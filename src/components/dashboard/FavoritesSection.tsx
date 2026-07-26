"use client";

import { Star } from "lucide-react";
import { ToolCard } from "./ToolCard";
import type { Tool } from "@/lib/tools";

interface FavoritesSectionProps {
  tools: Tool[];
  favorites: string[];
  onToggleFavorite: (slug: string) => void;
  mounted: boolean;
}

export function FavoritesSection({
  tools,
  favorites,
  onToggleFavorite,
  mounted,
}: FavoritesSectionProps) {
  if (!mounted || tools.length === 0) return null;

  return (
    <section id="favorites" className="scroll-mt-16">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
        </div>
        <h2 className="text-[15px] font-bold text-foreground">Favorites</h2>
        <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full tabular-nums">
          {tools.length}
        </span>
      </div>

      {/* Horizontal scroll strip */}
      <div className="scroll-strip flex gap-2.5 pb-1">
        {tools.map((tool) => (
          <ToolCard
            key={tool.slug}
            tool={tool}
            isFavorite={favorites.includes(tool.slug)}
            onToggleFavorite={onToggleFavorite}
            compact
          />
        ))}
      </div>
    </section>
  );
}
