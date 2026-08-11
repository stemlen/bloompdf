"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import {
  X,
  Upload,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileText,
  ScanText,
  Languages,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  FileDown,
  Zap,
  Shield,
  BarChart3,
  Wand2,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { validatePDFFile } from "@/lib/splitPdf";
import { loadPdfForRendering, renderPageToDataURL } from "@/lib/pdfRender";
import {
  runOCR,
  downloadTextFile,
  downloadPDFBytes,
  terminateOCRWorker,
  OCR_LANGUAGES,
  type OCRLanguage,
  type OCROutputMode,
  type OCREnhancementOptions,
  type OCRProgressEvent,
  type OCRResult,
  type OCRPageResult,
} from "@/lib/ocrPdf";

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolState =
  | "idle"
  | "loading_thumbnails"
  | "ready"
  | "processing"
  | "done"
  | "error";

type PageSelectionMode = "all" | "custom";

interface PageThumb {
  index: number; // 0-based
  dataUrl: string;
}

interface PDFInfo {
  file: File;
  name: string;
  size: number;
  totalPages: number;
}

// ─── Confidence badge ─────────────────────────────────────────────────────────

function ConfidenceBadge({ value }: { value: number }) {
  const color =
    value >= 80 ? "text-[#10B981] bg-[#ECFDF5] border-[#10B981]/20"
    : value >= 60 ? "text-[#F59E0B] bg-[#FFFBEB] border-[#F59E0B]/20"
    : "text-[#E8607A] bg-primary/10 border-[#E8607A]/20";

  const label =
    value >= 80 ? "High" : value >= 60 ? "Medium" : "Low";

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[12px] font-bold px-3 py-1 rounded-full border", color)}>
      <BarChart3 className="w-3.5 h-3.5" />
      {label} confidence · {value}%
    </span>
  );
}

// ─── Language selector ────────────────────────────────────────────────────────

function LanguageSelector({
  value,
  onChange,
  disabled,
}: {
  value: OCRLanguage;
  onChange: (v: OCRLanguage) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = OCR_LANGUAGES.find((l) => l.value === value)!;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full h-11 flex items-center gap-2.5 px-3.5 bg-card border rounded-xl text-[13px] font-bold text-foreground transition-all",
          disabled
            ? "opacity-50 cursor-not-allowed border-border"
            : "border-border hover:border-[#E8607A]/50 hover:bg-muted/40 cursor-pointer"
        )}
      >
        <span className="text-[18px]">{selected.flag}</span>
        <span className="flex-1 text-left">{selected.label}</span>
        <ChevronDown className={cn("w-4 h-4 text-[#A1A19D] transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-scale-in max-h-64 overflow-y-auto custom-scrollbar">
          {OCR_LANGUAGES.map((lang) => (
            <button
              key={lang.value}
              type="button"
              onClick={() => { onChange(lang.value); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-[13px] text-left transition-colors",
                lang.value === value
                  ? "bg-primary/10 text-[#E8607A] font-bold"
                  : "text-foreground hover:bg-[#F8F8F7] font-medium"
              )}
            >
              <span className="text-[18px]">{lang.flag}</span>
              {lang.label}
              {lang.value === value && <CheckCircle2 className="w-4 h-4 ml-auto text-[#E8607A]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Enhancement toggle ───────────────────────────────────────────────────────

function EnhancementToggle({
  label,
  description,
  checked,
  onChange,
  disabled,
  icon: Icon,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  icon: React.ElementType;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all w-full",
        checked
          ? "border-[#E8607A] bg-primary/10 shadow-sm"
          : "border-border bg-card hover:border-[#E8607A]/40",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className={cn(
        "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
        checked ? "bg-[#E8607A] border-[#E8607A]" : "border-[#D1D1CE] bg-card"
      )}>
        {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Icon className={cn("w-4 h-4", checked ? "text-[#E8607A]" : "text-[#A1A19D]")} />
          <span className={cn("text-[13px] font-bold", checked ? "text-[#E8607A]" : "text-foreground")}>{label}</span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{description}</p>
      </div>
    </button>
  );
}

// ─── Searchable PDF Viewer & Highlight Overlay ────────────────────────────────

interface SearchHit {
  id: string;
  globalIndex: number;
  pageIndex: number;
  wordIndex: number;
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

function PageOverlay({
  page,
  pageIndex,
  hits,
  activeMatchIndex,
}: {
  page: OCRPageResult;
  pageIndex: number;
  hits: SearchHit[];
  activeMatchIndex: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeHitRef = useRef<HTMLDivElement>(null);
  const [dim, setDim] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setDim({ width: rect.width, height: rect.height });
    };

    updateSize();
    const ro = new ResizeObserver(() => updateSize());
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  const pageHits = useMemo(() => hits.filter((h) => h.pageIndex === pageIndex), [hits, pageIndex]);

  useEffect(() => {
    const activeHit = hits[activeMatchIndex];
    if (activeHit && activeHit.pageIndex === pageIndex && activeHitRef.current) {
      activeHitRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeMatchIndex, hits, pageIndex]);

  const scaleX = dim.width > 0 && page.width > 0 ? dim.width / page.width : 1;
  const scaleY = dim.height > 0 && page.height > 0 ? dim.height / page.height : 1;

  return (
    <div ref={containerRef} className="relative w-full shadow-md rounded-xl overflow-hidden bg-white border border-border">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={page.imageDataUrl}
        alt={`Page ${page.pageNumber}`}
        draggable={false}
        className="w-full h-auto block select-none"
      />

      {dim.width > 0 &&
        dim.height > 0 &&
        pageHits.map((hit) => {
          const isActive = hit.globalIndex === activeMatchIndex;
          const left = hit.bbox.x0 * scaleX;
          const top = hit.bbox.y0 * scaleY;
          const width = (hit.bbox.x1 - hit.bbox.x0) * scaleX;
          const height = (hit.bbox.y1 - hit.bbox.y0) * scaleY;

          return (
            <div
              key={hit.id}
              ref={isActive ? activeHitRef : undefined}
              className={cn(
                "absolute pointer-events-none rounded-[2px] transition-all duration-200",
                isActive
                  ? "bg-[#E8607A]/85 border-2 border-[#E8607A] ring-4 ring-[#E8607A]/30 z-20 shadow-lg animate-pulse"
                  : "bg-yellow-300/60 border border-yellow-500/60 z-10"
              )}
              style={{
                left: `${left}px`,
                top: `${top}px`,
                width: `${Math.max(3, width)}px`,
                height: `${Math.max(3, height)}px`,
              }}
            />
          );
        })}
    </div>
  );
}

function SearchablePDFViewer({ ocrResult }: { ocrResult: OCRResult }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const searchHits = useMemo<SearchHit[]>(() => {
    if (!ocrResult || !searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    const qWords = q.split(/\s+/).filter(Boolean);
    const hits: SearchHit[] = [];
    let globalIndex = 0;

    ocrResult.pages.forEach((page, pageIndex) => {
      const words = page.words || [];
      if (qWords.length === 1) {
        const singleQ = qWords[0];
        words.forEach((word, wordIndex) => {
          const wordTextLower = word.text.toLowerCase();
          if (!wordTextLower.includes(singleQ)) return;

          let bbox = { ...word.bbox };
          if (wordTextLower !== singleQ && wordTextLower.length > 0) {
            const startIdx = wordTextLower.indexOf(singleQ);
            const endIdx = startIdx + singleQ.length;
            const wordW = word.bbox.x1 - word.bbox.x0;
            const subX0 = word.bbox.x0 + wordW * (startIdx / wordTextLower.length);
            const subX1 = word.bbox.x0 + wordW * (endIdx / wordTextLower.length);
            bbox = { x0: subX0, y0: word.bbox.y0, x1: subX1, y1: word.bbox.y1 };
          }

          hits.push({
            id: `hit-${pageIndex}-${wordIndex}-${globalIndex}`,
            globalIndex: globalIndex++,
            pageIndex,
            wordIndex,
            text: word.text,
            bbox,
          });
        });
      } else {
        for (let i = 0; i <= words.length - qWords.length; i++) {
          let match = true;
          for (let j = 0; j < qWords.length; j++) {
            if (!words[i + j].text.toLowerCase().includes(qWords[j])) {
              match = false;
              break;
            }
          }
          if (match) {
            for (let j = 0; j < qWords.length; j++) {
              const word = words[i + j];
              hits.push({
                id: `hit-${pageIndex}-${i + j}-${globalIndex}`,
                globalIndex: globalIndex++,
                pageIndex,
                wordIndex: i + j,
                text: word.text,
                bbox: { ...word.bbox },
              });
            }
          }
        }
      }
    });

    return hits;
  }, [ocrResult, searchQuery]);

  useEffect(() => {
    setActiveMatchIndex(0);
  }, [searchQuery]);

  const handleNext = () => {
    if (searchHits.length === 0) return;
    setActiveMatchIndex((prev) => (prev + 1) % searchHits.length);
  };

  const handlePrev = () => {
    if (searchHits.length === 0) return;
    setActiveMatchIndex((prev) => (prev - 1 + searchHits.length) % searchHits.length);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) handlePrev();
      else handleNext();
    }
  };

  return (
    <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col w-full">
      {/* Search Toolbar */}
      <div className="p-4 border-b border-border bg-[#F8F8F7] flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30">
        {/* Search Input Box */}
        <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
          <div className="relative flex-1 flex items-center">
            <Search className="w-4 h-4 text-[#A1A19D] absolute left-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search words in searchable PDF..."
              className="w-full h-9 pl-9 pr-8 bg-card border border-border rounded-xl text-[13px] font-medium focus:outline-none focus:border-[#E8607A] focus:ring-2 focus:ring-[#E8607A]/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 text-[#A1A19D] hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Match Counter & Prev/Next */}
          {searchQuery.trim().length > 0 && (
            <div className="flex items-center gap-1 bg-card border border-border rounded-xl px-2.5 py-1 flex-shrink-0">
              <span className={cn(
                "text-[12px] font-bold px-1",
                searchHits.length > 0 ? "text-[#E8607A]" : "text-muted-foreground"
              )}>
                {searchHits.length > 0 ? `${activeMatchIndex + 1} of ${searchHits.length}` : "0 matches"}
              </span>
              <div className="h-3 w-[1px] bg-border mx-0.5" />
              <button
                onClick={handlePrev}
                disabled={searchHits.length === 0}
                title="Previous match (Shift+Enter)"
                className="p-1 rounded hover:bg-muted text-foreground disabled:opacity-30"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleNext}
                disabled={searchHits.length === 0}
                title="Next match (Enter)"
                className="p-1 rounded hover:bg-muted text-foreground disabled:opacity-30"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-card border border-border rounded-xl p-1 gap-1">
            <button
              onClick={() => setZoom((z) => Math.max(50, z - 25))}
              disabled={zoom <= 50}
              className="p-1.5 hover:bg-muted rounded-lg text-foreground disabled:opacity-40"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[12px] font-bold w-12 text-center text-foreground">{zoom}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(250, z + 25))}
              disabled={zoom >= 250}
              className="p-1.5 hover:bg-muted rounded-lg text-foreground disabled:opacity-40"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
          {zoom !== 100 && (
            <button
              onClick={() => setZoom(100)}
              className="h-9 px-3 bg-card border border-border rounded-xl text-[12px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1"
              title="Reset Zoom"
            >
              <Maximize2 className="w-3.5 h-3.5" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Pages List */}
      <div className="p-6 bg-muted/40 overflow-y-auto max-h-[650px] custom-scrollbar flex flex-col items-center gap-8">
        {ocrResult.pages.map((page, idx) => (
          <div key={page.pageNumber} className="flex flex-col items-center transition-all duration-300" style={{ width: `${zoom}%`, maxWidth: "100%" }}>
            <div className="w-full flex items-center justify-between mb-2 px-1">
              <span className="text-[12px] font-bold text-muted-foreground">Page {page.pageNumber} of {ocrResult.pages.length}</span>
              {page.confidence > 0 && (
                <span className="text-[11px] font-semibold text-[#A1A19D]">{page.confidence}% confidence</span>
              )}
            </div>
            <PageOverlay
              page={page}
              pageIndex={idx}
              hits={searchHits}
              activeMatchIndex={activeMatchIndex}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OCRPDFTool() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [pdfInfo, setPdfInfo] = useState<PDFInfo | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [toolState, setToolState] = useState<ToolState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Thumbnails
  const [thumbnails, setThumbnails] = useState<PageThumb[]>([]);
  const [thumbProgress, setThumbProgress] = useState(0);
  const abortRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // OCR options
  const [language, setLanguage] = useState<OCRLanguage>("eng");
  const [pageMode, setPageMode] = useState<PageSelectionMode>("all");
  const [customFrom, setCustomFrom] = useState("1");
  const [customTo, setCustomTo] = useState("1");
  const [outputMode, setOutputMode] = useState<OCROutputMode>("searchable-pdf");
  const [enhancements, setEnhancements] = useState<OCREnhancementOptions>({
    autoEnhance: true,
    deskew: false,
    removeNoise: false,
    increaseContrast: false,
  });

  // Processing
  const [progressEvents, setProgressEvents] = useState<OCRProgressEvent[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [currentPhaseLabel, setCurrentPhaseLabel] = useState("");
  const [ocrResult, setOCRResult] = useState<OCRResult | null>(null);

  // Text preview
  const [previewPage, setPreviewPage] = useState(0); // 0-based index into result pages

  // Abort on unmount
  useEffect(() => () => { abortRef.current = true; terminateOCRWorker(); }, []);

  // ── Validation ─────────────────────────────────────────────────────────────

  const pageRangeError = useMemo<string | null>(() => {
    if (!pdfInfo || pageMode !== "custom") return null;
    const from = parseInt(customFrom, 10);
    const to = parseInt(customTo, 10);
    if (isNaN(from) || isNaN(to)) return "Please enter valid page numbers.";
    if (from < 1) return "From page must be at least 1.";
    if (to > pdfInfo.totalPages) return `To page cannot exceed ${pdfInfo.totalPages}.`;
    if (from > to) return "From page cannot be greater than To page.";
    return null;
  }, [pdfInfo, pageMode, customFrom, customTo]);

  const selectedPages = useMemo<number[]>(() => {
    if (!pdfInfo) return [];
    if (pageMode === "all") return Array.from({ length: pdfInfo.totalPages }, (_, i) => i + 1);
    const from = parseInt(customFrom, 10);
    const to = parseInt(customTo, 10);
    if (isNaN(from) || isNaN(to) || from > to) return [];
    const pages: number[] = [];
    for (let p = from; p <= to && p <= pdfInfo.totalPages; p++) pages.push(p);
    return pages;
  }, [pdfInfo, pageMode, customFrom, customTo]);

  const canProcess = toolState === "ready" && selectedPages.length > 0 && !pageRangeError;

  // ── File handling ──────────────────────────────────────────────────────────

  const handleFiles = async (raw: FileList | File[]) => {
    const file = raw[0];
    if (!file) return;
    const err = validatePDFFile(file);
    if (err) { setErrorMessage(err); setToolState("error"); return; }

    setPdfInfo(null);
    setThumbnails([]);
    setOCRResult(null);
    setProgressEvents([]);
    setErrorMessage(null);
    setToolState("loading_thumbnails");
    setThumbProgress(0);
    abortRef.current = false;

    try {
      const pdfDoc = await loadPdfForRendering(file);
      const total = pdfDoc.numPages;
      setPdfInfo({ file, name: file.name, size: file.size, totalPages: total });
      setCustomTo(String(total));

      for (let i = 1; i <= total; i++) {
        if (abortRef.current) break;
        try {
          const dataUrl = await renderPageToDataURL(pdfDoc, i, 0.35); // Lower res for thumbnails
          setThumbnails((p) => [...p, { index: i - 1, dataUrl }]);
        } catch {
          const canvas = document.createElement("canvas");
          canvas.width = 80; canvas.height = 110;
          const ctx = canvas.getContext("2d");
          if (ctx) { ctx.fillStyle = "#F3F3F2"; ctx.fillRect(0, 0, 80, 110); }
          setThumbnails((p) => [...p, { index: i - 1, dataUrl: canvas.toDataURL() }]);
        }
        setThumbProgress(Math.round((i / total) * 100));
        await new Promise<void>((r) => setTimeout(r, 8)); // Let UI breathe
      }
      if (!abortRef.current) setToolState("ready");
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      setErrorMessage(
        m.toLowerCase().includes("password") || m.toLowerCase().includes("encrypt")
          ? "This PDF is password-protected. Please unlock it first."
          : "Could not load the PDF. It may be corrupted or in an unsupported format."
      );
      setToolState("error");
    }
  };

  // ── Drag-and-drop ──────────────────────────────────────────────────────────

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false);
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleFiles(e.target.files);
    e.target.value = "";
  };

  // ── Reset ──────────────────────────────────────────────────────────────────

  const handleRemoveFile = () => {
    abortRef.current = true;
    setPdfInfo(null); setThumbnails([]); setOCRResult(null);
    setProgressEvents([]); setToolState("idle"); setErrorMessage(null);
  };
  const handleReset = handleRemoveFile;
  const handleDismissError = () => {
    setErrorMessage(null);
    setToolState(pdfInfo ? "ready" : "idle");
  };

  // ── OCR processing ─────────────────────────────────────────────────────────

  const handleRunOCR = async () => {
    if (!pdfInfo || !canProcess) return;
    setToolState("processing");
    setCurrentProgress(0);
    setProgressEvents([]);
    setOCRResult(null);
    setErrorMessage(null);

    try {
      const result = await runOCR(
        pdfInfo.file,
        selectedPages,
        language,
        outputMode,
        enhancements,
        (event) => {
          setProgressEvents((prev) => [...prev, event]);
          setCurrentProgress(event.pct);
          const phaseLabels: Record<string, string> = {
            rendering: `Rendering page ${event.page}...`,
            ocr: `Running OCR on page ${event.page}...`,
            building: "Building output document...",
          };
          setCurrentPhaseLabel(phaseLabels[event.phase] ?? "Processing...");
        }
      );
      setOCRResult(result);
      setToolState("done");
      setPreviewPage(0);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "An unexpected error occurred during OCR.");
      setToolState("error");
    }
  };

  // ── Download ───────────────────────────────────────────────────────────────

  const handleDownload = () => {
    if (!ocrResult || !pdfInfo) return;
    const baseName = pdfInfo.name.replace(/\.pdf$/i, "");
    if (ocrResult.outputMode === "searchable-pdf" && ocrResult.pdfBytes) {
      downloadPDFBytes(ocrResult.pdfBytes, `${baseName}_searchable.pdf`);
    } else if (ocrResult.outputMode === "extract-text" && ocrResult.textContent) {
      downloadTextFile(ocrResult.textContent, `${baseName}_text.txt`);
    }
  };

  // ── Enhancement toggle helper ──────────────────────────────────────────────

  const setEnhancement = (key: keyof OCREnhancementOptions) => (v: boolean) => {
    setEnhancements((prev) => ({ ...prev, [key]: v }));
  };

  const isProcessing = toolState === "processing";

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-muted relative">
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={handleInputChange} className="hidden" aria-hidden />

      {/* ── Left Panel: Sidebar ────────────────────────────────────────────── */}
      <div className="w-full md:w-[320px] lg:w-[360px] bg-card border-r border-border flex flex-col flex-shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] h-[40vh] md:h-full">
        <div className="px-5 py-4 border-b border-border flex-shrink-0 bg-muted/40">
          <h2 className="text-[14px] font-bold text-foreground">OCR PDF</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5 font-medium">Extract text from scanned documents</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
          {!pdfInfo ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                 <ScanText className="w-5 h-5 text-[#E8607A]" />
              </div>
              <p className="text-[13px] font-bold text-foreground">No file selected</p>
              <p className="text-[12px] text-muted-foreground mt-1">Upload a scanned PDF to begin</p>
            </div>
          ) : (
            <div className="p-5 flex flex-col gap-6">
              {/* File Info */}
              <div className="flex items-center justify-between p-3 bg-[#F8F8F7] border border-[#E5E5E3] rounded-xl shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-[#E8607A]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-foreground truncate">{pdfInfo.name}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      {formatFileSize(pdfInfo.size)} 
                      <span className="text-[#D1D1CE]">•</span> 
                      {pdfInfo.totalPages} pages
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRemoveFile}
                  disabled={isProcessing}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-[#A1A19D] hover:text-[#E8607A] hover:bg-primary/10 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Options Section */}
              <div className="space-y-6">
                 {/* OCR Language */}
                 <div className="space-y-3">
                    <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <Languages className="w-4 h-4 text-[#A1A19D]" /> Language
                    </h3>
                    <LanguageSelector value={language} onChange={setLanguage} disabled={isProcessing || toolState === "done"} />
                 </div>

                 {/* Page Selection */}
                 <div className="space-y-3">
                    <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wider flex items-center justify-between gap-2">
                       <div className="flex items-center gap-2">
                         <FileText className="w-4 h-4 text-[#A1A19D]" /> Pages
                       </div>
                       {selectedPages.length > 0 && (
                         <span className="text-[10px] font-bold text-[#E8607A] bg-primary/10 px-2 py-0.5 rounded-full">
                           {selectedPages.length} selected
                         </span>
                       )}
                    </h3>
                    
                    <div className="flex gap-2">
                      {(["all", "custom"] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setPageMode(m)}
                          disabled={isProcessing || toolState === "done"}
                          className={cn(
                            "flex-1 h-10 rounded-xl border text-[13px] font-bold transition-all",
                            pageMode === m
                              ? "bg-[#E8607A] text-white border-[#E8607A] shadow-sm"
                              : "bg-card text-muted-foreground border-border hover:border-[#E8607A]/50",
                            (isProcessing || toolState === "done") && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {m === "all" ? "All Pages" : "Custom"}
                        </button>
                      ))}
                    </div>

                    {pageMode === "custom" && (
                      <div className="flex items-center gap-3 animate-fade-in pt-1">
                        <div className="flex-1">
                          <input
                            type="number"
                            min={1}
                            max={pdfInfo.totalPages}
                            value={customFrom}
                            onChange={(e) => setCustomFrom(e.target.value)}
                            disabled={isProcessing || toolState === "done"}
                            placeholder="From"
                            className={cn(
                              "w-full h-10 px-3 border rounded-xl text-[13px] text-center font-bold focus:outline-none transition-all",
                              pageRangeError
                                ? "border-red-400 bg-red-50 text-red-600"
                                : "border-border focus:border-[#E8607A] focus:ring-2 focus:ring-[#E8607A]/20"
                            )}
                          />
                        </div>
                        <div className="text-[#A1A19D] font-bold">→</div>
                        <div className="flex-1">
                          <input
                            type="number"
                            min={1}
                            max={pdfInfo.totalPages}
                            value={customTo}
                            onChange={(e) => setCustomTo(e.target.value)}
                            disabled={isProcessing || toolState === "done"}
                            placeholder="To"
                            className={cn(
                              "w-full h-10 px-3 border rounded-xl text-[13px] text-center font-bold focus:outline-none transition-all",
                              pageRangeError
                                ? "border-red-400 bg-red-50 text-red-600"
                                : "border-border focus:border-[#E8607A] focus:ring-2 focus:ring-[#E8607A]/20"
                            )}
                          />
                        </div>
                      </div>
                    )}
                    {pageRangeError && (
                      <p className="text-[11px] font-medium text-red-500 flex items-center gap-1.5 animate-fade-in">
                        <AlertCircle className="w-3.5 h-3.5" /> {pageRangeError}
                      </p>
                    )}
                 </div>

                 {/* Output Mode */}
                 <div className="space-y-3">
                    <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                       <FileDown className="w-4 h-4 text-[#A1A19D]" /> Output
                    </h3>
                    <div className="space-y-2">
                       {([
                         {
                           value: "searchable-pdf" as const,
                           label: "Searchable PDF",
                           desc: "Add hidden text layer. Keeps original look.",
                           icon: ScanText,
                           badge: "Recommended",
                         },
                         {
                           value: "extract-text" as const,
                           label: "Extract Text",
                           desc: "Export recognized text as a raw .txt file.",
                           icon: FileText,
                           badge: null,
                         },
                       ]).map((opt) => (
                         <button
                           key={opt.value}
                           type="button"
                           disabled={isProcessing || toolState === "done"}
                           onClick={() => setOutputMode(opt.value)}
                           className={cn(
                             "w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all",
                             outputMode === opt.value
                               ? "border-[#E8607A] bg-primary/10 shadow-sm"
                               : "border-border bg-card hover:border-[#E8607A]/40",
                             (isProcessing || toolState === "done") && "opacity-60 cursor-not-allowed"
                           )}
                         >
                           <div className={cn(
                             "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                             outputMode === opt.value ? "bg-[#E8607A]" : "bg-[#F3F3F2]"
                           )}>
                             <opt.icon className={cn("w-4 h-4", outputMode === opt.value ? "text-white" : "text-muted-foreground")} />
                           </div>
                           <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-2">
                               <span className={cn("text-[13px] font-bold", outputMode === opt.value ? "text-[#E8607A]" : "text-foreground")}>
                                 {opt.label}
                               </span>
                               {opt.badge && (
                                 <span className="text-[9px] font-bold bg-[#E8607A] text-white px-2 py-0.5 rounded-full">{opt.badge}</span>
                               )}
                             </div>
                             <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{opt.desc}</p>
                           </div>
                         </button>
                       ))}
                    </div>
                 </div>

                 {/* Enhancements */}
                 <div className="space-y-3">
                    <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wider flex items-center justify-between gap-2">
                       <div className="flex items-center gap-2">
                         <Wand2 className="w-4 h-4 text-[#A1A19D]" /> Enhancements
                       </div>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <EnhancementToggle
                        label="Auto Enhance"
                        description="Improve contrast"
                        checked={enhancements.autoEnhance}
                        onChange={setEnhancement("autoEnhance")}
                        disabled={isProcessing || toolState === "done"}
                        icon={Sparkles}
                      />
                      <EnhancementToggle
                        label="High Contrast"
                        description="Stretch histogram"
                        checked={enhancements.increaseContrast}
                        onChange={setEnhancement("increaseContrast")}
                        disabled={isProcessing || toolState === "done"}
                        icon={Zap}
                      />
                      <EnhancementToggle
                        label="Denoise"
                        description="Clean dirty scans"
                        checked={enhancements.removeNoise}
                        onChange={setEnhancement("removeNoise")}
                        disabled={isProcessing || toolState === "done"}
                        icon={Shield}
                      />
                      <EnhancementToggle
                        label="Deskew"
                        description="Straighten pages"
                        checked={enhancements.deskew}
                        onChange={setEnhancement("deskew")}
                        disabled={isProcessing || toolState === "done"}
                        icon={Wand2}
                      />
                    </div>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right Panel: Canvas & Action Bar ───────────────────────────────── */}
      <div 
         className="flex-1 flex flex-col relative min-h-0 h-full bg-muted"
         onDrop={handleDrop}
         onDragOver={handleDragOver}
         onDragLeave={handleDragLeave}
      >
        {isDragOver && (
          <div className="absolute inset-0 z-50 bg-[#E8607A]/5 backdrop-blur-[2px] border-4 border-dashed border-[#E8607A] m-4 rounded-2xl flex items-center justify-center pointer-events-none">
            <div className="bg-card px-6 py-4 rounded-xl shadow-lg flex flex-col items-center border border-[#FECDD3]">
              <Upload className="w-8 h-8 text-[#E8607A] mb-2 animate-bounce" />
              <p className="text-[15px] font-bold text-foreground">Drop scanned PDF here</p>
            </div>
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative custom-scrollbar flex flex-col">
           
           {!pdfInfo ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                 <button 
                   onClick={() => inputRef.current?.click()}
                   className="flex flex-col items-center p-8 lg:p-12 border-2 border-dashed border-[#D1D1CE] rounded-3xl hover:border-[#E8607A] hover:bg-card/50 transition-all cursor-pointer group"
                 >
                    <div className="w-16 h-16 rounded-2xl bg-card shadow-sm border border-border flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-md transition-all">
                       <ScanText className="w-7 h-7 text-[#E8607A]" />
                    </div>
                    <h3 className="text-[20px] font-bold text-foreground mb-2">Upload a Scanned PDF</h3>
                    <p className="text-[14px] text-muted-foreground">Extract text using advanced OCR</p>
                 </button>
              </div>
           ) : toolState === "done" && ocrResult ? (
              <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto space-y-6 animate-slide-up pb-8">
                 {/* Success Header */}
                 <div className="bg-card rounded-3xl border border-border shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 justify-between">
                    <div className="flex items-center gap-5">
                       <div className="w-16 h-16 bg-[#ECFDF5] rounded-2xl flex items-center justify-center border border-[#10B981]/20 shadow-inner">
                         <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
                       </div>
                       <div>
                         <h2 className="text-[24px] font-bold text-foreground mb-1">OCR Complete!</h2>
                         <p className="text-[14px] text-muted-foreground">
                           Processed <strong className="text-foreground">{ocrResult.pages.length}</strong> {ocrResult.pages.length === 1 ? "page" : "pages"} successfully.
                         </p>
                       </div>
                    </div>
                    <ConfidenceBadge value={ocrResult.averageConfidence} />
                 </div>
                 
                 {/* Results Preview: Searchable PDF Viewer or Text Extractor */}
                 {ocrResult.outputMode === "searchable-pdf" ? (
                    <SearchablePDFViewer ocrResult={ocrResult} />
                 ) : (
                    <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col">
                       <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-[#F8F8F7]">
                          <h3 className="text-[14px] font-bold text-foreground flex items-center gap-2">
                             <FileText className="w-4 h-4 text-[#E8607A]" /> Extracted Text Preview
                          </h3>
                          <div className="flex items-center gap-2">
                             <span className="text-[12px] font-bold text-[#A1A19D]">Page</span>
                             <select 
                               className="h-8 px-2 border border-border rounded-lg text-[13px] font-bold focus:outline-none focus:border-[#E8607A]"
                               value={previewPage}
                               onChange={(e) => setPreviewPage(Number(e.target.value))}
                             >
                               {ocrResult.pages.map((p, i) => (
                                 <option key={i} value={i}>Page {i + 1}</option>
                               ))}
                             </select>
                          </div>
                       </div>
                       <div className="p-6 bg-muted/40 min-h-[300px]">
                          <textarea
                            readOnly
                            value={ocrResult.pages[previewPage]?.text || "No text detected."}
                            className="w-full h-64 p-4 border border-border rounded-xl font-mono text-[13px] leading-relaxed resize-none bg-card focus:outline-none"
                          />
                       </div>
                    </div>
                 )}
              </div>
           ) : (
              // Document Canvas / Thumbnails
              <div className="flex-1 w-full bg-card rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col">
                 <div className="px-6 py-4 border-b border-border bg-[#F8F8F7] flex items-center justify-between sticky top-0 z-10">
                    <h3 className="text-[14px] font-bold text-foreground">Document Preview</h3>
                    <div className="flex gap-2">
                       <span className="text-[12px] font-bold text-[#A1A19D] bg-card px-3 py-1 rounded-full border border-border">
                         {thumbnails.length} / {pdfInfo.totalPages} Loaded
                       </span>
                    </div>
                 </div>
                 
                 <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-muted/40">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                      {thumbnails.map((thumb) => {
                        const pageNum = thumb.index + 1;
                        const inRange =
                          pageMode === "all" ||
                          (pageMode === "custom" &&
                            pageNum >= (parseInt(customFrom, 10) || 1) &&
                            pageNum <= (parseInt(customTo, 10) || pdfInfo.totalPages));
                        
                        return (
                          <div
                            key={thumb.index}
                            className={cn(
                              "relative flex flex-col items-center group transition-all duration-300",
                              inRange ? "opacity-100 scale-100" : "opacity-40 scale-95 grayscale"
                            )}
                          >
                            <div className={cn(
                              "relative w-full aspect-[1/1.4] bg-card border-2 rounded-xl shadow-sm overflow-hidden transition-all duration-300",
                              inRange ? "border-[#E8607A] ring-4 ring-[#E8607A]/10 shadow-md" : "border-border"
                            )}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={thumb.dataUrl}
                                alt={`Page ${pageNum}`}
                                draggable={false}
                                className="w-full h-full object-cover"
                              />
                              {inRange && (
                                <div className="absolute top-2 right-2 w-6 h-6 bg-[#E8607A] rounded-full flex items-center justify-center text-white shadow-sm scale-0 group-hover:scale-100 transition-transform">
                                  <CheckCircle2 className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                            <span className="mt-3 text-[13px] font-bold text-muted-foreground">Page {pageNum}</span>
                          </div>
                        );
                      })}
                      
                      {toolState === "loading_thumbnails" && thumbnails.length < pdfInfo.totalPages &&
                        Array.from({ length: Math.min(pdfInfo.totalPages - thumbnails.length, 12) }).map((_, i) => (
                          <div key={`sk-${i}`} className="flex flex-col items-center">
                            <div className="w-full aspect-[1/1.4] bg-[#F3F3F2] rounded-xl border-2 border-transparent animate-pulse" />
                            <div className="w-12 h-4 bg-[#F3F3F2] rounded mt-3 animate-pulse" />
                          </div>
                        ))}
                    </div>
                 </div>

                 {/* OCR Processing Overlay */}
                 {toolState === "processing" && (
                    <div className="absolute inset-0 z-20 bg-card/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl border border-[#E8607A]/20">
                       <div className="w-24 h-24 relative mb-6">
                          <div className="absolute inset-0 bg-[#E8607A]/20 rounded-full animate-ping" />
                          <div className="relative w-full h-full bg-card rounded-full flex items-center justify-center shadow-xl border border-[#E8607A]/30">
                            <ScanText className="w-10 h-10 text-[#E8607A] animate-pulse" />
                          </div>
                       </div>
                       <h2 className="text-[28px] font-bold text-foreground mb-2">{currentProgress}%</h2>
                       <p className="text-[16px] font-bold text-[#E8607A] tracking-wider uppercase mb-1">{currentPhaseLabel}</p>
                       <p className="text-[14px] text-muted-foreground">Please do not close this window.</p>
                    </div>
                 )}
              </div>
           )}
        </div>

        {/* Sticky Action Bar */}
        <div className="bg-card border-t border-border h-[80px] px-6 flex items-center justify-between flex-shrink-0 shadow-[0_-8px_24px_rgba(0,0,0,0.02)] z-30 relative">
          
          {errorMessage && toolState === "error" && (
            <div className="absolute -top-16 right-6 flex items-center gap-3 p-3 bg-primary/10 rounded-xl border border-[#E8607A]/20 shadow-lg animate-slide-up max-w-sm">
              <AlertCircle className="w-5 h-5 text-[#E8607A] flex-shrink-0" />
              <p className="text-[12px] font-semibold text-foreground leading-tight">
                {errorMessage}
              </p>
              <button onClick={handleDismissError} className="p-1 hover:bg-[#FFC5D3] rounded-lg text-[#E8607A]">
                 <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Left Controls */}
          <div className="flex-1 max-w-md hidden md:block">
             {toolState === "processing" && (
                <div className="space-y-1.5 w-full pr-8 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-[#E8607A] uppercase tracking-wider">
                      {currentPhaseLabel}
                    </span>
                  </div>
                  <div className="h-2 bg-[#F3F3F2] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#E8607A] to-[#D94D6A] rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${currentProgress}%` }}
                    />
                  </div>
                </div>
             )}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            {toolState === "done" ? (
              <>
                 <button
                   onClick={handleReset}
                   className="h-11 px-5 bg-card border border-border hover:bg-muted text-foreground rounded-xl font-bold text-[14px] transition-colors flex items-center gap-2 w-full md:w-auto justify-center"
                 >
                   <RefreshCw className="w-4 h-4" />
                   Start over
                 </button>
                 <button
                   onClick={handleDownload}
                   className="flex-1 md:flex-none h-11 px-8 bg-[#E8607A] hover:bg-[#D94D6A] text-white rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-colors shadow-md w-full md:w-auto"
                 >
                   <Download className="w-4 h-4" />
                   {ocrResult?.outputMode === "searchable-pdf" ? "Download PDF" : "Download Text"}
                 </button>
              </>
            ) : (
              <button
                onClick={handleRunOCR}
                disabled={!canProcess || isProcessing}
                className={cn(
                  "flex-1 md:flex-none h-11 px-8 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all w-full md:w-auto",
                  isProcessing
                    ? "bg-[#E8607A]/80 text-white cursor-wait"
                    : !canProcess
                    ? "bg-muted text-[#A1A19D] cursor-not-allowed border border-border"
                    : "bg-[#111111] hover:bg-[#333333] text-white shadow-md active:scale-[0.98]"
                )}
              >
                {toolState === "loading_thumbnails" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : toolState === "processing" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Running OCR...
                  </>
                ) : (
                  <>
                    <ScanText className="w-4 h-4" />
                    Start OCR
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
