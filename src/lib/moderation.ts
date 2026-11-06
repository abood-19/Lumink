/**
 * A first, fast filter for obvious abuse. The Gemini check in lib/gemini.ts
 * handles topic and tone; this list only catches the most common slurs and
 * profanity roots so the platform stays clean even without an API key.
 * Extend it per language as the community grows.
 */
const BLOCKED = [
  "fuck", "shit", "bitch", "cunt", "nigg", "faggot", "whore",
  "хуй", "пизд", "ебат", "ебан", "бляд", "сука", "мудак", "пидор",
  "jalab", "qanjiq",
  "شرموط", "منيوك", "عاهرة", "قحبة",
];

export function hasBlockedWords(text: string): boolean {
  const lower = text.toLowerCase();
  return BLOCKED.some((w) => lower.includes(w));
}
