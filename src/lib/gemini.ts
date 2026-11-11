import "server-only";

const KEY = process.env.GEMINI_API_KEY ?? "";
const BASE = "https://generativelanguage.googleapis.com/v1beta";

// Google renames and retires models often. We try the configured model first, then known names,
// then ask the API which models this key can use, so a retired name never breaks the generator.
const TEXT_MODELS = [process.env.GEMINI_TEXT_MODEL, "gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-flash-lite"].filter(Boolean) as string[];
const IMAGE_MODELS = [process.env.GEMINI_IMAGE_MODEL, "gemini-2.5-flash-image", "gemini-3-pro-image", "gemini-3-pro-image-preview", "gemini-3.1-flash-image-preview"].filter(Boolean) as string[];

// Cloudflare Workers AI: ~170 free images a day, then about $0.0006 per image (the cheapest option).
const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
const CF_TOKEN = process.env.CLOUDFLARE_AI_TOKEN ?? "";
const CF = Boolean(CF_ACCOUNT && CF_TOKEN);
export const geminiConfigured = Boolean(KEY) || CF;

async function cfRun(model: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/${model}`, {
    method: "POST", headers: { authorization: `Bearer ${CF_TOKEN}`, "content-type": "application/json" }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Cloudflare ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as { result?: { image?: string; response?: string } };
}

type Part = { text?: string; inlineData?: { mimeType: string; data: string } };
class ModelGone extends Error {}

const working: { text?: string; image?: string } = {};

async function call(model: string, parts: Part[], generationConfig?: Record<string, unknown>) {
  const res = await fetch(`${BASE}/models/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": KEY },
    body: JSON.stringify({ contents: [{ role: "user", parts }], ...(generationConfig ? { generationConfig } : {}) }),
  });
  if (res.status === 404 || res.status === 400) {
    const body = await res.text();
    if (res.status === 404 || /not found|not supported|deprecated|retired/i.test(body)) throw new ModelGone(`${model}: ${body.slice(0, 200)}`);
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 300)}`);
  }
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  return (json?.candidates?.[0]?.content?.parts ?? []) as Part[];
}

/** Models this key can call with generateContent, filtered by kind. */
async function discover(kind: "text" | "image"): Promise<string[]> {
  try {
    const res = await fetch(`${BASE}/models?pageSize=200`, { headers: { "x-goog-api-key": KEY } });
    if (!res.ok) return [];
    const j = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
    const names = (j.models ?? []).filter((m) => m.supportedGenerationMethods?.includes("generateContent")).map((m) => m.name.replace(/^models\//, ""));
    const img = (n: string) => /image/.test(n) && !/imagen/.test(n);
    return kind === "image" ? names.filter(img) : names.filter((n) => /flash/.test(n) && !img(n) && !/tts|audio|live|embed/.test(n));
  } catch { return []; }
}

async function withFallback(kind: "text" | "image", parts: Part[], cfg?: Record<string, unknown>) {
  const tried = new Set<string>();
  const run = async (list: string[]) => {
    for (const m of list) {
      if (tried.has(m)) continue;
      tried.add(m);
      try { const out = await call(m, parts, cfg); working[kind] = m; return out; }
      catch (e) { if (!(e instanceof ModelGone)) throw e; }
    }
    return null;
  };
  const first = [working[kind], ...(kind === "text" ? TEXT_MODELS : IMAGE_MODELS)].filter(Boolean) as string[];
  return (await run(first)) ?? (await run(await discover(kind))) ?? (() => { throw new Error(`No ${kind} model available for this API key`); })();
}

/**
 * Asks the text model whether a text is acceptable for LUMINK.
 * kind "prompt": must describe a tattoo design. kind "post": must be about tattoos and respectful.
 */
export async function moderate(text: string, kind: "prompt" | "post"): Promise<boolean> {
  if (!KEY && !CF) return true;
  const rule =
    kind === "prompt"
      ? "Answer YES only if the text describes an image that could be a tattoo design (any subject is fine as a tattoo motif, in any language). Answer NO for anything else: questions, chat, code, homework, requests unrelated to a tattoo, sexual content, hate symbols, or real private people."
      : "Answer YES only if this social post caption is about tattoos (artwork, healing, studios, styles, artists) and contains no insults, hate, harassment or sexual content. Any language. Otherwise answer NO.";
  try {
    const q = `${rule}\nReply with exactly YES or NO.\n---\n${text.slice(0, 2000)}`;
    if (!KEY) {
      const r = await cfRun("@cf/meta/llama-3.1-8b-instruct", { messages: [{ role: "user", content: q }], max_tokens: 3, temperature: 0 });
      return (r.result?.response ?? "").trim().toUpperCase().startsWith("YES");
    }
    const parts = await withFallback("text", [{ text: q }], { temperature: 0 });
    return (parts.map((p) => p.text ?? "").join("") || "").trim().toUpperCase().startsWith("YES");
  } catch (e) {
    // The checker being down must not block paying users; the image prompt itself still restricts output to tattoo art.
    console.error("moderation unavailable", e);
    return kind === "prompt";
  }
}

export type GenMode = "line" | "shaded" | "color";

/** Generates a tattoo design. Returns a data URL. */
export async function generateLineArt(prompt: string, style: string, mode: GenMode = "line"): Promise<string> {
  const look =
    mode === "color"
      ? "Full-colour tattoo flash artwork with bold clean outlines and saturated tattoo-ink colours, on a pure white background."
      : mode === "shaded"
        ? "Black-and-grey tattoo artwork: clean black outlines with smooth grey shading, on a pure white background."
        : "Clean black line art only, no shading fills, no colour, on a pure white background, high contrast, ready to print as a tattoo stencil.";
  const instruction = [
    "Create one tattoo design.",
    `Subject: ${prompt}`,
    style ? `Tattoo style: ${style}.` : "",
    `${look} No text, no watermark, no signature, no skin, no body, no frame, no mockup. Centered, the whole design visible with margin around it.`,
  ].join("\n");
  // cheapest first; the other provider takes over if one fails or runs out
  const order = (process.env.AI_IMAGE_ORDER ?? "cloudflare,gemini").split(",").map((x) => x.trim());
  let lastErr: unknown = new Error("No image provider configured");
  for (const provider of order) {
    try {
      if (provider === "cloudflare" && CF) {
        const r = await cfRun("@cf/black-forest-labs/flux-1-schnell", { prompt: instruction.replace(/\n/g, " "), steps: 6 });
        if (r.result?.image) return `data:image/jpeg;base64,${r.result.image}`;
        throw new Error("Cloudflare returned no image");
      }
      if (provider === "gemini" && KEY) {
        const parts = await withFallback("image", [{ text: instruction }], { responseModalities: ["IMAGE", "TEXT"] });
        const img = parts.find((p) => p.inlineData?.data);
        if (img?.inlineData) return `data:${img.inlineData.mimeType};base64,${img.inlineData.data}`;
        throw new Error("Gemini returned no image");
      }
    } catch (e) { lastErr = e; console.error(provider, e); }
  }
  throw lastErr;
}
