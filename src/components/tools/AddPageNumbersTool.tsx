"use client";

import { useState, useRef, useEffect } from "react";
import {
  X, Upload, Download, Loader2, CheckCircle2, AlertCircle, RefreshCw,
  Hash, LayoutGrid, FileDigit, ChevronLeft, ChevronRight, CheckSquare,
  FileText
} from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { validatePDFFile } from "@/lib/splitPdf";
import { loadPdfForRendering, renderPageToDataURL } from "@/lib/pdfRender";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolState = "idle" | "loading" | "ready" | "processing" | "done" | "error";
type PageMode = "single" | "facing";
type Position = "tl" | "tc" | "tr" | "ml" | "mc" | "mr" | "bl" | "bc" | "br";
type Margin = "none" | "recommended" | "small" | "medium";

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

export function AddPageNumbersTool() {
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

  // Settings
  const [pageMode, setPageMode] = useState<PageMode>("single");
  const [firstPageIsCover, setFirstPageIsCover] = useState(true);
  const [position, setPosition] = useState<Position>("bc");
  const [margin, setMargin] = useState<Margin>("recommended");
  
  const [firstNumber, setFirstNumber] = useState(1);
  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState(1);
  
  const [textFormat, setTextFormat] = useState("{n}");
  const [fontSize, setFontSize] = useState(12);
  const [color, setColor] = useState("#000000");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);

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

  // ── Engine Helpers ───────────────────────────────────────────────────────

  const isLeftPage = (pageIndex0: number) => {
    if (pageMode === "single") return false;
    if (firstPageIsCover) return pageIndex0 % 2 !== 0;
    return pageIndex0 % 2 === 0;
  };

  const getEffectivePosition = (basePos: Position, isLeft: boolean): Position => {
    if (!isLeft) return basePos;
    if (basePos === "tl") return "tr";
    if (basePos === "tr") return "tl";
    if (basePos === "ml") return "mr";
    if (basePos === "mr") return "ml";
    if (basePos === "bl") return "br";
    if (basePos === "br") return "bl";
    return basePos;
  };

  const getPreviewText = (pageIndex0: number) => {
    const pageNum = pageIndex0 + 1;
    const startPage = Number(fromPage);
    const endPage = Number(toPage);
    
    if (pageNum < startPage || pageNum > endPage) return null;
    
    const numberedTotal = endPage - startPage + 1;
    const startPageIndex = startPage - 1;
    const currentPageIndex = pageIndex0;
    const n = Number(firstNumber) + (currentPageIndex - startPageIndex);
    
    return textFormat
      .replace(/\{n\}/g, String(n))
      .replace(/\{total\}/g, String(numberedTotal));
  };

  const getMarginCss = () => {
    switch (margin) {
      case "none": return "4px";
      case "small": return "12px";
      case "medium": return "24px";
      case "recommended": return "36px";
      default: return "24px";
    }
  };

  const getPositionClasses = (effectivePos: Position) => {
    switch(effectivePos) {
      case "tl": return "top-0 left-0";
      case "tc": return "top-0 left-1/2 -translate-x-1/2";
      case "tr": return "top-0 right-0";
      case "ml": return "top-1/2 left-0 -translate-y-1/2";
      case "mc": return "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";
      case "mr": return "top-1/2 right-0 -translate-y-1/2";
      case "bl": return "bottom-0 left-0";
      case "bc": return "bottom-0 left-1/2 -translate-x-1/2";
      case "br": return "bottom-0 right-0";
    }
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : { r: 0, g: 0, b: 0 };
  };

  // ── Processing ───────────────────────────────────────────────────────────

  const handleProcess = async () => {
    if (!pdfBytes) return;
    
    if (fromPage < 1 || toPage < fromPage || toPage > (pdfInfo?.totalPages || 1)) {
      setErrorMessage("Invalid page range.");
      setToolState("error");
      return;
    }

    setToolState("processing");
    setErrorMessage(null);

    try {
      const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();
      const numPages = pages.length;

      let font;
      if (isBold && isItalic) font = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
      else if (isBold) font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      else if (isItalic) font = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
      else font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      const colorRgb = hexToRgb(color);

      let marginPts = 36;
      switch (margin) {
        case "small": marginPts = 18; break;
        case "medium": marginPts = 36; break;
        case "recommended": marginPts = 54; break;
      }

      for (let i = 0; i < numPages; i++) {
        const pageNum = i + 1;
        if (pageNum < fromPage || pageNum > toPage) continue;

        const text = getPreviewText(i);
        if (!text) continue;

        const isLeft = isLeftPage(i);
        const effectivePos = getEffectivePosition(position, isLeft);
        const page = pages[i];
        
        const { width, height } = page.getSize();
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const textHeight = font.heightAtSize(fontSize);

        let x = 0; let y = 0;
        if (effectivePos.endsWith('l')) x = marginPts;
        else if (effectivePos.endsWith('c')) x = (width / 2) - (textWidth / 2);
        else if (effectivePos.endsWith('r')) x = width - marginPts - textWidth;

        if (effectivePos.startsWith('t')) y = height - marginPts - textHeight;
        else if (effectivePos.startsWith('m')) y = (height / 2) - (textHeight / 2);
        else if (effectivePos.startsWith('b')) y = marginPts;

        page.drawText(text, { x, y, size: fontSize, font, color: rgb(colorRgb.r, colorRgb.g, colorRgb.b) });
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
    a.download = pdfInfo.name.replace(/\.pdf$/i, "_numbered.pdf");
    a.click();
  };

  const CheckboxItem = ({ checked, onChange, label, desc, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string; disabled?: boolean }) => (
    <label className={cn("flex items-start gap-2.5 p-2 rounded-xl border transition-colors group", checked ? "bg-primary/10 border-[#E8607A]" : "bg-card border-border", disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-[#E8607A]/50")}>
      <div className={cn("mt-0.5 w-4 h-4 rounded-[4px] border flex items-center justify-center flex-shrink-0 transition-colors", checked && !disabled ? "bg-[#E8607A] border-[#E8607A]" : "border-[#D1D1CE] bg-card")}>
        {checked && <CheckSquare className="w-3 h-3 text-white" />}
        <input type="checkbox" className="hidden" checked={checked} onChange={(e) => !disabled && onChange(e.target.checked)} />
      </div>
      <div>
        <div className={cn("text-[12px] font-bold leading-tight", checked ? "text-[#E8607A]" : "text-foreground")}>{label}</div>
        {desc && <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{desc}</div>}
      </div>
    </label>
  );

  const canProcess = pdfInfo && toolState !== "loading";

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-muted relative">
      <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleInputChange} className="hidden" />

      {/* Left Panel */}
      <div className="w-full md:w-[320px] lg:w-[360px] bg-card border-r border-border flex flex-col flex-shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] h-[40vh] md:h-full">
        <div className="px-5 py-4 border-b border-border flex-shrink-0 bg-muted/40">
          <h2 className="text-[14px] font-bold text-foreground">Add Page Numbers</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5 font-medium">Insert numbers into your PDF pages</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {!pdfInfo ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center h-full">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                 <Hash className="w-5 h-5 text-[#E8607A]" />
              </div>
              <p className="text-[13px] font-bold text-foreground">No file selected</p>
              <p className="text-[12px] text-muted-foreground mt-1">Upload a PDF to number pages</p>
            </div>
          ) : (
            <div className="p-5 flex flex-col gap-6">
              
              {/* File Info */}
              <div className="flex items-center justify-between p-3 bg-[#F8F8F7] border border-[#E5E5E3] rounded-xl shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Hash className="w-4 h-4 text-[#E8607A]" />
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

              {/* Position */}
              <div className="space-y-3">
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

              {/* Page Mode */}
              <div className="space-y-3 border-t border-border pt-5">
                 <label className="text-[12px] font-bold text-foreground">Page Mode</label>
                 <div className="flex gap-2">
                   <button onClick={() => setPageMode("single")} className={cn("flex-1 h-10 rounded-xl border text-[13px] font-bold transition-all", pageMode === "single" ? "bg-[#111111] text-white border-[#111111]" : "bg-card text-muted-foreground border-border")}>Single Page</button>
                   <button onClick={() => setPageMode("facing")} className={cn("flex-1 h-10 rounded-xl border text-[13px] font-bold transition-all", pageMode === "facing" ? "bg-[#111111] text-white border-[#111111]" : "bg-card text-muted-foreground border-border")}>Facing Pages</button>
                 </div>
                 {pageMode === "facing" && (
                   <CheckboxItem checked={firstPageIsCover} onChange={setFirstPageIsCover} label="First page is cover page" desc="Alters left/right page symmetry" />
                 )}
              </div>

              {/* Format & Typography */}
              <div className="space-y-4 border-t border-border pt-5">
                 <div className="space-y-2">
                   <label className="text-[12px] font-bold text-foreground">Text Format</label>
                   <input type="text" value={textFormat} onChange={e => setTextFormat(e.target.value)} className="w-full h-10 px-3 border border-border rounded-xl text-[13px] font-medium focus:outline-none focus:border-[#E8607A] transition-colors" />
                   <p className="text-[11px] text-muted-foreground">Use <code className="bg-[#F3F3F2] px-1.5 py-0.5 rounded text-[#E8607A] font-bold">{`{n}`}</code> for number, <code className="bg-[#F3F3F2] px-1.5 py-0.5 rounded text-[#E8607A] font-bold">{`{total}`}</code> for total pages.</p>
                 </div>
                 
                 <div className="space-y-2">
                    <label className="text-[12px] font-bold text-foreground">Typography</label>
                    <div className="flex gap-2">
                       <button onClick={() => setIsBold(!isBold)} className={cn("flex-1 h-10 rounded-xl border text-[14px] font-serif font-bold transition-all", isBold ? "bg-[#E8607A] text-white border-[#E8607A]" : "bg-card text-foreground border-border")}>B</button>
                       <button onClick={() => setIsItalic(!isItalic)} className={cn("flex-1 h-10 rounded-xl border text-[14px] font-serif italic transition-all", isItalic ? "bg-[#E8607A] text-white border-[#E8607A]" : "bg-card text-foreground border-border")}>I</button>
                       <div className="relative w-14 h-10 rounded-xl border border-border overflow-hidden flex-shrink-0">
                          <input type="color" value={color} onChange={e => setColor(e.target.value)} className="absolute -inset-4 w-24 h-24 cursor-pointer" />
                       </div>
                    </div>
                 </div>
                 <div className="space-y-2 pt-1">
                   <div className="flex justify-between items-center"><label className="text-[12px] font-bold text-foreground">Font Size</label><span className="text-[12px] text-muted-foreground">{fontSize}px</span></div>
                   <input type="range" min="8" max="72" value={fontSize} onChange={e => setFontSize(parseInt(e.target.value))} className="w-full accent-[#E8607A]" />
                 </div>
              </div>

              {/* Range & Margins */}
              <div className="space-y-4 border-t border-border pt-5">
                 <div className="space-y-2">
                    <label className="text-[12px] font-bold text-foreground">Numbering Settings</label>
                    <div className="flex items-center justify-between gap-3 bg-[#F8F8F7] p-2.5 rounded-xl border border-border">
                       <span className="text-[12px] font-bold text-muted-foreground px-1">First Number:</span>
                       <input type="number" min="1" value={firstNumber} onChange={e => setFirstNumber(parseInt(e.target.value) || 1)} className="w-20 h-8 px-2 border border-border rounded-lg text-[13px] font-bold text-center focus:outline-none focus:border-[#E8607A]" />
                    </div>
                 </div>
                 
                 <div className="space-y-2">
                    <label className="text-[12px] font-bold text-foreground">Pages Range</label>
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

                 <div className="space-y-2">
                    <label className="text-[12px] font-bold text-foreground">Margin</label>
                    <select value={margin} onChange={(e) => setMargin(e.target.value as Margin)} className="w-full h-10 px-3 border border-border rounded-xl text-[13px] font-medium focus:outline-none focus:border-[#E8607A] bg-card transition-colors">
                      <option value="recommended">Recommended (0.75")</option>
                      <option value="medium">Medium (0.5")</option>
                      <option value="small">Small (0.25")</option>
                    </select>
                 </div>
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
                   <Hash className="w-7 h-7 text-[#E8607A]" />
                </div>
                <h3 className="text-[20px] font-bold text-foreground mb-2">Upload a PDF Document</h3>
                <p className="text-[14px] text-muted-foreground">Preview page numbers visually in real-time</p>
              </button>
            </div>
          ) : toolState === "done" && resultBlobUrl ? (
            <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full animate-slide-up">
              <div className="w-full bg-card rounded-3xl p-8 border border-border shadow-sm text-center">
                <div className="w-20 h-20 bg-[#ECFDF5] rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-[#10B981]/20">
                  <CheckCircle2 className="w-10 h-10 text-[#10B981]" />
                </div>
                <h2 className="text-[24px] font-bold text-foreground mb-2">Numbers Added!</h2>
                <p className="text-[14px] text-muted-foreground mb-8">Successfully numbered {toPage - fromPage + 1} pages.</p>
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
                      <FileText className="w-4 h-4 text-[#A1A19D]" /> Live Preview
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
                      <div className="relative max-h-full inline-block shadow-2xl rounded-sm bg-card">
                         {/* eslint-disable-next-line @next/next/no-img-element */}
                         <img src={thumbnails[currentPreviewSlide].dataUrl} alt="Preview" className="max-h-[65vh] object-contain transition-all" />
                         
                         {/* Dynamic Page Number Overlay */}
                         {getPreviewText(currentPreviewSlide) && (
                            <div 
                              className={cn("absolute text-center transition-all duration-300", getPositionClasses(getEffectivePosition(position, isLeftPage(currentPreviewSlide))))}
                              style={{
                                margin: getMarginCss(),
                                color,
                                fontSize: `${Math.max(12, fontSize * 0.8)}px`,
                                fontWeight: isBold ? 'bold' : 'normal',
                                fontStyle: isItalic ? 'italic' : 'normal',
                                whiteSpace: 'nowrap',
                                pointerEvents: 'none',
                              }}
                            >
                              {getPreviewText(currentPreviewSlide)}
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
                    toolState === "processing" ? "bg-[#E8607A]/80 text-white cursor-wait" : !canProcess ? "bg-muted text-[#A1A19D] cursor-not-allowed border border-border" : "bg-[#111111] hover:bg-[#333333] text-white"
                  )}
                >
                  {toolState === "processing" ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <><FileDigit className="w-4 h-4" /> Add Page Numbers</>}
                </button>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
