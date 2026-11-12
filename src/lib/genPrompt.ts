/** Reads the artist's description and picks the drawing type and style by itself (any language). */

export type GenMode = "line" | "shaded" | "color";

const COLOR = /(colou?r|colorful|watercolou?r|red|blue|green|yellow|purple|pink|orange|ملون|ملوّن|الوان|ألوان|لون|احمر|أحمر|ازرق|أزرق|اخضر|أخضر|اصفر|أصفر|بنفسجي|وردي|برتقالي|цвет|красн|син|зелен|жёлт|желт|фиолет|розов|рang|rangli|qizil|ko['‘’]?k|yashil|sariq)/i;
const LINE = /(stencil|line ?art|outline|fine ?line|minimal|ستنسل|استنسل|خطوط|خط رفيع|رفيع|بسيط|محيط|трафарет|контур|тонк|минимал|чистые линии|kontur|chiziq|oddiy)/i;

export function autoMode(text: string): GenMode {
  if (COLOR.test(text)) return "color";
  if (LINE.test(text)) return "line";
  return "shaded";
}

const LOOK: Record<GenMode, string> = {
  color: "full-colour tattoo flash artwork, bold clean outlines, saturated tattoo-ink colours",
  shaded: "black and grey tattoo design, clean black outlines with smooth grey shading",
  line: "clean black line art tattoo stencil, crisp outlines only, no shading fills, no colour",
};

/** One English instruction for any image model. */
export function tattooPrompt(subject: string, mode: GenMode) {
  return `Tattoo design of: ${subject}. Choose the tattoo style that best fits this description. ${LOOK[mode]}, isolated on a pure white background, centered, whole design visible with margin, high contrast, professional tattoo flash sheet quality. No text unless asked, no watermark, no skin, no body, no frame, no mockup.`;
}
