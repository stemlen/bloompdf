"use client";

import { useState, useCallback, useRef } from "react";
import {
  Upload, X, GripVertical, FileText, Download, Loader2,
  CheckCircle2, AlertCircle, RefreshCw, Combine, Plus,
  ZoomIn, ZoomOut, ArrowRight
} from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import {
  getPDFPageCount,
  mergePDFs,
  downloadBlob,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_COUNT,
} from "@/lib/mergePdf";

// ─── Types ─────────────────────────────────────────────────────────────────

interface PDFFile {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number | undefined | null;
  pageCountError?: string;
}

type MergeState = "idle" | "merging" | "done" | "error";

// ─── Helpers ───────────────────────────────────────────────────────────────

function makePDFFile(file: File): PDFFile {
  return {
    id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
    file,
    name: file.name,
    size: file.size,
    pageCount: undefined,
  };
}

// ─── Sub-components ────────────────────────────────────────────────────────

function PageCountBadge({
  pageCount,
  error,
}: {
  pageCount: number | undefined | null;
  error?: string;
}) {
  if (pageCount === undefined) {
    return (
      <span className="text-[11px] text-[#A1A19D] flex items-center gap-1">
        <Loader2 className="w-3 h-3 animate-spin" />
        Reading…
      </span>
    );
  }
  if (pageCount === null) {
    return (
      <span
        className="text-[11px] text-[#E8607A] flex items-center gap-1"
        title={error}
      >
        <AlertCircle className="w-3 h-3" />
        {error ?? "Cannot read"}
      </span>
    );
  }
  return (
    <span className="text-[11px] text-[#A1A19D]">
      {pageCount} {pageCount === 1 ? "page" : "pages"}
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export function MergePDFTool() {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [mergeState, setMergeState] = useState<MergeState>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mergedBytes, setMergedBytes] = useState<Uint8Array | null>(null);
  const [zoom, setZoom] = useState(100);

  // Drag-to-reorder state
  const dragIndexRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── File loading ──────────────────────────────────────────────────────────

  const loadPageCounts = useCallback(
    async (incoming: PDFFile[]) => {
      for (const f of incoming) {
        try {
          const count = await getPDFPageCount(f.file);
          setFiles((prev) =>
            prev.map((p) =>
              p.id === f.id ? { ...p, pageCount: count } : p
            )
          );
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : "Cannot read this PDF";
          setFiles((prev) =>
            prev.map((p) =>
              p.id === f.id
                ? { ...p, pageCount: null, pageCountError: msg }
                : p
            )
          );
        }
      }
    },
    []
  );

  const addFiles = useCallback(
    async (raw: FileList | File[]) => {
      const arr = Array.from(raw);
      const validationErrors: string[] = [];
      const accepted: PDFFile[] = [];

      for (const f of arr) {
        if (!f.name.toLowerCase().endsWith(".pdf")) {
          validationErrors.push(`"${f.name}" is not a PDF file.`);
          continue;
        }
        if (f.size > MAX_FILE_SIZE_BYTES) {
          validationErrors.push(
            `"${f.name}" exceeds the 50 MB size limit (${formatFileSize(f.size)}).`
          );
          continue;
        }
        accepted.push(makePDFFile(f));
      }

      setFiles((prev) => {
        const combined = [...prev, ...accepted].slice(0, MAX_FILE_COUNT);
        const truly_new = combined.filter(
          (f) => !prev.some((p) => p.id === f.id)
        );
        loadPageCounts(truly_new);
        return combined;
      });

      if (validationErrors.length > 0) {
        setErrorMessage(validationErrors.join("\n"));
        setMergeState("error");
      }
    },
    [loadPageCounts]
  );

  // ── Drop zone handlers ────────────────────────────────────────────────────

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    if (mergeState === "error") {
      setMergeState("idle");
      setErrorMessage(null);
    }
  };

  // ── Drag-to-reorder handlers ──────────────────────────────────────────────

  const handleItemDragStart = (index: number) => {
    dragIndexRef.current = index;
  };

  const handleItemDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const from = dragIndexRef.current;
    if (from === null || from === index) return;
    setFiles((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
    dragIndexRef.current = index;
  };

  const handleItemDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragIndexRef.current = null;
  };

  // ── Merge ─────────────────────────────────────────────────────────────────

  const handleMerge = async () => {
    if (files.length < 2 || mergeState === "merging") return;

    const bad = files.filter((f) => f.pageCount === null);
    if (bad.length > 0) {
      setErrorMessage(
        `Remove invalid files before merging:\n${bad.map((b) => b.name).join(", ")}`
      );
      setMergeState("error");
      return;
    }

    setMergeState("merging");
    setProgress(0);
    setErrorMessage(null);
    setMergedBytes(null);

    try {
      const result = await mergePDFs(
        files.map((f) => f.file),
        (pct) => setProgress(pct)
      );
      setMergedBytes(result);
      setMergeState("done");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(msg);
      setMergeState("error");
    }
  };

  const handleDownload = () => {
    if (!mergedBytes) return;
    downloadBlob(mergedBytes, "merged.pdf");
  };

  const handleReset = () => {
    setFiles([]);
    setMergeState("idle");
    setProgress(0);
    setErrorMessage(null);
    setMergedBytes(null);
  };

  const handleDismissError = () => {
    setMergeState(files.length > 0 ? "idle" : "idle");
    setErrorMessage(null);
  };

  // ── Computed ──────────────────────────────────────────────────────────────

  const hasFiles = files.length > 0;
  const canAddMore = files.length < MAX_FILE_COUNT;
  const canMerge =
    files.length >= 2 &&
    files.every((f) => f.pageCount !== undefined) &&
    mergeState !== "merging";
  const totalPages = files.reduce(
    (sum, f) => sum + (typeof f.pageCount === "number" ? f.pageCount : 0),
    0
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-muted relative">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        multiple
        onChange={handleInputChange}
        className="hidden"
        aria-hidden
      />

      {/* ── Left Panel: Sidebar ────────────────────────────────────────────── */}
      <div className={cn("w-full md:w-[320px] lg:w-[360px] bg-card border-r border-border flex flex-col flex-shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] md:h-full", hasFiles ? "h-[35vh]" : "hidden md:flex")}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex-shrink-0 bg-muted/40">
          <h2 className="text-[14px] font-bold text-foreground">Files to Merge</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5 font-medium">
            {files.length} {files.length === 1 ? "file" : "files"} • {totalPages} pages total
          </p>
        </div>

        {/* Scrollable File List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {files.map((f, index) => (
            <div
              key={f.id}
              draggable
              onDragStart={() => handleItemDragStart(index)}
              onDragOver={(e) => handleItemDragOver(e, index)}
              onDrop={handleItemDrop}
              className={cn(
                "flex items-center gap-3 bg-card border rounded-xl p-2.5 group transition-all cursor-grab active:cursor-grabbing select-none hover:shadow-sm",
                f.pageCount === null
                  ? "border-[#E8607A]/40 bg-primary/10"
                  : "border-border hover:border-[#111111]/20"
              )}
            >
              {/* Drag handle */}
              <div className="w-5 h-8 flex items-center justify-center -ml-1">
                 <GripVertical className="w-4 h-4 text-[#D1D1CE] group-hover:text-[#A1A19D] transition-colors" />
              </div>

              {/* Order badge */}
              <div className="w-6 h-6 rounded-md bg-muted border border-border flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-foreground truncate">
                  {f.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-medium text-[#A1A19D]">
                    {formatFileSize(f.size)}
                  </span>
                  <span className="text-[#E4E4E2]">•</span>
                  <PageCountBadge
                    pageCount={f.pageCount}
                    error={f.pageCountError}
                  />
                </div>
              </div>

              {/* Remove button */}
              <button
                onClick={() => removeFile(f.id)}
                className="w-7 h-7 rounded-lg text-[#A1A19D] hover:text-[#E8607A] hover:bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 border border-transparent hover:border-[#FFC5D3]"
                aria-label={`Remove ${f.name}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {/* Add more button inside list */}
          {canAddMore && (
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full h-11 flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl text-[12px] font-bold text-muted-foreground hover:border-[#E8607A] hover:text-[#E8607A] hover:bg-primary/10 transition-all mt-4"
            >
              <Plus className="w-4 h-4" />
              Add More PDFs
            </button>
          )}

          {!hasFiles && (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                 <FileText className="w-5 h-5 text-[#A1A19D]" />
              </div>
              <p className="text-[13px] font-bold text-foreground">No files added</p>
              <p className="text-[12px] text-muted-foreground mt-1">Upload files to start merging</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Right Panel: Canvas & Action Bar ───────────────────────────────── */}
      <div 
         className="flex-1 flex flex-col relative min-h-0 h-full"
         onDrop={handleDrop}
         onDragOver={handleDragOver}
         onDragLeave={handleDragLeave}
      >
        {/* Full-area Drop Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 z-50 bg-[#E8607A]/5 backdrop-blur-[2px] border-4 border-dashed border-[#E8607A] m-4 rounded-2xl flex items-center justify-center pointer-events-none">
            <div className="bg-card px-6 py-4 rounded-xl shadow-lg flex flex-col items-center border border-[#FFC5D3]">
              <Upload className="w-8 h-8 text-[#E8607A] mb-2 animate-bounce" />
              <p className="text-[15px] font-bold text-foreground">Drop PDF files here</p>
            </div>
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 relative custom-scrollbar">
           
           {!hasFiles ? (
              <div className="absolute inset-0 flex items-center justify-center">
                 <button 
                   onClick={() => inputRef.current?.click()}
                   className="flex flex-col items-center p-8 lg:p-12 border-2 border-dashed border-[#D1D1CE] rounded-3xl hover:border-[#E8607A] hover:bg-card/50 transition-all cursor-pointer group"
                 >
                    <div className="w-16 h-16 rounded-2xl bg-card shadow-sm border border-border flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-md transition-all">
                       <Upload className="w-7 h-7 text-[#E8607A]" />
                    </div>
                    <h3 className="text-[20px] font-bold text-foreground mb-2">Upload PDFs to merge</h3>
                    <p className="text-[14px] text-muted-foreground">Drag & drop your files anywhere in this space</p>
                 </button>
              </div>
           ) : (
             <div 
               className="flex flex-wrap items-center justify-center gap-4 lg:gap-8 max-w-5xl mx-auto py-8"
               style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center", transition: "transform 0.2s ease" }}
             >
                {files.map((f, index) => (
                  <div key={f.id} className="flex items-center gap-4 lg:gap-8">
                     
                     {/* The Document Thumbnail Card */}
                     <div 
                       draggable
                       onDragStart={() => handleItemDragStart(index)}
                       onDragOver={(e) => handleItemDragOver(e, index)}
                       onDrop={handleItemDrop}
                       className="relative group cursor-grab active:cursor-grabbing hover:-translate-y-1 transition-transform"
                     >
                        <div className="w-[140px] sm:w-[160px] aspect-[1/1.4] bg-card rounded-xl shadow-[0_8px_24px_-8px_rgba(0,0,0,0.15)] border border-border p-4 flex flex-col relative overflow-hidden group-hover:border-[#E8607A]/50 group-hover:shadow-[0_12px_32px_-8px_rgba(232,96,122,0.2)] transition-all">
                           
                           {/* Decorative header to look like a document */}
                           <div className="flex gap-1.5 mb-3">
                              <div className="w-3/4 h-2 bg-muted rounded-full" />
                           </div>
                           <div className="space-y-1.5 flex-1">
                              <div className="w-full h-1.5 bg-muted rounded-full" />
                              <div className="w-full h-1.5 bg-muted rounded-full" />
                              <div className="w-5/6 h-1.5 bg-muted rounded-full" />
                           </div>
                           
                           <div className="mt-auto pt-3 border-t border-[#F3F3F1] flex items-center justify-between">
                             <div className="flex-1 min-w-0 pr-2">
                               <p className="text-[10px] font-bold text-foreground truncate">{f.name}</p>
                             </div>
                           </div>

                           {/* Center giant number indicator */}
                           <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-card/40 backdrop-blur-[1px]">
                              <div className="w-12 h-12 rounded-full bg-[#E8607A] text-white flex items-center justify-center font-bold text-[18px] shadow-md">
                                {index + 1}
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* Connector Arrow */}
                     {index < files.length - 1 && (
                       <div className="hidden sm:flex text-[#D1D1CE]">
                         <ArrowRight className="w-6 h-6" />
                       </div>
                     )}
                  </div>
                ))}

                {/* Append Button Box */}
                {canAddMore && (
                  <div className="flex items-center gap-4 lg:gap-8">
                     <div className="hidden sm:flex text-[#D1D1CE]">
                        <ArrowRight className="w-6 h-6" />
                     </div>
                     <button 
                       onClick={() => inputRef.current?.click()}
                       className="w-[140px] sm:w-[160px] aspect-[1/1.4] border-2 border-dashed border-[#D1D1CE] rounded-xl flex flex-col items-center justify-center text-[#A1A19D] hover:border-[#E8607A] hover:text-[#E8607A] hover:bg-card transition-all cursor-pointer group"
                     >
                        <div className="w-10 h-10 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center mb-2 transition-colors">
                           <Plus className="w-5 h-5" />
                        </div>
                        <span className="text-[12px] font-bold">Add PDF</span>
                     </button>
                  </div>
                )}
             </div>
           )}
        </div>

        {/* Sticky Action Bar */}
        <div className="bg-card border-t border-border h-[80px] px-6 flex items-center justify-between flex-shrink-0 shadow-[0_-8px_24px_rgba(0,0,0,0.02)] z-30 relative">
          
          {/* Status & Errors (Absolute positioned above the bar if needed, or inline) */}
          {errorMessage && mergeState === "error" && (
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

          {/* Done Banner */}
          {mergeState === "done" && (
            <div className="absolute -top-16 right-6 flex items-center gap-3 p-3 bg-[#111111] text-white rounded-xl shadow-lg animate-slide-up max-w-sm">
              <CheckCircle2 className="w-5 h-5 text-[#27C93F] flex-shrink-0" />
              <div>
                 <p className="text-[13px] font-bold leading-tight">Merge complete!</p>
                 <p className="text-[11px] text-[#A1A19D]">Ready to download.</p>
              </div>
            </div>
          )}

          {/* Left Controls (Zoom) */}
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex items-center bg-muted border border-border rounded-lg p-1">
                <button 
                  onClick={() => setZoom(Math.max(50, zoom - 10))}
                  className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card rounded-md transition-all"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[12px] font-bold text-foreground w-12 text-center tabular-nums">{zoom}%</span>
                <button 
                  onClick={() => setZoom(Math.min(150, zoom + 10))}
                  className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card rounded-md transition-all"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
             </div>
          </div>

          {/* Right Controls (Merge / Download) */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {mergeState === "done" ? (
              <>
                <button
                  onClick={handleReset}
                  className="h-11 px-5 bg-card border border-border hover:bg-muted text-foreground rounded-xl font-bold text-[14px] transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Start over</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 sm:flex-none h-11 px-6 bg-[#E8607A] hover:bg-[#D94D6A] text-white rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md"
                >
                  <Download className="w-4 h-4" />
                  Download Merged PDF
                </button>
              </>
            ) : (
              <button
                onClick={handleMerge}
                disabled={!canMerge}
                className={cn(
                  "flex-1 sm:flex-none h-11 px-8 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all",
                  mergeState === "merging"
                    ? "bg-[#E8607A]/80 text-white cursor-wait"
                    : !canMerge
                    ? "bg-muted text-[#A1A19D] cursor-not-allowed border border-border"
                    : "bg-[#111111] hover:bg-[#333333] text-white shadow-md active:scale-[0.98]"
                )}
              >
                {mergeState === "merging" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Merging ({progress}%)...
                  </>
                ) : (
                  <>
                    <Combine className="w-4 h-4" />
                    Merge PDF
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
