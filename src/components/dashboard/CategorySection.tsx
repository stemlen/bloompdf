"use client";

import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid, PackageMinus, Image as ImageIcon,
  ArrowRightLeft, PenLine, ClipboardList,
} from "lucide-react";
import { ToolCard } from "./ToolCard";
import type { Tool } from "@/lib/tools";
import type { Category } from "@/lib/categories";

const categoryIcons: Record<string, LucideIcon> = {
  organize: LayoutGrid,
  optimize: PackageMinus,
  "convert-to": ImageIcon,
  "convert-from": ArrowRightLeft,
  edit: PenLine,
  forms: ClipboardList,
};

interface CategorySectionProps {
  category: Category;
  tools: Tool[];
  favorites: string[];
  onToggleFavorite: (slug: string) => void;
}

export function CategorySection({
  category,
  tools,
  favorites,
  onToggleFavorite,
}: CategorySectionProps) {
  if (tools.length === 0) return null;

  const Icon = categoryIcons[category.id] ?? LayoutGrid;

  return (
    <section id={category.id} className="scroll-mt-24">
      {/* Section header */}
      <div className="flex items-start gap-4 mb-5">
        {/* Icon + left border */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="flex-shrink-0 w-1 h-10 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: category.lightBg }}
          >
            <Icon className="w-6 h-6" style={{ color: category.color }} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-[16px] font-bold text-foreground tracking-tight">
                {category.label}
              </h2>
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums"
                style={{ backgroundColor: category.lightBg, color: category.color }}
              >
                {tools.length}
              </span>
            </div>
            <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
              {category.description}
            </p>
          </div>
        </div>
      </div>

      {/* Tool grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-5">
        {tools.map((tool) => (
          <ToolCard
            key={tool.slug}
            tool={tool}
            isFavorite={favorites.includes(tool.slug)}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    </section>
  );
}
