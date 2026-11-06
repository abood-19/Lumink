"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabase } from "./supabase/client";

/**
 * A small data layer for the artist's private records.
 * With Supabase connected and a signed-in user, rows live in the database
 * (row-level security keeps them private). Otherwise they live in this
 * browser's localStorage, so the studio works in demo mode.
 */
export type Row = { id: string; created_at?: string };

const lsKey = (table: string) => `lumink-demo-${table}`;

function readLocal<T>(table: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(lsKey(table)) ?? "[]") as T[];
  } catch {
    return [];
  }
}

function writeLocal<T>(table: string, rows: T[]) {
  try {
    localStorage.setItem(lsKey(table), JSON.stringify(rows));
  } catch {
    // Storage full or blocked: the in-memory state still works for this visit.
  }
}

export function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random());
}

export function useCollection<T extends Row>(table: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [remote, setRemote] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sb = getBrowserSupabase();
      const user = sb ? (await sb.auth.getUser()).data.user : null;
      if (sb && user) {
        const { data } = await sb.from(table).select("*").order("created_at", { ascending: false });
        if (!cancelled) {
          setRemote(true);
          setItems((data as T[]) ?? []);
        }
      } else if (!cancelled) {
        setItems(readLocal<T>(table));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [table]);

  const add = useCallback(
    async (row: Omit<T, "id" | "created_at">) => {
      const sb = getBrowserSupabase();
      if (remote && sb) {
        const { data, error } = await sb.from(table).insert(row as Record<string, unknown>).select().single();
        if (error) throw error;
        setItems((prev) => [data as T, ...prev]);
        return data as T;
      }
      const full = { ...row, id: uid(), created_at: new Date().toISOString() } as T;
      setItems((prev) => {
        const next = [full, ...prev];
        writeLocal(table, next);
        return next;
      });
      return full;
    },
    [remote, table],
  );

  const update = useCallback(
    async (id: string, patch: Partial<T>) => {
      const sb = getBrowserSupabase();
      if (remote && sb) {
        const { error } = await sb.from(table).update(patch as Record<string, unknown>).eq("id", id);
        if (error) throw error;
      }
      setItems((prev) => {
        const next = prev.map((r) => (r.id === id ? { ...r, ...patch } : r));
        if (!remote) writeLocal(table, next);
        return next;
      });
    },
    [remote, table],
  );

  const remove = useCallback(
    async (id: string) => {
      const sb = getBrowserSupabase();
      if (remote && sb) {
        const { error } = await sb.from(table).delete().eq("id", id);
        if (error) throw error;
      }
      setItems((prev) => {
        const next = prev.filter((r) => r.id !== id);
        if (!remote) writeLocal(table, next);
        return next;
      });
    },
    [remote, table],
  );

  return { items, loading, remote, add, update, remove };
}

/** Read a picked file as a data URL. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/** Downscale an image file so demo-mode storage stays small. */
export async function compressImage(file: File, maxSide = 1400, quality = 0.85): Promise<string> {
  const src = await fileToDataUrl(file);
  const img = await loadImage(src);
  const k = Math.min(1, maxSide / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", quality);
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
}

export function downloadDataUrl(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
