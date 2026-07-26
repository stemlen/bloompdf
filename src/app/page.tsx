"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sparkles, Clock, Star,
  PackageMinus, Image as ImageIcon, FileText,
  LayoutGrid, ArrowRightLeft, PenLine, ClipboardList,
  Shield, Zap, Combine, Scissors,
  MousePointer2, Type, Square, Download, MoreHorizontal, ChevronRight, ChevronLeft, ZoomIn, ZoomOut, CheckCircle2, AlignLeft
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { useRecent } from "@/lib/hooks/useRecent";
import { categories } from "@/lib/categories";
import { getToolsByCategory, tools as allTools } from "@/lib/tools";
import { CategorySection } from "@/components/dashboard/CategorySection";
import { ToolCard } from "@/components/dashboard/ToolCard";
import { getToolBySlug } from "@/lib/tools";
import { cn } from "@/lib/utils";

// ─── Data ──────────────────────────────────────────────────────────────────

const POPULAR_SLUGS = [
  "merge-pdf", "compress-pdf", "jpg-to-pdf",
  "pdf-to-word", "edit-pdf", "split-pdf",
];

const categoryIcons: Record<string, LucideIcon> = {
  organize: LayoutGrid,
  optimize: PackageMinus,
  "convert-to": ImageIcon,
  "convert-from": ArrowRightLeft,
  edit: PenLine,
  forms: ClipboardList,
};

const STATS = [
  { icon: FileText, label: `${allTools.length} Tools`, sub: "All in one place", color: "#E8607A", bg: "#FFF0F3" },
  { icon: Zap, label: "Instant", sub: "Processed in seconds", color: "#0D9488", bg: "#F0FDFA" },
  { icon: Shield, label: "Private", sub: "Files never stored", color: "#2563EB", bg: "#EFF6FF" },
];

// ─── Sub-components ────────────────────────────────────────────────────────

function SectionHeading({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  count,
  countColor,
  countBg,
}: {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  title: string;
  count?: number;
  countColor?: string;
  countBg?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: iconBg }}
      >
        <Icon className="w-4 h-4" style={{ color: iconColor }} />
      </div>
      <h2 className="text-[17px] font-bold text-foreground tracking-tight flex-1">
        {title}
      </h2>
      {count !== undefined && (
        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums"
          style={{ backgroundColor: countBg ?? "#F3F3F1", color: countColor ?? "#737373" }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function HomePage() {
  const { favorites, favoriteTools, toggle, isFavorite, mounted: favMounted } = useFavorites();
  const { recentTools, mounted: recentMounted } = useRecent();
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const popularTools = POPULAR_SLUGS
    .map((slug) => getToolBySlug(slug))
    .filter(Boolean) as NonNullable<ReturnType<typeof getToolBySlug>>[];

  const filteredCategories = activeCategory === "all"
    ? categories
    : categories.filter((c) => c.id === activeCategory);

  return (
    <div className="min-h-screen bg-muted">

      {/* ════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-card border-b border-border">
        {/* Fine grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, #E4E4E2 1px, transparent 1px), linear-gradient(to bottom, #E4E4E2 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            opacity: 0.35,
          }}
        />
        {/* Right glow accent */}
        <div
          className="absolute -right-40 top-0 w-[600px] h-[400px] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at top right, rgba(232,96,122,0.06) 0%, transparent 65%)",
          }}
        />

        <div className="relative max-w-screen-xl mx-auto px-4 sm:px-6 pt-16 pb-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Left side: text and badges */}
            <div className="max-w-2xl">
              {/* Eyebrow badge */}
              <div className="inline-flex items-center gap-2 bg-[#FFF0F3] border border-[#FFC5D3] rounded-full px-3.5 py-1.5 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E8607A] flex-shrink-0 animate-bloom-pulse" />
                <span className="text-[12px] font-semibold text-[#E8607A]">
                  {allTools.length} tools · 100% free · No sign-up
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-[40px] sm:text-[52px] font-extrabold text-foreground leading-[1.1] tracking-tight mb-5">
                One Workspace.
                <br />
                <span className="text-[#E8607A]">Every PDF Task.</span>
              </h1>

              {/* Sub-headline */}
              <p className="text-[17px] sm:text-[18px] text-muted-foreground leading-relaxed max-w-xl mb-8">
                Professional document tools — merge, split, compress, convert, and edit PDFs
                entirely in your browser. Fast, private, and completely free.
              </p>

              {/* Stats row */}
              <div className="flex flex-wrap gap-3">
                {STATS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div
                      key={s.label}
                      className="flex items-center gap-2.5 bg-card border border-border rounded-xl px-3.5 py-2.5 shadow-xs"
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: s.bg }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-foreground leading-none">{s.label}</p>
                        <p className="text-[11px] text-muted-foreground leading-none mt-0.5">{s.sub}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right side: PDF Workspace Illustration */}
            <div className="relative w-full aspect-square max-w-[600px] mx-auto lg:ml-auto flex items-center justify-center lg:justify-end mt-10 lg:mt-0">
              
              {/* Decorative blobs */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#E8607A]/15 blur-[100px] rounded-full pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-blue-600/10 blur-[80px] rounded-full pointer-events-none" />

              {/* Main PDF Mockup - with floating animation */}
              <div className="relative z-10 w-[320px] sm:w-[440px] bg-muted rounded-2xl border border-border shadow-[0_30px_80px_-20px_rgba(0,0,0,0.15)] overflow-hidden animate-float flex flex-col">
                
                {/* Mac-style Window Header */}
                <div className="h-10 bg-card border-b border-border flex items-center px-4 gap-4 flex-shrink-0">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
                    <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
                    <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
                  </div>
                  <div className="flex-1 flex justify-center items-center gap-3">
                    <span className="text-[11px] font-semibold text-foreground">Q3_Financial_Report_Final.pdf</span>
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">PDF/A</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Download className="w-3.5 h-3.5 text-muted-foreground" />
                    <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
                
                {/* Toolbar */}
                <div className="h-11 bg-card border-b border-border flex items-center px-4 justify-between flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <div className="p-1.5 bg-[#FFF0F3] text-[#E8607A] rounded-lg border border-[#FFC5D3] shadow-sm">
                      <MousePointer2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg">
                      <Type className="w-3.5 h-3.5" />
                    </div>
                    <div className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg">
                      <ImageIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg">
                      <Square className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 border-l border-border pl-3">
                    <ZoomOut className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[11px] font-medium text-foreground">100%</span>
                    <ZoomIn className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>

                {/* Workspace Area */}
                <div className="flex flex-1 min-h-[300px] sm:min-h-[360px] bg-muted">
                  {/* Left Sidebar (Thumbnails) */}
                  <div className="w-[100px] hidden sm:flex flex-col gap-3 p-3 border-r border-border bg-muted overflow-hidden">
                    <div className="aspect-[3/4] w-full bg-card rounded shadow-sm border-2 border-[#E8607A] relative p-1">
                      <div className="w-full h-1 bg-[#E8607A]/20 mb-1 rounded-sm" />
                      <div className="w-3/4 h-1 bg-[#E4E4E2] mb-0.5 rounded-sm" />
                      <div className="w-1/2 h-1 bg-[#E4E4E2] rounded-sm" />
                      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#E8607A] rounded-full border-2 border-[#F7F7F6] flex items-center justify-center">
                        <span className="text-[8px] font-bold text-white leading-none">1</span>
                      </div>
                    </div>
                    <div className="aspect-[3/4] w-full bg-card/60 rounded border border-border p-1">
                       <div className="w-full h-8 bg-muted mb-1 rounded-sm" />
                       <div className="w-full h-1 bg-[#E4E4E2] mb-0.5 rounded-sm" />
                       <div className="w-full h-1 bg-[#E4E4E2] rounded-sm" />
                    </div>
                    <div className="aspect-[3/4] w-full bg-card/60 rounded border border-border p-1">
                       <div className="w-full h-1 bg-[#E4E4E2] mb-0.5 rounded-sm" />
                       <div className="w-full h-1 bg-[#E4E4E2] mb-0.5 rounded-sm" />
                       <div className="w-full h-1 bg-[#E4E4E2] mb-0.5 rounded-sm" />
                    </div>
                  </div>

                  {/* Main Document Canvas */}
                  <div className="flex-1 p-4 sm:p-6 overflow-hidden flex justify-center items-start relative">
                    {/* The Page */}
                    <div className="w-full max-w-[280px] bg-card aspect-[1/1.4] rounded shadow-md border border-border p-5 sm:p-6 relative">
                      
                      {/* Document Header */}
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-8 h-8 bg-[#E8607A] rounded flex items-center justify-center">
                          <Zap className="w-4 h-4 text-white" />
                        </div>
                        <div className="text-right">
                          <div className="w-16 h-2 bg-[#E4E4E2] rounded-full mb-1 ml-auto" />
                          <div className="w-10 h-1.5 bg-muted rounded-full ml-auto" />
                        </div>
                      </div>

                      {/* Document Title */}
                      <div className="space-y-1.5 mb-5">
                        <div className="w-full h-4 bg-[#111111]/80 rounded-md" />
                        <div className="w-3/4 h-4 bg-[#111111]/80 rounded-md" />
                      </div>

                      {/* Highlighted text block (Edit Mode Simulation) */}
                      <div className="relative mb-4 group">
                        <div className="absolute -inset-1.5 border border-[#E8607A]/50 bg-[#FFF0F3]/30 rounded" />
                        <div className="relative space-y-1.5">
                          <div className="w-full h-2 bg-[#555555]/80 rounded-full" />
                          <div className="w-[95%] h-2 bg-[#555555]/80 rounded-full" />
                          <div className="w-[85%] h-2 bg-[#555555]/80 rounded-full" />
                        </div>
                        {/* Fake cursor */}
                        <div className="absolute bottom-0 right-[15%] w-px h-3 bg-[#E8607A] animate-pulse" />
                      </div>

                      {/* Real-looking chart/image block */}
                      <div className="w-full h-20 bg-muted border border-border rounded-lg mb-4 flex items-end p-2 gap-1.5">
                        <div className="w-1/4 bg-[#E8607A]/40 h-[40%] rounded-sm" />
                        <div className="w-1/4 bg-[#E8607A]/60 h-[70%] rounded-sm" />
                        <div className="w-1/4 bg-[#E8607A]/80 h-[50%] rounded-sm" />
                        <div className="w-1/4 bg-[#E8607A] h-[90%] rounded-sm relative">
                           <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-card border border-[#E8607A]" />
                        </div>
                      </div>

                      <div className="flex gap-4">
                         <div className="flex-1 space-y-1.5">
                           <div className="w-full h-1.5 bg-[#E4E4E2] rounded-full" />
                           <div className="w-5/6 h-1.5 bg-[#E4E4E2] rounded-full" />
                           <div className="w-full h-1.5 bg-[#E4E4E2] rounded-full" />
                         </div>
                         <div className="flex-1 space-y-1.5">
                           <div className="w-full h-1.5 bg-[#E4E4E2] rounded-full" />
                           <div className="w-4/5 h-1.5 bg-[#E4E4E2] rounded-full" />
                           <div className="w-full h-1.5 bg-[#E4E4E2] rounded-full" />
                         </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Action Chips - Positioned intentionally around the UI */}
              
              {/* Combine / Merge */}
              <div className="absolute top-[15%] right-[-10px] sm:right-[-30px] z-20 animate-float-delayed">
                <div className="flex items-center gap-2.5 bg-card/90 backdrop-blur-md border border-border shadow-lg rounded-xl py-2 px-3">
                  <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] flex items-center justify-center border border-[#BFDBFE]">
                    <Combine className="w-3.5 h-3.5 text-[#2563EB]" />
                  </div>
                  <div className="pr-1">
                    <p className="text-[12px] font-bold text-foreground leading-tight">Merge</p>
                    <p className="text-[9px] text-muted-foreground leading-tight">2 files</p>
                  </div>
                </div>
              </div>

              {/* Compress */}
              <div className="absolute bottom-[20%] right-[-5px] sm:right-[-20px] z-20 animate-float-fast">
                <div className="flex items-center gap-2.5 bg-card/90 backdrop-blur-md border border-border shadow-lg rounded-xl py-2 px-3">
                  <div className="w-7 h-7 rounded-lg bg-[#F0FDFA] flex items-center justify-center border border-[#99F6E4]">
                    <PackageMinus className="w-3.5 h-3.5 text-[#0D9488]" />
                  </div>
                  <div className="pr-1">
                    <p className="text-[12px] font-bold text-foreground leading-tight">Compress</p>
                    <p className="text-[9px] text-[#0D9488] font-medium leading-tight">-85% size</p>
                  </div>
                </div>
              </div>

              {/* Split */}
              <div className="absolute bottom-[10%] left-2 sm:left-[-20px] z-20 animate-float-slow">
                <div className="flex items-center gap-2 bg-card/90 backdrop-blur-md border border-border shadow-lg rounded-full py-1.5 px-3">
                  <Scissors className="w-3 h-3 text-[#B45309]" />
                  <span className="text-[11px] font-bold text-foreground">Extract pages</span>
                </div>
              </div>

              {/* Edit (Hero Chip) */}
              <div className="absolute top-[40%] left-[-15px] sm:left-[-40px] z-20 animate-float">
                <div className="flex items-center gap-2.5 bg-[#111111] shadow-[0_12px_24px_-4px_rgba(17,17,17,0.3)] rounded-xl py-2.5 px-4 border border-[#333333]">
                  <div className="w-7 h-7 rounded-lg bg-[#E8607A] flex items-center justify-center shadow-inner">
                    <PenLine className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <span className="block text-[13px] font-bold text-white leading-tight">Edit PDF</span>
                    <span className="block text-[10px] text-[#A0A0A0] leading-tight">Text & Images</span>
                  </div>
                </div>
              </div>

              {/* Success badge */}
              <div className="absolute top-[5%] left-[20%] sm:left-[10%] z-20 animate-fade-in" style={{ animationDelay: '1s', animationFillMode: 'both' }}>
                 <div className="flex items-center gap-1.5 bg-[#F0FDF4] border border-[#BBF7D0] shadow-sm rounded-full py-1 px-2.5">
                   <CheckCircle2 className="w-3 h-3 text-[#16A34A]" />
                   <span className="text-[10px] font-semibold text-[#16A34A]">Auto-saved</span>
                 </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          MAIN DASHBOARD
      ════════════════════════════════════════════════════ */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 pb-24">

          {/* ── Favorites ─────────────────────────────────────────── */}
          {favMounted && favoriteTools.length > 0 && (
            <section id="favorites" className="scroll-mt-20 pt-10">
              <SectionHeading
                icon={Star}
                iconBg="#FFF7ED"
                iconColor="#F59E0B"
                title="Favorites"
                count={favoriteTools.length}
                countColor="#B45309"
                countBg="#FEF3C7"
              />
              <div className="scroll-strip flex gap-3 pb-2">
                {favoriteTools.map((tool) => (
                  <ToolCard
                    key={tool.slug}
                    tool={tool}
                    isFavorite={true}
                    onToggleFavorite={toggle}
                    compact
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Recently Used ──────────────────────────────────────── */}
          {recentMounted && recentTools.length > 0 && (
            <section id="recent" className="scroll-mt-20 pt-10">
              <SectionHeading
                icon={Clock}
                iconBg="#F3F3F1"
                iconColor="#737373"
                title="Recently Used"
                count={recentTools.length}
              />
              <div className="scroll-strip flex gap-3 pb-2">
                {recentTools.map((tool) => (
                  <ToolCard
                    key={tool.slug}
                    tool={tool}
                    isFavorite={isFavorite(tool.slug)}
                    onToggleFavorite={toggle}
                    compact
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Popular Tools ──────────────────────────────────────── */}
          <section id="popular" className="scroll-mt-20 pt-10">
            <SectionHeading
              icon={Sparkles}
              iconBg="#FFF0F3"
              iconColor="#E8607A"
              title="Most Popular"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {popularTools.map((tool) => (
                <ToolCard
                  key={tool.slug}
                  tool={tool}
                  isFavorite={isFavorite(tool.slug)}
                  onToggleFavorite={toggle}
                  featured
                />
              ))}
            </div>
          </section>

          {/* ── Category filter + All Tools ──────────────────────────── */}
          <section className="pt-12">
            {/* Divider */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 border-t border-border" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex-shrink-0">
                All Tools by Category
              </span>
              <div className="flex-1 border-t border-border" />
            </div>

            {/* Category filter chips */}
            <div className="flex flex-wrap gap-2 mb-8">
              <button
                onClick={() => setActiveCategory("all")}
                className={cn(
                  "h-8 px-3.5 rounded-full text-[12px] font-semibold border transition-all duration-150",
                  activeCategory === "all"
                    ? "bg-[#111111] text-white border-[#111111] shadow-sm"
                    : "bg-card text-muted-foreground border-border hover:border-[#A0A0A0] hover:text-foreground"
                )}
              >
                All categories
              </button>
              {categories.map((cat) => {
                const Icon = categoryIcons[cat.id] ?? LayoutGrid;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      "h-8 px-3.5 rounded-full text-[12px] font-semibold border transition-all duration-150 flex items-center gap-1.5"
                    )}
                    style={
                      isActive
                        ? { backgroundColor: cat.color, color: "#fff", borderColor: cat.color }
                        : { backgroundColor: "#fff", color: "#555555", borderColor: "#E4E4E2" }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = cat.color;
                        (e.currentTarget as HTMLButtonElement).style.color = cat.color;
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = cat.lightBg;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "#E4E4E2";
                        (e.currentTarget as HTMLButtonElement).style.color = "#555555";
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#fff";
                      }
                    }}
                  >
                    <Icon className="w-3 h-3 flex-shrink-0" style={isActive ? { color: "#fff" } : { color: cat.color }} />
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Category sections */}
            <div className="space-y-14">
              {filteredCategories.map((cat) => {
                const catTools = getToolsByCategory(cat.id);
                return (
                  <CategorySection
                    key={cat.id}
                    category={cat}
                    tools={catTools}
                    favorites={favorites}
                    onToggleFavorite={toggle}
                  />
                );
              })}
            </div>
          </section>

          {/* ── Footer strip ───────────────────────────────────────── */}
          <div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#FFF0F3] border border-[#FFE0E8] rounded-lg flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-[#E8607A]" />
              </div>
              <span className="text-[13px] font-bold text-foreground">BloomPDF</span>
              <span className="text-[12px] text-muted-foreground">— Professional PDF Workspace</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[12px] text-muted-foreground">
                All {allTools.length} tools free · No sign-up · No watermarks
              </span>
            </div>
          </div>
        </div>
    </div>
  );
}
