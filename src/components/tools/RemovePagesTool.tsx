"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  X,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileText,
  Trash2,
  CheckSquare,
  Square,
  Upload,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { validatePDFFile, downloadFile } from "@/lib/splitPdf";
import { loadPdfForRendering, renderPageToDataURL } from "@/lib/pdfRender";
import { removePagesFromPDF } from "@/lib/removePages";

// ─── Types ─────────────────────────────────────────────────────────────────

type ToolState =
  | "idle"
  | "loading_thumbnails"
  | "ready"
  | "processing"
  | "done"
  | "error";

interface PageThumbnail {
  index: number;
  dataUrl: string;
  selectedForRemoval: boolean;
}

interface PDFInfo {
  file: File;
  name: string;
  size: number;
  totalPages: number;
}

interface DoneSnapshot {
  removedCount: number;
  remainingCount: number;
  outputBytes: number;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function RemovePagesTool() {
  const [pdfInfo, setPdfInfo] = useState<PDFInfo | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [toolState, setToolState] = useState<ToolState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [thumbnailsProgress, setThumbnailsProgress] = useState(0);

  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [doneSnapshot, setDoneSnapshot] = useState<DoneSnapshot | null>(null);

  const [zoom, setZoom] = useState(100);

  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      abortRef.current = true;
    };
  }, []);

  // ─── Derived values ──────────────────────────────────────────────────────

  const selectedCount = thumbnails.filter((t) => t.selectedForRemoval).length;
  const loadedCount = thumbnails.length;
  const totalPages = pdfInfo?.totalPages ?? 0;
  const isAllSelected = totalPages > 0 && selectedCount === totalPages;
  const isNoneSelected = selectedCount === 0;

  const canProcess =
    toolState === "ready" && selectedCount > 0 && !isAllSelected;

  // ─── File handling & Thumbnail generation ────────────────────────────────

  const handleFiles = async (raw: FileList | File[]) => {
    const file = raw[0];
    if (!file) return;

    const validationError = validatePDFFile(file);
    if (validationError) {
      setErrorMessage(validationError);
      setToolState("error");
      return;
    }

    setPdfInfo(null);
    setThumbnails([]);
    setErrorMessage(null);
    setResultBytes(null);
    setDoneSnapshot(null);
    setToolState("loading_thumbnails");
    setThumbnailsProgress(0);
    abortRef.current = false;

    try {
      const pdfDoc = await loadPdfForRendering(file);
      const total = pdfDoc.numPages;

      setPdfInfo({ file, name: file.name, size: file.size, totalPages: total });

      for (let i = 1; i <= total; i++) {
        if (abortRef.current) break;

        try {
          const dataUrl = await renderPageToDataURL(pdfDoc, i, 0.35);
          setThumbnails((prev) => [
            ...prev,
            { index: i - 1, dataUrl, selectedForRemoval: false },
          ]);
          setThumbnailsProgress(Math.round((i / total) * 100));
        } catch (renderErr) {
          console.warn(`Page ${i} thumbnail failed:`, renderErr);
          const fallbackCanvas = document.createElement("canvas");
          fallbackCanvas.width = 80;
          fallbackCanvas.height = 110;
          const ctx = fallbackCanvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#F3F3F2";
            ctx.fillRect(0, 0, 80, 110);
          }
          setThumbnails((prev) => [
            ...prev,
            {
              index: i - 1,
              dataUrl: fallbackCanvas.toDataURL(),
              selectedForRemoval: false,
            },
          ]);
          setThumbnailsProgress(Math.round((i / total) * 100));
        }

        await new Promise<void>((resolve) => setTimeout(resolve, 8));
      }

      if (!abortRef.current) {
        setToolState("ready");
      }
    } catch (err) {
      console.error("PDF load error:", err);
      const msg =
        err instanceof Error ? err.message : "Unknown error loading PDF.";
      if (
        msg.toLowerCase().includes("password") ||
        msg.toLowerCase().includes("encrypt")
      ) {
        setErrorMessage(
          "This PDF is password-protected. Please unlock it before uploading."
        );
      } else {
        setErrorMessage(
          "Could not load the PDF. The file may be corrupted or in an unsupported format."
        );
      }
      setToolState("error");
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node))
      setIsDragOver(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleFiles(e.target.files);
    e.target.value = "";
  };

  // ─── Page selection ──────────────────────────────────────────────────────

  const togglePageSelection = (index: number) => {
    if (toolState !== "ready") return;
    setThumbnails((prev) =>
      prev.map((t) =>
        t.index === index ? { ...t, selectedForRemoval: !t.selectedForRemoval } : t
      )
    );
  };

  const selectAll = () => {
    if (toolState !== "ready") return;
    setThumbnails((prev) =>
      prev.map((t) => ({ ...t, selectedForRemoval: true }))
    );
  };

  const deselectAll = () => {
    if (toolState !== "ready") return;
    setThumbnails((prev) =>
      prev.map((t) => ({ ...t, selectedForRemoval: false }))
    );
  };

  const handleRemoveFile = () => {
    abortRef.current = true;
    setPdfInfo(null);
    setThumbnails([]);
    setToolState("idle");
    setErrorMessage(null);
    setResultBytes(null);
    setDoneSnapshot(null);
  };

  const handleReset = () => handleRemoveFile();

  const handleDismissError = () => {
    setErrorMessage(null);
    if (pdfInfo && thumbnails.length > 0) {
      setToolState("ready");
    } else if (pdfInfo) {
      setToolState("loading_thumbnails");
    } else {
      setToolState("idle");
    }
  };

  // ─── Processing ──────────────────────────────────────────────────────────

  const handleRemovePages = async () => {
    if (!pdfInfo || !canProcess) return;

    const indicesToRemove = thumbnails
      .filter((t) => t.selectedForRemoval)
      .map((t) => t.index);

    setToolState("processing");
    setErrorMessage(null);
    setResultBytes(null);
    setDoneSnapshot(null);

    try {
      const bytes = await removePagesFromPDF(pdfInfo.file, indicesToRemove);

      const snapshot: DoneSnapshot = {
        removedCount: indicesToRemove.length,
        remainingCount: pdfInfo.totalPages - indicesToRemove.length,
        outputBytes: bytes.byteLength,
      };

      setResultBytes(bytes);
      setDoneSnapshot(snapshot);
      setToolState("done");
    } catch (err) {
      console.error("Remove pages error:", err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while removing pages."
      );
      setToolState("error");
    }
  };

  const handleDownload = () => {
    if (!resultBytes || !pdfInfo) return;
    const baseName = pdfInfo.name.replace(/\.pdf$/i, "");
    downloadFile(resultBytes, `${baseName}_pages_removed.pdf`);
  };

  // ─── Render helpers ──────────────────────────────────────────────────────

  const isLoadingWithPartialThumbnails =
    toolState === "loading_thumbnails" && thumbnails.length > 0;

  const showThumbnailGrid =
    toolState === "ready" ||
    toolState === "processing" ||
    toolState === "done" ||
    isLoadingWithPartialThumbnails;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-muted relative">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleInputChange}
        className="hidden"
        aria-hidden
      />

      {/* ── Left Panel: Sidebar ────────────────────────────────────────────── */}
      <div className="w-full md:w-[320px] lg:w-[360px] bg-card border-r border-border flex flex-col flex-shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] h-[40vh] md:h-full">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex-shrink-0 bg-muted/40">
          <h2 className="text-[14px] font-bold text-foreground">Remove Pages</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5 font-medium">Select pages you want to delete</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
          {!pdfInfo ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                 <Trash2 className="w-5 h-5 text-[#A1A19D]" />
              </div>
              <p className="text-[13px] font-bold text-foreground">No file selected</p>
              <p className="text-[12px] text-muted-foreground mt-1">Upload a PDF to view and remove pages</p>
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
                  disabled={toolState === "processing"}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-[#A1A19D] hover:text-[#E8607A] hover:bg-primary/10 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Selection Controls */}
              {toolState !== "done" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[13px] font-bold text-foreground">Selection</h3>
                    <span className="text-[12px] font-medium text-muted-foreground">
                      <span className={cn("font-bold", selectedCount > 0 ? "text-[#E8607A]" : "")}>{selectedCount}</span> / {totalPages}
                    </span>
                  </div>
                  
                  <div className="flex bg-[#F3F3F2] rounded-xl p-1 border border-border">
                    <button
                      onClick={selectAll}
                      disabled={toolState !== "ready"}
                      className="flex-1 flex items-center justify-center gap-2 text-[11px] font-bold py-2 rounded-lg transition-all hover:bg-card hover:text-foreground hover:shadow-sm hover:border-border/50 text-muted-foreground disabled:opacity-50"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      Select All
                    </button>
                    <button
                      onClick={deselectAll}
                      disabled={toolState !== "ready"}
                      className="flex-1 flex items-center justify-center gap-2 text-[11px] font-bold py-2 rounded-lg transition-all hover:bg-card hover:text-foreground hover:shadow-sm hover:border-border/50 text-muted-foreground disabled:opacity-50"
                    >
                      <Square className="w-3.5 h-3.5" />
                      Clear All
                    </button>
                  </div>

                  {isAllSelected && toolState === "ready" && (
                    <div className="flex items-start gap-2 p-3 bg-primary/10 text-[#E8607A] rounded-lg border border-[#E8607A]/20 text-[11px] font-bold mt-2">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      You cannot remove all pages. At least one page must remain.
                    </div>
                  )}
                </div>
              )}

              {/* Loading Status */}
              {toolState === "loading_thumbnails" && (
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] font-bold text-foreground flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin text-[#E8607A]" />
                      Generating Previews
                    </span>
                    <span className="text-[12px] font-medium text-muted-foreground tabular-nums">{thumbnailsProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#E8607A] rounded-full transition-all duration-300"
                      style={{ width: `${thumbnailsProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Done Status */}
              {toolState === "done" && doneSnapshot && (
                <div className="pt-4 border-t border-border space-y-3">
                  <h3 className="text-[13px] font-bold text-foreground">Document Summary</h3>
                  <div className="bg-[#F8F8F7] border border-border rounded-xl p-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium mb-1">Removed</p>
                      <p className="text-[20px] font-bold text-[#E8607A] tabular-nums leading-none">
                        {doneSnapshot.removedCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium mb-1">Remaining</p>
                      <p className="text-[20px] font-bold text-[#2F9E44] tabular-nums leading-none">
                        {doneSnapshot.remainingCount}
                      </p>
                    </div>
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
          <div className="absolute inset-0 z-50 bg-[#E8607A]/5 backdrop-blur-[2px] border-4 border-dashed border-[#E8607A] m-4 rounded-2xl flex items-center justify-center pointer-events-none">
            <div className="bg-card px-6 py-4 rounded-xl shadow-lg flex flex-col items-center border border-[#FFC5D3]">
              <Upload className="w-8 h-8 text-[#E8607A] mb-2 animate-bounce" />
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
                   className="flex flex-col items-center p-8 lg:p-12 border-2 border-dashed border-[#D1D1CE] rounded-3xl hover:border-[#E8607A] hover:bg-card/50 transition-all cursor-pointer group"
                 >
                    <div className="w-16 h-16 rounded-2xl bg-card shadow-sm border border-border flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-md transition-all">
                       <Upload className="w-7 h-7 text-[#E8607A]" />
                    </div>
                    <h3 className="text-[20px] font-bold text-foreground mb-2">Upload a PDF to remove pages</h3>
                    <p className="text-[14px] text-muted-foreground">Drag & drop your file anywhere in this space</p>
                 </button>
              </div>
           ) : toolState === "done" && doneSnapshot ? (
             <div className="max-w-xl mx-auto py-10 space-y-6">
                <div className="bg-card p-8 rounded-2xl border border-border shadow-sm text-center">
                   <div className="w-16 h-16 rounded-full bg-[#EBFBEE] flex items-center justify-center mx-auto mb-4">
                     <CheckCircle2 className="w-8 h-8 text-[#2F9E44]" />
                   </div>
                   <h2 className="text-[24px] font-bold text-foreground mb-2">Pages Removed!</h2>
                   <p className="text-muted-foreground text-[14px] mb-6">Your new PDF is ready to download.</p>
                   
                   <button
                     onClick={handleDownload}
                     className="h-12 px-8 bg-[#E8607A] hover:bg-[#D94D6A] text-white rounded-xl font-bold text-[15px] transition-all shadow-md mx-auto flex items-center gap-2"
                   >
                     <Download className="w-5 h-5" />
                     Download PDF ({formatFileSize(doneSnapshot.outputBytes)})
                   </button>
                </div>
             </div>
           ) : (
             <div 
               className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 max-w-6xl mx-auto py-4"
               style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left", transition: "transform 0.2s ease" }}
             >
                {thumbnails.map((thumb) => {
                  const isSelected = thumb.selectedForRemoval;
                  const isInteractive = toolState === "ready";

                  return (
                    <div
                      key={thumb.index}
                      role={isInteractive ? "checkbox" : "img"}
                      aria-checked={isInteractive ? isSelected : undefined}
                      tabIndex={isInteractive ? 0 : -1}
                      onClick={() => isInteractive && togglePageSelection(thumb.index)}
                      className={cn(
                        "relative flex flex-col group transition-all duration-200 rounded-xl overflow-hidden",
                        isInteractive && "cursor-pointer"
                      )}
                    >
                      <div className={cn(
                        "relative aspect-[1/1.4] bg-card rounded-xl shadow-sm overflow-hidden transition-all border-2",
                        isSelected 
                          ? "border-[#E8607A] ring-2 ring-[#E8607A]/20 shadow-[0_4px_16px_rgba(232,96,122,0.15)]" 
                          : "border-border hover:border-[#E8607A]/50 hover:shadow-md"
                      )}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={thumb.dataUrl}
                          alt={`Page ${thumb.index + 1}`}
                          draggable={false}
                          className={cn(
                            "w-full h-full object-cover transition-all duration-200",
                            isSelected ? "opacity-30 grayscale" : "opacity-100"
                          )}
                        />

                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-10 h-10 bg-[#E8607A] rounded-full flex items-center justify-center shadow-md animate-scale-in">
                              <Trash2 className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        )}

                        {!isSelected && isInteractive && (
                          <div className="absolute inset-0 bg-[#E8607A]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>

                      <div className="py-2 text-center">
                        <span
                          className={cn(
                            "text-[12px] font-bold px-2 py-0.5 rounded-full transition-colors",
                            isSelected
                              ? "bg-primary/10 text-[#E8607A]"
                              : "bg-muted text-muted-foreground group-hover:bg-[#E4E4E2] group-hover:text-foreground"
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
                  loadedCount < totalPages &&
                  Array.from({
                    length: Math.min(totalPages - loadedCount, 6),
                  }).map((_, i) => (
                    <div
                      key={`skel-${i}`}
                      className="flex flex-col gap-2 rounded-xl"
                    >
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
                onClick={handleRemovePages}
                disabled={!canProcess}
                className={cn(
                  "flex-1 sm:flex-none h-11 px-8 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all w-full sm:w-auto",
                  toolState === "processing"
                    ? "bg-[#E8607A]/80 text-white cursor-wait"
                    : !canProcess
                    ? "bg-muted text-[#A1A19D] cursor-not-allowed border border-border"
                    : "bg-[#111111] hover:bg-[#333333] text-white shadow-md active:scale-[0.98]"
                )}
              >
                {toolState === "processing" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Remove {selectedCount > 0 ? selectedCount : ""} {selectedCount === 1 ? "Page" : "Pages"}
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
