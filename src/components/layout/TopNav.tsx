"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  Search,
  X,
  Menu,
  ChevronDown,
  ExternalLink,
  // All PDF Tools / category icons
  LayoutGrid,
  Scissors,
  FileMinus,
  FileOutput,
  Scan,
  Minimize2,
  Wrench,
  ScanText,
  Image as ImageIcon,
  Globe,
  FileImage,
  FileEdit,
  Presentation,
  FileSpreadsheet,
  Archive,
  PenLine,
  RotateCw,
  Hash,
  Droplets,
  Crop,
  ClipboardList,
  Combine,
  ArrowRightLeft,
  // Convert PDF nav icons
  ArrowRight,
  Layers,
  RefreshCw,
  Shield,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearch } from "@/lib/hooks/useSearch";
import type { LucideIcon } from "lucide-react";
import { getCategoryById, getCategoryBgStyle } from "@/lib/categories";
import { ToolIcon } from "@/components/icons/ToolIcons";
import { getToolUrl } from "@/lib/tools";
import { ThemeToggle } from "./ThemeToggle";

function CustomEditIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12.75 4.75L15.25 7.25L7.5 15H5V12.5L12.75 4.75Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11 6.5L13.5 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface MegaToolItem {
  slug: string;
  name: string;
  icon: LucideIcon;
  description?: string;
}

interface MegaCategory {
  id: string;
  label: string;
  color: string;
  lightBg: string;
  icon: LucideIcon;
  tools: MegaToolItem[];
}

// ─── Data ────────────────────────────────────────────────────────────────────

const iconMap: Record<string, LucideIcon> = {
  Combine, Scissors, FileMinus, FileOutput, LayoutGrid, Scan,
  Minimize2, Wrench, ScanText, Image: ImageIcon, FileText,
  FileSpreadsheet, Globe, FileImage, FileEdit, Presentation,
  Archive, PenLine, RotateCw, Hash, Droplets, Crop, ClipboardList,
};

const allPdfCategories: MegaCategory[] = [
  {
    id: "organize",
    label: "Organize PDF",
    color: "#2563EB",
    lightBg: "#EFF6FF",
    icon: LayoutGrid,
    tools: [
      { slug: "merge-pdf", name: "Merge PDF", icon: Combine, description: "Combine multiple PDFs" },
      { slug: "split-pdf", name: "Split PDF", icon: Scissors, description: "Divide into separate files" },
      { slug: "remove-pages", name: "Remove Pages", icon: FileMinus, description: "Delete specific pages" },
      { slug: "extract-pages", name: "Extract Pages", icon: FileOutput, description: "Pull pages into a new PDF" },
      { slug: "organize-pdf", name: "Organize PDF", icon: LayoutGrid, description: "Reorder and rotate pages" },
      { slug: "scan-to-pdf", name: "Scan to PDF", icon: Scan, description: "Images to PDF" },
    ],
  },
  {
    id: "optimize",
    label: "Optimize PDF",
    color: "#0D9488",
    lightBg: "#F0FDFA",
    icon: Minimize2,
    tools: [
      { slug: "compress-pdf", name: "Compress PDF", icon: Minimize2, description: "Reduce file size" },
      { slug: "repair-pdf", name: "Repair PDF", icon: Wrench, description: "Fix damaged files" },
      { slug: "ocr-pdf", name: "OCR PDF", icon: ScanText, description: "Recognize text in scans" },
    ],
  },
  {
    id: "convert-to",
    label: "Convert to PDF",
    color: "#16A34A",
    lightBg: "#F0FDF4",
    icon: ImageIcon,
    tools: [
      { slug: "jpg-to-pdf", name: "JPG to PDF", icon: ImageIcon, description: "Images to PDF" },
      { slug: "word-to-pdf", name: "Word to PDF", icon: FileText, description: "DOCX to PDF" },
      { slug: "excel-to-pdf", name: "Excel to PDF", icon: FileSpreadsheet, description: "XLSX to PDF" },
      { slug: "powerpoint-to-pdf", name: "PowerPoint to PDF", icon: Presentation, description: "PPTX to PDF" },
      { slug: "html-to-pdf", name: "HTML to PDF", icon: Globe, description: "Webpages to PDF" },
      { slug: "markdown-to-pdf", name: "Markdown to PDF", icon: FileEdit, description: "MD to PDF" },
      { slug: "text-to-pdf", name: "Text to PDF", icon: FileText, description: "TXT to PDF" },
    ],
  },
  {
    id: "convert-from",
    label: "Convert from PDF",
    color: "#EA580C",
    lightBg: "#FFF7ED",
    icon: ArrowRight,
    tools: [
      { slug: "pdf-to-jpg", name: "PDF to JPG", icon: FileImage, description: "Extract images" },
      { slug: "pdf-to-word", name: "PDF to Word", icon: FileText, description: "Editable .DOCX" },
      { slug: "pdf-to-powerpoint", name: "PDF to PowerPoint", icon: Presentation, description: "Editable .PPTX" },
      { slug: "pdf-to-excel", name: "PDF to Excel", icon: FileSpreadsheet, description: "Tables to .XLSX" },
    ],
  },
  {
    id: "edit",
    label: "Edit PDF",
    color: "#7C3AED",
    lightBg: "#F5F3FF",
    icon: PenLine,
    tools: [
      { slug: "edit-pdf", name: "Edit PDF", icon: PenLine, description: "Add text, shapes & annotations" },
      { slug: "rotate-pdf", name: "Rotate PDF", icon: RotateCw, description: "Rotate page orientation" },
      { slug: "add-page-numbers", name: "Page Numbers", icon: Hash, description: "Insert page numbers" },
      { slug: "add-watermark", name: "Add Watermark", icon: Droplets, description: "Text or image watermark" },
      { slug: "crop-pdf", name: "Crop PDF", icon: Crop, description: "Trim page margins" },
    ],
  },
  {
    id: "security",
    label: "PDF Security",
    color: "#DC2626",
    lightBg: "#FFF1F1",
    icon: Shield,
    tools: [
      { slug: "protect-pdf", name: "Protect PDF", icon: Shield, description: "Add password protection" },
      { slug: "unlock-pdf", name: "Unlock PDF", icon: Shield, description: "Remove password" },
      { slug: "pdf-forms", name: "PDF Forms", icon: ClipboardList, description: "Fill out forms" },
    ],
  },
  {
    id: "intelligence",
    label: "PDF Intelligence",
    color: "#4F46E5",
    lightBg: "#EEF2FF",
    icon: Brain,
    tools: [
      { slug: "ocr-pdf", name: "OCR Recognition", icon: ScanText, description: "Extract selectable text" },
    ],
  },
];

// ─── Mega-menu sub-components ─────────────────────────────────────────────

function ToolLink({ tool, onClick, catId }: { tool: MegaToolItem; onClick?: () => void; color?: string; catId?: string }) {
  const category = catId ? getCategoryById(catId) : undefined;
  return (
    <Link
      href={getToolUrl(tool.slug)}
      onClick={onClick}
      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted transition-colors group min-w-0"
    >
      <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
        <ToolIcon slug={tool.slug} size={24} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-medium text-foreground leading-tight truncate">
          {tool.name}
        </p>
        {tool.description && (
          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate" title={tool.description}>
            {tool.description}
          </p>
        )}
      </div>
    </Link>
  );
}

// ─── Main component ───────────────────────────────────────────────────────

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { query: searchQuery, setQuery: setSearchQuery, results, isSearching, clear } = useSearch();
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Close menus on path change
  useEffect(() => {
    setActiveMenu(null);
    setMobileOpen(false);
    setSearchExpanded(false);
  }, [pathname]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
        setSearchExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation for search dropdown & Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchExpanded((prev) => {
          if (!prev) {
            setTimeout(() => searchInputRef.current?.focus(), 50);
          }
          return !prev;
        });
        return;
      }
      if (e.key === "Escape") {
        setSearchExpanded(false);
        setActiveMenu(null);
      }
      if (searchExpanded && results.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % results.length);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        } else if (e.key === "Enter") {
          e.preventDefault();
          const target = results[selectedIndex];
          if (target) {
            router.push(`/tools/${target.slug}`);
            setSearchExpanded(false);
            clear();
          }
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchExpanded, results, selectedIndex, router, clear]);

  const handleMenuEnter = (id: string) => {
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    setActiveMenu(id);
  };

  const handleMenuLeave = () => {
    leaveTimeoutRef.current = setTimeout(() => {
      setActiveMenu(null);
    }, 150);
  };

  // ─── Nav items ────────────────────────────────────────────────────────

  const navItems = [
    { id: "all-tools", label: "All PDF Tools" },
    { id: "convert-pdf", label: "Convert PDF" },
  ];

  return (
    <>
      <nav
        ref={navRef}
        className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border shadow-xs"
      >
        <div className="max-w-screen-xl mx-auto px-1 sm:px-4 md:px-6">
          <div className="flex items-center h-[58px] gap-2">

            {/* ── Logo ──────────────────────────────────────────── */}
            <Link
              href="/"
              className="flex items-center flex-shrink-0 -ml-2 sm:-ml-1 mr-3 sm:mr-6 overflow-visible"
              aria-label="BloomPDF home"
            >
              <Image
                src="/BloomPDF.png"
                alt="BloomPDF"
                width={320}
                height={90}
                className="h-16 sm:h-20 w-auto object-contain scale-150 origin-left"
                priority
              />
            </Link>

            {/* ── Primary nav items (desktop & tablet) ───────────────────── */}
            <div className="hidden md:flex items-center gap-0.5">
              {navItems.map((item) => (
                <div
                  key={item.id}
                  className="relative"
                  onMouseEnter={() => handleMenuEnter(item.id)}
                  onMouseLeave={handleMenuLeave}
                >
                  <button
                    aria-haspopup="true"
                    aria-expanded={activeMenu === item.id}
                    onClick={() => setActiveMenu((prev) => (prev === item.id ? null : item.id))}
                    className={cn(
                      "flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 select-none cursor-pointer",
                      activeMenu === item.id
                        ? "bg-muted text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                    )}
                  >
                    <span>{item.label}</span>
                    <ChevronDown
                      className={cn(
                        "w-3.5 h-3.5 transition-transform duration-200 opacity-60",
                        activeMenu === item.id && "rotate-180 opacity-100"
                      )}
                    />
                  </button>
                </div>
              ))}
              <a
                href="https://editor.bloompdf.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all duration-150 flex items-center gap-1.5"
              >
                <CustomEditIcon className="w-4 h-4" />
                <span>PDF Editor</span>
              </a>
              <Link
                href="/about"
                className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all duration-150"
              >
                About Us
              </Link>
              <Link
                href="/blog"
                className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all duration-150"
              >
                Blog
              </Link>
              <Link
                href="/contact"
                className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all duration-150"
              >
                Contact
              </Link>
            </div>

            {/* ── Search bar (desktop) ─────────────────────────── */}
            <div className="flex-1 max-w-sm mx-auto relative hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search tools… (⌘K)"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (!searchExpanded) setSearchExpanded(true);
                    setSelectedIndex(0);
                  }}
                  onFocus={() => setSearchExpanded(true)}
                  className="w-full h-9 pl-9 pr-8 bg-muted/60 border border-border rounded-xl text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-border transition-all"
                />
                {searchQuery ? (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      clear();
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full text-muted-foreground hover:text-foreground flex items-center justify-center"
                    aria-label="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                ) : (
                  <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground bg-card border border-border rounded shadow-2xs pointer-events-none">
                    ⌘K
                  </kbd>
                )}
              </div>

              {/* ── Search dropdown results ────────────────────── */}
              {searchExpanded && searchQuery.trim().length > 0 && (
                <div
                  className="absolute top-full left-0 right-0 mt-2 bg-card rounded-2xl border border-border shadow-lg overflow-hidden z-50 animate-scale-in"
                >
                  <div className="p-2 max-h-[380px] overflow-y-auto">
                    {results.length > 0 ? (
                      <div className="space-y-0.5">
                        {results.map((tool, index) => {
                          const category = getCategoryById(tool.categoryId);
                          const Icon = iconMap[tool.icon] ?? FileText;
                          const isSelected = index === selectedIndex;
                          return (
                            <Link
                              key={tool.slug}
                              href={getToolUrl(tool.slug)}
                              onClick={() => {
                                clear();
                                setSearchExpanded(false);
                              }}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group",
                                isSelected ? "bg-primary/10" : "hover:bg-muted"
                              )}
                              onMouseEnter={() => setSelectedIndex(index)}
                            >
                              <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
                                <ToolIcon slug={tool.slug} size={28} />
                              </div>
                              <div className="min-w-0">
                                <p className={cn("text-[13px] font-semibold leading-tight", isSelected ? "text-primary" : "text-foreground")}>
                                  {tool.name}
                                </p>
                                <p className="text-[11px] text-muted-foreground leading-tight truncate mt-0.5">
                                  {tool.description}
                                </p>
                              </div>
                              {isSelected && (
                                <div className="ml-auto flex items-center gap-1 text-[10px] font-medium text-primary bg-card px-1.5 py-0.5 rounded border border-primary/30">
                                  Enter ↵
                                </div>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-6 text-center">
                        <p className="text-[13px] font-medium text-foreground">No tools found</p>
                        <p className="text-[12px] text-muted-foreground mt-1">Try searching for &quot;merge&quot;, &quot;compress&quot;, or &quot;convert&quot;</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right side items ────────────────────────────── */}
            <div className="flex items-center gap-1.5 ml-auto">
              <ThemeToggle />

              {/* Mobile menu trigger */}
              <button
                onClick={() => setMobileOpen((prev) => !prev)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted md:hidden transition-colors"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            MEGA DROPDOWNS (Desktop)
        ══════════════════════════════════════════════════════════════════ */}

        {/* ── 1. ALL PDF TOOLS MEGA MENU ─────────────────────────────── */}
        {activeMenu === "all-tools" && (
          <div
            onMouseEnter={() => handleMenuEnter("all-tools")}
            onMouseLeave={handleMenuLeave}
            className="absolute top-full left-0 right-0 bg-card border-b border-border shadow-2xl z-50 animate-fade-in max-h-[85vh] overflow-y-auto"
          >
            <div className="max-w-screen-xl mx-auto px-6 py-6">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
                <div>
                  <h3 className="text-[14px] font-bold text-foreground tracking-tight">All PDF Tools</h3>
                  <p className="text-[12px] text-muted-foreground">Complete suite of online document utilities</p>
                </div>
                <Link
                  href="/"
                  onClick={() => setActiveMenu(null)}
                  className="flex items-center gap-1 text-[12px] font-bold text-primary hover:text-primary/80 transition-colors"
                >
                  Browse all
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Category columns grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4 xl:gap-2">
                {allPdfCategories.map((cat) => {
                  const CatIcon = cat.icon;
                  const category = getCategoryById(cat.id);
                  return (
                    <div key={cat.id} className="min-w-0">
                      {/* Category header */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 mb-1">
                        <div
                          className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                          style={getCategoryBgStyle(category)}
                        >
                          <CatIcon className="w-3 h-3" style={{ color: cat.color }} />
                        </div>
                        <span
                          className="text-[11px] font-bold uppercase tracking-wider truncate"
                          style={{ color: cat.color }}
                        >
                          {cat.label}
                        </span>
                      </div>

                      {/* Divider */}
                      <div
                        className="h-px mx-2.5 mb-2 rounded-full border-t border-border/50"
                      />

                      {/* Tools */}
                      <div className="space-y-0.5">
                        {cat.tools.map((tool) => (
                          <ToolLink
                            key={tool.slug}
                            tool={tool}
                            onClick={() => setActiveMenu(null)}
                            color={cat.color}
                            catId={cat.id}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer bar */}
              <div className="mt-5 pt-4 border-t border-border flex items-center gap-6">
                <p className="text-[11px] text-muted-foreground">
                  All processing is done locally in your browser — your files never leave your device.
                </p>
                <Link
                  href="/"
                  onClick={() => setActiveMenu(null)}
                  className="ml-auto flex-shrink-0 flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline"
                >
                  View all tools <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── Convert PDF mega-menu ────────────────────────────────────── */}
        {activeMenu === "convert-pdf" && (
          <div
            className="absolute left-0 right-0 top-full border-b border-border bg-card shadow-2xl z-50 animate-fade-in"
            onMouseEnter={() => handleMenuEnter("convert-pdf")}
            onMouseLeave={handleMenuLeave}
            role="menu"
            aria-label="Convert PDF"
          >
            <div className="max-w-screen-xl mx-auto px-6 py-6">
              <div className="grid grid-cols-2 gap-8">

                {/* ── Convert TO PDF ─── */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <ArrowRight className="w-3.5 h-3.5 text-[#16A34A]" />
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-[#16A34A] uppercase tracking-wider">
                        Convert to PDF
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Transform any format into PDF
                      </p>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    {(allPdfCategories.find((c) => c.id === "convert-to")?.tools || []).map((tool) => {
                      return (
                        <Link
                          key={tool.slug}
                          href={`/tools/${tool.slug}`}
                          onClick={() => setActiveMenu(null)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors group"
                        >
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0 border border-transparent transition-all shadow-none group-hover:shadow-sm p-1">
                            <ToolIcon slug={tool.slug} size={28} />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-foreground leading-tight">
                              {tool.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground leading-tight">
                              {tool.description}
                            </p>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* ── Convert FROM PDF ─── */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <RefreshCw className="w-3.5 h-3.5 text-[#EA580C]" />
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-[#EA580C] uppercase tracking-wider">
                        Convert from PDF
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Export PDF to any format
                      </p>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    {(allPdfCategories.find((c) => c.id === "convert-from")?.tools || []).map((tool) => {
                      return (
                        <Link
                          key={tool.slug}
                          href={`/tools/${tool.slug}`}
                          onClick={() => setActiveMenu(null)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors group"
                        >
                          <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0 border border-transparent transition-all shadow-none group-hover:shadow-sm p-1">
                            <ToolIcon slug={tool.slug} size={28} />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-foreground leading-tight">
                              {tool.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground leading-tight">
                              {tool.description}
                            </p>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-5 pt-4 border-t border-border flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    All conversions run client-side — no uploads to servers
                  </p>
                </div>
                <Link
                  href="/"
                  onClick={() => setActiveMenu(null)}
                  className="ml-auto flex-shrink-0 flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                >
                  All conversion tools <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── Mobile menu ─────────────────────────────────────────────── */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-card animate-fade-in max-h-[80vh] overflow-y-auto z-50 shadow-2xl">
            <div className="px-4 py-4 space-y-4">
              <div className="pb-2 border-b border-border space-y-2">
                <a
                  href="https://editor.bloompdf.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-muted/70 hover:bg-muted text-foreground font-semibold text-[13.5px] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <CustomEditIcon className="w-4.5 h-4.5" />
                    <span>PDF Editor</span>
                  </span>
                </a>
                <Link
                  href="/about"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-muted text-foreground font-bold text-[13.5px]"
                >
                  <span>About BloomPDF & Stemlen</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              {allPdfCategories.map((cat) => {
                const category = getCategoryById(cat.id);
                return (
                  <div key={cat.id} className="space-y-1">
                    <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground" style={{ color: cat.color }}>
                      {cat.label}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {cat.tools.map((tool) => (
                        <Link
                          key={tool.slug}
                          href={getToolUrl(tool.slug)}
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl transition-colors hover:bg-muted"
                        >
                          <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
                            <ToolIcon slug={tool.slug} size={28} />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-foreground leading-snug">{tool.name}</p>
                            {tool.description && (
                              <p className="text-[11px] text-muted-foreground leading-snug truncate">{tool.description}</p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
