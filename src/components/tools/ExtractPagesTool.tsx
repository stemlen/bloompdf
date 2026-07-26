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
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileText,
  FileOutput,
  Layers,
  CheckSquare,
  Square,
  Hash,
  AlignJustify,
  Grid3x3,
  Merge,
  Upload,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { validatePDFFile, downloadFile } from "@/lib/splitPdf";
import { loadPdfForRendering, renderPageToDataURL } from "@/lib/pdfRender";
import {
  parseRangeInput,
  generateSizeRanges,
  expandRangesToPages,
  extractPages,
  type SplitRange,
  type GeneratedFile,
} from "@/lib/extractPages";

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolState =
  | "idle"
  | "loading_thumbnails"
  | "ready"
  | "processing"
  | "done"
  | "error";

type ExtractMode = "range" | "pages" | "size";
type PagesSubMode = "all" | "select" | "manual";

interface PageThumb {
  index: number;
  dataUrl: string;
  selected: boolean;
}

interface PDFInfo {
  file: File;
  name: string;
  size: number;
  totalPages: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function thumbsToSelectedPages(thumbs: PageThumb[]): Set<number> {
  const s = new Set<number>();
  thumbs.forEach((t) => { if (t.selected) s.add(t.index + 1); });
  return s;
}

function pagesToRanges(pages: number[]): SplitRange[] {
  if (pages.length === 0) return [];
  const sorted = [...pages].sort((a, b) => a - b);
  const ranges: SplitRange[] = [];
  let start = sorted[0], end = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push({ start, end });
      start = end = sorted[i];
    }
  }
  ranges.push({ start, end });
  return ranges;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExtractPagesTool() {
  const [pdfInfo, setPdfInfo] = useState<PDFInfo | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [toolState, setToolState] = useState<ToolState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [thumbnails, setThumbnails] = useState<PageThumb[]>([]);
  const [thumbProgress, setThumbProgress] = useState(0);
  const [zoom, setZoom] = useState(100);
  const abortRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<ExtractMode>("range");
  const [pagesSubMode, setPagesSubMode] = useState<PagesSubMode>("select");

  const [rangeInput, setRangeInput] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [sizeInput, setSizeInput] = useState("2");

  const [mergeOutput, setMergeOutput] = useState(true);

  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<GeneratedFile[]>([]);

  useEffect(() => () => { abortRef.current = true; }, []);

  // ── Derived: compute ranges from current mode ──────────────────────────────

  const { ranges, rangeError } = useMemo<{
    ranges: SplitRange[];
    rangeError: string | null;
  }>(() => {
    if (!pdfInfo || toolState === "idle" || toolState === "loading_thumbnails")
      return { ranges: [], rangeError: null };

    if (mode === "range") {
      const result = parseRangeInput(rangeInput, pdfInfo.totalPages);
      if (typeof result === "string") return { ranges: [], rangeError: result };
      return { ranges: result, rangeError: null };
    }

    if (mode === "pages") {
      if (pagesSubMode === "all") {
        return { ranges: [{ start: 1, end: pdfInfo.totalPages }], rangeError: null };
      }
      if (pagesSubMode === "select") {
        const selected = thumbsToSelectedPages(thumbnails);
        if (selected.size === 0)
          return { ranges: [], rangeError: null };
        const pages = [...selected].sort((a, b) => a - b);
        return { ranges: pagesToRanges(pages), rangeError: null };
      }
      if (pagesSubMode === "manual") {
        const result = parseRangeInput(manualInput, pdfInfo.totalPages);
        if (typeof result === "string") return { ranges: [], rangeError: result };
        return { ranges: result, rangeError: null };
      }
    }

    if (mode === "size") {
      const n = parseInt(sizeInput, 10);
      const result = generateSizeRanges(n, pdfInfo.totalPages);
      if (typeof result === "string") return { ranges: [], rangeError: result };
      return { ranges: result, rangeError: null };
    }

    return { ranges: [], rangeError: null };
  }, [pdfInfo, mode, pagesSubMode, rangeInput, manualInput, sizeInput, thumbnails, toolState]);

  const selectedPageCount = useMemo(
    () => expandRangesToPages(ranges).length,
    [ranges]
  );

  const outputFileCount = mergeOutput ? (ranges.length > 0 ? 1 : 0) : ranges.length;
  const canProcess = toolState === "ready" && ranges.length > 0 && !rangeError;

  // Helper for visual canvas
  const isPageInRanges = useCallback((pageNum: number) => {
    return ranges.some(r => pageNum >= r.start && pageNum <= r.end);
  }, [ranges]);

  // ── File handling ──────────────────────────────────────────────────────────

  const handleFiles = async (raw: FileList | File[]) => {
    const file = raw[0];
    if (!file) return;
    const err = validatePDFFile(file);
    if (err) { setErrorMessage(err); setToolState("error"); return; }

    setPdfInfo(null);
    setThumbnails([]);
    setResults([]);
    setErrorMessage(null);
    setToolState("loading_thumbnails");
    setThumbProgress(0);
    abortRef.current = false;

    try {
      const pdfDoc = await loadPdfForRendering(file);
      const total = pdfDoc.numPages;
      const info = { file, name: file.name, size: file.size, totalPages: total };
      setPdfInfo(info);

      setRangeInput(`1-${Math.min(5, total)}`);
      setManualInput("1, 3");
      setSizeInput(total <= 4 ? "1" : "2");

      for (let i = 1; i <= total; i++) {
        if (abortRef.current) break;
        try {
          const dataUrl = await renderPageToDataURL(pdfDoc, i, 0.35);
          setThumbnails((p) => [...p, { index: i - 1, dataUrl, selected: false }]);
        } catch {
          const canvas = document.createElement("canvas");
          canvas.width = 80; canvas.height = 110;
          const ctx = canvas.getContext("2d");
          if (ctx) { ctx.fillStyle = "#F3F3F2"; ctx.fillRect(0, 0, 80, 110); }
          setThumbnails((p) => [...p, { index: i - 1, dataUrl: canvas.toDataURL(), selected: false }]);
        }
        setThumbProgress(Math.round((i / total) * 100));
        await new Promise<void>((r) => setTimeout(r, 8));
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

  // ── Selection ──────────────────────────────────────────────────────────────

  const toggleThumb = (index: number) => {
    if (toolState !== "ready") return;
    setThumbnails((p) => p.map((t) => t.index === index ? { ...t, selected: !t.selected } : t));
  };
  const selectAllThumbs = () => setThumbnails((p) => p.map((t) => ({ ...t, selected: true })));
  const deselectAllThumbs = () => setThumbnails((p) => p.map((t) => ({ ...t, selected: false })));

  // ── Reset / file remove ────────────────────────────────────────────────────

  const handleRemoveFile = () => {
    abortRef.current = true;
    setPdfInfo(null); setThumbnails([]); setResults([]);
    setToolState("idle"); setErrorMessage(null);
  };
  const handleReset = () => handleRemoveFile();
  const handleDismissError = () => {
    setErrorMessage(null);
    setToolState(pdfInfo && thumbnails.length > 0 ? "ready" : "idle");
  };

  // ── Processing ─────────────────────────────────────────────────────────────

  const handleExtract = async () => {
    if (!pdfInfo || !canProcess) return;
    setToolState("processing");
    setProgress(0);
    setErrorMessage(null);
    setResults([]);

    try {
      const generated = await extractPages(pdfInfo.file, ranges, mergeOutput, setProgress);
      setResults(generated);
      setToolState("done");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "An error occurred during extraction.");
      setToolState("error");
    }
  };

  const handleDownloadAll = () => {
    results.forEach((r, i) => setTimeout(() => downloadFile(r.bytes, r.name), i * 300));
  };

  const loadedCount = thumbnails.length;
  const isInteractiveSelect = mode === "pages" && pagesSubMode === "select" && toolState === "ready";

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-muted relative">
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={handleInputChange} className="hidden" aria-hidden />

      {/* ── Left Panel: Sidebar ────────────────────────────────────────────── */}
      <div className="w-full md:w-[320px] lg:w-[360px] bg-card border-r border-border flex flex-col flex-shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] h-[40vh] md:h-full">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex-shrink-0 bg-[#FAFAFA]">
          <h2 className="text-[14px] font-bold text-foreground">Extract Pages</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5 font-medium">Extract and save specific pages</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
          {!pdfInfo ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] flex items-center justify-center mb-3">
                 <FileOutput className="w-5 h-5 text-[#2563EB]" />
              </div>
              <p className="text-[13px] font-bold text-foreground">No file selected</p>
              <p className="text-[12px] text-muted-foreground mt-1">Upload a PDF to configure extraction</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5 p-5">
              {/* File Info */}
              <div className="flex items-center justify-between p-3 bg-[#F8F8F7] border border-[#E5E5E3] rounded-xl shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-[#EFF6FF] rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-[#2563EB]" />
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
                  disabled={toolState === "processing"}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-[#A1A19D] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Mode Tabs */}
              {toolState !== "done" && (
                <>
                  <div className="flex bg-[#F3F3F2] rounded-xl p-1 border border-border">
                    {(
                      [
                        { id: "range", label: "Range" },
                        { id: "pages", label: "Pages" },
                        { id: "size",  label: "Size" },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setMode(tab.id)}
                        className={cn(
                          "flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-all",
                          mode === tab.id ? "bg-card text-[#2563EB] shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Mode Content */}
                  <div className="min-h-[90px]">
                    {mode === "range" && (
                      <div className="space-y-2 animate-fade-in">
                        <label className="text-[12px] font-medium text-muted-foreground">
                          Enter page ranges (e.g., 1-5, 8, 10-12)
                        </label>
                        <input
                          type="text"
                          value={rangeInput}
                          onChange={(e) => setRangeInput(e.target.value)}
                          disabled={toolState === "processing"}
                          className={cn(
                            "w-full h-10 px-3 border rounded-lg text-[13px] focus:outline-none transition-all",
                            rangeError ? "border-red-400 bg-red-50 focus:ring-1 focus:ring-red-400" : "border-border focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                          )}
                        />
                        {rangeError && <p className="text-[11px] text-red-500 mt-1">{rangeError}</p>}
                      </div>
                    )}

                    {mode === "pages" && (
                      <div className="space-y-3 animate-fade-in">
                        <div className="flex gap-2">
                          {(
                            [
                              { id: "all",    label: "All" },
                              { id: "select", label: "Select visually" },
                              { id: "manual", label: "Manual input" },
                            ] as const
                          ).map((s) => (
                            <button
                              key={s.id}
                              onClick={() => setPagesSubMode(s.id)}
                              className={cn(
                                "flex-1 py-1.5 rounded-lg border text-[11px] font-bold transition-all",
                                pagesSubMode === s.id ? "bg-[#2563EB] text-white border-[#2563EB]" : "bg-card text-muted-foreground border-border hover:border-[#2563EB] hover:text-[#2563EB]"
                              )}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                        {pagesSubMode === "manual" && (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={manualInput}
                              onChange={(e) => setManualInput(e.target.value)}
                              disabled={toolState === "processing"}
                              placeholder="e.g. 1, 3, 5-8"
                              className={cn(
                                "w-full h-10 px-3 border rounded-lg text-[13px] focus:outline-none transition-all mt-1",
                                rangeError ? "border-red-400 bg-red-50" : "border-border focus:border-[#2563EB]"
                              )}
                            />
                            {rangeError && <p className="text-[11px] text-red-500 mt-1">{rangeError}</p>}
                          </div>
                        )}
                        {pagesSubMode === "select" && toolState === "ready" && (
                           <div className="flex bg-[#F3F3F2] rounded-xl p-1 border border-border">
                             <button onClick={selectAllThumbs} className="flex-1 text-[11px] font-bold py-1.5 rounded-lg text-muted-foreground hover:bg-card transition-all">Select All</button>
                             <button onClick={deselectAllThumbs} className="flex-1 text-[11px] font-bold py-1.5 rounded-lg text-muted-foreground hover:bg-card transition-all">Clear All</button>
                           </div>
                        )}
                      </div>
                    )}

                    {mode === "size" && (
                      <div className="space-y-2 animate-fade-in">
                        <label className="text-[12px] font-medium text-muted-foreground">
                          Pages per chunk
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="1"
                            value={sizeInput}
                            onChange={(e) => setSizeInput(e.target.value)}
                            disabled={toolState === "processing"}
                            className={cn(
                              "w-24 h-10 px-3 border rounded-lg text-[13px] text-center font-bold focus:outline-none transition-all",
                              rangeError ? "border-red-400 bg-red-50" : "border-border focus:border-[#2563EB]"
                            )}
                          />
                          <div className="flex flex-1 gap-1">
                            {[1, 2, 5, 10].map((n) => (
                              <button
                                key={n}
                                onClick={() => setSizeInput(String(n))}
                                className={cn(
                                  "flex-1 h-10 rounded-lg border text-[12px] font-bold transition-all",
                                  sizeInput === String(n) ? "bg-[#2563EB] text-white border-[#2563EB]" : "bg-card text-muted-foreground border-border hover:border-[#2563EB] hover:text-[#2563EB]"
                                )}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                        {rangeError && <p className="text-[11px] text-red-500 mt-1">{rangeError}</p>}
                      </div>
                    )}
                  </div>

                  {/* Merge toggle */}
                  <div className="flex items-center gap-3 p-3.5 bg-[#F8F8F7] rounded-xl border border-border cursor-pointer" onClick={() => setMergeOutput((v) => !v)}>
                    <div className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all",
                        mergeOutput ? "bg-[#2563EB] border-[#2563EB]" : "bg-card border-[#D1D1CE]"
                      )}>
                      {mergeOutput && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <p className="text-[13px] font-bold text-foreground">Merge into one PDF</p>
                      <p className="text-[11px] text-muted-foreground">
                        {mergeOutput ? "Combine ranges into a single file" : "Save each range as separate file"}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Output Summary */}
              {toolState !== "done" && (
                <div className="pt-4 border-t border-border flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#A1A19D]" />
                      Preview
                    </h3>
                    {!rangeError && ranges.length > 0 && (
                      <span className="text-[11px] text-muted-foreground font-bold">
                        <span className="text-[#2563EB]">{selectedPageCount}</span> p. / <span className="text-[#2563EB]">{outputFileCount}</span> {outputFileCount === 1 ? "file" : "files"}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2 max-h-[200px]">
                    {!pdfInfo || toolState === "loading_thumbnails" ? (
                      <p className="text-[12px] text-[#A1A19D] text-center mt-4">Loading…</p>
                    ) : rangeError ? (
                      <p className="text-[12px] text-[#A1A19D] text-center mt-4 font-medium">Fix errors above to see preview</p>
                    ) : ranges.length === 0 ? (
                      <p className="text-[12px] text-[#A1A19D] text-center mt-4">No ranges selected</p>
                    ) : mergeOutput ? (
                      <div className="flex items-center justify-between p-2.5 bg-[#EFF6FF] border border-[#DBEAFE] rounded-lg">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-[#2563EB] rounded-md flex items-center justify-center">
                            <FileOutput className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="text-[12px] font-bold text-foreground">Merged PDF</span>
                        </div>
                        <span className="text-[11px] text-[#2563EB] font-bold bg-[#DBEAFE] px-2 py-0.5 rounded-full">
                          {selectedPageCount} p.
                        </span>
                      </div>
                    ) : (
                      ranges.map((r, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 bg-card border border-border rounded-lg shadow-sm">
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 bg-muted rounded flex items-center justify-center">
                              <FileOutput className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                            <span className="text-[12px] font-bold text-foreground">File {i + 1}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-bold bg-muted px-2 py-0.5 rounded-full border border-border/50">
                            {r.start === r.end ? `p. ${r.start}` : `p. ${r.start}–${r.end}`}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
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
          <div className="absolute inset-0 z-50 bg-[#2563EB]/5 backdrop-blur-[2px] border-4 border-dashed border-[#2563EB] m-4 rounded-2xl flex items-center justify-center pointer-events-none">
            <div className="bg-card px-6 py-4 rounded-xl shadow-lg flex flex-col items-center border border-[#DBEAFE]">
              <Upload className="w-8 h-8 text-[#2563EB] mb-2 animate-bounce" />
              <p className="text-[15px] font-bold text-foreground">Drop PDF here</p>
            </div>
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 relative custom-scrollbar">
           
           {!pdfInfo ? (
              <div className="absolute inset-0 flex items-center justify-center">
                 <button 
                   onClick={() => inputRef.current?.click()}
                   className="flex flex-col items-center p-8 lg:p-12 border-2 border-dashed border-[#D1D1CE] rounded-3xl hover:border-[#2563EB] hover:bg-card/50 transition-all cursor-pointer group"
                 >
                    <div className="w-16 h-16 rounded-2xl bg-card shadow-sm border border-border flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-md transition-all">
                       <Upload className="w-7 h-7 text-[#2563EB]" />
                    </div>
                    <h3 className="text-[20px] font-bold text-foreground mb-2">Upload a PDF to extract pages</h3>
                    <p className="text-[14px] text-muted-foreground">Drag & drop your file anywhere in this space</p>
                 </button>
              </div>
           ) : toolState === "done" ? (
             <div className="max-w-3xl mx-auto py-10 space-y-6">
                <div className="bg-card p-8 rounded-2xl border border-border shadow-sm text-center">
                   <div className="w-16 h-16 rounded-full bg-[#DCFCE7] flex items-center justify-center mx-auto mb-4">
                     <CheckCircle2 className="w-8 h-8 text-[#16A34A]" />
                   </div>
                   <h2 className="text-[24px] font-bold text-foreground mb-2">Extraction Complete!</h2>
                   <p className="text-muted-foreground text-[14px] mb-6">Generated {results.length} {results.length === 1 ? "file" : "files"} · {selectedPageCount} pages extracted</p>
                   
                   {results.length > 1 && (
                     <button
                       onClick={handleDownloadAll}
                       className="h-11 px-6 bg-[#111111] hover:bg-[#333333] text-white rounded-xl font-bold text-[14px] transition-all shadow-md mx-auto flex items-center gap-2"
                     >
                       <Download className="w-4 h-4" />
                       Download All Files
                     </button>
                   )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.map((res, i) => (
                    <div key={i} className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center justify-between">
                       <div className="flex items-center gap-3 min-w-0">
                         <div className="w-10 h-10 bg-[#EFF6FF] rounded-lg flex items-center justify-center flex-shrink-0">
                           <FileOutput className="w-5 h-5 text-[#2563EB]" />
                         </div>
                         <div className="min-w-0">
                           <p className="text-[13px] font-bold text-foreground truncate">{res.name}</p>
                           <p className="text-[11px] text-muted-foreground font-medium">{res.pageCount} p. · {formatFileSize(res.bytes.byteLength)}</p>
                         </div>
                       </div>
                       <button
                         onClick={() => downloadFile(res.bytes, res.name)}
                         className="w-8 h-8 rounded-lg bg-muted hover:bg-[#2563EB] hover:text-white text-muted-foreground flex items-center justify-center transition-colors flex-shrink-0 ml-2"
                       >
                         <Download className="w-4 h-4" />
                       </button>
                    </div>
                  ))}
                </div>
             </div>
           ) : (
             <div 
               className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 max-w-6xl mx-auto py-4"
               style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left", transition: "transform 0.2s ease" }}
             >
                {thumbnails.map((thumb) => {
                  const isSelected = isInteractiveSelect ? thumb.selected : isPageInRanges(thumb.index + 1);

                  return (
                    <div
                      key={thumb.index}
                      role={isInteractiveSelect ? "checkbox" : "img"}
                      aria-checked={isInteractiveSelect ? isSelected : undefined}
                      tabIndex={isInteractiveSelect ? 0 : -1}
                      onClick={() => isInteractiveSelect && toggleThumb(thumb.index)}
                      className={cn(
                        "relative flex flex-col group transition-all duration-200 rounded-xl overflow-hidden",
                        isInteractiveSelect && "cursor-pointer"
                      )}
                    >
                      <div className={cn(
                        "relative aspect-[1/1.4] bg-card rounded-xl shadow-sm overflow-hidden transition-all border-2",
                        isSelected 
                          ? "border-[#2563EB] ring-2 ring-[#2563EB]/20 shadow-[0_4px_16px_rgba(37,99,235,0.15)]" 
                          : "border-border",
                        isInteractiveSelect && !isSelected && "hover:border-[#2563EB]/50 hover:shadow-md"
                      )}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={thumb.dataUrl}
                          alt={`Page ${thumb.index + 1}`}
                          draggable={false}
                          className={cn(
                            "w-full h-full object-cover transition-all duration-200",
                            !isSelected && "opacity-40"
                          )}
                        />

                        {isSelected && (
                          <div className="absolute top-2 right-2 w-6 h-6 bg-[#2563EB] rounded-md flex items-center justify-center shadow-md animate-scale-in">
                            <CheckSquare className="w-4 h-4 text-white" />
                          </div>
                        )}

                        {!isSelected && isInteractiveSelect && (
                          <div className="absolute inset-0 bg-[#2563EB]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>

                      <div className="py-2 text-center">
                        <span
                          className={cn(
                            "text-[12px] font-bold px-2 py-0.5 rounded-full transition-colors",
                            isSelected
                              ? "bg-[#EFF6FF] text-[#2563EB]"
                              : "bg-muted text-muted-foreground",
                            isInteractiveSelect && !isSelected && "group-hover:bg-[#E4E4E2] group-hover:text-foreground"
                          )}
                        >
                          Page {thumb.index + 1}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Skeletons */}
                {toolState === "loading_thumbnails" &&
                  loadedCount < (pdfInfo?.totalPages ?? 0) &&
                  Array.from({
                    length: Math.min((pdfInfo?.totalPages ?? 0) - loadedCount, 6),
                  }).map((_, i) => (
                    <div key={`skel-${i}`} className="flex flex-col gap-2 rounded-xl">
                      <div className="relative aspect-[1/1.4] bg-[#E4E4E2] rounded-xl shadow-sm overflow-hidden animate-pulse" />
                      <div className="py-2 flex justify-center">
                        <div className="w-12 h-5 bg-[#E4E4E2] rounded-full animate-pulse" />
                      </div>
                    </div>
                  ))}
             </div>
           )}
        </div>

        {/* Sticky Action Bar */}
        <div className="bg-card border-t border-border h-[80px] px-6 flex items-center justify-between flex-shrink-0 shadow-[0_-8px_24px_rgba(0,0,0,0.02)] z-30 relative">
          
          {errorMessage && toolState === "error" && (
            <div className="absolute -top-16 right-6 flex items-center gap-3 p-3 bg-[#FFF0F3] rounded-xl border border-[#E8607A]/20 shadow-lg animate-slide-up max-w-sm">
              <AlertCircle className="w-5 h-5 text-[#E8607A] flex-shrink-0" />
              <p className="text-[12px] font-semibold text-foreground leading-tight">
                {errorMessage}
              </p>
              <button onClick={handleDismissError} className="p-1 hover:bg-[#FFC5D3] rounded-lg text-[#E8607A]">
                 <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Left Controls (Zoom) */}
          <div className="flex items-center gap-3">
             {pdfInfo && toolState !== "done" && (
               <div className="hidden sm:flex items-center bg-muted border border-border rounded-lg p-1">
                  <button 
                    onClick={() => setZoom(Math.max(50, zoom - 10))}
                    className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card rounded-md transition-all"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-[12px] font-bold text-foreground w-12 text-center tabular-nums">{zoom}%</span>
                  <button 
                    onClick={() => setZoom(Math.min(200, zoom + 10))}
                    className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card rounded-md transition-all"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
               </div>
             )}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {toolState === "done" ? (
              <button
                onClick={handleReset}
                className="h-11 px-5 bg-card border border-border hover:bg-muted text-foreground rounded-xl font-bold text-[14px] transition-colors flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <RefreshCw className="w-4 h-4" />
                Start over
              </button>
            ) : (
              <button
                onClick={handleExtract}
                disabled={!canProcess}
                className={cn(
                  "flex-1 sm:flex-none h-11 px-8 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all w-full sm:w-auto",
                  toolState === "processing"
                    ? "bg-[#2563EB]/80 text-white cursor-wait"
                    : !canProcess
                    ? "bg-muted text-[#A1A19D] cursor-not-allowed border border-border"
                    : "bg-[#111111] hover:bg-[#333333] text-white shadow-md active:scale-[0.98]"
                )}
              >
                {toolState === "processing" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <FileOutput className="w-4 h-4" />
                    Extract {selectedPageCount > 0 ? selectedPageCount : ""} {selectedPageCount === 1 ? "Page" : "Pages"}
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
