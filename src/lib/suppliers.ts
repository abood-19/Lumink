/**
 * Supplier and inspiration directory. Researched October 2026.
 * Shops change often: confirm stock, prices and shipping to Uzbekistan before ordering.
 */
import { siAliexpress, siBehance, siEtsy, siInstagram, siPinterest } from "simple-icons";

export type Link = { name: string; url: string; note: string; logo?: { path: string; hex: string } };

const logo = (i: { path: string; hex: string }) => ({ path: i.path, hex: i.hex });

export const LOCAL: Link[] = [
  { name: "2GIS — tattoo supply shops", url: "https://2gis.uz/tashkent/search/%D0%9C%D0%B0%D0%B3%D0%B0%D0%B7%D0%B8%D0%BD%20%D1%82%D0%B0%D1%82%D1%83", note: "Map of Tashkent shops with tattoo goods, phones and addresses" },
  { name: "OLX.uz — tattoo inks", url: "https://www.olx.uz/tashkent/q-%D0%BA%D1%80%D0%B0%D1%81%D0%BA%D0%B8-%D1%82%D0%B0%D1%82%D1%83/", note: "Listings for Dynamic, Intenze and other inks. Check originality" },
];

export const ONLINE: Link[] = [
  { name: "Killer Ink", url: "https://www.killerinktattoo.co.uk", note: "UK. Machines, cartridges, inks, aftercare" },
  { name: "Tatuat.ro", url: "https://tatuat.ro", note: "Romania. Ships to 190+ countries" },
  { name: "StarBrite Colors", url: "https://www.starbritecolors.com", note: "USA. Inks, worldwide shipping" },
  { name: "Cheyenne", url: "https://shop.eu.cheyennetattoo.com", note: "Official store: machines and cartridges" },
  { name: "Tattoo Shop KZ", url: "https://www.instagram.com/tattooshopkz/", note: "Kazakhstan. Machines, inks, power supplies", logo: logo(siInstagram) },
  { name: "AliExpress", url: "https://www.aliexpress.com/w/wholesale-tattoo-cartridges.html", note: "Cheapest, quality varies widely", logo: logo(siAliexpress) },
];

export const IDEAS: Link[] = [
  { name: "Pinterest", url: "https://www.pinterest.com/search/pins/?q=tattoo%20flash", note: "The largest board of tattoo ideas", logo: logo(siPinterest) },
  { name: "Tattoodo", url: "https://www.tattoodo.com", note: "Tattoo community and artwork by style" },
  { name: "Instagram", url: "https://www.instagram.com/explore/tags/flashtattoo/", note: "Hashtags: #flashtattoo, #blackworktattoo", logo: logo(siInstagram) },
  { name: "Behance", url: "https://www.behance.net/search/projects?search=tattoo", note: "Professional illustration and tattoo projects", logo: logo(siBehance) },
  { name: "Etsy — flash sheets", url: "https://www.etsy.com/search?q=tattoo%20flash%20sheet", note: "Licensed flash sheets from artists", logo: logo(siEtsy) },
  { name: "INKPPL", url: "https://inkppl.com/tattoo-mastera/uzbekistan/tashkent", note: "CIS artists, including Tashkent" },
];
