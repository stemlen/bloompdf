"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import {
  X, Download, Loader2, CheckCircle2, AlertCircle, RefreshCw,
  FileText, Scissors, FileOutput, Layers, Upload, ZoomIn, ZoomOut
} from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import {
  validatePDFFile, parseCustomRanges, parseSpecificPages,
  generateFixedRanges, splitPDF, downloadFile, type SplitRange, type GeneratedFile
} from "@/lib/splitPdf";
import { loadPdfForRendering, renderPageToDataURL } from "@/lib/pdfRender";

type SplitMode = "custom" | "specific" | "fixed";
type SplitState = "idle" | "splitting" | "done" | "error";

interface PDFInfo {
  file: File;
  name: string;
  size: number;
  totalPages: number;
}

interface Thumbnail {
  index: number;
  dataUrl: string;
}

export function SplitPDFTool() {
  const [pdfInfo, setPdfInfo] = useState<PDFInfo | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [parsingPdf, setParsingPdf] = useState(false);
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([]);
  
  const [mode, setMode] = useState<SplitMode>("custom");
  const [customInput, setCustomInput] = useState("");
  const [specificInput, setSpecificInput] = useState("");
  const [fixedInput, setFixedInput] = useState("2");
  
  const [splitState, setSplitState] = useState<SplitState>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [results, setResults] = useState<GeneratedFile[]>([]);
  
  const [zoom, setZoom] = useState(100);

  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  // ─── File handling ────────────────────────────────────────────────────────

  const handleFiles = async (raw: FileList | File[]) => {
    const file = raw[0];
    if (!file) return;

    const err = validatePDFFile(file);
    if (err) {
      setErrorMessage(err);
      setSplitState("error");
      return;
    }

    setParsingPdf(true);
    setErrorMessage(null);
    setThumbnails([]);
    abortRef.current = false;

    try {
      const pdfDoc = await loadPdfForRendering(file);
      const totalPages = pdfDoc.numPages;
      setPdfInfo({ file, name: file.name, size: file.size, totalPages });
      setSplitState("idle");
      
      // Set sensible defaults based on page count
      setCustomInput(`1-${Math.min(5, totalPages)}`);
      setSpecificInput("1, 3");

      // Render actual PDF page previews
      for (let i = 1; i <= totalPages; i++) {
        if (abortRef.current) break;
        try {
          const dataUrl = await renderPageToDataURL(pdfDoc, i, 0.4);
          setThumbnails((prev) => [...prev, { index: i - 1, dataUrl }]);
        } catch (renderErr) {
          console.warn(`Page ${i} thumbnail render error:`, renderErr);
        }
        await new Promise<void>((resolve) => setTimeout(resolve, 8));
      }
    } catch {
      setErrorMessage("Could not read PDF. It might be corrupted or password protected.");
      setSplitState("error");
    } finally {
      setParsingPdf(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }, []);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false);
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleFiles(e.target.files);
    e.target.value = "";
  };

  const handleRemoveFile = () => {
    abortRef.current = true;
    setPdfInfo(null);
    setThumbnails([]);
    setSplitState("idle");
    setErrorMessage(null);
    setResults([]);
  };

  // ─── Mode and Validation ──────────────────────────────────────────────────

  const parsedResult: SplitRange[] | string = useMemo(() => {
    if (!pdfInfo) return [];
    if (mode === "custom") return parseCustomRanges(customInput, pdfInfo.totalPages);
    if (mode === "specific") return parseSpecificPages(specificInput, pdfInfo.totalPages);
    if (mode === "fixed") return generateFixedRanges(parseInt(fixedInput, 10) || 0, pdfInfo.totalPages);
    return [];
  }, [mode, customInput, specificInput, fixedInput, pdfInfo]);

  const rangesToGenerate = Array.isArray(parsedResult) ? parsedResult : [];
  const validationError = typeof parsedResult === "string" ? parsedResult : null;
  const canSplit = rangesToGenerate.length > 0 && splitState !== "splitting" && splitState !== "done";

  // Helper to check if a page is included in any generated range
  const isPageSelected = (pageNum: number) => {
    if (!Array.isArray(parsedResult)) return false;
    return parsedResult.some(r => pageNum >= r.start && pageNum <= r.end);
  };

  const handlePageClick = (pageNum: number) => {
    if (mode !== "specific") return;
    
    // Toggle page in specificInput
    let pages = specificInput.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    if (pages.includes(pageNum)) {
      pages = pages.filter(p => p !== pageNum);
    } else {
      pages.push(pageNum);
      pages.sort((a, b) => a - b);
    }
    setSpecificInput(pages.join(', '));
  };

  // ─── Processing ───────────────────────────────────────────────────────────

  const handleSplit = async () => {
    if (!pdfInfo || !canSplit) return;
    
    setSplitState("splitting");
    setProgress(0);
    setErrorMessage(null);
    setResults([]);
    
    try {
      const generated = await splitPDF(pdfInfo.file, rangesToGenerate, setProgress);
      setResults(generated);
      setSplitState("done");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred during splitting.");
      setSplitState("error");
    }
  };

  const handleDownloadAll = () => {
    results.forEach((res, index) => {
      setTimeout(() => downloadFile(res.bytes, res.name), index * 300);
    });
  };

  const handleReset = () => {
    setSplitState("idle");
    setProgress(0);
    setErrorMessage(null);
    setResults([]);
  };

  const handleDismissError = () => {
    setSplitState("idle");
    setErrorMessage(null);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-muted relative">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={handleInputChange}
        className="hidden"
        aria-hidden
      />

      {/* ── Left Panel: Sidebar ────────────────────────────────────────────── */}
      <div className="w-full md:w-[320px] lg:w-[360px] bg-card border-r border-border flex flex-col flex-shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] h-[40vh] md:h-full">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex-shrink-0 bg-muted/40">
          <h2 className="text-[14px] font-bold text-foreground">Split Settings</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5 font-medium">Configure how to divide your document</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
          {!pdfInfo ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                 <Scissors className="w-5 h-5 text-[#A1A19D]" />
              </div>
              <p className="text-[13px] font-bold text-foreground">No file selected</p>
              <p className="text-[12px] text-muted-foreground mt-1">Upload a PDF to configure split options</p>
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
                  disabled={splitState === "splitting"}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-[#A1A19D] hover:text-[#E8607A] hover:bg-primary/10 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Mode Selection */}
              <div className="space-y-3">
                <h3 className="text-[13px] font-bold text-foreground">Split Mode</h3>
                
                <div className="flex bg-[#F3F3F2] rounded-xl p-1 border border-border">
                  <button
                    onClick={() => setMode("custom")}
                    className={cn(
                      "flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-all",
                      mode === "custom" ? "bg-card text-foreground shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Ranges
                  </button>
                  <button
                    onClick={() => setMode("specific")}
                    className={cn(
                      "flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-all",
                      mode === "specific" ? "bg-card text-foreground shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Specific
                  </button>
                  <button
                    onClick={() => setMode("fixed")}
                    className={cn(
                      "flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-all",
                      mode === "fixed" ? "bg-card text-foreground shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Fixed
                  </button>
                </div>

                {/* Input for Custom */}
                {mode === "custom" && (
                  <div className="space-y-2 animate-fade-in">
                    <label className="text-[12px] font-medium text-muted-foreground">
                      Enter page ranges (e.g., 1-5, 8-10)
                    </label>
                    <input
                      type="text"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      disabled={splitState === "splitting"}
                      className="w-full h-10 px-3 border border-border rounded-lg text-[13px] focus:outline-none focus:border-[#E8607A] focus:ring-1 focus:ring-[#E8607A]"
                    />
                  </div>
                )}

                {/* Input for Specific */}
                {mode === "specific" && (
                  <div className="space-y-2 animate-fade-in">
                    <label className="text-[12px] font-medium text-muted-foreground">
                      Select pages on the right or enter below
                    </label>
                    <input
                      type="text"
                      value={specificInput}
                      onChange={(e) => setSpecificInput(e.target.value)}
                      disabled={splitState === "splitting"}
                      className="w-full h-10 px-3 border border-border rounded-lg text-[13px] focus:outline-none focus:border-[#E8607A] focus:ring-1 focus:ring-[#E8607A]"
                    />
                  </div>
                )}

                {/* Input for Fixed */}
                {mode === "fixed" && (
                  <div className="space-y-2 animate-fade-in">
                    <label className="text-[12px] font-medium text-muted-foreground">
                      Split document every N pages
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={fixedInput}
                      onChange={(e) => setFixedInput(e.target.value)}
                      disabled={splitState === "splitting"}
                      className="w-full h-10 px-3 border border-border rounded-lg text-[13px] focus:outline-none focus:border-[#E8607A] focus:ring-1 focus:ring-[#E8607A]"
                    />
                  </div>
                )}
              </div>

              {/* Output Preview */}
              <div className="pt-4 border-t border-border flex-1 flex flex-col min-h-[150px]">
                <h3 className="text-[13px] font-bold text-foreground mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#A1A19D]" />
                  Generated Files ({rangesToGenerate.length})
                </h3>
                
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                  {validationError ? (
                    <div className="p-3 bg-primary/10 text-[#E8607A] text-[12px] font-medium rounded-lg border border-[#E8607A]/20">
                      {validationError}
                    </div>
                  ) : rangesToGenerate.length > 0 ? (
                    rangesToGenerate.map((r, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 bg-card border border-border rounded-lg shadow-sm">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-6 h-6 bg-muted rounded flex items-center justify-center flex-shrink-0">
                            <FileOutput className="w-3 h-3 text-muted-foreground" />
                          </div>
                          <span className="text-[12px] font-bold text-foreground truncate">
                            File {i + 1}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-bold bg-muted px-2 py-0.5 rounded-full flex-shrink-0 border border-border/50">
                          {r.start === r.end ? `Page ${r.start}` : `p. ${r.start}-${r.end}`}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[12px] text-[#A1A19D] text-center mt-6 font-medium">No ranges specified</p>
                  )}
                </div>
              </div>
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
        {isDragOver && (
          <div className="absolute inset-0 z-50 bg-[#E8607A]/5 backdrop-blur-[2px] border-4 border-dashed border-[#E8607A] m-4 rounded-2xl flex items-center justify-center pointer-events-none">
            <div className="bg-card px-6 py-4 rounded-xl shadow-lg flex flex-col items-center border border-[#FFC5D3]">
              <Upload className="w-8 h-8 text-[#E8607A] mb-2 animate-bounce" />
              <p className="text-[15px] font-bold text-foreground">Drop PDF here</p>
            </div>
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 relative custom-scrollbar bg-muted">
           
           {!pdfInfo ? (
              <div className="absolute inset-0 flex items-center justify-center">
                 <button 
                   onClick={() => inputRef.current?.click()}
                   className="flex flex-col items-center p-8 lg:p-12 border-2 border-dashed border-[#D1D1CE] rounded-3xl hover:border-[#E8607A] hover:bg-card/50 transition-all cursor-pointer group"
                 >
                    <div className="w-16 h-16 rounded-2xl bg-card shadow-sm border border-border flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-md transition-all">
                       {parsingPdf ? (
                          <Loader2 className="w-7 h-7 text-[#E8607A] animate-spin" />
                       ) : (
                          <Upload className="w-7 h-7 text-[#E8607A]" />
                       )}
                    </div>
                    <h3 className="text-[20px] font-bold text-foreground mb-2">Upload a PDF to split</h3>
                    <p className="text-[14px] text-muted-foreground">Drag & drop your file anywhere in this space</p>
                 </button>
              </div>
           ) : splitState === "done" ? (
             <div className="max-w-3xl mx-auto py-10 space-y-6">
                <div className="bg-card p-8 rounded-2xl border border-border shadow-sm text-center">
                   <div className="w-16 h-16 rounded-full bg-[#EBFBEE] flex items-center justify-center mx-auto mb-4">
                     <CheckCircle2 className="w-8 h-8 text-[#2F9E44]" />
                   </div>
                   <h2 className="text-[24px] font-bold text-foreground mb-2">PDF Split Successfully!</h2>
                   <p className="text-muted-foreground text-[14px] mb-6">Generated {results.length} files from your document.</p>
                   
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
                         <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                           <FileOutput className="w-5 h-5 text-[#E8607A]" />
                         </div>
                         <div className="min-w-0">
                           <p className="text-[13px] font-bold text-foreground truncate">{res.name}</p>
                           <p className="text-[11px] text-muted-foreground font-medium">{formatFileSize(res.bytes.byteLength)}</p>
                         </div>
                       </div>
                       <button
                         onClick={() => downloadFile(res.bytes, res.name)}
                         className="w-8 h-8 rounded-lg bg-muted hover:bg-[#E8607A] hover:text-white text-muted-foreground flex items-center justify-center transition-colors flex-shrink-0 ml-2"
                       >
                         <Download className="w-4 h-4" />
                       </button>
                    </div>
                  ))}
                </div>
             </div>
           ) : (
             <div 
               className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-6 max-w-6xl mx-auto py-4"
               style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left", transition: "transform 0.2s ease" }}
             >
                {Array.from({ length: pdfInfo.totalPages }).map((_, i) => {
                  const pageNum = i + 1;
                  const isSelected = isPageSelected(pageNum);
                  const thumb = thumbnails.find((t) => t.index === i);
                  
                  // Visual cut marker for Fixed mode
                  let showCutMarker = false;
                  if (mode === "fixed" && !validationError) {
                    const N = parseInt(fixedInput, 10);
                    if (N > 0 && pageNum % N === 0 && pageNum < pdfInfo.totalPages) {
                      showCutMarker = true;
                    }
                  }

                  return (
                    <div key={pageNum} className="relative flex flex-col gap-2 items-center">
                      <button
                        onClick={() => handlePageClick(pageNum)}
                        disabled={mode !== "specific"}
                        className={cn(
                          "w-full aspect-[1/1.414] rounded-xl shadow-sm border p-2 flex flex-col relative overflow-hidden transition-all text-left bg-card group",
                          isSelected
                            ? "border-[#E8607A] shadow-[0_4px_16px_rgba(232,96,122,0.15)] ring-2 ring-[#E8607A]"
                            : "border-border opacity-70 hover:opacity-100",
                          mode === "specific" && "cursor-pointer hover:border-[#E8607A]/50 hover:shadow-md",
                          mode !== "specific" && "cursor-default"
                        )}
                      >
                         <div className="flex-1 w-full h-full relative overflow-hidden rounded-lg bg-[#FAFAF9] flex items-center justify-center border border-border/30">
                            {thumb?.dataUrl ? (
                              <img
                                src={thumb.dataUrl}
                                alt={`Page ${pageNum}`}
                                className="w-full h-full object-contain pointer-events-none select-none rounded"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center p-3 animate-pulse">
                                <div className="w-12 h-1.5 bg-muted rounded mb-2" />
                                <div className="w-16 h-1 bg-muted rounded mb-1" />
                                <div className="w-10 h-1 bg-muted rounded" />
                              </div>
                            )}
                         </div>

                         {isSelected && mode === "specific" && (
                           <div className="absolute top-2 right-2 w-5 h-5 bg-[#E8607A] text-white rounded-full flex items-center justify-center shadow-md">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                           </div>
                         )}
                      </button>

                      <span className={cn(
                        "text-[12px] font-bold px-2.5 py-0.5 rounded-full transition-colors",
                        isSelected ? "bg-[#E8607A] text-white" : "text-muted-foreground"
                      )}>
                        Page {pageNum}
                      </span>

                      {/* Visual Split Marker for fixed mode */}
                      {showCutMarker && (
                        <div className="absolute -right-3 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 hidden sm:flex flex-col items-center gap-1">
                          <Scissors className="w-4 h-4 text-[#E8607A]" />
                          <div className="w-[1px] h-12 border-l-2 border-dashed border-[#E8607A]/50" />
                        </div>
                      )}
                    </div>
                  );
                })}
             </div>
           )}
        </div>

        {/* Sticky Action Bar */}
        <div className="bg-card border-t border-border h-[80px] px-6 flex items-center justify-between flex-shrink-0 shadow-[0_-8px_24px_rgba(0,0,0,0.02)] z-30 relative">
          
          {errorMessage && splitState === "error" && (
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
             {pdfInfo && splitState !== "done" && (
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
            {splitState === "done" ? (
              <button
                onClick={handleReset}
                className="h-11 px-5 bg-card border border-border hover:bg-muted text-foreground rounded-xl font-bold text-[14px] transition-colors flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <RefreshCw className="w-4 h-4" />
                Start over
              </button>
            ) : (
              <button
                onClick={handleSplit}
                disabled={!canSplit}
                className={cn(
                  "flex-1 sm:flex-none h-11 px-8 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all w-full sm:w-auto",
                  splitState === "splitting"
                    ? "bg-[#E8607A]/80 text-white cursor-wait"
                    : !canSplit
                    ? "bg-muted text-[#A1A19D] cursor-not-allowed border border-border"
                    : "bg-[#111111] hover:bg-[#333333] text-white shadow-md active:scale-[0.98]"
                )}
              >
                {splitState === "splitting" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Splitting ({progress}%)...
                  </>
                ) : (
                  <>
                    <Scissors className="w-4 h-4" />
                    Split PDF
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
