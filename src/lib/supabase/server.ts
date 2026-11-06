import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "./config";

export async function getServerSupabase(): Promise<SupabaseClient | null> {
  if (!supabaseConfigured) return null;
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are refreshed by the middleware instead.
        }
      },
    },
  });
}

export type Profile = {
  id: string;
  display_name: string | null;
  city: string | null;
  role: "admin" | "artist" | "member";
  plan: "free" | "pro" | "gold";
  tokens: number;
  lifetime: boolean;
};

/** The signed-in user's profile, or null (signed out, or demo mode). */
export async function getProfile(): Promise<Profile | null> {
  const sb = await getServerSupabase();
  if (!sb) return null;
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return null;
  const { data } = await sb.from("profiles").select("*").eq("id", auth.user.id).single();
  return (data as Profile) ?? null;
}
