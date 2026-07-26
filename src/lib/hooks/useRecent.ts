"use client";

import { useState, useEffect, useCallback } from "react";
import { tools } from "@/lib/tools";
import type { Tool } from "@/lib/tools";

const STORAGE_KEY = "pdf-editor-recent";
const MAX_RECENT = 6;

export function useRecent() {
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setRecentSlugs(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const addRecent = useCallback((slug: string) => {
    setRecentSlugs((prev) => {
      const filtered = prev.filter((s) => s !== slug);
      const next = [slug, ...filtered].slice(0, MAX_RECENT);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const recentTools: Tool[] = recentSlugs
    .map((slug) => tools.find((t) => t.slug === slug))
    .filter(Boolean) as Tool[];

  return { recentSlugs, recentTools, addRecent, mounted };
}
