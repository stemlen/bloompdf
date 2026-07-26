"use client";

import { Sparkles } from "lucide-react";
import { ToolCard } from "./ToolCard";
import { getToolBySlug } from "@/lib/tools";

// Curated list of popular tool slugs
const POPULAR_SLUGS = [
  "merge-pdf",
  "compress-pdf",
  "jpg-to-pdf",
  "pdf-to-word",
  "edit-pdf",
  "ocr-pdf",
];

interface PopularToolsSectionProps {
  favorites: string[];
  onToggleFavorite: (slug: string) => void;
}

export function PopularToolsSection({
  favorites,
  onToggleFavorite,
}: PopularToolsSectionProps) {
  const popularTools = POPULAR_SLUGS
    .map((slug) => getToolBySlug(slug))
    .filter(Boolean) as NonNullable<ReturnType<typeof getToolBySlug>>[];

  if (popularTools.length === 0) return null;

  return (
    <section id="popular" className="scroll-mt-16">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-rose-50 to-red-100 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-rose-500" />
        </div>
        <div>
          <h2 className="text-[16px] font-bold text-foreground tracking-tight">
            Most Popular
          </h2>
        </div>
        <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full ml-0.5">
          Editor&apos;s Pick
        </span>
      </div>

      {/* Featured grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 lg:gap-5">
        {popularTools.map((tool) => (
          <ToolCard
            key={tool.slug}
            tool={tool}
            isFavorite={favorites.includes(tool.slug)}
            onToggleFavorite={onToggleFavorite}
            featured
          />
        ))}
      </div>
    </section>
  );
}
