"use client";

import { useState, useRef, useEffect } from "react";
import {
  X,
  Upload,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Crop,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  Layers,
} from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { validatePDFFile } from "@/lib/splitPdf";
import { loadPdfForRendering, renderPageToDataURL } from "@/lib/pdfRender";
import { PDFDocument } from "pdf-lib";

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolState = "idle" | "loading" | "ready" | "processing" | "done" | "error";
type CropRect = { top: number; left: number; width: number; height: number };
type CropScope = "current" | "all";

interface PDFInfo {
  file: File;
  name: string;
  size: number;
  totalPages: number;
}

interface PageThumb {
  index: number;
  dataUrl: string;
  width: number;
  height: number;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CropPdfTool() {
  // State
  const [pdfInfo, setPdfInfo] = useState<PDFInfo | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [toolState, setToolState] = useState<ToolState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Thumbnails
  const [thumbnails, setThumbnails] = useState<PageThumb[]>([]);
  const [currentPreviewSlide, setCurrentPreviewSlide] = useState(0);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);

  // Crop state
  const [crops, setCrops] = useState<{ [key: number]: CropRect }>({});
  const [cropScope, setCropScope] = useState<CropScope>("current");
  const [zoom, setZoom] = useState(100);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag and Resize State
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);

  const defaultCrop: CropRect = { top: 0, left: 0, width: 100, height: 100 };
  const currentCrop = crops[currentPreviewSlide] || defaultCrop;
  const [resultBlobUrl, setResultBlobUrl] = useState<string | null>(null);

  // Refs to always have latest values inside pointer event closures
  const cropScopeRef = useRef<CropScope>("current");
  const currentPreviewSlideRef = useRef<number>(0);
  const thumbnailsRef = useRef<PageThumb[]>([]);
  useEffect(() => { cropScopeRef.current = cropScope; }, [cropScope]);
  useEffect(() => { currentPreviewSlideRef.current = currentPreviewSlide; }, [currentPreviewSlide]);
  useEffect(() => { thumbnailsRef.current = thumbnails; }, [thumbnails]);

  useEffect(() => {
    return () => {
      if (resultBlobUrl) URL.revokeObjectURL(resultBlobUrl);
    };
  }, [resultBlobUrl]);

  // ── File Handling ────────────────────────────────────────────────────────

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
    setCrops({});
    setErrorMessage(null);
    setToolState("loading");
    setCurrentPreviewSlide(0);

    try {
      const buffer = await file.arrayBuffer();
      setPdfBytes(buffer);

      const pdfDoc = await loadPdfForRendering(file);
      const total = pdfDoc.numPages;
      setPdfInfo({ file, name: file.name, size: file.size, totalPages: total });

      const newThumbs: PageThumb[] = [];
      for (let i = 1; i <= total; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 1.0 });
        const dataUrl = await renderPageToDataURL(pdfDoc, i, 1.2);
        newThumbs.push({ index: i - 1, dataUrl, width: viewport.width, height: viewport.height });
      }
      setThumbnails(newThumbs);
      setToolState("ready");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Failed to load PDF");
      setToolState("error");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false);
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleFiles(e.target.files);
    e.target.value = "";
  };

  const handleReset = () => {
    setPdfInfo(null);
    setPdfBytes(null);
    setThumbnails([]);
    setCrops({});
    setCropScope("current");
    setZoom(100);
    if (resultBlobUrl) {
      URL.revokeObjectURL(resultBlobUrl);
      setResultBlobUrl(null);
    }
    setToolState("idle");
    setErrorMessage(null);
  };

  // ── Crop Helpers ─────────────────────────────────────────────────────────

  const updateCurrentCrop = (newCrop: Partial<CropRect>) => {
    const updated = { ...currentCrop, ...newCrop };
    if (cropScope === "all") {
      const newCrops: { [key: number]: CropRect } = {};
      thumbnails.forEach((_, idx) => {
        newCrops[idx] = { ...updated };
      });
      setCrops(newCrops);
    } else {
      setCrops((prev) => ({
        ...prev,
        [currentPreviewSlide]: updated,
      }));
    }
  };

  const handleMarginChange = (edge: "top" | "bottom" | "left" | "right", value: number) => {
    const val = Number.isNaN(value) ? 0 : value;
    const currentTop = currentCrop.top;
    const currentLeft = currentCrop.left;
    const currentBottom = 100 - (currentCrop.top + currentCrop.height);
    const currentRight = 100 - (currentCrop.left + currentCrop.width);

    let newTop = currentTop;
    let newLeft = currentLeft;
    let newHeight = currentCrop.height;
    let newWidth = currentCrop.width;

    if (edge === "top") {
      const clampedTop = Math.max(0, Math.min(100 - currentBottom - 2, val));
      newTop = clampedTop;
      newHeight = 100 - clampedTop - currentBottom;
    } else if (edge === "bottom") {
      const clampedBottom = Math.max(0, Math.min(100 - currentTop - 2, val));
      newHeight = 100 - currentTop - clampedBottom;
    } else if (edge === "left") {
      const clampedLeft = Math.max(0, Math.min(100 - currentRight - 2, val));
      newLeft = clampedLeft;
      newWidth = 100 - clampedLeft - currentRight;
    } else if (edge === "right") {
      const clampedRight = Math.max(0, Math.min(100 - currentLeft - 2, val));
      newWidth = 100 - currentLeft - clampedRight;
    }

    updateCurrentCrop({ top: newTop, left: newLeft, width: newWidth, height: newHeight });
  };

  const handleScopeChange = (newScope: CropScope) => {
    setCropScope(newScope);
    if (newScope === "all") {
      const newCrops: { [key: number]: CropRect } = {};
      thumbnails.forEach((_, idx) => {
        newCrops[idx] = { ...currentCrop };
      });
      setCrops(newCrops);
    }
  };

  const handleResetAll = () => {
    setCrops({});
  };

  // ── Global Pointer Event Dragging (uses refs to avoid stale closures) ────────

  const handlePointerDown = (e: React.PointerEvent, handle: string | null = null) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    // Capture the crop at pointer-down time — this is our fixed reference point
    const startCrop = { ...currentCrop };
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect || containerRect.width === 0 || containerRect.height === 0) return;

    setIsDragging(!handle);
    setIsResizing(handle);

    const onPointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const deltaXPct = (deltaX / containerRect.width) * 100;
      const deltaYPct = (deltaY / containerRect.height) * 100;

      // Always compute from startCrop (fixed at pointer-down) + delta
      let top = startCrop.top;
      let left = startCrop.left;
      let width = startCrop.width;
      let height = startCrop.height;

      if (!handle) {
        // Dragging the crop box itself
        left = Math.max(0, Math.min(100 - width, startCrop.left + deltaXPct));
        top = Math.max(0, Math.min(100 - height, startCrop.top + deltaYPct));
      } else {
        // North (top) edge — moves the top boundary downward/upward
        if (handle.includes("n")) {
          const newTop = Math.max(0, Math.min(startCrop.top + startCrop.height - 2, startCrop.top + deltaYPct));
          top = newTop;
          height = startCrop.height + (startCrop.top - newTop);
        }
        // South (bottom) edge
        if (handle.includes("s")) {
          height = Math.max(2, Math.min(100 - startCrop.top, startCrop.height + deltaYPct));
        }
        // West (left) edge
        if (handle.includes("w")) {
          const newLeft = Math.max(0, Math.min(startCrop.left + startCrop.width - 2, startCrop.left + deltaXPct));
          left = newLeft;
          width = startCrop.width + (startCrop.left - newLeft);
        }
        // East (right) edge
        if (handle.includes("e")) {
          width = Math.max(2, Math.min(100 - startCrop.left, startCrop.width + deltaXPct));
        }
      }

      // Use refs to get the latest scope + slide without stale closure
      const scope = cropScopeRef.current;
      const slide = currentPreviewSlideRef.current;
      const thumbs = thumbnailsRef.current;
      const updated: CropRect = { top, left, width, height };

      if (scope === "all") {
        const newCrops: { [key: number]: CropRect } = {};
        thumbs.forEach((_, idx) => { newCrops[idx] = { ...updated }; });
        setCrops(newCrops);
      } else {
        setCrops((prev) => ({ ...prev, [slide]: updated }));
      }
    };

    const onPointerUp = () => {
      setIsDragging(false);
      setIsResizing(null);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  // ── Processing with Rotation-Aware PDF Crop Box Mapping ────────────────────

  const handleProcess = async () => {
    if (!pdfBytes) return;
    setToolState("processing");
    setErrorMessage(null);

    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();

      for (let i = 0; i < pages.length; i++) {
        const crop = crops[i] || (cropScope === "all" ? currentCrop : defaultCrop);
        if (crop.top === 0 && crop.left === 0 && crop.width === 100 && crop.height === 100) continue;

        const page = pages[i];
        
        // Retrieve page rotation and mediaBox
        const rotationAngle = (page.getRotation().angle % 360 + 360) % 360;
        const mediaBox = page.getMediaBox() || { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() };

        const cL = crop.left / 100;
        const cT = crop.top / 100;
        const cW = crop.width / 100;
        const cH = crop.height / 100;

        // Browser: origin top-left, Y grows down.
        // PDF:     origin bottom-left, Y grows up.
        //
        // Visual crop rect in fractions:
        //   cT = fraction from top of image to top of crop box
        //   cL = fraction from left
        //   cW = fraction of width to keep
        //   cH = fraction of height to keep
        //
        // For 0° rotation:
        //   pdfX = mediaBox.x + cL * mediaBox.width
        //   pdfY = mediaBox.y + (1 - cT - cH) * mediaBox.height  ← bottom of crop box in PDF space
        //   pdfW = cW * mediaBox.width
        //   pdfH = cH * mediaBox.height
        //
        // cT = 0, cH = 1 → full height → pdfY = mediaBox.y (correct: bottom of page)
        // cT = 0.2, cH = 0.8 → crop top 20% → pdfY = mediaBox.y + 0 = mediaBox.y (correct: bottom of kept area)
        // cT = 0, cH = 0.8 → crop bottom 20% → pdfY = mediaBox.y + 0.2 * h (correct: bottom 20% removed)

        let pdfX: number, pdfY: number, pdfW: number, pdfH: number;

        if (rotationAngle === 0) {
          pdfX = mediaBox.x + cL * mediaBox.width;
          pdfY = mediaBox.y + (1 - cT - cH) * mediaBox.height;
          pdfW = cW * mediaBox.width;
          pdfH = cH * mediaBox.height;
        } else if (rotationAngle === 90) {
          // Visual top → PDF right; visual left → PDF bottom
          pdfX = mediaBox.x + cT * mediaBox.width;
          pdfY = mediaBox.y + cL * mediaBox.height;
          pdfW = cH * mediaBox.width;
          pdfH = cW * mediaBox.height;
        } else if (rotationAngle === 180) {
          // Visual top → PDF bottom; visual left → PDF right
          pdfX = mediaBox.x + (1 - cL - cW) * mediaBox.width;
          pdfY = mediaBox.y + cT * mediaBox.height;
          pdfW = cW * mediaBox.width;
          pdfH = cH * mediaBox.height;
        } else if (rotationAngle === 270) {
          // Visual top → PDF left; visual left → PDF top
          pdfX = mediaBox.x + (1 - cT - cH) * mediaBox.width;
          pdfY = mediaBox.y + (1 - cL - cW) * mediaBox.height;
          pdfW = cH * mediaBox.width;
          pdfH = cW * mediaBox.height;
        } else {
          pdfX = mediaBox.x + cL * mediaBox.width;
          pdfY = mediaBox.y + (1 - cT - cH) * mediaBox.height;
          pdfW = cW * mediaBox.width;
          pdfH = cH * mediaBox.height;
        }

        console.log(`[CropPDF] Page ${i + 1}: rotation=${rotationAngle}°`, {
          crop: { top: crop.top, left: crop.left, width: crop.width, height: crop.height },
          mediaBox,
          pdfBox: { pdfX, pdfY, pdfW, pdfH },
        });

        page.setCropBox(pdfX, pdfY, pdfW, pdfH);
        page.setMediaBox(pdfX, pdfY, pdfW, pdfH);
      }

      const finalBytes = await pdfDoc.save();
      const blob = new Blob([finalBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setResultBlobUrl(url);
      setToolState("done");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Processing failed.");
      setToolState("error");
    }
  };

  const handleDownload = () => {
    if (!resultBlobUrl || !pdfInfo) return;
    const a = document.createElement("a");
    a.href = resultBlobUrl;
    a.download = pdfInfo.name.replace(/\.pdf$/i, "_cropped.pdf");
    a.click();
  };

  const renderHandle = (type: string, cls: string) => (
    <div
      onPointerDown={(e) => handlePointerDown(e, type)}
      className={cn("absolute bg-[#E8607A] z-50 transition-transform hover:scale-125 touch-none select-none", cls)}
    />
  );

  const thumbSize = thumbnails[currentPreviewSlide];
  const actualW = thumbSize ? Math.round((currentCrop.width / 100) * thumbSize.width) : 0;
  const actualH = thumbSize ? Math.round((currentCrop.height / 100) * thumbSize.height) : 0;
  const canProcess = pdfInfo && toolState !== "loading";

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-muted relative overflow-hidden">
      <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleInputChange} className="hidden" aria-hidden />

      {/* ── Left Panel: Minimal Controls ─────────────────────────────────── */}
      <div className="w-full md:w-[320px] lg:w-[360px] bg-card border-r border-border flex flex-col flex-shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] h-[40vh] md:h-full">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex-shrink-0 bg-muted/40">
          <h2 className="text-[14px] font-bold text-foreground">Crop PDF</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5 font-medium">Trim margins and crop pages accurately</p>
        </div>

        {/* Scrollable Controls Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-6">
          {!pdfInfo ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center h-full">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <Crop className="w-5 h-5 text-[#E8607A]" />
              </div>
              <p className="text-[13px] font-bold text-foreground">No file selected</p>
              <p className="text-[12px] text-muted-foreground mt-1">Upload a PDF to start cropping</p>
            </div>
          ) : (
            <>
              {/* File Info */}
              <div className="flex items-center justify-between p-3 bg-[#F8F8F7] border border-[#E5E5E3] rounded-xl shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-[#E8607A]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-foreground truncate">{pdfInfo.name}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      {formatFileSize(pdfInfo.size)} <span className="text-[#D1D1CE]">•</span> {pdfInfo.totalPages} pages
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  disabled={toolState === "processing"}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-[#A1A19D] hover:text-[#E8607A] hover:bg-primary/10 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Scope Selection */}
              <div className="space-y-3">
                <label className="text-[12px] font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#A1A19D]" /> Apply Crop To
                </label>
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={toolState === "processing" || toolState === "done"}
                    onClick={() => handleScopeChange("current")}
                    className={cn(
                      "w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all",
                      cropScope === "current"
                        ? "border-[#E8607A] bg-primary/10 shadow-sm"
                        : "border-border bg-card hover:border-[#E8607A]/40",
                      (toolState === "processing" || toolState === "done") && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                      cropScope === "current" ? "border-[#E8607A] bg-[#E8607A]" : "border-[#D1D1CE] bg-card"
                    )}>
                      {cropScope === "current" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={cn("text-[13px] font-bold block", cropScope === "current" ? "text-[#E8607A]" : "text-foreground")}>
                        Current Page Only
                      </span>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        Crop box applies only to Page {currentPreviewSlide + 1}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={toolState === "processing" || toolState === "done"}
                    onClick={() => handleScopeChange("all")}
                    className={cn(
                      "w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all",
                      cropScope === "all"
                        ? "border-[#E8607A] bg-primary/10 shadow-sm"
                        : "border-border bg-card hover:border-[#E8607A]/40",
                      (toolState === "processing" || toolState === "done") && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                      cropScope === "all" ? "border-[#E8607A] bg-[#E8607A]" : "border-[#D1D1CE] bg-card"
                    )}>
                      {cropScope === "all" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={cn("text-[13px] font-bold block", cropScope === "all" ? "text-[#E8607A]" : "text-foreground")}>
                        All Pages
                      </span>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        Apply identical crop area across all {pdfInfo.totalPages} pages
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Crop Margins Precision Inputs */}
              <div className="bg-[#F8F8F7] border border-border rounded-xl p-4 shadow-sm space-y-3">
                <p className="text-[10px] font-bold text-[#A1A19D] uppercase tracking-wider">Crop Margins (%)</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Top Margin */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                      <span>Top</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{Math.round(currentCrop.top)}%</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100 - Math.round(100 - (currentCrop.top + currentCrop.height)) - 2}
                      value={Math.round(currentCrop.top)}
                      disabled={toolState === "processing" || toolState === "done"}
                      onChange={(e) => handleMarginChange("top", parseInt(e.target.value, 10))}
                      className="w-full h-8 px-2.5 text-[12px] font-mono font-bold bg-card border border-border rounded-lg focus:outline-none focus:border-[#E8607A] transition-colors"
                    />
                  </div>

                  {/* Bottom Margin */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                      <span>Bottom</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{Math.round(100 - (currentCrop.top + currentCrop.height))}%</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100 - Math.round(currentCrop.top) - 2}
                      value={Math.round(100 - (currentCrop.top + currentCrop.height))}
                      disabled={toolState === "processing" || toolState === "done"}
                      onChange={(e) => handleMarginChange("bottom", parseInt(e.target.value, 10))}
                      className="w-full h-8 px-2.5 text-[12px] font-mono font-bold bg-card border border-border rounded-lg focus:outline-none focus:border-[#E8607A] transition-colors"
                    />
                  </div>

                  {/* Left Margin */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                      <span>Left</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{Math.round(currentCrop.left)}%</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100 - Math.round(100 - (currentCrop.left + currentCrop.width)) - 2}
                      value={Math.round(currentCrop.left)}
                      disabled={toolState === "processing" || toolState === "done"}
                      onChange={(e) => handleMarginChange("left", parseInt(e.target.value, 10))}
                      className="w-full h-8 px-2.5 text-[12px] font-mono font-bold bg-card border border-border rounded-lg focus:outline-none focus:border-[#E8607A] transition-colors"
                    />
                  </div>

                  {/* Right Margin */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                      <span>Right</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{Math.round(100 - (currentCrop.left + currentCrop.width))}%</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100 - Math.round(currentCrop.left) - 2}
                      value={Math.round(100 - (currentCrop.left + currentCrop.width))}
                      disabled={toolState === "processing" || toolState === "done"}
                      onChange={(e) => handleMarginChange("right", parseInt(e.target.value, 10))}
                      className="w-full h-8 px-2.5 text-[12px] font-mono font-bold bg-card border border-border rounded-lg focus:outline-none focus:border-[#E8607A] transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Crop Bounding Box Dimensions & Reset All */}
              <div className="bg-[#F8F8F7] border border-border rounded-xl p-4 text-center shadow-sm space-y-3">
                <div>
                  <p className="text-[10px] font-bold text-[#A1A19D] uppercase tracking-wider mb-1">Crop Area Size</p>
                  <div className="text-[18px] font-mono font-bold text-foreground">
                    {actualW} <span className="text-[#A1A19D] font-normal mx-1">×</span> {actualH} <span className="text-[12px] font-sans text-muted-foreground font-normal ml-1">pts</span>
                  </div>
                </div>
                <button
                  onClick={handleResetAll}
                  disabled={toolState === "processing" || toolState === "done"}
                  className="w-full text-[12px] font-bold text-foreground bg-card border border-border hover:bg-muted py-2 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#E8607A]" /> Reset All Selections
                </button>
              </div>
            </>
          )}
        </div>

        {/* Fixed Bottom Action Button */}
        {pdfInfo && (
          <div className="p-4 border-t border-border bg-card flex-shrink-0">
            {toolState === "done" ? (
              <button
                onClick={handleDownload}
                className="w-full h-11 bg-[#E8607A] hover:bg-[#D94D6A] text-white rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
            ) : (
              <button
                onClick={handleProcess}
                disabled={!canProcess || toolState === "processing"}
                className={cn(
                  "w-full h-11 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]",
                  toolState === "processing"
                    ? "bg-[#E8607A]/80 text-white cursor-wait"
                    : !canProcess
                    ? "bg-muted text-[#A1A19D] cursor-not-allowed border border-border"
                    : "bg-[#111111] hover:bg-[#333333] text-white cursor-pointer"
                )}
              >
                {toolState === "processing" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Cropping PDF...
                  </>
                ) : (
                  <>
                    <Crop className="w-4 h-4" /> Crop PDF
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Right Panel: Large Preview Workspace ────────────────────────────── */}
      <div
        className="flex-1 flex flex-col relative min-h-0 h-full bg-muted overflow-hidden"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {isDragOver && (
          <div className="absolute inset-0 z-50 bg-[#E8607A]/5 backdrop-blur-[2px] border-4 border-dashed border-[#E8607A] m-4 rounded-2xl flex items-center justify-center pointer-events-none">
            <div className="bg-card px-6 py-4 rounded-xl shadow-lg flex flex-col items-center border border-[#FECDD3]">
              <Upload className="w-8 h-8 text-[#E8607A] mb-2 animate-bounce" />
              <p className="text-[15px] font-bold text-foreground">Drop PDF file here</p>
            </div>
          </div>
        )}

        {!pdfInfo ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center p-8 lg:p-12 border-2 border-dashed border-[#D1D1CE] rounded-3xl hover:border-[#E8607A] hover:bg-card/50 transition-all cursor-pointer group"
            >
              <div className="w-16 h-16 rounded-2xl bg-card shadow-sm border border-border flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-md transition-all">
                <Crop className="w-7 h-7 text-[#E8607A]" />
              </div>
              <h3 className="text-[20px] font-bold text-foreground mb-2">Upload a PDF Document</h3>
              <p className="text-[14px] text-muted-foreground">Interactively crop pages with precision</p>
            </button>
          </div>
        ) : toolState === "done" && resultBlobUrl ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 animate-slide-up">
            <div className="w-full max-w-md bg-card rounded-3xl p-8 border border-border shadow-sm text-center">
              <div className="w-16 h-16 bg-[#ECFDF5] rounded-2xl flex items-center justify-center mx-auto mb-5 border border-[#10B981]/20 shadow-inner">
                <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
              </div>
              <h2 className="text-[24px] font-bold text-foreground mb-2">PDF Cropped Successfully!</h2>
              <p className="text-[14px] text-muted-foreground mb-6">
                Applied crop margins across {pdfInfo.totalPages} {pdfInfo.totalPages === 1 ? "page" : "pages"}.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleReset}
                  className="flex-1 h-11 bg-card border border-border hover:bg-muted text-foreground rounded-xl font-bold text-[14px] transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Start Over
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 h-11 bg-[#E8607A] hover:bg-[#D94D6A] text-white rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-colors shadow-md"
                >
                  <Download className="w-4 h-4" /> Download PDF
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
            {/* Top Workspace Toolbar */}
            <div className="px-6 py-3 border-b border-border bg-card flex flex-wrap items-center justify-between gap-3 flex-shrink-0 z-20 shadow-sm">
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] font-bold text-foreground flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-[#A1A19D]" /> Page Preview Workspace
                </h3>
              </div>

              {/* Page Navigation & Zoom Controls */}
              <div className="flex items-center gap-4">
                {/* Page Selector */}
                {thumbnails.length > 0 && (
                  <div className="flex items-center gap-2 bg-[#F8F8F7] border border-border rounded-xl px-2 py-1">
                    <button
                      onClick={() => setCurrentPreviewSlide((p) => Math.max(0, p - 1))}
                      disabled={currentPreviewSlide === 0}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-card text-foreground disabled:opacity-30 transition-colors"
                      title="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-[12px] font-bold text-foreground min-w-[80px] text-center">
                      Page {currentPreviewSlide + 1} of {pdfInfo.totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPreviewSlide((p) => Math.min(thumbnails.length - 1, p + 1))}
                      disabled={currentPreviewSlide === thumbnails.length - 1}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-card text-foreground disabled:opacity-30 transition-colors"
                      title="Next page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Zoom Controls */}
                <div className="flex items-center bg-[#F8F8F7] border border-border rounded-xl p-1 gap-1">
                  <button
                    onClick={() => setZoom((z) => Math.max(50, z - 25))}
                    disabled={zoom <= 50}
                    className="p-1 hover:bg-card rounded-lg text-foreground disabled:opacity-30"
                    title="Zoom out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[12px] font-bold w-12 text-center text-foreground">{zoom}%</span>
                  <button
                    onClick={() => setZoom((z) => Math.min(200, z + 25))}
                    disabled={zoom >= 200}
                    className="p-1 hover:bg-card rounded-lg text-foreground disabled:opacity-30"
                    title="Zoom in"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                {zoom !== 100 && (
                  <button
                    onClick={() => setZoom(100)}
                    className="h-8 px-2.5 bg-[#F8F8F7] border border-border rounded-xl text-[12px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    title="Reset zoom to fit"
                  >
                    <Maximize2 className="w-3.5 h-3.5" /> Fit
                  </button>
                )}
              </div>
            </div>

            {/* Preview Workspace Area */}
            <div className="flex-1 overflow-auto py-8 px-4 md:px-8 flex flex-col items-center justify-start sm:justify-center relative custom-scrollbar bg-muted/50">
              {toolState === "loading" ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#E8607A] mb-4" />
                  <p className="text-[14px] font-bold text-muted-foreground">Rendering full page preview...</p>
                </div>
              ) : thumbnails.length > 0 ? (
                <div
                  style={{ width: `${zoom}%`, maxWidth: zoom === 100 ? "100%" : "none" }}
                  className="flex items-center justify-center transition-all duration-200 py-6 px-8 my-auto"
                >
                  <div
                    ref={containerRef}
                    className="relative inline-block shadow-2xl rounded-md touch-none select-none max-h-[calc(100vh-260px)]"
                  >
                    {/* Rendered Full PDF Page Image */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumbnails[currentPreviewSlide].dataUrl}
                      alt={`Page ${currentPreviewSlide + 1}`}
                      className="max-h-[calc(100vh-260px)] w-auto object-contain bg-white block relative z-0 pointer-events-none rounded-md"
                      draggable={false}
                    />

                    {/* Crop Overlay Selection Box */}
                    <div
                      className="absolute border border-white z-20 cursor-move group touch-none transition-all duration-75"
                      style={{
                        top: `${currentCrop.top}%`,
                        left: `${currentCrop.left}%`,
                        width: `${currentCrop.width}%`,
                        height: `${currentCrop.height}%`,
                        boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.45), inset 0 0 0 1px rgba(255, 255, 255, 0.6)",
                        clipPath: "inset(-9999px)",
                      }}
                      onPointerDown={(e) => handlePointerDown(e)}
                    >
                      {/* Rule of Thirds Grid */}
                      <div className="absolute top-1/3 left-0 w-full h-px bg-white/20 pointer-events-none" />
                      <div className="absolute top-2/3 left-0 w-full h-px bg-white/20 pointer-events-none" />
                      <div className="absolute left-1/3 top-0 h-full w-px bg-white/20 pointer-events-none" />
                      <div className="absolute left-2/3 top-0 h-full w-px bg-white/20 pointer-events-none" />

                      {/* Edge Drag Hit-Zones for smooth edge resizing */}
                      <div
                        onPointerDown={(e) => handlePointerDown(e, "n")}
                        className="absolute top-0 left-0 w-full h-3 -mt-1.5 cursor-ns-resize z-40 touch-none"
                      />
                      <div
                        onPointerDown={(e) => handlePointerDown(e, "s")}
                        className="absolute bottom-0 left-0 w-full h-3 -mb-1.5 cursor-ns-resize z-40 touch-none"
                      />
                      <div
                        onPointerDown={(e) => handlePointerDown(e, "w")}
                        className="absolute top-0 left-0 h-full w-3 -ml-1.5 cursor-ew-resize z-40 touch-none"
                      />
                      <div
                        onPointerDown={(e) => handlePointerDown(e, "e")}
                        className="absolute top-0 right-0 h-full w-3 -mr-1.5 cursor-ew-resize z-40 touch-none"
                      />

                      {/* 8 Handles */}
                      {renderHandle("nw", "top-0 left-0 w-4 h-4 -ml-2 -mt-2 cursor-nwse-resize rounded-full border-2 border-white shadow-md")}
                      {renderHandle("n", "top-0 left-1/2 w-8 h-4 -ml-4 -mt-2 cursor-ns-resize rounded-full border-2 border-white shadow-md")}
                      {renderHandle("ne", "top-0 right-0 w-4 h-4 -mr-2 -mt-2 cursor-nesw-resize rounded-full border-2 border-white shadow-md")}
                      {renderHandle("w", "top-1/2 left-0 w-4 h-8 -mt-4 -ml-2 cursor-ew-resize rounded-full border-2 border-white shadow-md")}
                      {renderHandle("e", "top-1/2 right-0 w-4 h-8 -mt-4 -mr-2 cursor-ew-resize rounded-full border-2 border-white shadow-md")}
                      {renderHandle("sw", "bottom-0 left-0 w-4 h-4 -ml-2 -mb-2 cursor-nesw-resize rounded-full border-2 border-white shadow-md")}
                      {renderHandle("s", "bottom-0 left-1/2 w-8 h-4 -ml-4 -mb-2 cursor-ns-resize rounded-full border-2 border-white shadow-md")}
                      {renderHandle("se", "bottom-0 right-0 w-4 h-4 -mr-2 -mb-2 cursor-nwse-resize rounded-full border-2 border-white shadow-md")}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
