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
  RotateCw,
  RotateCcw,
  CheckSquare,
  Square,
  FlipHorizontal2,
  Upload,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { validatePDFFile, downloadFile } from "@/lib/splitPdf";
import { loadPdfForRendering, renderPageToDataURL } from "@/lib/pdfRender";
import { rotatePDFPages, type RotationAngle } from "@/lib/rotatePdf";

// ─── Types ───────────────────────────────────────────────────────────────────

type ToolState =
  | "idle"
  | "loading_thumbnails"
  | "ready"
  | "processing"
  | "done"
  | "error";

type VisualRotation = 0 | 90 | 180 | 270;

interface PageThumb {
  index: number;
  dataUrl: string;
  rotation: VisualRotation;
  selected: boolean;
}

interface PDFInfo {
  file: File;
  name: string;
  size: number;
  totalPages: number;
}

interface DoneSnapshot {
  rotatedPages: number;
  totalPages: number;
  outputBytes: number;
}

// ─── Rotation angle options ──────────────────────────────────────────────────

const ANGLE_OPTIONS: { value: RotationAngle; label: string; shortLabel: string; icon: React.ReactNode }[] = [
  {
    value: 90,
    label: "90° clockwise",
    shortLabel: "90° CW",
    icon: <RotateCw className="w-3.5 h-3.5" />,
  },
  {
    value: 270,
    label: "90° counter-clockwise",
    shortLabel: "90° CCW",
    icon: <RotateCcw className="w-3.5 h-3.5" />,
  },
  {
    value: 180,
    label: "180°",
    shortLabel: "180°",
    icon: <FlipHorizontal2 className="w-3.5 h-3.5" />,
  },
];

function addRotation(current: VisualRotation, delta: RotationAngle): VisualRotation {
  return ((current + delta) % 360) as VisualRotation;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RotatePDFTool() {
  const [pdfInfo, setPdfInfo] = useState<PDFInfo | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [toolState, setToolState] = useState<ToolState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [thumbnails, setThumbnails] = useState<PageThumb[]>([]);
  const [thumbProgress, setThumbProgress] = useState(0);
  const [zoom, setZoom] = useState(100);

  const [rotateMode, setRotateMode] = useState<"all" | "selected">("all");

  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [doneSnapshot, setDoneSnapshot] = useState<DoneSnapshot | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<boolean>(false);

  useEffect(() => () => { abortRef.current = true; }, []);

  // ─── Derived ─────────────────────────────────────────────────────────────

  const loadedCount = thumbnails.length;
  const totalPages = pdfInfo?.totalPages ?? 0;
  const selectedCount = thumbnails.filter((t) => t.selected).length;
  const rotatedCount = thumbnails.filter((t) => t.rotation !== 0).length;

  const pagesToRotate = thumbnails.filter((t) => t.rotation !== 0);
  const canProcess = toolState === "ready" && pagesToRotate.length > 0;

  // ─── File handling ────────────────────────────────────────────────────────

  const handleFiles = async (raw: FileList | File[]) => {
    const file = raw[0];
    if (!file) return;

    const err = validatePDFFile(file);
    if (err) {
      setErrorMessage(err);
      setToolState("error");
      return;
    }

    setPdfInfo(null);
    setThumbnails([]);
    setErrorMessage(null);
    setResultBytes(null);
    setDoneSnapshot(null);
    setToolState("loading_thumbnails");
    setThumbProgress(0);
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
            { index: i - 1, dataUrl, rotation: 0, selected: false },
          ]);
        } catch {
          const canvas = document.createElement("canvas");
          canvas.width = 80; canvas.height = 110;
          const ctx = canvas.getContext("2d");
          if (ctx) { ctx.fillStyle = "#F3F3F2"; ctx.fillRect(0, 0, 80, 110); }
          setThumbnails((prev) => [
            ...prev,
            { index: i - 1, dataUrl: canvas.toDataURL(), rotation: 0, selected: false },
          ]);
        }
        setThumbProgress(Math.round((i / total) * 100));
        await new Promise<void>((res) => setTimeout(res, 8));
      }

      if (!abortRef.current) setToolState("ready");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setErrorMessage(
        msg.toLowerCase().includes("password") || msg.toLowerCase().includes("encrypt")
          ? "This PDF is password-protected. Please unlock it before uploading."
          : "Could not load the PDF. The file may be corrupted or in an unsupported format."
      );
      setToolState("error");
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
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

  // ─── Page selection ───────────────────────────────────────────────────────

  const toggleSelect = (index: number) => {
    if (toolState !== "ready") return;
    setThumbnails((prev) =>
      prev.map((t) => (t.index === index ? { ...t, selected: !t.selected } : t))
    );
  };

  const selectAll = () => {
    if (toolState !== "ready") return;
    setThumbnails((prev) => prev.map((t) => ({ ...t, selected: true })));
  };

  const deselectAll = () => {
    if (toolState !== "ready") return;
    setThumbnails((prev) => prev.map((t) => ({ ...t, selected: false })));
  };

  // ─── Rotation application ─────────────────────────────────────────────────

  const applyRotation = (angle: RotationAngle) => {
    if (toolState !== "ready") return;
    setThumbnails((prev) =>
      prev.map((t) => {
        const shouldRotate = rotateMode === "all" || (rotateMode === "selected" && t.selected);
        if (!shouldRotate) return t;
        return { ...t, rotation: addRotation(t.rotation, angle) };
      })
    );
  };

  const resetAllRotations = () => {
    if (toolState !== "ready") return;
    setThumbnails((prev) => prev.map((t) => ({ ...t, rotation: 0 })));
  };

  const resetPageRotation = (index: number) => {
    if (toolState !== "ready") return;
    setThumbnails((prev) =>
      prev.map((t) => (t.index === index ? { ...t, rotation: 0 } : t))
    );
  };

  // ─── File removal / reset ─────────────────────────────────────────────────

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
    if (pdfInfo && thumbnails.length > 0) setToolState("ready");
    else if (pdfInfo) setToolState("loading_thumbnails");
    else setToolState("idle");
  };

  // ─── Processing ───────────────────────────────────────────────────────────

  const handleRotate = async () => {
    if (!pdfInfo || !canProcess) return;

    const rotations = pagesToRotate.map((t) => ({
      pageIndex: t.index,
      angle: t.rotation as RotationAngle,
    }));

    setToolState("processing");
    setErrorMessage(null);
    setResultBytes(null);
    setDoneSnapshot(null);

    try {
      const bytes = await rotatePDFPages(pdfInfo.file, rotations);

      setResultBytes(bytes);
      setDoneSnapshot({
        rotatedPages: rotations.length,
        totalPages: pdfInfo.totalPages,
        outputBytes: bytes.byteLength,
      });
      setToolState("done");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "An error occurred while rotating pages."
      );
      setToolState("error");
    }
  };

  const handleDownload = () => {
    if (!resultBytes || !pdfInfo) return;
    const base = pdfInfo.name.replace(/\.pdf$/i, "");
    downloadFile(resultBytes, `${base}_rotated.pdf`);
  };

  function rotationLabel(deg: VisualRotation): string {
    if (deg === 0) return "";
    if (deg === 90) return "90° CW";
    if (deg === 180) return "180°";
    return "90° CCW";
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-muted relative">
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={handleInputChange} className="hidden" aria-hidden />

      {/* ── Left Panel: Sidebar ────────────────────────────────────────────── */}
      <div className="w-full md:w-[320px] lg:w-[360px] bg-card border-r border-border flex flex-col flex-shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] h-[40vh] md:h-full">
        <div className="px-5 py-4 border-b border-border flex-shrink-0 bg-[#FAFAFA]">
          <h2 className="text-[14px] font-bold text-foreground">Rotate PDF</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5 font-medium">Rotate pages exactly as you want</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
          {!pdfInfo ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#F5F3FF] flex items-center justify-center mb-3">
                 <RotateCw className="w-5 h-5 text-[#7C3AED]" />
              </div>
              <p className="text-[13px] font-bold text-foreground">No file selected</p>
              <p className="text-[12px] text-muted-foreground mt-1">Upload a PDF to view and rotate</p>
            </div>
          ) : (
            <div className="p-5 flex flex-col gap-6">
              {/* File Info */}
              <div className="flex items-center justify-between p-3 bg-[#F8F8F7] border border-[#E5E5E3] rounded-xl shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-[#F5F3FF] rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-[#7C3AED]" />
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
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-[#A1A19D] hover:text-[#7C3AED] hover:bg-[#F5F3FF] transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {toolState !== "done" && (
                <div className="space-y-6">
                   {/* Rotate Mode */}
                   <div className="space-y-3">
                      <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wider">Apply Rotation To</h3>
                      <div className="flex bg-[#F3F3F2] rounded-xl p-1 border border-border">
                         <button
                           onClick={() => setRotateMode("all")}
                           className={cn(
                             "flex-1 text-[12px] font-bold py-2 rounded-lg transition-all",
                             rotateMode === "all" ? "bg-card text-[#7C3AED] shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"
                           )}
                         >
                           All Pages
                         </button>
                         <button
                           onClick={() => setRotateMode("selected")}
                           className={cn(
                             "flex-1 text-[12px] font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-1.5",
                             rotateMode === "selected" ? "bg-card text-[#7C3AED] shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"
                           )}
                         >
                           Selected <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", rotateMode === "selected" ? "bg-[#F5F3FF] text-[#7C3AED]" : "bg-[#E4E4E2] text-muted-foreground")}>{selectedCount}</span>
                         </button>
                      </div>
                   </div>

                   {/* Rotate Actions */}
                   <div className="space-y-3">
                      <div className="flex items-center justify-between">
                         <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wider">Rotate</h3>
                         {rotatedCount > 0 && (
                           <button
                             onClick={resetAllRotations}
                             className="text-[11px] font-bold text-[#E8607A] hover:text-[#D94D6A] flex items-center gap-1"
                           >
                              Reset All ({rotatedCount})
                           </button>
                         )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                         {ANGLE_OPTIONS.map(opt => (
                           <button
                             key={opt.value}
                             onClick={() => applyRotation(opt.value)}
                             disabled={toolState !== "ready" || (rotateMode === "selected" && selectedCount === 0)}
                             className={cn(
                               "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all",
                               toolState === "ready" && (rotateMode === "all" || selectedCount > 0)
                                 ? "bg-card border-border text-muted-foreground hover:text-[#7C3AED] hover:border-[#7C3AED]/50 hover:bg-[#F5F3FF]/50"
                                 : "bg-[#F8F8F7] border-border text-[#A1A19D] cursor-not-allowed",
                               opt.value === 180 && "col-span-2"
                             )}
                           >
                             <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[inherit]">
                                {opt.icon}
                             </div>
                             <span className="text-[12px] font-bold">{opt.label}</span>
                           </button>
                         ))}
                      </div>

                      {rotateMode === "selected" && selectedCount === 0 && (
                         <div className="flex items-start gap-2 p-3 bg-[#F8F8F7] rounded-xl border border-border mt-2">
                            <AlertCircle className="w-4 h-4 text-[#A1A19D] flex-shrink-0 mt-0.5" />
                            <p className="text-[11px] text-muted-foreground leading-tight">
                               Select pages on the canvas first, then use these buttons to rotate them.
                            </p>
                         </div>
                      )}
                   </div>

                   {/* Selection Controls */}
                   {rotateMode === "selected" && toolState === "ready" && (
                      <div className="space-y-3 pt-4 border-t border-border">
                         <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wider">Selection</h3>
                         <div className="flex bg-[#F3F3F2] rounded-xl p-1 border border-border">
                            <button
                              onClick={selectAll}
                              className="flex-1 text-[11px] font-bold py-2 rounded-lg text-muted-foreground hover:bg-card hover:text-foreground transition-all"
                            >
                              Select All
                            </button>
                            <button
                              onClick={deselectAll}
                              className="flex-1 text-[11px] font-bold py-2 rounded-lg text-muted-foreground hover:bg-card hover:text-foreground transition-all"
                            >
                              Clear All
                            </button>
                         </div>
                      </div>
                   )}
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
          <div className="absolute inset-0 z-50 bg-[#7C3AED]/5 backdrop-blur-[2px] border-4 border-dashed border-[#7C3AED] m-4 rounded-2xl flex items-center justify-center pointer-events-none">
            <div className="bg-card px-6 py-4 rounded-xl shadow-lg flex flex-col items-center border border-[#E9D5FF]">
              <Upload className="w-8 h-8 text-[#7C3AED] mb-2 animate-bounce" />
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
                   className="flex flex-col items-center p-8 lg:p-12 border-2 border-dashed border-[#D1D1CE] rounded-3xl hover:border-[#7C3AED] hover:bg-card/50 transition-all cursor-pointer group"
                 >
                    <div className="w-16 h-16 rounded-2xl bg-card shadow-sm border border-border flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-md transition-all">
                       <Upload className="w-7 h-7 text-[#7C3AED]" />
                    </div>
                    <h3 className="text-[20px] font-bold text-foreground mb-2">Upload a PDF to rotate</h3>
                    <p className="text-[14px] text-muted-foreground">Drag & drop your file anywhere in this space</p>
                 </button>
              </div>
           ) : toolState === "done" && doneSnapshot ? (
             <div className="max-w-xl mx-auto py-10 space-y-6">
                <div className="bg-card p-8 rounded-2xl border border-border shadow-sm text-center">
                   <div className="w-16 h-16 rounded-full bg-[#F5F3FF] flex items-center justify-center mx-auto mb-4">
                     <CheckCircle2 className="w-8 h-8 text-[#7C3AED]" />
                   </div>
                   <h2 className="text-[24px] font-bold text-foreground mb-2">Rotation Applied!</h2>
                   <p className="text-muted-foreground text-[14px] mb-6">Rotated {doneSnapshot.rotatedPages} {doneSnapshot.rotatedPages === 1 ? "page" : "pages"}.</p>
                   
                   <button
                     onClick={handleDownload}
                     className="h-12 px-8 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl font-bold text-[15px] transition-all shadow-md mx-auto flex items-center gap-2"
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
                  const isInteractive = toolState === "ready";
                  const isSelected = rotateMode === "selected" && thumb.selected;
                  const hasRotation = thumb.rotation !== 0;

                  return (
                    <div
                      key={thumb.index}
                      role={rotateMode === "selected" && isInteractive ? "checkbox" : undefined}
                      aria-checked={rotateMode === "selected" && isInteractive ? isSelected : undefined}
                      tabIndex={isInteractive ? 0 : -1}
                      onClick={() => rotateMode === "selected" && isInteractive && toggleSelect(thumb.index)}
                      className={cn(
                        "relative flex flex-col group transition-all duration-200 rounded-xl overflow-hidden",
                        rotateMode === "selected" && isInteractive && "cursor-pointer"
                      )}
                    >
                      <div className={cn(
                        "relative aspect-[1/1.4] bg-card rounded-xl shadow-sm overflow-hidden transition-all border-2",
                        isSelected 
                          ? "border-[#7C3AED] ring-2 ring-[#7C3AED]/20 shadow-[0_4px_16px_rgba(124,58,237,0.15)]" 
                          : hasRotation
                          ? "border-[#7C3AED]/50"
                          : "border-border",
                        rotateMode === "selected" && isInteractive && !isSelected && "hover:border-[#7C3AED]/50 hover:shadow-md"
                      )}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={thumb.dataUrl}
                          alt={`Page ${thumb.index + 1}`}
                          draggable={false}
                          className={cn(
                            "w-full h-full object-cover transition-transform duration-300 ease-in-out",
                          )}
                          style={{ transform: `rotate(${thumb.rotation}deg)` }}
                        />

                        {/* Badges and Overlays */}
                        {hasRotation && (
                           <div className="absolute top-2 right-2 bg-[#7C3AED] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md animate-scale-in">
                              {rotationLabel(thumb.rotation)}
                           </div>
                        )}

                        {isSelected && (
                          <div className="absolute top-2 left-2 w-6 h-6 bg-[#7C3AED] rounded-md flex items-center justify-center shadow-md animate-scale-in">
                            <CheckSquare className="w-4 h-4 text-white" />
                          </div>
                        )}

                        {isInteractive && hasRotation && (
                           <button
                             onClick={(e) => { e.stopPropagation(); resetPageRotation(thumb.index); }}
                             className="absolute bottom-2 right-2 w-8 h-8 bg-card/90 backdrop-blur border border-border rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#FFF0F3] hover:border-[#E8607A] hover:text-[#E8607A] shadow-sm"
                             title="Reset rotation"
                           >
                             <RotateCcw className="w-4 h-4" />
                           </button>
                        )}

                        {!isSelected && isInteractive && rotateMode === "selected" && (
                          <div className="absolute inset-0 bg-[#7C3AED]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        )}
                      </div>

                      <div className="py-2 text-center">
                        <span
                          className={cn(
                            "text-[12px] font-bold px-2 py-0.5 rounded-full transition-colors inline-flex items-center justify-center gap-1 min-w-[3rem]",
                            isSelected || hasRotation
                              ? "bg-[#F5F3FF] text-[#7C3AED]"
                              : "bg-muted text-muted-foreground",
                            rotateMode === "selected" && isInteractive && !isSelected && "group-hover:bg-[#E4E4E2] group-hover:text-foreground"
                          )}
                        >
                          {thumb.index + 1}
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
                onClick={handleRotate}
                disabled={!canProcess}
                className={cn(
                  "flex-1 sm:flex-none h-11 px-8 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all w-full sm:w-auto",
                  toolState === "processing"
                    ? "bg-[#7C3AED]/80 text-white cursor-wait"
                    : !canProcess
                    ? "bg-muted text-[#A1A19D] cursor-not-allowed border border-border"
                    : "bg-[#111111] hover:bg-[#333333] text-white shadow-md active:scale-[0.98]"
                )}
              >
                {toolState === "processing" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <RotateCw className="w-4 h-4" />
                    Rotate {rotatedCount > 0 ? rotatedCount : ""} {rotatedCount === 1 ? "Page" : "Pages"}
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
