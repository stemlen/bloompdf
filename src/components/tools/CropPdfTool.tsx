"use client";

import { useState, useRef, useEffect } from "react";
import {
  X, Upload, Download, Loader2, CheckCircle2, AlertCircle, RefreshCw,
  Crop, Maximize, RotateCcw, Copy, ChevronLeft, ChevronRight, LayoutGrid
} from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { validatePDFFile } from "@/lib/splitPdf";
import { loadPdfForRendering, renderPageToDataURL } from "@/lib/pdfRender";
import { PDFDocument } from "pdf-lib";

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolState = "idle" | "loading" | "ready" | "processing" | "done" | "error";
type CropRect = { top: number; left: number; width: number; height: number };

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
  
  // Crop state per page
  const [crops, setCrops] = useState<{ [key: number]: CropRect }>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag and Resize State
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const dragStartRef = useRef<{ x: number, y: number, crop: CropRect } | null>(null);

  const currentCrop = crops[currentPreviewSlide] || { top: 0, left: 0, width: 100, height: 100 };
  const [resultBlobUrl, setResultBlobUrl] = useState<string | null>(null);
  
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
    if (err) { setErrorMessage(err); setToolState("error"); return; }

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

      const limit = Math.min(total, 50);
      const newThumbs: PageThumb[] = [];
      for (let i = 1; i <= limit; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 1.0 });
        const dataUrl = await renderPageToDataURL(pdfDoc, i, 1.0);
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
    e.preventDefault(); setIsDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false);
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleFiles(e.target.files);
    e.target.value = "";
  };

  const handleReset = () => {
    setPdfInfo(null); setPdfBytes(null); setThumbnails([]); setCrops({});
    if (resultBlobUrl) { URL.revokeObjectURL(resultBlobUrl); setResultBlobUrl(null); }
    setToolState("idle"); setErrorMessage(null);
  };

  // ── Crop Helpers ─────────────────────────────────────────────────────────

  const updateCurrentCrop = (newCrop: Partial<CropRect>) => {
    setCrops(prev => ({
      ...prev,
      [currentPreviewSlide]: { ...currentCrop, ...newCrop }
    }));
  };

  const applyMargin = (marginPct: number) => {
    updateCurrentCrop({
      top: marginPct,
      left: marginPct,
      width: 100 - (marginPct * 2),
      height: 100 - (marginPct * 2)
    });
  };

  const applyToAllPages = () => {
    const newCrops: { [key: number]: CropRect } = {};
    thumbnails.forEach((_, idx) => {
      newCrops[idx] = { ...currentCrop };
    });
    setCrops(newCrops);
  };

  const autoTrim = () => {
    const thumb = thumbnails[currentPreviewSlide];
    if (!thumb) return;
    
    const img = new Image();
    img.src = thumb.dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      
      let top = 0, bottom = canvas.height, left = 0, right = canvas.width;
      
      const isNotWhite = (x: number, y: number) => {
        const idx = (y * canvas.width + x) * 4;
        return data[idx] < 250 || data[idx+1] < 250 || data[idx+2] < 250;
      };

      top_loop: for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          if (isNotWhite(x, y)) { top = y; break top_loop; }
        }
      }
      bottom_loop: for (let y = canvas.height - 1; y >= 0; y--) {
        for (let x = 0; x < canvas.width; x++) {
          if (isNotWhite(x, y)) { bottom = y; break bottom_loop; }
        }
      }
      left_loop: for (let x = 0; x < canvas.width; x++) {
        for (let y = 0; y < canvas.height; y++) {
          if (isNotWhite(x, y)) { left = x; break left_loop; }
        }
      }
      right_loop: for (let x = canvas.width - 1; x >= 0; x--) {
        for (let y = 0; y < canvas.height; y++) {
          if (isNotWhite(x, y)) { right = x; break right_loop; }
        }
      }

      top = Math.max(0, top - 5);
      bottom = Math.min(canvas.height, bottom + 5);
      left = Math.max(0, left - 5);
      right = Math.min(canvas.width, right + 5);

      updateCurrentCrop({
        top: (top / canvas.height) * 100,
        left: (left / canvas.width) * 100,
        width: ((right - left) / canvas.width) * 100,
        height: ((bottom - top) / canvas.height) * 100
      });
    };
  };

  // ── Drag & Resize ────────────────────────────────────────────────────────

  const handlePointerDown = (e: React.PointerEvent, handle: string | null = null) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = { x: e.clientX, y: e.clientY, crop: { ...currentCrop } };
    
    if (handle) setIsResizing(handle);
    else setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    
    const deltaXPct = (deltaX / containerRect.width) * 100;
    const deltaYPct = (deltaY / containerRect.height) * 100;
    
    const startCrop = dragStartRef.current.crop;
    let { top, left, width, height } = startCrop;

    if (isDragging) {
      left = Math.max(0, Math.min(100 - width, startCrop.left + deltaXPct));
      top = Math.max(0, Math.min(100 - height, startCrop.top + deltaYPct));
    } else if (isResizing) {
      if (isResizing.includes('n')) {
        top = Math.max(0, Math.min(startCrop.top + startCrop.height - 2, startCrop.top + deltaYPct));
        height = startCrop.height + (startCrop.top - top);
      }
      if (isResizing.includes('s')) {
        height = Math.max(2, Math.min(100 - startCrop.top, startCrop.height + deltaYPct));
      }
      if (isResizing.includes('w')) {
        left = Math.max(0, Math.min(startCrop.left + startCrop.width - 2, startCrop.left + deltaXPct));
        width = startCrop.width + (startCrop.left - left);
      }
      if (isResizing.includes('e')) {
        width = Math.max(2, Math.min(100 - startCrop.left, startCrop.width + deltaXPct));
      }
    }

    updateCurrentCrop({ top, left, width, height });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    setIsResizing(null);
    dragStartRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // ── Processing ───────────────────────────────────────────────────────────

  const handleProcess = async () => {
    if (!pdfBytes) return;
    setToolState("processing");
    setErrorMessage(null);

    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();

      for (let i = 0; i < pages.length; i++) {
        const crop = crops[i] || { top: 0, left: 0, width: 100, height: 100 };
        if (crop.top === 0 && crop.left === 0 && crop.width === 100 && crop.height === 100) continue;

        const page = pages[i];
        const { width: pageWidth, height: pageHeight } = page.getSize();
        
        const cropX = (crop.left / 100) * pageWidth;
        const cropWidth = (crop.width / 100) * pageWidth;
        const cropHeight = (crop.height / 100) * pageHeight;
        
        const cropY = ((100 - crop.top - crop.height) / 100) * pageHeight;

        page.setCropBox(cropX, cropY, cropWidth, cropHeight);
        page.setMediaBox(cropX, cropY, cropWidth, cropHeight);
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
    <div onPointerDown={(e) => handlePointerDown(e, type)} className={cn("absolute bg-[#E8607A] shadow-sm z-50", cls)} />
  );

  const thumbSize = thumbnails[currentPreviewSlide];
  const actualW = thumbSize ? Math.round((currentCrop.width / 100) * thumbSize.width) : 0;
  const actualH = thumbSize ? Math.round((currentCrop.height / 100) * thumbSize.height) : 0;
  const canProcess = pdfInfo && toolState !== "loading";

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-muted relative">
      <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleInputChange} className="hidden" />

      {/* Left Panel */}
      <div className="w-full md:w-[320px] lg:w-[360px] bg-card border-r border-border flex flex-col flex-shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] h-[40vh] md:h-full">
        <div className="px-5 py-4 border-b border-border flex-shrink-0 bg-muted/40">
          <h2 className="text-[14px] font-bold text-foreground">Crop PDF</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5 font-medium">Trim margins and resize pages</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {!pdfInfo ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center h-full">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                 <Crop className="w-5 h-5 text-[#E8607A]" />
              </div>
              <p className="text-[13px] font-bold text-foreground">No file selected</p>
              <p className="text-[12px] text-muted-foreground mt-1">Upload a PDF to start cropping</p>
            </div>
          ) : (
            <div className="p-5 flex flex-col gap-6">
              
              {/* File Info */}
              <div className="flex items-center justify-between p-3 bg-[#F8F8F7] border border-[#E5E5E3] rounded-xl shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Crop className="w-4 h-4 text-[#E8607A]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-foreground truncate">{pdfInfo.name}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      {formatFileSize(pdfInfo.size)} <span className="text-[#D1D1CE]">•</span> {pdfInfo.totalPages} pages
                    </p>
                  </div>
                </div>
                <button onClick={handleReset} className="w-7 h-7 flex items-center justify-center rounded-lg text-[#A1A19D] hover:text-[#E8607A] hover:bg-primary/10 transition-colors disabled:opacity-50 flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Dimensions Box */}
              <div className="bg-[#F8F8F7] border border-border rounded-xl p-4 text-center shadow-sm">
                <p className="text-[10px] font-bold text-[#A1A19D] uppercase tracking-wider mb-1.5">Current Crop Size</p>
                <div className="text-[18px] font-mono font-bold text-foreground">
                  {actualW} <span className="text-[#A1A19D] font-normal mx-1">×</span> {actualH} <span className="text-[12px] font-sans text-muted-foreground font-normal ml-1">pts</span>
                </div>
                <button onClick={() => applyMargin(0)} className="mt-3 text-[12px] font-bold text-[#E8607A] hover:bg-primary/10 px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 w-full transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" /> Reset Crop Area
                </button>
              </div>

              {/* Smart Tools */}
              <div className="space-y-3 border-t border-border pt-5">
                 <label className="text-[12px] font-bold text-foreground">Smart Crop</label>
                 <button onClick={autoTrim} className="w-full h-11 bg-card border border-border hover:border-[#E8607A] hover:bg-primary/10 rounded-xl text-[13px] font-bold text-foreground flex items-center justify-center gap-2 transition-all shadow-sm group">
                   <Maximize className="w-4 h-4 text-[#A1A19D] group-hover:text-[#E8607A] transition-colors" />
                   Auto-Trim White Margins
                 </button>
                 <p className="text-[11px] text-muted-foreground text-center leading-tight px-2">Automatically detects and snaps the crop box to the content of the current page.</p>
              </div>

              {/* Margin Presets */}
              <div className="space-y-3 border-t border-border pt-5">
                 <label className="text-[12px] font-bold text-foreground">Margin Presets</label>
                 <div className="grid grid-cols-2 gap-2">
                   <button onClick={() => applyMargin(0)} className="h-10 rounded-xl border border-border bg-card hover:border-[#A1A19D] hover:bg-[#F8F8F7] text-[12px] font-bold text-foreground transition-colors">None</button>
                   <button onClick={() => applyMargin(5)} className="h-10 rounded-xl border border-border bg-card hover:border-[#A1A19D] hover:bg-[#F8F8F7] text-[12px] font-bold text-foreground transition-colors">Small</button>
                   <button onClick={() => applyMargin(10)} className="h-10 rounded-xl border border-border bg-card hover:border-[#A1A19D] hover:bg-[#F8F8F7] text-[12px] font-bold text-foreground transition-colors">Medium</button>
                   <button onClick={() => applyMargin(15)} className="h-10 rounded-xl border border-border bg-card hover:border-[#A1A19D] hover:bg-[#F8F8F7] text-[12px] font-bold text-foreground transition-colors">Large</button>
                 </div>
              </div>

              {/* Batch Apply */}
              <div className="space-y-3 border-t border-border pt-5 pb-2">
                 <label className="text-[12px] font-bold text-foreground">Batch Action</label>
                 <button onClick={applyToAllPages} className="w-full h-11 bg-[#111111] hover:bg-[#333333] rounded-xl text-[13px] font-bold text-white flex items-center justify-center gap-2 transition-all shadow-md">
                   <Copy className="w-4 h-4" /> Apply to All Pages
                 </button>
                 <p className="text-[11px] text-muted-foreground text-center leading-tight px-2">Copies the current page&apos;s crop area to the entire document.</p>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Canvas & Action Bar */}
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
              <p className="text-[15px] font-bold text-foreground">Drop PDF here</p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative custom-scrollbar flex flex-col">
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
                <p className="text-[14px] text-muted-foreground">Interactively crop pages in real-time</p>
              </button>
            </div>
          ) : toolState === "done" && resultBlobUrl ? (
            <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full animate-slide-up">
              <div className="w-full bg-card rounded-3xl p-8 border border-border shadow-sm text-center">
                <div className="w-20 h-20 bg-[#ECFDF5] rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-[#10B981]/20">
                  <CheckCircle2 className="w-10 h-10 text-[#10B981]" />
                </div>
                <h2 className="text-[24px] font-bold text-foreground mb-2">PDF Cropped!</h2>
                <p className="text-[14px] text-muted-foreground mb-8">Successfully cropped margins on {pdfInfo.totalPages} pages.</p>
                <button
                   onClick={handleDownload}
                   className="w-full h-12 bg-[#E8607A] hover:bg-[#D94D6A] text-white rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
                >
                   <Download className="w-5 h-5" /> Download PDF
                </button>
              </div>
            </div>
          ) : (
             <div className="flex-1 w-full bg-muted/40 rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between sticky top-0 z-20">
                   <h3 className="text-[14px] font-bold text-foreground flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4 text-[#A1A19D]" /> Interactive Workspace
                   </h3>
                   {thumbnails.length > 0 && (
                     <div className="flex items-center gap-4">
                        <button onClick={() => setCurrentPreviewSlide(Math.max(0, currentPreviewSlide - 1))} disabled={currentPreviewSlide === 0} className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#F3F3F2] hover:bg-[#E8607A] hover:text-white transition-colors disabled:opacity-30 disabled:hover:bg-[#F3F3F2] disabled:hover:text-inherit">
                           <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-[12px] font-bold text-muted-foreground min-w-[50px] text-center">
                           {currentPreviewSlide + 1} / {pdfInfo.totalPages}
                        </span>
                        <button onClick={() => setCurrentPreviewSlide(Math.min(thumbnails.length - 1, currentPreviewSlide + 1))} disabled={currentPreviewSlide === thumbnails.length - 1} className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#F3F3F2] hover:bg-[#E8607A] hover:text-white transition-colors disabled:opacity-30 disabled:hover:bg-[#F3F3F2] disabled:hover:text-inherit">
                           <ChevronRight className="w-4 h-4" />
                        </button>
                     </div>
                   )}
                </div>

                <div className="flex-1 overflow-hidden relative flex items-center justify-center p-8 bg-[url('/checkers.svg')] select-none">
                   {toolState === "loading" ? (
                      <div className="flex flex-col items-center">
                         <Loader2 className="w-8 h-8 animate-spin text-[#E8607A] mb-4" />
                         <p className="text-[14px] font-bold text-muted-foreground">Generating interactive preview...</p>
                      </div>
                   ) : thumbnails.length > 0 ? (
                      <div 
                        ref={containerRef}
                        className="relative inline-block max-h-full shadow-2xl rounded-sm touch-none"
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                      >
                         {/* eslint-disable-next-line @next/next/no-img-element */}
                         <img src={thumbnails[currentPreviewSlide].dataUrl} alt="Preview" className="max-h-[65vh] object-contain bg-card relative z-0 pointer-events-none" draggable={false} />
                         
                         {/* Dark Overlay (Mask) outside crop */}
                         <div className="absolute inset-0 bg-[#111111]/40 z-10 pointer-events-none rounded-sm transition-opacity" />

                         {/* Crop Area */}
                         <div 
                            className="absolute border border-white z-20 cursor-move group touch-none rounded-sm transition-all duration-75"
                            style={{
                               top: `${currentCrop.top}%`,
                               left: `${currentCrop.left}%`,
                               width: `${currentCrop.width}%`,
                               height: `${currentCrop.height}%`,
                               boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255,255,255,0.5)',
                               clipPath: 'inset(0 -9999px -9999px -9999px)'
                            }}
                            onPointerDown={(e) => handlePointerDown(e)}
                         >
                            <div className="absolute inset-0 bg-transparent pointer-events-none" />

                            {/* Grid Lines */}
                            <div className="absolute top-1/3 left-0 w-full h-px bg-card/50 pointer-events-none border-t border-white/20" />
                            <div className="absolute top-2/3 left-0 w-full h-px bg-card/50 pointer-events-none border-t border-white/20" />
                            <div className="absolute left-1/3 top-0 h-full w-px bg-card/50 pointer-events-none border-l border-white/20" />
                            <div className="absolute left-2/3 top-0 h-full w-px bg-card/50 pointer-events-none border-l border-white/20" />

                            {/* Resize Handles */}
                            {renderHandle('nw', 'top-0 left-0 w-4 h-4 -ml-2 -mt-2 cursor-nwse-resize rounded-full border-[3px] border-white')}
                            {renderHandle('n', 'top-0 left-1/2 w-6 h-3 -ml-3 -mt-1.5 cursor-ns-resize rounded-full border-2 border-white')}
                            {renderHandle('ne', 'top-0 right-0 w-4 h-4 -mr-2 -mt-2 cursor-nesw-resize rounded-full border-[3px] border-white')}
                            
                            {renderHandle('w', 'top-1/2 left-0 w-3 h-6 -mt-3 -ml-1.5 cursor-ew-resize rounded-full border-2 border-white')}
                            {renderHandle('e', 'top-1/2 right-0 w-3 h-6 -mt-3 -mr-1.5 cursor-ew-resize rounded-full border-2 border-white')}
                            
                            {renderHandle('sw', 'bottom-0 left-0 w-4 h-4 -ml-2 -mb-2 cursor-nesw-resize rounded-full border-[3px] border-white')}
                            {renderHandle('s', 'bottom-0 left-1/2 w-6 h-3 -ml-3 -mb-1.5 cursor-ns-resize rounded-full border-2 border-white')}
                            {renderHandle('se', 'bottom-0 right-0 w-4 h-4 -mr-2 -mb-2 cursor-nwse-resize rounded-full border-[3px] border-white')}
                         </div>
                      </div>
                   ) : null}
                </div>
             </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="bg-card border-t border-border h-[80px] px-6 flex items-center justify-between flex-shrink-0 shadow-[0_-8px_24px_rgba(0,0,0,0.02)] z-30 relative">
          {errorMessage && toolState === "error" && (
            <div className="absolute -top-16 right-6 flex items-center gap-3 p-3 bg-primary/10 rounded-xl border border-[#E8607A]/20 shadow-lg animate-slide-up">
              <AlertCircle className="w-5 h-5 text-[#E8607A] flex-shrink-0" />
              <p className="text-[12px] font-semibold text-foreground leading-tight max-w-sm">{errorMessage}</p>
              <button onClick={() => { setErrorMessage(null); setToolState(pdfInfo ? "ready" : "idle"); }} className="p-1 hover:bg-[#FFC5D3] rounded-lg text-[#E8607A]"><X className="w-4 h-4" /></button>
            </div>
          )}

          <div className="flex-1" />

          <div className="flex items-center gap-3 w-full md:w-auto">
             {toolState === "done" ? (
               <button onClick={handleReset} className="h-11 px-5 bg-card border border-border hover:bg-muted text-foreground rounded-xl font-bold text-[14px] transition-colors flex items-center justify-center gap-2 w-full md:w-auto">
                  <RefreshCw className="w-4 h-4" /> Reset
               </button>
             ) : (
                <button
                  onClick={handleProcess}
                  disabled={!canProcess || toolState === "processing"}
                  className={cn(
                    "flex-1 md:flex-none h-11 px-8 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] w-full md:w-auto",
                    toolState === "processing" ? "bg-[#E8607A]/80 text-white cursor-wait" : !canProcess ? "bg-muted text-[#A1A19D] cursor-not-allowed border border-border" : "bg-[#E8607A] hover:bg-[#D94D6A] text-white"
                  )}
                >
                  {toolState === "processing" ? <><Loader2 className="w-4 h-4 animate-spin" /> Cropping...</> : <><Crop className="w-4 h-4" /> Crop PDF</>}
                </button>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
