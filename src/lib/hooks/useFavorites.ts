"use client";

import { useState, useEffect, useCallback } from "react";
import { tools } from "@/lib/tools";
import type { Tool } from "@/lib/tools";

const STORAGE_KEY = "pdf-editor-favorites";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setFavorites(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(
    (slug: string) => {
      setFavorites((prev) => {
        const next = prev.includes(slug)
          ? prev.filter((s) => s !== slug)
          : [...prev, slug];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const isFavorite = useCallback(
    (slug: string) => favorites.includes(slug),
    [favorites]
  );

  const favoriteTools: Tool[] = favorites
    .map((slug) => tools.find((t) => t.slug === slug))
    .filter(Boolean) as Tool[];

  return { favorites, favoriteTools, toggle, isFavorite, mounted };
}
