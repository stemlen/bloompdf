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
import { getCategoryById } from "@/lib/categories";
import { ThemeToggle } from "./ThemeToggle";

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
      { slug: "merge-pdf",      name: "Merge PDF",       icon: Combine,     description: "Combine multiple PDFs" },
      { slug: "split-pdf",      name: "Split PDF",        icon: Scissors,    description: "Divide into separate files" },
      { slug: "remove-pages",   name: "Remove Pages",     icon: FileMinus,   description: "Delete specific pages" },
      { slug: "extract-pages",  name: "Extract Pages",    icon: FileOutput,  description: "Pull pages into a new PDF" },
      { slug: "organize-pdf",   name: "Organize PDF",     icon: LayoutGrid,  description: "Reorder and rotate pages" },
      { slug: "scan-to-pdf",    name: "Scan to PDF",      icon: Scan,        description: "Images to PDF" },
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
      { slug: "repair-pdf",   name: "Repair PDF",   icon: Wrench,    description: "Fix corrupted PDFs" },
      { slug: "ocr-pdf",      name: "OCR PDF",      icon: ScanText,  description: "Make PDFs searchable" },
    ],
  },
  {
    id: "convert-to",
    label: "Convert to PDF",
    color: "#16A34A",
    lightBg: "#F0FDF4",
    icon: ImageIcon,
    tools: [
      { slug: "jpg-to-pdf",        name: "JPG to PDF",        icon: ImageIcon,       description: "Images to PDF" },
      { slug: "word-to-pdf",       name: "Word to PDF",       icon: FileText,        description: "DOCX to PDF" },
      { slug: "powerpoint-to-pdf", name: "PowerPoint to PDF", icon: Presentation,    description: "PPT to PDF" },
      { slug: "excel-to-pdf",      name: "Excel to PDF",      icon: FileSpreadsheet, description: "Spreadsheets to PDF" },
      { slug: "html-to-pdf",       name: "HTML to PDF",       icon: Globe,           description: "Web pages to PDF" },
    ],
  },
  {
    id: "convert-from",
    label: "Convert from PDF",
    color: "#EA580C",
    lightBg: "#FFF7ED",
    icon: ArrowRightLeft,
    tools: [
      { slug: "pdf-to-jpg",        name: "PDF to JPG",        icon: FileImage,       description: "Export pages as images" },
      { slug: "pdf-to-word",       name: "PDF to Word",       icon: FileEdit,        description: "Edit in Word" },
      { slug: "pdf-to-powerpoint", name: "PDF to PowerPoint", icon: Presentation,    description: "Editable slides" },
      { slug: "pdf-to-excel",      name: "PDF to Excel",      icon: FileSpreadsheet, description: "Extract tables" },
      { slug: "pdf-to-pdfa",       name: "PDF to PDF/A",      icon: Archive,         description: "Long-term archiving" },
    ],
  },
  {
    id: "edit",
    label: "Edit PDF",
    color: "#7C3AED",
    lightBg: "#F5F3FF",
    icon: PenLine,
    tools: [
      { slug: "edit-pdf",          name: "Edit PDF",          icon: PenLine,   description: "Annotate and modify" },
      { slug: "rotate-pdf",        name: "Rotate PDF",        icon: RotateCw,  description: "Rotate pages" },
      { slug: "add-page-numbers",  name: "Add Page Numbers",  icon: Hash,      description: "Insert numbering" },
      { slug: "add-watermark",     name: "Add Watermark",     icon: Droplets,  description: "Stamp branding" },
      { slug: "crop-pdf",          name: "Crop PDF",          icon: Crop,      description: "Trim margins" },
    ],
  },
  {
    id: "security",
    label: "PDF Security",
    color: "#DC2626",
    lightBg: "#FFF1F1",
    icon: Shield,
    tools: [
      { slug: "pdf-forms", name: "PDF Forms", icon: ClipboardList, description: "Fill and create forms" },
    ],
  },
  {
    id: "intelligence",
    label: "PDF Intelligence",
    color: "#4F46E5",
    lightBg: "#EEF2FF",
    icon: Brain,
    tools: [
      { slug: "ocr-pdf", name: "OCR PDF", icon: ScanText, description: "AI text recognition" },
    ],
  },
];

const convertToTools: MegaToolItem[] = [
  { slug: "jpg-to-pdf",        name: "JPG to PDF",        icon: ImageIcon,       description: "Images & photos to PDF" },
  { slug: "word-to-pdf",       name: "Word to PDF",       icon: FileText,        description: ".DOC / .DOCX to PDF" },
  { slug: "powerpoint-to-pdf", name: "PowerPoint to PDF", icon: Presentation,    description: ".PPT / .PPTX to PDF" },
  { slug: "excel-to-pdf",      name: "Excel to PDF",      icon: FileSpreadsheet, description: ".XLS / .XLSX to PDF" },
  { slug: "html-to-pdf",       name: "HTML to PDF",       icon: Globe,           description: "Web pages to PDF" },
];

const convertFromTools: MegaToolItem[] = [
  { slug: "pdf-to-jpg",        name: "PDF to JPG",        icon: FileImage,       description: "Export pages as images" },
  { slug: "pdf-to-word",       name: "PDF to Word",       icon: FileEdit,        description: "Editable .DOCX" },
  { slug: "pdf-to-powerpoint", name: "PDF to PowerPoint", icon: Presentation,    description: "Editable .PPTX slides" },
  { slug: "pdf-to-excel",      name: "PDF to Excel",      icon: FileSpreadsheet, description: "Tables to .XLSX" },
  { slug: "pdf-to-pdfa",       name: "PDF to PDF/A",      icon: Archive,         description: "Archiving standard" },
];

// ─── Mega-menu sub-components ─────────────────────────────────────────────

function ToolLink({ tool, onClick, color, lightBg }: { tool: MegaToolItem; onClick?: () => void; color?: string; lightBg?: string }) {
  const Icon = tool.icon;
  return (
    <Link
      href={`/tools/${tool.slug}`}
      onClick={onClick}
      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted transition-colors group"
    >
      <div 
        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-colors border border-transparent group-hover:shadow-sm"
        style={{ backgroundColor: lightBg || '#F3F3F1' }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: color || '#555555' }} />
      </div>
      <div className="min-w-0">
        <p className="text-[12.5px] font-medium text-foreground leading-tight whitespace-nowrap">
          {tool.name}
        </p>
        {tool.description && (
          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 whitespace-nowrap">
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
  const { query, setQuery, isSearching, results, clear } = useSearch();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const menuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isHome = pathname === "/";

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchExpanded(true);
        setTimeout(() => searchRef.current?.focus(), 50);
        return;
      }
      
      if (e.key === "Escape") {
        setSearchExpanded(false);
        setActiveMenu(null);
        clear();
        searchRef.current?.blur();
        return;
      }

      if (isSearching) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (results.length > 0) {
            const tool = results[selectedIndex];
            if (tool) {
              router.push(`/tools/${tool.slug}`);
              clear();
              setSearchExpanded(false);
              searchRef.current?.blur();
            }
          }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [clear, isSearching, results, selectedIndex, router]);

  const handleMenuEnter = (id: string) => {
    if (menuTimerRef.current) clearTimeout(menuTimerRef.current);
    setActiveMenu(id);
  };

  const handleMenuLeave = () => {
    menuTimerRef.current = setTimeout(() => setActiveMenu(null), 80);
  };

  const handleMenuStay = (id: string) => {
    if (menuTimerRef.current) clearTimeout(menuTimerRef.current);
    setActiveMenu(id);
  };

  const handleSearchClear = useCallback(() => {
    clear();
    setSearchExpanded(false);
  }, [clear]);

  // ─── Nav items ────────────────────────────────────────────────────────

  const navItems = [
    { id: "all-tools",   label: "All PDF Tools" },
    { id: "convert-pdf", label: "Convert PDF"   },
  ];

  return (
    <>
      <nav
        ref={navRef}
        className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
      >
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
          <div className="flex items-center h-[58px] gap-2">

            {/* ── Logo ──────────────────────────────────────────── */}
            <Link
              href="/"
              className="flex items-center gap-2.5 flex-shrink-0 group mr-3"
              aria-label="BloomPDF home"
            >
              <div className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 overflow-hidden bg-[#FFF0F3] border border-[#FFE0E8] group-hover:border-[#FFC5D3] transition-all shadow-sm">
                <Image src="/bloompdf-logo.png" alt="BloomPDF" width={28} height={28} className="object-contain" />
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-[15px] text-foreground tracking-tight leading-none">
                  BloomPDF
                </span>
                <span className="block text-[10px] text-muted-foreground font-medium leading-none mt-0.5">
                  PDF Workspace
                </span>
              </div>
            </Link>

            {/* ── Primary nav items (desktop) ───────────────────── */}
            <div className="hidden lg:flex items-center gap-0.5">
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
                    className={cn(
                      "flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 select-none",
                      activeMenu === item.id
                        ? "text-[#E8607A] bg-[#FFF0F3]"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <span>{item.label}</span>
                    <ChevronDown
                      className={cn(
                        "w-3.5 h-3.5 transition-transform duration-200",
                        activeMenu === item.id ? "rotate-180 text-[#E8607A]" : "text-muted-foreground"
                      )}
                    />
                  </button>
                </div>
              ))}

              {/* Separator */}
              <div className="w-px h-5 bg-[#E4E4E2] mx-1" />

              {/* All Tools link */}
              <Link
                href="/"
                className="px-3 py-2 rounded-lg text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                All Tools
              </Link>
            </div>

            {/* ── Search and Theme (desktop) ──────────────────────────────── */}
            <div className="hidden md:flex items-center gap-2 ml-auto">
              <ThemeToggle />
              <div
                className={cn(
                  "relative transition-all duration-200",
                  searchExpanded ? "w-72" : "w-52"
                )}
              >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input
                  ref={searchRef}
                  id="nav-search"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setSearchExpanded(true)}
                  onBlur={() => { setTimeout(() => { if (!query) setSearchExpanded(false); }, 200); }}
                  placeholder="Search tools…"
                  className="w-full h-9 pl-9 pr-20 bg-muted border border-border rounded-lg text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#E8607A] focus:ring-2 focus:ring-[#E8607A]/10 focus:bg-card transition-all"
                  aria-label="Search PDF tools"
                />
                {isSearching ? (
                  <button
                    onClick={handleSearchClear}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 px-2 flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-card hover:bg-muted rounded-md border border-border transition-colors z-10"
                    aria-label="Clear search"
                  >
                    <X className="w-2.5 h-2.5" />
                    Clear
                  </button>
                ) : (
                  <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border pointer-events-none">
                    ⌘K
                  </kbd>
                )}

                {/* Dropdown Results */}
                {isSearching && searchExpanded && (
                  <div 
                    className="absolute top-full right-0 mt-2 w-[320px] bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in"
                    style={{ boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)" }}
                  >
                    {results.length > 0 ? (
                      <div className="max-h-[360px] overflow-y-auto p-1.5 scrollbar-thin scrollbar-thumb-[#E4E4E2] scrollbar-track-transparent">
                        <div className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                          <span>Search Results</span>
                          <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{results.length} found</span>
                        </div>
                        {results.map((tool, index) => {
                          const Icon = typeof tool.icon === 'string' ? (iconMap[tool.icon] || FileText) : (tool.icon || FileText);
                          const category = getCategoryById(tool.categoryId);
                          const isSelected = index === selectedIndex;
                          return (
                            <Link
                              key={tool.slug}
                              href={`/tools/${tool.slug}`}
                              onClick={() => {
                                clear();
                                setSearchExpanded(false);
                              }}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group",
                                isSelected ? "bg-[#FFF0F3]" : "hover:bg-muted"
                              )}
                              onMouseEnter={() => setSelectedIndex(index)}
                            >
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                                isSelected ? "bg-card border border-[#FFC5D3] shadow-sm" : "group-hover:shadow-sm"
                              )}
                              style={!isSelected ? { backgroundColor: category?.lightBg || '#F3F3F1' } : {}}
                              >
                                <Icon className="w-4 h-4" style={{ color: isSelected ? "#E8607A" : (category?.color || "#555555") }} />
                              </div>
                              <div className="min-w-0">
                                <p className={cn("text-[13px] font-semibold leading-tight", isSelected ? "text-[#E8607A]" : "text-foreground")}>
                                  {tool.name}
                                </p>
                                <p className="text-[11px] text-muted-foreground leading-tight truncate mt-0.5">
                                  {tool.description}
                                </p>
                              </div>
                              {isSelected && (
                                <div className="ml-auto flex items-center gap-1 text-[10px] font-medium text-[#E8607A] bg-card px-1.5 py-0.5 rounded border border-[#FFC5D3]">
                                  Enter ↵
                                </div>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-6 text-center">
                        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                          <Search className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <p className="text-[13px] font-medium text-foreground">No results found</p>
                        <p className="text-[11.5px] text-muted-foreground mt-1">Try a different keyword like &quot;merge&quot; or &quot;convert&quot;</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Mobile buttons ────────────────────────────────── */}
            <div className="flex items-center gap-1 ml-auto lg:hidden">
              <ThemeToggle />
              <button
                onClick={() => { setSearchExpanded((v) => !v); setTimeout(() => searchRef.current?.focus(), 50); }}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Search"
              >
                <Search className="w-[18px] h-[18px]" />
              </button>
              <button
                onClick={() => setMobileOpen((v) => !v)}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
              >
                {mobileOpen ? <X className="w-[18px] h-[18px]" /> : <Menu className="w-[18px] h-[18px]" />}
              </button>
            </div>
          </div>

          {/* ── Mobile search bar ───────────────────────────────── */}
          {searchExpanded && (
            <div className="md:hidden pb-3 animate-fade-in">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search tools…"
                  className="w-full h-10 pl-10 pr-10 bg-muted border border-border rounded-xl text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#E8607A] focus:ring-2 focus:ring-[#E8607A]/10 focus:bg-card"
                  aria-label="Search PDF tools"
                  autoFocus
                />
                {isSearching && (
                  <button onClick={handleSearchClear} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            MEGA MENUS — rendered outside the constrained container so they
            can be full-width. They're still inside the <nav> for correct
            mouseenter/mouseleave scoping.
        ══════════════════════════════════════════════════════════════════ */}

        {/* ── All PDF Tools mega-menu ─────────────────────────────────── */}
        {activeMenu === "all-tools" && (
          <div
            className="absolute left-0 right-0 top-full border-t border-border bg-card shadow-xl animate-fade-in"
            style={{ boxShadow: "0 16px 40px -8px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.04)" }}
            onMouseEnter={() => handleMenuStay("all-tools")}
            onMouseLeave={handleMenuLeave}
            role="menu"
            aria-label="All PDF Tools"
          >
            <div className="max-w-screen-xl mx-auto px-6 py-6">
              {/* Header strip */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#E8607A] flex items-center justify-center">
                    <Layers className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-foreground">All PDF Tools</p>
                    <p className="text-[11px] text-muted-foreground">Everything you need for PDF workflows</p>
                  </div>
                </div>
                <Link
                  href="/"
                  onClick={() => setActiveMenu(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-[#E8607A] hover:bg-[#FFF0F3] transition-colors"
                >
                  Browse all
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Category columns grid */}
              <div className="grid grid-cols-7 gap-1">
                {allPdfCategories.map((cat) => {
                  const CatIcon = cat.icon;
                  return (
                    <div key={cat.id} className="min-w-0">
                      {/* Category header */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 mb-1">
                        <div
                          className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: cat.lightBg }}
                        >
                          <CatIcon className="w-3 h-3" style={{ color: cat.color }} />
                        </div>
                        <span
                          className="text-[11px] font-bold uppercase tracking-wider whitespace-nowrap"
                          style={{ color: cat.color }}
                        >
                          {cat.label}
                        </span>
                      </div>

                      {/* Divider */}
                      <div
                        className="h-px mx-2.5 mb-2 rounded-full"
                        style={{ backgroundColor: cat.lightBg }}
                      />

                      {/* Tools */}
                      <div className="space-y-0.5">
                        {cat.tools.map((tool) => (
                          <ToolLink
                            key={tool.slug}
                            tool={tool}
                            onClick={() => setActiveMenu(null)}
                            color={cat.color}
                            lightBg={cat.lightBg}
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
                  className="ml-auto flex-shrink-0 flex items-center gap-1.5 text-[11px] font-semibold text-[#E8607A] hover:underline"
                >
                  View all {" "} tools <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── Convert PDF mega-menu ────────────────────────────────────── */}
        {activeMenu === "convert-pdf" && (
          <div
            className="absolute left-0 right-0 top-full border-t border-border bg-card shadow-xl animate-fade-in"
            style={{ boxShadow: "0 16px 40px -8px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.04)" }}
            onMouseEnter={() => handleMenuStay("convert-pdf")}
            onMouseLeave={handleMenuLeave}
            role="menu"
            aria-label="Convert PDF"
          >
            <div className="max-w-screen-xl mx-auto px-6 py-6">
              <div className="grid grid-cols-2 gap-8">

                {/* ── Convert TO PDF ─── */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-[#F0FDF4] flex items-center justify-center">
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
                    {convertToTools.map((tool) => {
                      const Icon = tool.icon;
                      return (
                        <Link
                          key={tool.slug}
                          href={`/tools/${tool.slug}`}
                          onClick={() => setActiveMenu(null)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#F0FDF4] transition-colors group"
                        >
                          <div className="w-9 h-9 rounded-xl bg-[#F0FDF4] flex items-center justify-center flex-shrink-0 border border-transparent transition-all shadow-none group-hover:shadow-sm">
                            <Icon className="w-4 h-4 text-[#16A34A]" />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-foreground leading-tight">
                              {tool.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground leading-tight">
                              {tool.description}
                            </p>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-[#C4C4C0] ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* ── Convert FROM PDF ─── */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-[#FFF7ED] flex items-center justify-center">
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
                    {convertFromTools.map((tool) => {
                      const Icon = tool.icon;
                      return (
                        <Link
                          key={tool.slug}
                          href={`/tools/${tool.slug}`}
                          onClick={() => setActiveMenu(null)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#FFF7ED] transition-colors group"
                        >
                          <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] flex items-center justify-center flex-shrink-0 border border-transparent transition-all shadow-none group-hover:shadow-sm">
                            <Icon className="w-4 h-4 text-[#EA580C]" />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-foreground leading-tight">
                              {tool.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground leading-tight">
                              {tool.description}
                            </p>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-[#C4C4C0] ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-5 pt-4 border-t border-border flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-[#F0FDF4] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    All conversions run client-side — no uploads to servers
                  </p>
                </div>
                <Link
                  href="/"
                  onClick={() => setActiveMenu(null)}
                  className="ml-auto flex-shrink-0 flex items-center gap-1 text-[11px] font-semibold text-[#E8607A] hover:underline"
                >
                  All conversion tools <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── Mobile menu ─────────────────────────────────────────────── */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-border bg-card animate-fade-in max-h-[75vh] overflow-y-auto">
            <div className="px-4 py-3 space-y-1">

              {/* Convert to PDF section */}
              <div className="mb-2">
                <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Convert to PDF
                </p>
                {convertToTools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <Link
                      key={tool.slug}
                      href={`/tools/${tool.slug}`}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-[#F0FDF4]"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-[#16A34A]" />
                      </div>
                      <p className="text-[13px] font-semibold text-foreground">{tool.name}</p>
                    </Link>
                  );
                })}
              </div>

              <div className="h-px bg-[#F0F0EF] my-2" />

              {/* Convert from PDF section */}
              <div className="mb-2">
                <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Convert from PDF
                </p>
                {convertFromTools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <Link
                      key={tool.slug}
                      href={`/tools/${tool.slug}`}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-[#FFF7ED]"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#FFF7ED] flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-[#EA580C]" />
                      </div>
                      <p className="text-[13px] font-semibold text-foreground">{tool.name}</p>
                    </Link>
                  );
                })}
              </div>

              <div className="h-px bg-[#F0F0EF] my-2" />

              {/* All tools link */}
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-muted"
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-[13px] font-semibold text-foreground">All PDF Tools</p>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Spacer */}
      <div className="h-[58px]" aria-hidden />
    </>
  );
}
