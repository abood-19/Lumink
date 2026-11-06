import { getDict } from "./index";
import { getLocale } from "./server";

/** Dictionary for the current request (server components). */
export async function getT() {
  return getDict(await getLocale());
}
