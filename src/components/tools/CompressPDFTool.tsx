"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Upload,
  X,
  FileText,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  PackageMinus,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import {
  downloadCompressedPDF,
  type CompressionLevel,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/compressPdf";

export interface CompressionResult {
  bytes: Uint8Array;
  originalSize: number;
  compressedSize: number;
  reduction: number;
  modeUsed?: string;
  warningMessage?: string;
}

import { loadPdfForRendering, renderPageToDataURL } from "@/lib/pdfRender";

// ─── Types ─────────────────────────────────────────────────────────────────

type CompressState = "idle" | "loading_preview" | "ready" | "compressing" | "done" | "error";

interface PDFInfo {
  file: File;
  name: string;
  size: number;
  totalPages: number;
  thumbnailDataUrl?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const COMPRESSION_LEVELS: {
  value: CompressionLevel;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    value: "low",
    label: "Less Compression",
    shortLabel: "Low",
    description: "Fastest · Structural rewrite only · Maximum quality preserved",
  },
  {
    value: "medium",
    label: "Recommended",
    shortLabel: "Medium",
    description: "Balanced · Removes metadata · Good reduction for most files",
  },
  {
    value: "high",
    label: "Extreme Compression",
    shortLabel: "High",
    description: "Smallest file · Removes thumbnails & private app data",
  },
  {
    value: "target",
    label: "Custom Target Size",
    shortLabel: "Target",
    description: "Specify a desired maximum file size in MB",
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────

function SizeStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 items-center sm:items-start text-center sm:text-left">
      <span className="text-[12px] font-bold text-[#A1A19D] uppercase tracking-wider">{label}</span>
      <span
        className={cn(
          "text-[24px] lg:text-[32px] font-bold tabular-nums leading-none",
          accent ? "text-[#E8607A]" : "text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export function CompressPDFTool() {
  const [pdfInfo, setPdfInfo] = useState<PDFInfo | null>(null);
  const [level, setLevel] = useState<CompressionLevel>("medium");
  const [targetSize, setTargetSize] = useState<string>("500");
  const [targetUnit, setTargetUnit] = useState<"KB" | "MB">("KB");
  const [isDragOver, setIsDragOver] = useState(false);
  const [compressState, setCompressState] = useState<CompressState>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CompressionResult | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<boolean>(false);

  useEffect(() => () => { abortRef.current = true; }, []);

  // ── File validation & selection ───────────────────────────────────────────

  const handleFiles = async (raw: FileList | File[]) => {
    const f = raw[0];
    if (!f) return;

    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setErrorMessage(`"${f.name}" is not a PDF file.`);
      setCompressState("error");
      return;
    }
    if (f.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(
        `"${f.name}" exceeds the 50 MB size limit (${formatFileSize(f.size)}).`
      );
      setCompressState("error");
      return;
    }

    setPdfInfo(null);
    setCompressState("loading_preview");
    setErrorMessage(null);
    setResult(null);
    setProgress(0);
    abortRef.current = false;

    try {
      // Try to load thumbnail and page count
      const pdfDoc = await loadPdfForRendering(f);
      const totalPages = pdfDoc.numPages;
      let thumbnailDataUrl = "";
      
      try {
         thumbnailDataUrl = await renderPageToDataURL(pdfDoc, 1, 0.5); // moderate scale for single preview
      } catch (e) {
         console.warn("Could not render thumbnail", e);
      }

      if (!abortRef.current) {
         setPdfInfo({
           file: f,
           name: f.name,
           size: f.size,
           totalPages,
           thumbnailDataUrl
         });
         setCompressState("ready");
      }
    } catch (e) {
      if (!abortRef.current) {
        // Fallback: If we can't render it, just allow compression without preview
        setPdfInfo({ file: f, name: f.name, size: f.size, totalPages: 0 });
        setCompressState("ready");
      }
    }
  };

  // ── Drop zone handlers ────────────────────────────────────────────────────

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

  const removeFile = () => {
    abortRef.current = true;
    setPdfInfo(null);
    setCompressState("idle");
    setErrorMessage(null);
    setResult(null);
  };

  const handleReset = () => removeFile();
  const handleDismissError = () => {
    setCompressState(pdfInfo ? "ready" : "idle");
    setErrorMessage(null);
  };

  // ── Compression ───────────────────────────────────────────────────────────

  const handleCompress = async () => {
    if (!pdfInfo || compressState === "compressing") return;
    setCompressState("compressing");
    setProgress(0);
    setErrorMessage(null);
    setResult(null);

    let targetSizeKb: number | undefined;
    if (level === "target") {
      const parsed = parseFloat(targetSize);
      if (isNaN(parsed) || parsed <= 0) {
        setErrorMessage("Please enter a valid target size.");
        setCompressState("error");
        return;
      }
      targetSizeKb = targetUnit === "MB" ? parsed * 1024 : parsed;
    }

    // Simulate progress
    let simProgress = 0;
    const progressInterval = setInterval(() => {
      simProgress += (90 - simProgress) * 0.1;
      setProgress(Math.round(simProgress));
    }, 500);

    try {
      const formData = new FormData();
      formData.append("file", pdfInfo.file);
      formData.append("level", level);
      if (targetSizeKb) formData.append("targetSizeKb", targetSizeKb.toString());

      const res = await fetch("/api/compress-pdf", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let msg = "Failed to compress PDF.";
        try {
          const errData = await res.json();
          msg = errData.error || msg;
        } catch {}
        throw new Error(msg);
      }

      const buffer = await res.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      
      const origStr = res.headers.get("X-Original-Size");
      const compStr = res.headers.get("X-Compressed-Size");
      const redStr = res.headers.get("X-Reduction-Pct");
      const modeUsed = res.headers.get("X-Strategy-Used") || undefined;
      const warnStr = res.headers.get("X-Warning-Message");
      const warningMessage = warnStr ? decodeURIComponent(warnStr) : undefined;

      clearInterval(progressInterval);
      setProgress(100);

      setResult({
        bytes,
        originalSize: origStr ? parseInt(origStr, 10) : pdfInfo.size,
        compressedSize: compStr ? parseInt(compStr, 10) : bytes.byteLength,
        reduction: redStr ? parseInt(redStr, 10) : 0,
        modeUsed,
        warningMessage
      });
      setCompressState("done");
    } catch (err) {
      clearInterval(progressInterval);
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred.");
      setCompressState("error");
    }
  };

  const handleDownload = () => {
    if (!result || !pdfInfo) return;
    downloadCompressedPDF(result.bytes, pdfInfo.name);
  };

  // ── Derived state ─────────────────────────────────────────────────────────

  const canCompress = pdfInfo && compressState === "ready";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-muted relative">
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={handleInputChange} className="hidden" aria-hidden />

      {/* ── Left Panel: Sidebar ────────────────────────────────────────────── */}
      <div className="w-full md:w-[320px] lg:w-[360px] bg-card border-r border-border flex flex-col flex-shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] h-[40vh] md:h-full">
        <div className="px-5 py-4 border-b border-border flex-shrink-0 bg-muted/40">
          <h2 className="text-[14px] font-bold text-foreground">Compress PDF</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5 font-medium">Reduce file size while keeping quality</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
          {!pdfInfo ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                 <PackageMinus className="w-5 h-5 text-[#E8607A]" />
              </div>
              <p className="text-[13px] font-bold text-foreground">No file selected</p>
              <p className="text-[12px] text-muted-foreground mt-1">Upload a PDF to start compressing</p>
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
                      {pdfInfo.totalPages > 0 && (
                        <>
                          <span className="text-[#D1D1CE]">•</span> 
                          {pdfInfo.totalPages} pages
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={removeFile}
                  disabled={compressState === "compressing"}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-[#A1A19D] hover:text-[#E8607A] hover:bg-primary/10 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Compression Levels */}
              {compressState !== "done" && (
                <div className="space-y-3">
                   <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wider">Compression Level</h3>
                   <div className="space-y-2">
                     {COMPRESSION_LEVELS.map((lvl) => (
                       <div key={lvl.value} className="flex flex-col gap-2">
                         <button
                           onClick={() => setLevel(lvl.value)}
                           disabled={compressState === "compressing"}
                           className={cn(
                             "w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all",
                             level === lvl.value
                               ? "border-[#E8607A] bg-primary/10"
                               : "border-[#E5E5E3] bg-card hover:border-[#E8607A]/40",
                             compressState === "compressing" && "opacity-60 cursor-not-allowed"
                           )}
                         >
                           <div
                             className={cn(
                               "w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 transition-all",
                               level === lvl.value
                                 ? "border-[#E8607A] bg-[#E8607A]"
                                 : "border-[#D1D1CE] bg-card"
                             )}
                           >
                             {level === lvl.value && (
                               <div className="w-full h-full flex items-center justify-center">
                                 <div className="w-1.5 h-1.5 bg-card rounded-full" />
                               </div>
                             )}
                           </div>
                           <div className="flex-1 min-w-0">
                             <p
                               className={cn(
                                 "text-[13px] font-bold",
                                 level === lvl.value ? "text-[#E8607A]" : "text-foreground"
                               )}
                             >
                               {lvl.label}
                             </p>
                             <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                               {lvl.description}
                             </p>
                           </div>
                         </button>
                         {level === "target" && lvl.value === "target" && (
                           <div className="pl-10 pr-2 pb-2 animate-fade-in flex items-center gap-2">
                             <label className="text-[12px] font-bold text-muted-foreground whitespace-nowrap">Target Size:</label>
                             <input
                               type="number"
                               min="0.1"
                               step={targetUnit === "MB" ? "0.1" : "1"}
                               value={targetSize}
                               onChange={(e) => setTargetSize(e.target.value)}
                               disabled={compressState === "compressing"}
                               className="w-20 h-9 px-3 border border-border rounded-l-lg text-[13px] font-bold focus:outline-none focus:border-[#E8607A] focus:z-10 focus:ring-1 focus:ring-[#E8607A]/20 transition-all"
                             />
                             <select
                               value={targetUnit}
                               onChange={(e) => setTargetUnit(e.target.value as "KB" | "MB")}
                               disabled={compressState === "compressing"}
                               className="h-9 px-2 -ml-2 border border-border border-l-0 rounded-r-lg text-[13px] font-bold bg-[#F8F8F7] focus:outline-none focus:border-[#E8607A] focus:z-10 focus:ring-1 focus:ring-[#E8607A]/20 transition-all"
                             >
                               <option value="KB">KB</option>
                               <option value="MB">MB</option>
                             </select>
                           </div>
                         )}
                       </div>
                     ))}
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
            <div className="bg-card px-6 py-4 rounded-xl shadow-lg flex flex-col items-center border border-[#FECDD3]">
              <Upload className="w-8 h-8 text-[#E8607A] mb-2 animate-bounce" />
              <p className="text-[15px] font-bold text-foreground">Drop PDF here</p>
            </div>
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 relative custom-scrollbar flex flex-col">
           
           {!pdfInfo ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                 <button 
                   onClick={() => inputRef.current?.click()}
                   className="flex flex-col items-center p-8 lg:p-12 border-2 border-dashed border-[#D1D1CE] rounded-3xl hover:border-[#E8607A] hover:bg-card/50 transition-all cursor-pointer group"
                 >
                    <div className="w-16 h-16 rounded-2xl bg-card shadow-sm border border-border flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-md transition-all">
                       <Upload className="w-7 h-7 text-[#E8607A]" />
                    </div>
                    <h3 className="text-[20px] font-bold text-foreground mb-2">Upload a PDF to compress</h3>
                    <p className="text-[14px] text-muted-foreground">Drag & drop your file anywhere in this space</p>
                 </button>
              </div>
           ) : compressState === "done" && result ? (
             <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full py-10 space-y-8 animate-slide-up">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center shadow-[0_0_0_8px_rgba(232,96,122,0.1)]">
                  <CheckCircle2 className="w-10 h-10 text-[#E8607A]" />
                </div>
                
                <div className="text-center space-y-2">
                   <h2 className="text-[28px] lg:text-[32px] font-bold text-foreground">Compression Complete!</h2>
                   {result.reduction > 0 ? (
                     <p className="text-muted-foreground text-[16px]">We saved <span className="font-bold text-[#E8607A]">{formatFileSize(result.originalSize - result.compressedSize)}</span> ({result.reduction}%) of space.</p>
                   ) : (
                     <p className="text-muted-foreground text-[16px]">We attempted multiple strategies but no further meaningful reduction was achievable.</p>
                   )}
                </div>

                <div className="w-full bg-card rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-[#E4E4E2]">
                   <div className="flex-1 p-8 flex flex-col items-center sm:items-start">
                      <SizeStat label="Original Size" value={formatFileSize(result.originalSize)} />
                   </div>
                   <div className="hidden sm:flex items-center justify-center -mx-4 z-10">
                      <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-[#A1A19D] shadow-sm">
                         <ArrowRight className="w-5 h-5" />
                      </div>
                   </div>
                   <div className="flex-1 p-8 flex flex-col items-center sm:items-end">
                      <SizeStat label="Compressed Size" value={formatFileSize(result.compressedSize)} accent={result.reduction > 0} />
                   </div>
                </div>

                {result.reduction > 0 && (
                   <div className="w-full max-w-md mx-auto space-y-2">
                     <div className="flex items-center justify-between text-[12px] font-bold text-muted-foreground">
                        <span>Reduction: {result.reduction}%</span>
                        <span>{COMPRESSION_LEVELS.find((l) => l.value === level)?.shortLabel} Level</span>
                     </div>
                     <div className="h-3 bg-[#F3F3F2] rounded-full overflow-hidden shadow-inner">
                       <div
                         className="h-full bg-gradient-to-r from-[#E8607A] to-[#D94D6A] rounded-full transition-all duration-1000 ease-out"
                         style={{ width: `${100 - result.reduction}%` }}
                       />
                     </div>
                   </div>
                )}
                
             </div>
           ) : (
             <div className="flex-1 flex items-center justify-center">
                {compressState === "loading_preview" ? (
                   <div className="flex flex-col items-center gap-4 text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin text-[#E8607A]" />
                      <span className="text-[14px] font-bold">Loading PDF...</span>
                   </div>
                ) : (
                   <div className="relative group perspective">
                      <div className="absolute inset-0 bg-[#E8607A]/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500 opacity-50" />
                      {pdfInfo.thumbnailDataUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img 
                          src={pdfInfo.thumbnailDataUrl} 
                          alt="PDF Preview"
                          className="relative z-10 max-h-[60vh] max-w-full object-contain rounded-xl shadow-2xl border border-border/50 bg-card"
                        />
                      ) : (
                        <div className="relative z-10 w-[300px] aspect-[1/1.4] bg-card rounded-xl shadow-2xl border border-border flex flex-col items-center justify-center p-8 text-center text-[#A1A19D]">
                           <FileText className="w-16 h-16 text-[#E8607A]/30 mb-4" />
                           <span className="font-bold text-foreground mb-1 truncate w-full">{pdfInfo.name}</span>
                           <span className="text-[13px]">Preview unavailable</span>
                        </div>
                      )}
                      
                      {compressState === "compressing" && (
                         <div className="absolute inset-0 z-20 bg-card/60 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center">
                            <Loader2 className="w-12 h-12 animate-spin text-[#E8607A] mb-4" />
                            <span className="text-[18px] font-bold text-foreground">Compressing...</span>
                            <span className="text-[24px] font-black text-[#E8607A] mt-2 tabular-nums">{progress}%</span>
                         </div>
                      )}
                   </div>
                )}
             </div>
           )}
        </div>

        {/* Sticky Action Bar */}
        <div className="bg-card border-t border-border h-[80px] px-6 flex items-center justify-between flex-shrink-0 shadow-[0_-8px_24px_rgba(0,0,0,0.02)] z-30 relative">
          
          {errorMessage && compressState === "error" && (
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

          {/* Left Controls (Progress Bar if compressing) */}
          <div className="flex-1 max-w-md hidden md:block">
             {compressState === "compressing" && (
                <div className="space-y-1.5 w-full pr-8 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-muted-foreground">
                      Compressing...
                    </span>
                  </div>
                  <div className="h-2 bg-[#F3F3F2] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#E8607A] rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
             )}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            {compressState === "done" ? (
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
                   Download PDF
                 </button>
              </>
            ) : (
              <button
                onClick={handleCompress}
                disabled={!canCompress}
                className={cn(
                  "flex-1 md:flex-none h-11 px-8 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all w-full md:w-auto",
                  compressState === "compressing"
                    ? "bg-[#E8607A]/80 text-white cursor-wait"
                    : !canCompress
                    ? "bg-muted text-[#A1A19D] cursor-not-allowed border border-border"
                    : "bg-[#111111] hover:bg-[#333333] text-white shadow-md active:scale-[0.98]"
                )}
              >
                {compressState === "compressing" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <PackageMinus className="w-4 h-4" />
                    Compress PDF
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
