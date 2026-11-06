import "server-only";

const KEY = process.env.GEMINI_API_KEY ?? "";
const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export const geminiConfigured = Boolean(KEY);

type Part = { text?: string; inlineData?: { mimeType: string; data: string } };

async function call(model: string, parts: Part[], generationConfig?: Record<string, unknown>) {
  const res = await fetch(`${BASE}/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": KEY },
    body: JSON.stringify({ contents: [{ role: "user", parts }], ...(generationConfig ? { generationConfig } : {}) }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  return (json?.candidates?.[0]?.content?.parts ?? []) as Part[];
}

/**
 * Asks the text model whether a text is acceptable for LUMINK.
 * kind "prompt": must describe a tattoo design. kind "post": must be about tattoos and respectful.
 * Fails open to `true` only when Gemini is not configured.
 */
export async function moderate(text: string, kind: "prompt" | "post"): Promise<boolean> {
  if (!KEY) return true;
  const rule =
    kind === "prompt"
      ? "Answer YES only if the text describes an image that could be a tattoo design (any subject is fine as a tattoo motif, in any language). Answer NO for anything else: questions, chat, code, homework, requests unrelated to a tattoo, sexual content, hate symbols, or real private people."
      : "Answer YES only if this social post caption is about tattoos (artwork, healing, studios, styles, artists) and contains no insults, hate, harassment or sexual content. Any language. Otherwise answer NO.";
  const parts = await call(TEXT_MODEL, [{ text: `${rule}\nReply with exactly YES or NO.\n---\n${text.slice(0, 2000)}` }], { temperature: 0 });
  const out = (parts.map((p) => p.text ?? "").join("") || "").trim().toUpperCase();
  return out.startsWith("YES");
}

/** Generates black-on-white tattoo line art. Returns a data URL. */
export async function generateLineArt(prompt: string, style: string): Promise<string> {
  const instruction = [
    "Create a tattoo stencil design.",
    `Subject: ${prompt}`,
    style ? `Tattoo style: ${style}.` : "",
    "Requirements: clean black line art only on a pure white background, no shading fills, no color, no text, no watermark, no skin or body, centered, high contrast, suitable for printing as a tattoo stencil.",
  ].join("\n");
  const parts = await call(IMAGE_MODEL, [{ text: instruction }], { responseModalities: ["IMAGE"] });
  const img = parts.find((p) => p.inlineData?.data);
  if (!img?.inlineData) throw new Error("No image returned");
  return `data:${img.inlineData.mimeType};base64,${img.inlineData.data}`;
}
