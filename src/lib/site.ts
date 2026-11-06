import { siInstagram, siTelegram, siTiktok, siYoutube } from "simple-icons";

/** Social links with the official brand icons (simple-icons). Fill in the real accounts before launch. */
export const SOCIALS = [
  { name: "Instagram", href: "#", icon: siInstagram.path, color: "#FF0069" },
  { name: "Telegram", href: "#", icon: siTelegram.path, color: "#26A5E4" },
  { name: "TikTok", href: "#", icon: siTiktok.path, color: "#FFFFFF" },
  { name: "YouTube", href: "#", icon: siYoutube.path, color: "#FF0000" },
];

/** Artwork shown until real portfolio photos are uploaded: the styles studios sell most. */
import type { FlashName } from "./flash";

/** sheet: several small designs on paper. single: one drawn design. design: a design image on paper. photo: a real photo. */
export type Art = { sheet?: FlashName[]; single?: FlashName; design?: string; photo?: string; ornament?: boolean; style: string; city: string };

/** Home gallery: kept short (12) so the rail stays calm. Swap in portfolio photos via PHOTOS.gallery. */
export const PLACEHOLDER_ART: Art[] = [
  { design: "/designs/oni.png", style: "Japanese · Blackwork", city: "Tashkent" },
  { photo: "/photos/studio-bw.jpg", style: "In the studio", city: "Tashkent" },
  { design: "/designs/spine.png", style: "Cyber sigilism", city: "Seoul" },
  { sheet: ["heart", "sparkle", "flame", "moon", "alien", "bolt", "cherry", "spider", "star"], style: "Flash · Micro", city: "Berlin" },
  { design: "/designs/snake.png", style: "Fine line", city: "Dubai" },
  { design: "/designs/tribal.png", style: "Tribal", city: "Almaty" },
  { photo: "/photos/stencil.jpg", style: "Stencil", city: "Istanbul" },
  { design: "/designs/mask.png", style: "Neo-tribal", city: "London" },
  { sheet: ["leo", "scorpio", "aries", "moon"], style: "Zodiac", city: "Paris" },
  { single: "dagger", style: "Neo-traditional", city: "Milan" },
  { sheet: ["smiley", "ghost", "webs", "eye", "saturn", "paw", "lucky", "note", "mushroom"], style: "Flash · Fine line", city: "Riyadh" },
  { single: "sigil", style: "Blackwork", city: "Moscow" },
];

/** Artists shown on the home page with a booking link. */
export const FEATURED_ARTISTS = [
  { name: "ЛЕО Tattoo", handle: "Leo", photo: "/artists/leo.jpg", cover: "/artists/leo-cover.jpg", url: "https://leotattoouz-gif.github.io/Leo.Tattoo/" },
];

/** Real photos. Put the files in /public and set the paths here (null = not added yet). */
export const PHOTOS: { hero: string | null; demoArm: string | null; gallery: string[] } = {
  hero: null, // e.g. "/photos/hero.jpg" — wide photo, at least 2000 px
  demoArm: null, // e.g. "/photos/arm.jpg" — vertical forearm photo for the simulator preview
  gallery: [], // e.g. ["/photos/work-01.jpg", ...] — replaces the drawn gallery when filled
};
