"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Upload,
  Download,
  Loader2,
  AlertCircle,
  Edit3,
  Eye,
  Columns,
  FileText,
  CheckCircle2,
  Printer,
  Sparkles,
  Copy,
  Trash2,
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  List,
  ListOrdered,
  CheckSquare,
  Table as TableIcon,
  Link2,
  Minus,
  Palette,
  Sliders,
  Maximize2,
  ZoomIn,
  ZoomOut,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  THEME_CONFIGS,
  getThemeStyles,
  renderMarkdownToHtml,
  type MarkdownTheme,
  type PageFormat,
  type PageOrientation,
  type PageMargin,
} from "@/lib/markdownStyles";
import {
  convertMarkdownToPdfBlob,
  printMarkdownDocument,
  downloadPdfBlob,
} from "@/lib/markdownPdfConverter";
import { renderMermaidInElement } from "@/lib/mermaidRenderer";

// ─── Preset Templates ─────────────────────────────────────────────────────────

const SAMPLE_TEMPLATES: Record<string, { label: string; description: string; content: string }> = {
  readme: {
    label: "Project README",
    description: "Standard GitHub documentation layout",
    content: `# 🚀 BloomPDF: Next-Gen PDF Studio

A high-performance, client-side PDF utility suite designed for developers, teams, and professionals.

## ✨ Key Features

- **⚡ Blazing Fast**: Processes documents directly inside your browser with instant responsiveness.
- **🔒 Privacy First**: Your files never leave your device and are never uploaded to third-party servers.
- **🎨 Beautiful Styling**: Full support for GitHub-Flavored Markdown, code syntax highlighting, and custom themes.
- **📄 Multi-Page Output**: Seamless automatic pagination formatted for standard A4 and US Letter sizes.

## 📦 Quick Start Example

\`\`\`typescript
import { convertMarkdownToPdf } from "@/lib/bloompdf";

async function generateReport() {
  const pdfBytes = await convertMarkdownToPdf("# Hello World", {
    theme: "github",
    pageSize: "A4",
  });
  console.log("PDF generated successfully! Size:", pdfBytes.length);
}
\`\`\`

## 📊 Performance Benchmarks

| Operation | Client-Side Engine | Legacy Serverless | Status |
| :--- | :--- | :--- | :--- |
| **Markdown to PDF** | \`< 120 ms\` | \`< 450 ms\` | 🟢 Optimal |
| **Merge Documents** | \`< 85 ms\` | \`< 300 ms\` | 🟢 Optimal |
| **Split & Reorder** | \`< 40 ms\` | \`< 180 ms\` | 🟢 Optimal |

## 📝 Roadmap & Tasks

- [x] Client-side vector & canvas PDF generator
- [x] Live side-by-side Markdown preview
- [x] Multi-theme document presets (Academic, Obsidian, Minimalist, Crimson)
- [ ] Custom watermark and digital signature stamp

---
*Built with ❤️ for privacy, speed, and design excellence.*
`,
  },
  architecture: {
    label: "Architecture & Diagrams",
    description: "Mermaid sequence diagrams and system flows",
    content: `# 5. The Event-Driven "Sleep & Wake-Up" Lifecycle

The system avoids burning CPU cycles or token costs while waiting for long-running sub-agent operations:

\`\`\`mermaid
sequenceDiagram
  autonumber
  actor User as Human User
  participant PA as Personal Agent (Grok 4.6)
  participant DB as Appwrite DB / Redis
  participant Sub as QA / Coder Sub-Agent
  participant TestMu as TestMu AI / GitHub

  User->>PA: "Fix mobile sidebar overflow and test it"
  PA->>DB: Create SubAgent Run (Parent: PA.id)
  PA->>DB: Set PA Status = "waiting_for_subagent"
  PA->>DB: Save state & PA goes to SLEEP ($0 cost)

  Sub->>TestMu: Execute code patch & run cloud browser test
  TestMu-->>Sub: Return test video & 0 regression report
  Sub->>DB: Update SubAgent Status = "completed"

  DB-->>PA: Wake-up Event via Redis pub/sub
  PA->>User: "Fix complete & verified"
\`\`\`

## 6. Sub-Agent Hierarchy & Execution Flow

Each sub-agent runs with **Strict Least-Privilege Tool Scoping**:

\`\`\`mermaid
flowchart TD
  Planner[🧠 Planner Agent] -->|Decomposes Spec| Builder[🛠️ Builder / Coder]
  Builder -->|Generates Patch| QA[🧪 QA / Tester Agent]
  QA -->|Validates Proof| Reviewer[🔍 Reviewer Agent]
  Reviewer -->|Approved| Deploy[🚀 Production Deploy]
  QA -.->|Fails Test| Builder
\`\`\`

---

## 12. Verification & Acceptance Criteria

| Phase | Milestone / Verification Standard | Status Indicator |
| :--- | :--- | :--- |
| **Phase 1** | Daily Briefing renders in \`< 800ms\` on login with accurate role priorities. | 🟢 Ready |
| **Phase 2** | Personal Agent spawns Sub-Agent, goes to sleep, and wakes up on callback. | 🟢 Ready |
| **Phase 3** | Personal Agent verifies diff, rejects bad code, and auto-approves safe fixes. | 🟢 Ready |
| **Phase 4** | Coder Sub-Agent stages code and opens a clean GitHub Pull Request. | 🟢 Ready |
`,
  },
  report: {
    label: "Technical Report",
    description: "Formal engineering & research document",
    content: `# Technical Architecture & Performance Report

**Document Version:** 2.4.0  
**Status:** Approved for Production  
**Date:** September 2026  

---

## 1. Executive Summary

This document describes the architectural transition of the document processing pipeline to a **zero-trust, client-first runtime**. By executing PDF generation directly within the client browser, we eliminate backend rendering bottlenecks, reduce server operating costs to zero, and guarantee 100% data confidentiality.

## 2. Telemetry & Query Metrics

\`\`\`sql
-- Query document processing telemetry by engine type
SELECT 
    engine_type,
    COUNT(*) AS total_conversions,
    AVG(duration_ms) AS avg_duration_ms,
    ROUND(SUM(bytes_saved) / 1024 / 1024, 2) AS mb_saved
FROM document_metrics
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY engine_type
ORDER BY total_conversions DESC;
\`\`\`

> **Security Guarantee:** All document manipulations are performed within memory-safe contexts. No document payload is ever transmitted over network interfaces.

## 3. System Benchmarks

| Metric | Target SLA | Measured Value | Variance |
| :--- | :--- | :--- | :--- |
| **Time to First Page** | \`< 250 ms\` | \`92 ms\` | \`-63%\` |
| **Peak Memory Allocation** | \`< 64 MB\` | \`38 MB\` | \`-40%\` |
| **Export Fidelity Score** | \`> 99.5%\` | \`99.9%\` | \`+0.4%\` |

## 4. Next Action Items

- [x] Implement multi-page smart canvas slicing
- [x] Verify dimensional compliance across A4, US Letter, and Legal formats
- [ ] Add automated PDF/A archival compliance verification
`,
  },
  resume: {
    label: "Resume / CV",
    description: "Clean modern professional curriculum vitae",
    content: `# Alex Morgan
**Senior Software Architect & Full-Stack Engineer**  
📧 alex.morgan@example.com · 📱 +1 (555) 019-2834 · 🌐 linkedin.com/in/alexmorgan · 📍 San Francisco, CA

---

## Executive Summary
Results-driven Software Architect with 8+ years of expertise designing high-throughput web applications, developer platforms, and client-side tooling. Proven track record of scaling developer products to millions of active monthly users.

## Core Technical Skills
- **Languages:** TypeScript, JavaScript, Python, Rust, Go, SQL, HTML5/CSS3
- **Frameworks & Libraries:** React, Next.js, Node.js, Tailwind CSS, pdf-lib, WebAssembly
- **Cloud & Infrastructure:** Cloudflare Pages, Docker, AWS, Kubernetes, GitHub Actions

---

## Professional Experience

### **Principal Software Engineer** · Bloom Technologies
*January 2023 – Present · San Francisco, CA*
- Led the complete re-architecture of the client-side PDF document engine, reducing end-to-end rendering time by **64%**.
- Designed and released 25+ browser-native document tools serving over 150,000 daily active users.
- Mentored a distributed team of 14 engineers across frontend, core algorithms, and security.

### **Senior Full-Stack Developer** · CloudForge Systems
*June 2020 – December 2022 · New York, NY*
- Engineered real-time collaborative document editor with sub-50ms peer-to-peer sync.
- Reduced production bundle size by 48% via tree-shaking and aggressive code splitting.

---

## Education & Certifications
- **B.S. in Computer Science** — University of California, Berkeley (2016 – 2020)
- **AWS Certified Solutions Architect – Professional** (2022)
`,
  },
  meeting: {
    label: "Meeting Minutes",
    description: "Structured agenda, notes, and task items",
    content: `# Weekly Engineering Sync Minutes

**Date:** September 2, 2026 · **Time:** 10:00 AM – 11:00 AM EST  
**Chair:** Alex Morgan · **Recorder:** Marcus Vance  
**Attendees:** Alex Morgan, Sarah Chen, David Kim, Elena Rostova, Marcus Vance  

---

## 🎯 Key Objectives
1. Review Markdown-to-PDF client engine rollout.
2. Confirm performance metrics across mobile and desktop browsers.
3. Assign sprint deliverables for upcoming v2.5 release.

## 📋 Discussion & Key Decisions

### 1. Client-Side Rendering vs Backend Service
- The client-side \`pdf-lib\` + Canvas pipeline completely removes server errors and permission issues.
- Native browser print styling enables lossless, searchable vector exports.

### 2. Multi-Theme Document Support
- Five standard themes (*GitHub Classic*, *Academic Serif*, *Obsidian Void*, *Minimalist Clean*, *Crimson Editorial*) have been validated across standard A4 and US Letter sheets.

---

## ✅ Action Items

- [x] Complete split-view live preview synchronization (*Marcus*)
- [x] Finalize formatting toolbar shortcuts (*Elena*)
- [ ] Integrate custom page header and page number options (*David*)
- [ ] Prepare release announcement and changelog (*Sarah*)

---
*Next sync scheduled for Wednesday, September 9, 2026 at 10:00 AM EST.*
`,
  },
};

// ─── Main Component ──────────────────────────────────────────────────────────

export function MarkdownToPdfTool() {
  const [markdown, setMarkdown] = useState<string>(SAMPLE_TEMPLATES.readme.content);
  const [viewMode, setViewMode] = useState<"split" | "write" | "preview">("split");
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);

  // Document Styling Options
  const [theme, setTheme] = useState<MarkdownTheme>("github");
  const [pageSize, setPageSize] = useState<PageFormat>("A4");
  const [orientation, setOrientation] = useState<PageOrientation>("portrait");
  const [margins, setMargins] = useState<PageMargin>("medium");
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");
  const [showPageNumbers, setShowPageNumbers] = useState<boolean>(true);
  const [headerTitle, setHeaderTitle] = useState<string>("");
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Conversion state
  const [converting, setConverting] = useState(false);
  const [convertProgress, setConvertProgress] = useState<{ pct: number; stage: string }>({ pct: 0, stage: "" });
  const [converted, setConverted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Live HTML Render
  const htmlPreview = useMemo(() => {
    return renderMarkdownToHtml(markdown);
  }, [markdown]);

  // Render Mermaid diagrams into SVGs inside preview container
  useEffect(() => {
    if (previewContainerRef.current && (viewMode === "preview" || viewMode === "split")) {
      const timer = setTimeout(() => {
        if (previewContainerRef.current) {
          renderMermaidInElement(previewContainerRef.current, theme);
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [htmlPreview, theme, viewMode]);

  // CSS Stylesheet for current theme
  const currentThemeCss = useMemo(() => {
    return getThemeStyles(theme, fontSize);
  }, [theme, fontSize]);

  // Stats
  const stats = useMemo(() => {
    const chars = markdown.length;
    const words = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
    const lines = markdown.split("\n").length;
    const estimatedPages = Math.max(1, Math.ceil(words / 450));
    return { chars, words, lines, estimatedPages };
  }, [markdown]);

  // ─── File Upload & Drag & Drop ─────────────────────────────────────────────

  const readFile = (file: File) => {
    const ext = file.name.toLowerCase();
    if (!ext.endsWith(".md") && !ext.endsWith(".markdown") && !ext.endsWith(".txt")) {
      setError("Please upload a .md, .markdown, or .txt file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setMarkdown(text);
      setFileInfo({ name: file.name, size: file.size });
      setHeaderTitle(file.name.replace(/\.(md|markdown|txt)$/i, ""));
      setError(null);
      setConverted(false);
    };
    reader.onerror = () => setError("Failed to read file.");
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  };

  // ─── Editor Formatting Shortcuts ──────────────────────────────────────────

  const insertText = useCallback((prefix: string, suffix: string = "", placeholder: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = markdown.slice(start, end) || placeholder;

    const newText =
      markdown.slice(0, start) +
      prefix +
      selectedText +
      suffix +
      markdown.slice(end);

    setMarkdown(newText);
    setConverted(false);

    // Re-focus and set selection
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + selectedText.length;
      textarea.setSelectionRange(
        start + prefix.length,
        selectedText ? newCursorPos : start + prefix.length
      );
    }, 10);
  }, [markdown]);

  // ─── Conversion Actions ───────────────────────────────────────────────────

  const handleConvertDownload = async () => {
    if (!markdown.trim()) {
      setError("Please write or upload some Markdown content first.");
      return;
    }
    setConverting(true);
    setConverted(false);
    setError(null);
    setConvertProgress({ pct: 5, stage: "Starting conversion..." });

    try {
      const blob = await convertMarkdownToPdfBlob(markdown, {
        theme,
        pageSize,
        orientation,
        margins,
        fontSize,
        showPageNumbers,
        headerTitle: headerTitle.trim() || undefined,
        onProgress: (pct, stage) => setConvertProgress({ pct, stage }),
      });

      if (blob) {
        const filename = fileInfo
          ? fileInfo.name.replace(/\.(md|markdown|txt)$/i, ".pdf")
          : headerTitle.trim()
          ? `${headerTitle.trim().toLowerCase().replace(/\s+/g, "_")}.pdf`
          : `document_${Date.now()}.pdf`;

        downloadPdfBlob(blob, filename);
        setConverted(true);
        setTimeout(() => setConverted(false), 4000);
      }
    } catch (err) {
      console.warn("Direct blob generation failed, seamlessly falling back to vector print preview:", err);
      setConvertProgress({ pct: 100, stage: "Opening Print / Save Vector PDF..." });
      try {
        await printMarkdownDocument(markdown, {
          theme,
          pageSize,
          orientation,
          margins,
          fontSize,
          headerTitle: headerTitle.trim() || "Markdown Document",
        });
        setConverted(true);
        setTimeout(() => setConverted(false), 4000);
      } catch (printErr) {
        console.error("Print fallback error:", printErr);
        setError("Failed to open PDF export. Please click 'Print / Vector' to save as PDF.");
      }
    } finally {
      setConverting(false);
    }
  };

  const handlePrintVector = async () => {
    if (!markdown.trim()) {
      setError("Please write or upload some Markdown content first.");
      return;
    }
    try {
      await printMarkdownDocument(markdown, {
        theme,
        pageSize,
        orientation,
        margins,
        fontSize,
        headerTitle: headerTitle.trim() || "Markdown Document",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open print preview.");
    }
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileInfo ? fileInfo.name : "document.md";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear the editor?")) {
      setMarkdown("");
      setFileInfo(null);
      setHeaderTitle("");
      setConverted(false);
      setError(null);
    }
  };

  // Dimensions for Preview Sheet Display
  const sheetDimensions = useMemo(() => {
    let w = pageSize === "A4" ? 794 : pageSize === "Letter" ? 816 : 816; // 96 DPI approximation
    let h = pageSize === "A4" ? 1123 : pageSize === "Letter" ? 1056 : 1344;
    if (orientation === "landscape") {
      const t = w;
      w = h;
      h = t;
    }
    return { width: w, height: h };
  }, [pageSize, orientation]);

  return (
    <div
      className="flex flex-col w-full h-full bg-background relative overflow-hidden"
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false);
      }}
    >
      {/* ── Drag & Drop Overlay ────────────────────────────────────────────── */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-[#E8607A]/10 backdrop-blur-[4px] border-4 border-dashed border-[#E8607A] m-4 rounded-3xl flex items-center justify-center pointer-events-none">
          <div className="bg-card px-10 py-6 rounded-3xl shadow-2xl border border-[#FECDD3] flex flex-col items-center gap-3 text-center animate-scale-in">
            <div className="w-14 h-14 rounded-2xl bg-[#FFF0F3] dark:bg-[#E8607A]/20 flex items-center justify-center">
              <Upload className="w-7 h-7 text-[#E8607A] animate-bounce" />
            </div>
            <h4 className="text-[17px] font-bold text-foreground">Drop your Markdown file here</h4>
            <p className="text-[13px] text-muted-foreground">Accepts .md, .markdown, or .txt</p>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt"
        className="hidden"
        onChange={(e) => e.target.files && readFile(e.target.files[0])}
      />

      {/* ── Top Header Toolbar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 sm:px-6 py-2.5 flex-shrink-0 gap-3 flex-wrap z-20">
        {/* Left: View Mode Toggle & File Pill */}
        <div className="flex items-center gap-3">
          <div className="flex bg-muted p-1 rounded-xl gap-0.5 border border-border/50">
            <button
              onClick={() => setViewMode("split")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all",
                viewMode === "split"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Side-by-Side Split View"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Split</span>
            </button>
            <button
              onClick={() => setViewMode("write")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all",
                viewMode === "write"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Editor View"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Write</span>
            </button>
            <button
              onClick={() => setViewMode("preview")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all",
                viewMode === "preview"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Full Preview"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Preview</span>
            </button>
          </div>

          {/* Theme Selector Pill */}
          <div className="relative flex items-center">
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as MarkdownTheme)}
              className="appearance-none bg-muted hover:bg-muted/80 text-foreground text-[12px] font-bold px-3 py-1.5 pr-7 rounded-xl border border-border cursor-pointer transition-all outline-none"
            >
              {Object.entries(THEME_CONFIGS).map(([key, item]) => (
                <option key={key} value={key}>
                  {item.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2 pointer-events-none" />
          </div>

          {/* Options Panel Toggle Button */}
          <button
            onClick={() => setShowOptions(!showOptions)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold border transition-all",
              showOptions
                ? "bg-[#E8607A]/10 text-[#E8607A] border-[#E8607A]/30"
                : "bg-muted text-muted-foreground hover:text-foreground border-border"
            )}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Page Settings</span>
          </button>
        </div>

        {/* Right: Upload, Templates, and Conversion Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Templates Dropdown */}
          <div className="relative">
            <select
              onChange={(e) => {
                if (e.target.value && SAMPLE_TEMPLATES[e.target.value]) {
                  setMarkdown(SAMPLE_TEMPLATES[e.target.value].content);
                  setHeaderTitle(SAMPLE_TEMPLATES[e.target.value].label);
                  setFileInfo(null);
                  setConverted(false);
                }
                e.target.value = "";
              }}
              defaultValue=""
              className="appearance-none bg-muted hover:bg-muted/80 text-foreground text-[12px] font-bold px-3 py-2 pr-7 rounded-xl border border-border cursor-pointer transition-all outline-none"
            >
              <option value="" disabled>
                Templates
              </option>
              {Object.entries(SAMPLE_TEMPLATES).map(([key, t]) => (
                <option key={key} value={key}>
                  {t.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl text-[12px] font-bold transition-colors"
            title="Upload Markdown File"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Upload</span>
          </button>

          {/* Print / Vector PDF Button */}
          <button
            onClick={handlePrintVector}
            disabled={!markdown.trim()}
            className="flex items-center gap-1.5 px-3 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl text-[12px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            title="Print or Save as Vector PDF"
          >
            <Printer className="w-3.5 h-3.5 text-[#E8607A]" />
            <span className="hidden sm:inline">Print / Vector</span>
          </button>

          {/* Primary Convert & Download PDF Button */}
          <button
            onClick={handleConvertDownload}
            disabled={converting || !markdown.trim()}
            className={cn(
              "flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-[13px] transition-all shadow-sm active:scale-[0.98]",
              converting
                ? "bg-[#E8607A]/80 text-white cursor-wait"
                : !markdown.trim()
                ? "bg-muted text-muted-foreground cursor-not-allowed border border-border"
                : converted
                ? "bg-[#10B981] hover:bg-[#059669] text-white"
                : "bg-[#E8607A] hover:bg-[#D94D6A] text-white"
            )}
          >
            {converting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{convertProgress.stage || "Converting..."}</span>
              </>
            ) : converted ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Optional Page Settings Bar ─────────────────────────────────────── */}
      {showOptions && (
        <div className="border-b border-border bg-card/80 backdrop-blur-sm px-4 sm:px-6 py-3 flex items-center justify-between gap-4 flex-wrap z-10 animate-fade-in">
          <div className="flex items-center gap-4 flex-wrap text-[12px]">
            {/* Page Size */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-medium">Page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value as PageFormat)}
                className="bg-muted text-foreground font-semibold px-2 py-1 rounded-lg border border-border outline-none cursor-pointer"
              >
                <option value="A4">A4 (210 × 297 mm)</option>
                <option value="Letter">US Letter (8.5 × 11 in)</option>
                <option value="Legal">Legal (8.5 × 14 in)</option>
              </select>
            </div>

            {/* Orientation */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-medium">Layout:</span>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as PageOrientation)}
                className="bg-muted text-foreground font-semibold px-2 py-1 rounded-lg border border-border outline-none cursor-pointer"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>

            {/* Margins */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-medium">Margins:</span>
              <select
                value={margins}
                onChange={(e) => setMargins(e.target.value as PageMargin)}
                className="bg-muted text-foreground font-semibold px-2 py-1 rounded-lg border border-border outline-none cursor-pointer"
              >
                <option value="none">None (0 mm)</option>
                <option value="small">Small (10 mm)</option>
                <option value="medium">Medium (20 mm)</option>
                <option value="large">Large (30 mm)</option>
              </select>
            </div>

            {/* Font Size */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-medium">Text Size:</span>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value as "small" | "medium" | "large")}
                className="bg-muted text-foreground font-semibold px-2 py-1 rounded-lg border border-border outline-none cursor-pointer"
              >
                <option value="small">Compact (14px)</option>
                <option value="medium">Standard (16px)</option>
                <option value="large">Large (18px)</option>
              </select>
            </div>

            {/* Page Numbers Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-foreground">
              <input
                type="checkbox"
                checked={showPageNumbers}
                onChange={(e) => setShowPageNumbers(e.target.checked)}
                className="rounded accent-[#E8607A] w-3.5 h-3.5"
              />
              <span>Page Numbers</span>
            </label>

            {/* Header Title Input */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-medium">Header:</span>
              <input
                type="text"
                value={headerTitle}
                onChange={(e) => setHeaderTitle(e.target.value)}
                placeholder="Optional document title"
                className="bg-muted text-foreground font-medium px-2.5 py-1 rounded-lg border border-border outline-none text-[12px] w-40 focus:border-[#E8607A]"
              />
            </div>
          </div>

          {/* Zoom Controls for Preview */}
          {(viewMode === "preview" || viewMode === "split") && (
            <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border border-border">
              <button
                onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
                className="p-1 hover:bg-card rounded-lg text-muted-foreground hover:text-foreground"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-bold px-1.5 min-w-[40px] text-center text-foreground">
                {zoomLevel}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
                className="p-1 hover:bg-card rounded-lg text-muted-foreground hover:text-foreground"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel(100)}
                className="text-[11px] font-semibold px-2 py-0.5 hover:bg-card rounded-lg text-muted-foreground hover:text-foreground"
                title="Reset Zoom"
              >
                Reset
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Markdown Formatting Toolbar (Visible in Write & Split modes) ───── */}
      {(viewMode === "write" || viewMode === "split") && (
        <div className="border-b border-border bg-card/60 px-4 sm:px-6 py-1.5 flex items-center justify-between gap-2 overflow-x-auto custom-scrollbar flex-shrink-0 z-10">
          <div className="flex items-center gap-1 text-muted-foreground">
            <button
              onClick={() => insertText("# ", "", "Heading 1")}
              className="p-1.5 hover:bg-muted hover:text-foreground rounded-lg transition-colors"
              title="Heading 1"
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertText("## ", "", "Heading 2")}
              className="p-1.5 hover:bg-muted hover:text-foreground rounded-lg transition-colors"
              title="Heading 2"
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertText("### ", "", "Heading 3")}
              className="p-1.5 hover:bg-muted hover:text-foreground rounded-lg transition-colors"
              title="Heading 3"
            >
              <Heading3 className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-border mx-1" />

            <button
              onClick={() => insertText("**", "**", "bold text")}
              className="p-1.5 hover:bg-muted hover:text-foreground rounded-lg transition-colors"
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertText("*", "*", "italic text")}
              className="p-1.5 hover:bg-muted hover:text-foreground rounded-lg transition-colors"
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertText("~~", "~~", "strikethrough text")}
              className="p-1.5 hover:bg-muted hover:text-foreground rounded-lg transition-colors"
              title="Strikethrough"
            >
              <Strikethrough className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-border mx-1" />

            <button
              onClick={() => insertText("- ", "", "List item")}
              className="p-1.5 hover:bg-muted hover:text-foreground rounded-lg transition-colors"
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertText("1. ", "", "List item")}
              className="p-1.5 hover:bg-muted hover:text-foreground rounded-lg transition-colors"
              title="Numbered List"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertText("- [ ] ", "", "Task item")}
              className="p-1.5 hover:bg-muted hover:text-foreground rounded-lg transition-colors"
              title="Task List"
            >
              <CheckSquare className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-border mx-1" />

            <button
              onClick={() => insertText("> ", "", "Blockquote")}
              className="p-1.5 hover:bg-muted hover:text-foreground rounded-lg transition-colors"
              title="Blockquote"
            >
              <Quote className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertText("`", "`", "code")}
              className="p-1.5 hover:bg-muted hover:text-foreground rounded-lg transition-colors"
              title="Inline Code"
            >
              <Code className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertText("```typescript\n", "\n```", "const hello = 'world';")}
              className="px-2 py-1 hover:bg-muted hover:text-foreground rounded-lg text-[11px] font-mono font-bold transition-colors"
              title="Code Block"
            >
              &lt;/&gt;
            </button>
            <button
              onClick={() =>
                insertText(
                  "\n| Header 1 | Header 2 | Header 3 |\n| :--- | :--- | :--- |\n| Cell 1 | Cell 2 | Cell 3 |\n| Cell 4 | Cell 5 | Cell 6 |\n"
                )
              }
              className="p-1.5 hover:bg-muted hover:text-foreground rounded-lg transition-colors"
              title="Insert Table"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertText("[", "](https://example.com)", "link title")}
              className="p-1.5 hover:bg-muted hover:text-foreground rounded-lg transition-colors"
              title="Insert Link"
            >
              <Link2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertText("\n---\n")}
              className="p-1.5 hover:bg-muted hover:text-foreground rounded-lg transition-colors"
              title="Horizontal Divider"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Utility Actions */}
          <div className="flex items-center gap-1.5 text-muted-foreground text-[12px]">
            <button
              onClick={handleCopyMarkdown}
              className="p-1.5 hover:bg-muted hover:text-foreground rounded-lg transition-colors"
              title="Copy Markdown Text"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleDownloadMarkdown}
              className="p-1.5 hover:bg-muted hover:text-foreground rounded-lg transition-colors"
              title="Download .md File"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleClear}
              className="p-1.5 hover:bg-muted hover:text-destructive rounded-lg transition-colors"
              title="Clear Editor"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Error Banner ───────────────────────────────────────────────────── */}
      {error && (
        <div className="mx-4 sm:mx-6 mt-3 flex items-center justify-between gap-3 px-4 py-3 bg-[#FEF2F2] dark:bg-[#EF4444]/10 rounded-2xl border border-[#E8607A]/20 text-[#E8607A] shadow-sm flex-shrink-0 z-20">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-[13px] font-semibold">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-[12px] font-bold underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Main Workspace Area (Split / Write / Preview) ─────────────────── */}
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        {/* Editor Pane (Shown in 'write' or 'split' view) */}
        {(viewMode === "write" || viewMode === "split") && (
          <div
            className={cn(
              "flex flex-col h-full relative border-r border-border bg-card",
              viewMode === "split" ? "w-1/2" : "w-full"
            )}
          >
            {!markdown && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                <div className="flex flex-col items-center text-center px-8 py-10 rounded-3xl max-w-sm">
                  <div className="w-14 h-14 rounded-2xl bg-[#FFF0F3] dark:bg-[#E8607A]/15 border border-[#FFC5D3] dark:border-[#E8607A]/30 flex items-center justify-center mb-3">
                    <Edit3 className="w-6 h-6 text-[#E8607A]" />
                  </div>
                  <h3 className="text-[16px] font-bold text-foreground mb-1">Start writing Markdown</h3>
                  <p className="text-[13px] text-muted-foreground mb-4">
                    Type directly, choose a template above, or drag and drop any <code className="text-[12px] bg-muted px-1.5 py-0.5 rounded font-mono">.md</code> file.
                  </p>
                </div>
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={markdown}
              onChange={(e) => {
                setMarkdown(e.target.value);
                if (fileInfo && !e.target.value) setFileInfo(null);
                if (converted) setConverted(false);
              }}
              placeholder="Write your Markdown here..."
              spellCheck={false}
              className="w-full h-full p-6 sm:p-8 resize-none outline-none text-[13.5px] font-mono leading-[1.7] text-foreground bg-transparent custom-scrollbar z-20"
              style={{ tabSize: 2 }}
            />

            {/* Bottom Editor Status Bar */}
            <div className="flex items-center justify-between border-t border-border/70 px-4 py-2 bg-muted/40 text-[11px] text-muted-foreground font-medium flex-shrink-0 z-20">
              <div className="flex items-center gap-3">
                <span>{stats.words.toLocaleString()} words</span>
                <span>·</span>
                <span>{stats.chars.toLocaleString()} chars</span>
                <span>·</span>
                <span>{stats.lines.toLocaleString()} lines</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Est. ~{stats.estimatedPages} {stats.estimatedPages === 1 ? "page" : "pages"}</span>
              </div>
            </div>
          </div>
        )}

        {/* Preview Pane (Shown in 'preview' or 'split' view) */}
        {(viewMode === "preview" || viewMode === "split") && (
          <div
            className={cn(
              "flex-1 h-full overflow-y-auto custom-scrollbar p-4 sm:p-8 flex flex-col items-center bg-muted/50",
              theme === "obsidian" ? "dark bg-[#030304]" : "bg-[#E5E5E3]/40"
            )}
          >
            {markdown.trim() ? (
              <div
                className="w-full flex flex-col items-center transition-transform duration-150 origin-top"
                style={{ transform: `scale(${zoomLevel / 100})` }}
              >
                <style dangerouslySetInnerHTML={{ __html: currentThemeCss }} />

                {/* Paginated Document Representation */}
                <div
                  className="markdown-container shadow-2xl transition-all relative border border-border/80 rounded-md"
                  style={{
                    width: "100%",
                    maxWidth: `${sheetDimensions.width}px`,
                    minHeight: `${sheetDimensions.height}px`,
                    background: theme === "obsidian" ? "#0a0b0e" : theme === "crimson" ? "#fcfbf9" : "#ffffff",
                    padding: margins === "none" ? "20px" : margins === "small" ? "36px" : margins === "large" ? "72px" : "54px",
                    boxSizing: "border-box",
                  }}
                >
                  {/* Optional Document Header */}
                  {headerTitle && (
                    <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-6 text-[11px] text-muted-foreground font-medium">
                      <span>{headerTitle}</span>
                      <span>{pageSize} · {orientation}</span>
                    </div>
                  )}

                  {/* Rendered Markdown Body */}
                  <div
                    ref={previewContainerRef}
                    className="markdown-body"
                    dangerouslySetInnerHTML={{ __html: htmlPreview }}
                  />

                  {/* Optional Document Footer / Page Number */}
                  {showPageNumbers && (
                    <div className="flex items-center justify-between border-t border-border/60 pt-4 mt-8 text-[11px] text-muted-foreground font-medium">
                      <span>{THEME_CONFIGS[theme].name} Theme</span>
                      <span>Page 1 of {stats.estimatedPages}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground my-auto py-12">
                <div className="w-12 h-12 rounded-2xl bg-card border border-border flex items-center justify-center mb-3">
                  <Eye className="w-6 h-6 opacity-50 text-foreground" />
                </div>
                <h4 className="text-[15px] font-bold text-foreground mb-1">Live Preview Ready</h4>
                <p className="text-[13px] text-muted-foreground max-w-xs text-center">
                  Start typing Markdown on the left to see the instant live preview here.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
