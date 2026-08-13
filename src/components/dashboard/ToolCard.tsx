"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Combine, Scissors, FileMinus, FileOutput, LayoutGrid, Scan,
  Minimize2, Wrench, ScanText, Image as ImageIcon, FileText,
  FileSpreadsheet, Globe, FileImage, FileEdit, Presentation,
  Archive, PenLine, RotateCw, Hash, Droplets, Crop, ClipboardList,
  Star, ArrowRight,
} from "lucide-react";
import { ToolIcon } from "@/components/icons/ToolIcons";
import { cn } from "@/lib/utils";
import { getCategoryById, getCategoryBgStyle } from "@/lib/categories";
import { type Tool, getToolUrl } from "@/lib/tools";

interface ToolCardProps {
  tool: Tool;
  isFavorite?: boolean;
  onToggleFavorite?: (slug: string) => void;
  compact?: boolean;
  featured?: boolean;
}

export function ToolCard({
  tool,
  isFavorite,
  onToggleFavorite,
  compact,
  featured,
}: ToolCardProps) {
  const category = getCategoryById(tool.categoryId);
  const toolHref = getToolUrl(tool.slug);

  /* ── Compact (horizontal pill — used in Recent / Favorites) ── */
  if (compact) {
    return (
      <div className="relative group tool-card flex-shrink-0">
        <Link
          href={toolHref}
          className="flex items-center gap-3 bg-card rounded-xl border border-border shadow-card hover:shadow-card-hover px-3.5 py-3 transition-all duration-200 w-52"
          aria-label={tool.name}
        >
          <div className="card-icon-container w-10 h-10 flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
            <ToolIcon slug={tool.slug} size={40} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-foreground truncate leading-snug">
              {tool.shortName}
            </p>
            <p className="text-[11px] text-muted-foreground truncate leading-snug mt-0.5">
              {tool.outputFormat}
            </p>
          </div>
        </Link>
        {onToggleFavorite && (
          <button
            onClick={(e) => { e.preventDefault(); onToggleFavorite(tool.slug); }}
            className={cn(
              "absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-all",
              "opacity-0 group-hover:opacity-100",
              isFavorite && "opacity-100",
              isFavorite ? "text-amber-500" : "text-muted-foreground hover:text-amber-500"
            )}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Star className={cn("w-3 h-3", isFavorite && "fill-current")} />
          </button>
        )}
      </div>
    );
  }

  /* ── Standard card ─────────────────────────────────────────── */
  const iconBoxSize = featured ? "w-20 h-20" : "w-[4.5rem] h-[4.5rem]";
  const svgSize = featured ? 52 : 44;

  return (
    <div className="relative group tool-card">
      <Link
        href={toolHref}
        className={cn(
          "relative flex flex-col bg-card rounded-2xl border border-border shadow-card hover:shadow-card-hover transition-all duration-200 overflow-hidden",
          featured ? "p-6 lg:p-7" : "p-5 lg:p-6"
        )}
        aria-label={tool.name}
      >
        {/* Top accent line — slides in on hover */}
        <div
          className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-250"
          style={{ backgroundColor: category?.color }}
        />

        {/* Icon */}
        <div
          className={cn(
            "card-icon-container flex items-center justify-center flex-shrink-0 mb-5 transition-transform duration-200 group-hover:scale-105",
            featured ? "w-16 h-16" : "w-14 h-14"
          )}
        >
          <ToolIcon slug={tool.slug} size={featured ? 64 : 54} />
        </div>

        {/* Name + description */}
        <div className="flex-1 min-w-0">
          <h3
            className={cn(
              "font-bold text-foreground leading-snug mb-2 truncate",
              featured ? "text-[18px]" : "text-[15px]"
            )}
          >
            {tool.name}
          </h3>
          <p
            className={cn(
              "text-muted-foreground leading-relaxed line-clamp-2",
              featured ? "text-[14px]" : "text-[13px]"
            )}
          >
            {tool.description}
          </p>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
          <span
            className="text-[10px] sm:text-[10.5px] font-bold px-2 py-0.5 rounded-md tracking-wide truncate min-w-0 max-w-[65%]"
            style={{
              ...getCategoryBgStyle(category),
              color: category?.color,
            }}
            title={category?.label}
          >
            {category?.label}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground flex-shrink-0">
            <span>{tool.outputFormat}</span>
            <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
          </span>
        </div>
      </Link>

      {/* Favorite button */}
      {onToggleFavorite && (
        <button
          onClick={(e) => { e.preventDefault(); onToggleFavorite(tool.slug); }}
          className={cn(
            "absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-150",
            "opacity-0 group-hover:opacity-100",
            isFavorite && "opacity-100",
            isFavorite
              ? "text-amber-500 bg-amber-50 dark:bg-amber-950/40"
              : "text-muted-foreground hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 bg-card/80"
          )}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Star className={cn("w-3.5 h-3.5", isFavorite && "fill-current")} />
        </button>
      )}
    </div>
  );
}
