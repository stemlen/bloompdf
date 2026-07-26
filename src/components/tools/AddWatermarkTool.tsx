"use client";

import { useState, useRef, useEffect } from "react";
import {
  X, Upload, Download, Loader2, CheckCircle2, AlertCircle, RefreshCw,
  Droplets, Image as ImageIcon, Type, Settings, ChevronLeft, ChevronRight,
  Layers, RotateCw, LayoutGrid
} from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { validatePDFFile } from "@/lib/splitPdf";
import { loadPdfForRendering, renderPageToDataURL } from "@/lib/pdfRender";
import { PDFDocument, rgb, StandardFonts, degrees, PDFName, PDFArray, PDFRef } from "pdf-lib";

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolState = "idle" | "loading" | "ready" | "processing" | "done" | "error";
type Position = "tl" | "tc" | "tr" | "ml" | "mc" | "mr" | "bl" | "bc" | "br";
type WatermarkType = "text" | "image";
type LayerOrder = "over" | "below";
type ImageScale = "small" | "medium" | "large" | "custom";
type FontFamily = "Helvetica" | "TimesRoman" | "Courier";

interface PDFInfo {
  file: File;
  name: string;
  size: number;
  totalPages: number;
}

interface PageThumb {
  index: number;
  dataUrl: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AddWatermarkTool() {
  // State
  const [pdfInfo, setPdfInfo] = useState<PDFInfo | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [toolState, setToolState] = useState<ToolState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Thumbnails
  const [thumbnails, setThumbnails] = useState<PageThumb[]>([]);
  const [currentPreviewSlide, setCurrentPreviewSlide] = useState(0);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  // Settings
  const [type, setType] = useState<WatermarkType>("text");
  const [position, setPosition] = useState<Position>("mc");
  const [transparency, setTransparency] = useState(50); // 0 to 100 (50% transparent)
  const [rotation, setRotation] = useState(45); // -180 to 180
  const [layer, setLayer] = useState<LayerOrder>("over");
  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState(1);

  // Text Settings
  const [text, setText] = useState("CONFIDENTIAL");
  const [fontFamily, setFontFamily] = useState<FontFamily>("Helvetica");
  const [fontSize, setFontSize] = useState(48);
  const [color, setColor] = useState("#000000");
  const [isBold, setIsBold] = useState(true);
  const [isItalic, setIsItalic] = useState(false);

  // Image Settings
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageBytes, setImageBytes] = useState<ArrayBuffer | null>(null);
  const [imageScaleMode, setImageScaleMode] = useState<ImageScale>("medium");
  const [customScale, setCustomScale] = useState(50); // 1 to 100

  const [resultBlobUrl, setResultBlobUrl] = useState<string | null>(null);
  
  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      if (resultBlobUrl) URL.revokeObjectURL(resultBlobUrl);
    };
  }, [imagePreviewUrl, resultBlobUrl]);

  // ── File Handling ────────────────────────────────────────────────────────

  const handleFiles = async (raw: FileList | File[]) => {
    const file = raw[0];
    if (!file) return;
    const err = validatePDFFile(file);
    if (err) { setErrorMessage(err); setToolState("error"); return; }

    setPdfInfo(null);
    setThumbnails([]);
    setErrorMessage(null);
    setToolState("loading");
    setCurrentPreviewSlide(0);

    try {
      const buffer = await file.arrayBuffer();
      setPdfBytes(buffer);

      const pdfDoc = await loadPdfForRendering(file);
      const total = pdfDoc.numPages;
      setPdfInfo({ file, name: file.name, size: file.size, totalPages: total });
      setFromPage(1);
      setToPage(total);

      // Generate thumbnails (limit for performance on huge PDFs)
      const limit = Math.min(total, 50);
      const newThumbs: PageThumb[] = [];
      for (let i = 1; i <= limit; i++) {
        const dataUrl = await renderPageToDataURL(pdfDoc, i, 0.4);
        newThumbs.push({ index: i - 1, dataUrl });
      }
      setThumbnails(newThumbs);
      setToolState("ready");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Failed to load PDF");
      setToolState("error");
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please upload a valid image file (PNG, JPG).");
      setToolState("error");
      return;
    }
    setImageFile(file);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
    const buffer = await file.arrayBuffer();
    setImageBytes(buffer);
    if (toolState === "error") setToolState("ready");
  };

  // Drag and drop
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
    setPdfInfo(null); setPdfBytes(null); setThumbnails([]);
    if (resultBlobUrl) { URL.revokeObjectURL(resultBlobUrl); setResultBlobUrl(null); }
    setToolState("idle"); setErrorMessage(null);
  };

  // ── Watermark Engine ─────────────────────────────────────────────────────

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : { r: 0, g: 0, b: 0 };
  };

  const getRotationOffset = (cx: number, cy: number, w: number, h: number, angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    const x = cx - (w / 2) * Math.cos(rad) + (h / 2) * Math.sin(rad);
    const y = cy - (w / 2) * Math.sin(rad) - (h / 2) * Math.cos(rad);
    return { x, y };
  };

  const handleProcess = async () => {
    if (!pdfBytes) return;
    if (type === "image" && !imageBytes) {
      setErrorMessage("Please upload an image for the watermark.");
      setToolState("error");
      return;
    }
    
    // Validate page range
    if (fromPage < 1 || toPage < fromPage || toPage > (pdfInfo?.totalPages || 1)) {
      setErrorMessage("Invalid page range.");
      setToolState("error");
      return;
    }

    setToolState("processing");
    setErrorMessage(null);

    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      const numPages = pages.length;

      let font;
      let embeddedImage;
      let imgWidth = 0;
      let imgHeight = 0;

      if (type === "text") {
        let fontType = StandardFonts.Helvetica;
        if (fontFamily === "TimesRoman") fontType = StandardFonts.TimesRoman;
        else if (fontFamily === "Courier") fontType = StandardFonts.Courier;

        if (isBold && isItalic) {
          if (fontFamily === "Helvetica") fontType = StandardFonts.HelveticaBoldOblique;
          if (fontFamily === "TimesRoman") fontType = StandardFonts.TimesRomanBoldItalic;
          if (fontFamily === "Courier") fontType = StandardFonts.CourierBoldOblique;
        } else if (isBold) {
          if (fontFamily === "Helvetica") fontType = StandardFonts.HelveticaBold;
          if (fontFamily === "TimesRoman") fontType = StandardFonts.TimesRomanBold;
          if (fontFamily === "Courier") fontType = StandardFonts.CourierBold;
        } else if (isItalic) {
          if (fontFamily === "Helvetica") fontType = StandardFonts.HelveticaOblique;
          if (fontFamily === "TimesRoman") fontType = StandardFonts.TimesRomanItalic;
          if (fontFamily === "Courier") fontType = StandardFonts.CourierOblique;
        }
        font = await pdfDoc.embedFont(fontType);
      } else if (type === "image" && imageBytes && imageFile) {
        if (imageFile.type === "image/png") embeddedImage = await pdfDoc.embedPng(imageBytes);
        else if (imageFile.type === "image/jpeg" || imageFile.type === "image/jpg") embeddedImage = await pdfDoc.embedJpg(imageBytes);
        else throw new Error("Unsupported image format. Please use PNG or JPG.");
        imgWidth = embeddedImage.width;
        imgHeight = embeddedImage.height;
      }

      const colorRgb = hexToRgb(color);
      const opacity = 1 - (transparency / 100);
      const marginPts = 36; // 0.5 inch

      for (let i = 0; i < numPages; i++) {
        const pageNum = i + 1;
        if (pageNum < fromPage || pageNum > toPage) continue;
        const page = pages[i];
        const { width: pageWidth, height: pageHeight } = page.getSize();

        let w = 0; let h = 0;

        if (type === "text" && font) {
          w = font.widthOfTextAtSize(text, fontSize);
          h = font.heightAtSize(fontSize);
        } else if (type === "image" && embeddedImage) {
          let scaleFactor = 0.5;
          if (imageScaleMode === "small") scaleFactor = 0.25;
          else if (imageScaleMode === "medium") scaleFactor = 0.5;
          else if (imageScaleMode === "large") scaleFactor = 0.8;
          else if (imageScaleMode === "custom") scaleFactor = customScale / 100;
          const targetWidth = pageWidth * scaleFactor;
          const ratio = imgHeight / imgWidth;
          w = targetWidth; h = targetWidth * ratio;
        }

        let cx = 0; let cy = 0;
        if (position.endsWith('l')) cx = marginPts + w/2;
        else if (position.endsWith('c')) cx = pageWidth / 2;
        else if (position.endsWith('r')) cx = pageWidth - marginPts - w/2;
        if (position.startsWith('t')) cy = pageHeight - marginPts - h/2;
        else if (position.startsWith('m')) cy = pageHeight / 2;
        else if (position.startsWith('b')) cy = marginPts + h/2;

        const { x, y } = getRotationOffset(cx, cy, w, h, rotation);

        if (type === "text" && font) {
          page.drawText(text, { x, y, size: fontSize, font, color: rgb(colorRgb.r, colorRgb.g, colorRgb.b), opacity, rotate: degrees(rotation) });
        } else if (type === "image" && embeddedImage) {
          page.drawImage(embeddedImage, { x, y, width: w, height: h, opacity, rotate: degrees(rotation) });
        }

        if (layer === "below") {
          const contentsRef = page.node.get(PDFName.of('Contents'));
          if (contentsRef) {
            let contentsArray;
            if (contentsRef instanceof PDFRef) contentsArray = pdfDoc.context.lookup(contentsRef);
            if (contentsArray instanceof PDFArray) {
              const size = contentsArray.size();
              if (size > 1) {
                const watermarkStream = contentsArray.get(size - 1);
                contentsArray.remove(size - 1);
                contentsArray.insert(0, watermarkStream);
              }
            }
          }
        }
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
    a.download = pdfInfo.name.replace(/\.pdf$/i, "_watermarked.pdf");
    a.click();
  };

  // ── Preview Helpers ──────────────────────────────────────────────────────

  const getPositionClasses = (pos: Position) => {
    switch(pos) {
      case "tl": return "top-[5%] left-[5%] origin-top-left";
      case "tc": return "top-[5%] left-1/2 -translate-x-1/2 origin-top";
      case "tr": return "top-[5%] right-[5%] origin-top-right";
      case "ml": return "top-1/2 left-[5%] -translate-y-1/2 origin-left";
      case "mc": return "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 origin-center";
      case "mr": return "top-1/2 right-[5%] -translate-y-1/2 origin-right";
      case "bl": return "bottom-[5%] left-[5%] origin-bottom-left";
      case "bc": return "bottom-[5%] left-1/2 -translate-x-1/2 origin-bottom";
      case "br": return "bottom-[5%] right-[5%] origin-bottom-right";
    }
  };

  const getFontFamilyCss = () => {
    if (fontFamily === "Helvetica") return "Arial, Helvetica, sans-serif";
    if (fontFamily === "TimesRoman") return "'Times New Roman', Times, serif";
    if (fontFamily === "Courier") return "'Courier New', Courier, monospace";
    return "Arial";
  };

  const isPreviewVisible = () => {
    const pageNum = currentPreviewSlide + 1;
    return pageNum >= fromPage && pageNum <= toPage;
  };

  const canProcess = pdfInfo && (type === "text" || (type === "image" && imageBytes));

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-muted relative">
      <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleInputChange} className="hidden" />

      {/* Left Panel */}
      <div className="w-full md:w-[320px] lg:w-[360px] bg-card border-r border-border flex flex-col flex-shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] h-[40vh] md:h-full">
        <div className="px-5 py-4 border-b border-border flex-shrink-0 bg-[#FAFAFA]">
          <h2 className="text-[14px] font-bold text-foreground">Add Watermark</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5 font-medium">Stamp text or images on your PDF</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {!pdfInfo ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center h-full">
              <div className="w-12 h-12 rounded-xl bg-[#FFF0F3] flex items-center justify-center mb-3">
                 <Droplets className="w-5 h-5 text-[#E8607A]" />
              </div>
              <p className="text-[13px] font-bold text-foreground">No file selected</p>
              <p className="text-[12px] text-muted-foreground mt-1">Upload a PDF to configure watermarks</p>
            </div>
          ) : (
            <div className="p-5 flex flex-col gap-6">
              
              {/* File Info */}
              <div className="flex items-center justify-between p-3 bg-[#F8F8F7] border border-[#E5E5E3] rounded-xl shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-[#FFF0F3] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Droplets className="w-4 h-4 text-[#E8607A]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-foreground truncate">{pdfInfo.name}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      {formatFileSize(pdfInfo.size)} <span className="text-[#D1D1CE]">•</span> {pdfInfo.totalPages} pages
                    </p>
                  </div>
                </div>
                <button onClick={handleReset} className="w-7 h-7 flex items-center justify-center rounded-lg text-[#A1A19D] hover:text-[#E8607A] hover:bg-[#FFF0F3] transition-colors disabled:opacity-50 flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Type Switcher */}
              <div className="flex bg-[#F3F3F2] p-1 rounded-xl">
                 <button onClick={() => setType("text")} className={cn("flex-1 h-9 rounded-lg text-[13px] font-bold flex items-center justify-center gap-2 transition-all", type === "text" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                   <Type className="w-4 h-4" /> Text
                 </button>
                 <button onClick={() => setType("image")} className={cn("flex-1 h-9 rounded-lg text-[13px] font-bold flex items-center justify-center gap-2 transition-all", type === "image" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                   <ImageIcon className="w-4 h-4" /> Image
                 </button>
              </div>

              {/* Type Specific Options */}
              {type === "text" ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-2">
                    <label className="text-[12px] font-bold text-foreground">Watermark Text</label>
                    <input type="text" value={text} onChange={e => setText(e.target.value)} placeholder="CONFIDENTIAL" className="w-full h-10 px-3 border border-border rounded-xl text-[13px] font-medium focus:outline-none focus:border-[#E8607A] transition-colors" />
                  </div>
                  
                  <div className="space-y-2">
                     <label className="text-[12px] font-bold text-foreground">Typography</label>
                     <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value as FontFamily)} className="w-full h-10 px-3 border border-border rounded-xl text-[13px] font-medium focus:outline-none focus:border-[#E8607A] transition-colors bg-card">
                        <option value="Helvetica">Helvetica</option>
                        <option value="TimesRoman">Times Roman</option>
                        <option value="Courier">Courier</option>
                     </select>
                     <div className="flex gap-2 pt-1">
                        <button onClick={() => setIsBold(!isBold)} className={cn("flex-1 h-10 rounded-xl border text-[14px] font-serif font-bold transition-all", isBold ? "bg-[#E8607A] text-white border-[#E8607A]" : "bg-card text-foreground border-border")}>B</button>
                        <button onClick={() => setIsItalic(!isItalic)} className={cn("flex-1 h-10 rounded-xl border text-[14px] font-serif italic transition-all", isItalic ? "bg-[#E8607A] text-white border-[#E8607A]" : "bg-card text-foreground border-border")}>I</button>
                        <div className="relative w-14 h-10 rounded-xl border border-border overflow-hidden flex-shrink-0">
                           <input type="color" value={color} onChange={e => setColor(e.target.value)} className="absolute -inset-4 w-24 h-24 cursor-pointer" />
                        </div>
                     </div>
                  </div>
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-center"><label className="text-[12px] font-bold text-foreground">Font Size</label><span className="text-[12px] text-muted-foreground">{fontSize}px</span></div>
                    <input type="range" min="12" max="150" value={fontSize} onChange={e => setFontSize(parseInt(e.target.value))} className="w-full accent-[#E8607A]" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-2">
                    <label className="text-[12px] font-bold text-foreground">Watermark Image</label>
                    {imagePreviewUrl ? (
                      <div className="relative border-2 border-border rounded-xl p-2 bg-card flex flex-col items-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imagePreviewUrl} alt="Watermark" className="h-20 object-contain" />
                        <button onClick={() => { setImageFile(null); setImagePreviewUrl(null); setImageBytes(null); }} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white flex items-center justify-center shadow-sm hover:bg-red-600 transition-colors">
                           <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div onClick={() => imgInputRef.current?.click()} className="border-2 border-dashed border-border hover:border-[#E8607A] rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-card">
                        <ImageIcon className="w-6 h-6 text-[#A1A19D] mb-2" />
                        <p className="text-[12px] font-bold text-foreground">Upload Image</p>
                        <p className="text-[11px] text-muted-foreground mt-1">PNG or JPG</p>
                        <input type="file" ref={imgInputRef} accept=".png,.jpg,.jpeg" className="hidden" onChange={e => e.target.files && handleImageUpload(e.target.files[0])} />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                     <label className="text-[12px] font-bold text-foreground">Image Scale</label>
                     <select value={imageScaleMode} onChange={(e) => setImageScaleMode(e.target.value as ImageScale)} className="w-full h-10 px-3 border border-border rounded-xl text-[13px] font-medium focus:outline-none focus:border-[#E8607A] transition-colors bg-card">
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                        <option value="custom">Custom Scale</option>
                     </select>
                     {imageScaleMode === "custom" && (
                        <div className="flex items-center gap-3 pt-2">
                          <input type="range" min="1" max="100" value={customScale} onChange={e => setCustomScale(parseInt(e.target.value))} className="flex-1 accent-[#E8607A]" />
                          <span className="text-[12px] text-muted-foreground w-8">{customScale}%</span>
                        </div>
                     )}
                  </div>
                </div>
              )}

              {/* Shared Options */}
              <div className="space-y-5 border-t border-border pt-5">
                 
                 {/* Position Grid */}
                 <div className="space-y-2">
                    <label className="text-[12px] font-bold text-foreground flex items-center gap-2">
                      <LayoutGrid className="w-3.5 h-3.5 text-[#A1A19D]" /> Position
                    </label>
                    <div className="w-[150px] aspect-[3/4] mx-auto border-2 border-border rounded-xl bg-card p-1.5 grid grid-cols-3 grid-rows-3 gap-1 shadow-sm">
                       {(["tl", "tc", "tr", "ml", "mc", "mr", "bl", "bc", "br"] as Position[]).map(pos => (
                         <button key={pos} onClick={() => setPosition(pos)} className={cn("w-full h-full rounded border flex items-center justify-center transition-all", position === pos ? "bg-[#E8607A] border-[#E8607A] shadow-inner" : "bg-[#F8F8F7] border-border hover:bg-[#F3F3F2]")}>
                           {position === pos && <div className="w-2 h-2 bg-card rounded-full shadow-sm" />}
                         </button>
                       ))}
                    </div>
                 </div>

                 {/* Adjustments */}
                 <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center"><label className="text-[12px] font-bold text-foreground">Transparency</label><span className="text-[12px] text-muted-foreground">{transparency}%</span></div>
                      <input type="range" min="0" max="100" value={transparency} onChange={e => setTransparency(parseInt(e.target.value))} className="w-full accent-[#E8607A]" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center"><label className="text-[12px] font-bold text-foreground">Rotation</label><span className="text-[12px] text-muted-foreground">{rotation}°</span></div>
                      <div className="flex items-center gap-3">
                         <RotateCw className="w-4 h-4 text-[#A1A19D]" />
                         <input type="range" min="-180" max="180" value={rotation} onChange={e => setRotation(parseInt(e.target.value))} className="w-full accent-[#E8607A]" />
                      </div>
                    </div>
                 </div>

                 {/* Pages */}
                 <div className="space-y-2">
                    <label className="text-[12px] font-bold text-foreground">Pages to Watermark</label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-[#A1A19D] uppercase tracking-wider">From</label>
                        <input type="number" min="1" max={pdfInfo?.totalPages || 1} value={fromPage} onChange={e => setFromPage(parseInt(e.target.value) || 1)} className="w-full h-9 px-3 border border-border rounded-xl text-[13px] font-bold text-center focus:outline-none focus:border-[#E8607A]" />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-[#A1A19D] uppercase tracking-wider">To</label>
                        <input type="number" min="1" max={pdfInfo?.totalPages || 1} value={toPage} onChange={e => setToPage(parseInt(e.target.value) || 1)} className="w-full h-9 px-3 border border-border rounded-xl text-[13px] font-bold text-center focus:outline-none focus:border-[#E8607A]" />
                      </div>
                    </div>
                 </div>

                 {/* Layer Order */}
                 <div className="space-y-2">
                    <label className="text-[12px] font-bold text-foreground flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-[#A1A19D]"/> Layering</label>
                    <div className="flex gap-2">
                       <button onClick={() => setLayer("over")} className={cn("flex-1 h-10 rounded-xl border text-[13px] font-bold transition-all", layer === "over" ? "bg-[#111111] text-white border-[#111111]" : "bg-card text-muted-foreground border-border")}>Over Content</button>
                       <button onClick={() => setLayer("below")} className={cn("flex-1 h-10 rounded-xl border text-[13px] font-bold transition-all", layer === "below" ? "bg-[#111111] text-white border-[#111111]" : "bg-card text-muted-foreground border-border")}>Under Content</button>
                    </div>
                 </div>

              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel */}
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
                   <Droplets className="w-7 h-7 text-[#E8607A]" />
                </div>
                <h3 className="text-[20px] font-bold text-foreground mb-2">Upload a PDF Document</h3>
                <p className="text-[14px] text-muted-foreground">Preview watermarks visually in real-time</p>
              </button>
            </div>
          ) : toolState === "done" && resultBlobUrl ? (
            <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full animate-slide-up">
              <div className="w-full bg-card rounded-3xl p-8 border border-border shadow-sm text-center">
                <div className="w-20 h-20 bg-[#ECFDF5] rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-[#10B981]/20">
                  <CheckCircle2 className="w-10 h-10 text-[#10B981]" />
                </div>
                <h2 className="text-[24px] font-bold text-foreground mb-2">Watermark Added!</h2>
                <p className="text-[14px] text-muted-foreground mb-8">Successfully stamped on {toPage - fromPage + 1} pages.</p>
                <button
                   onClick={handleDownload}
                   className="w-full h-12 bg-[#E8607A] hover:bg-[#D94D6A] text-white rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
                >
                   <Download className="w-5 h-5" /> Download PDF
                </button>
              </div>
            </div>
          ) : (
             <div className="flex-1 w-full bg-[#FAFAFA] rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between sticky top-0 z-20">
                   <h3 className="text-[14px] font-bold text-foreground flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-[#A1A19D]" /> Live Preview
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

                <div className="flex-1 overflow-hidden relative flex items-center justify-center p-8 bg-[url('/checkers.svg')]">
                   {toolState === "loading" ? (
                      <div className="flex flex-col items-center">
                         <Loader2 className="w-8 h-8 animate-spin text-[#E8607A] mb-4" />
                         <p className="text-[14px] font-bold text-muted-foreground">Generating preview...</p>
                      </div>
                   ) : thumbnails.length > 0 ? (
                      <div className="relative max-h-full inline-block shadow-2xl rounded-sm">
                         {/* eslint-disable-next-line @next/next/no-img-element */}
                         <img src={thumbnails[currentPreviewSlide].dataUrl} alt="Preview" className={cn("max-h-[65vh] object-contain bg-card transition-all", layer === "below" ? "mix-blend-multiply" : "")} />
                         
                         {/* Dynamic CSS Overlay */}
                         {isPreviewVisible() && (
                            <div 
                              className={cn("absolute pointer-events-none flex items-center justify-center transition-all duration-300", getPositionClasses(position), layer === "below" ? "-z-10" : "z-10")}
                              style={{
                                transform: `rotate(${rotation}deg) translate(-50%, -50%)`,
                                opacity: 1 - transparency / 100,
                              }}
                            >
                               {type === "text" ? (
                                  <div style={{ color, fontSize: `${Math.max(16, fontSize * 0.6)}px`, fontFamily: getFontFamilyCss(), fontWeight: isBold ? 'bold' : 'normal', fontStyle: isItalic ? 'italic' : 'normal', whiteSpace: 'nowrap' }}>
                                    {text || "Sample Text"}
                                  </div>
                               ) : type === "image" && imagePreviewUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={imagePreviewUrl} alt="Watermark Preview" style={{ width: imageScaleMode === "small" ? '100px' : imageScaleMode === "medium" ? '200px' : imageScaleMode === "large" ? '300px' : `${customScale * 4}px`, objectFit: 'contain' }} />
                               ) : null}
                            </div>
                         )}
                      </div>
                   ) : null}
                </div>
             </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="bg-card border-t border-border h-[80px] px-6 flex items-center justify-between flex-shrink-0 shadow-[0_-8px_24px_rgba(0,0,0,0.02)] z-30 relative">
          {errorMessage && toolState === "error" && (
            <div className="absolute -top-16 right-6 flex items-center gap-3 p-3 bg-[#FFF0F3] rounded-xl border border-[#E8607A]/20 shadow-lg animate-slide-up">
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
                    toolState === "processing" ? "bg-[#E8607A]/80 text-white cursor-wait" : !canProcess ? "bg-muted text-[#A1A19D] cursor-not-allowed border border-border" : "bg-[#111111] hover:bg-[#333333] text-white"
                  )}
                >
                  {toolState === "processing" ? <><Loader2 className="w-4 h-4 animate-spin" /> Stamping...</> : <><Droplets className="w-4 h-4" /> Add Watermark</>}
                </button>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
