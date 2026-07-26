"use client";

import { useState, useRef } from "react";
import {
  Upload, FileText, Settings, Loader2, Download, AlertCircle, Maximize, CheckSquare, 
  ChevronLeft, ChevronRight, Presentation
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as pdfjsLib from 'pdfjs-dist';
import { loadPdfForRendering, renderPageToDataURL } from "@/lib/pdfRender";
import { PDFDocument, PageSizes, degrees } from "pdf-lib";

type PageSize = "A4" | "Letter" | "Legal" | "A3";
type Margins = "none" | "small" | "medium" | "large";
type Orientation = "portrait" | "landscape";
type Quality = "standard" | "high";

export function PptxToPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [basePdfBlob, setBasePdfBlob] = useState<Blob | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPreviewSlide, setCurrentPreviewSlide] = useState(0);

  // Settings
  const [pageSize, setPageSize] = useState<PageSize>("A4");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [margins, setMargins] = useState<Margins>("medium");
  const [quality, setQuality] = useState<Quality>("standard");
  const [fitSlides, setFitSlides] = useState(true);
  const [preserveRatio, setPreserveRatio] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(false); // UI stub

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (uploadedFile: File) => {
    if (!uploadedFile.name.endsWith('.ppt') && !uploadedFile.name.endsWith('.pptx')) {
      setError("Please upload a .ppt or .pptx file.");
      return;
    }

    setFile(uploadedFile);
    setLoading(true);
    setError(null);
    setBasePdfBlob(null);
    setThumbnails([]);
    setCurrentPreviewSlide(0);

    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);

      const res = await fetch("/api/pptx-to-pdf", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to convert presentation");
      }

      const blob = await res.blob();
      setBasePdfBlob(blob);

      // Render thumbnails
      const tempFile = new File([blob], "preview.pdf");
      const pdfDoc = await loadPdfForRendering(tempFile);
      const numPages = pdfDoc.numPages;
      
      const newThumbnails = [];
      // Render first 50 pages to prevent memory issues on huge presentations
      const limit = Math.min(numPages, 50);
      for (let i = 1; i <= limit; i++) {
        const dataUrl = await renderPageToDataURL(pdfDoc, i, 0.5);
        newThumbnails.push(dataUrl);
      }
      
      setThumbnails(newThumbnails);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!basePdfBlob) return;
    setConverting(true);
    setError(null);

    try {
      const arrayBuffer = await basePdfBlob.arrayBuffer();
      const baseDoc = await PDFDocument.load(arrayBuffer);
      const newDoc = await PDFDocument.create();

      const basePages = baseDoc.getPages();
      const embeddedPages = await newDoc.embedPages(basePages);

      embeddedPages.forEach((embeddedPage) => {
        if (!embeddedPage) throw new Error("embeddedPage is invalid");

        // Determine dimensions based on pageSize
        let width, height;
        switch (pageSize) {
          case "A4": [width, height] = PageSizes.A4; break;
          case "Letter": [width, height] = PageSizes.Letter; break;
          case "Legal": [width, height] = PageSizes.Legal; break;
          case "A3": [width, height] = PageSizes.A3; break;
          default: [width, height] = PageSizes.A4; break;
        }

        if (orientation === "landscape") {
          const temp = width;
          width = height;
          height = temp;
        }

        if (Number.isNaN(width) || Number.isNaN(height)) {
          throw new Error("Target page dimensions are NaN");
        }

        // Determine margins
        let marginPoints = 0;
        switch (margins) {
          case "none": marginPoints = 0; break;
          case "small": marginPoints = 36; break; // 0.5 inch
          case "medium": marginPoints = 72; break; // 1 inch
          case "large": marginPoints = 108; break; // 1.5 inch
        }

        const newPage = newDoc.addPage([width, height]);
        
        const usableWidth = width - (marginPoints * 2);
        const usableHeight = height - (marginPoints * 2);

        const origWidth = embeddedPage.width;
        const origHeight = embeddedPage.height;
        
        if (Number.isNaN(origWidth) || Number.isNaN(origHeight)) {
          throw new Error("embeddedPage dimensions are NaN");
        }

        let scale = 1;
        if (fitSlides) {
           if (preserveRatio) {
               scale = Math.min(usableWidth / origWidth, usableHeight / origHeight);
           } else {
               scale = Math.min(usableWidth / origWidth, usableHeight / origHeight); // Maintain aspect visually in PDF-lib
           }
        }

        const drawWidth = origWidth * scale;
        const drawHeight = origHeight * scale;
        
        if (Number.isNaN(scale) || Number.isNaN(drawWidth) || Number.isNaN(drawHeight)) {
          throw new Error("Scale or draw dimensions calculated as NaN");
        }

        // Center on page
        const x = marginPoints + (usableWidth - drawWidth) / 2;
        const y = marginPoints + (usableHeight - drawHeight) / 2;
        
        if (Number.isNaN(x) || Number.isNaN(y)) {
          throw new Error("Coordinates calculated as NaN");
        }
        
        console.log("Rendering embedded page:", {
          embeddedPage: !!embeddedPage,
          origWidth, origHeight,
          pageWidth: width, pageHeight: height,
          scale, drawWidth, drawHeight, x, y
        });

        newPage.drawPage(embeddedPage, {
          x,
          y,
          width: drawWidth,
          height: drawHeight,
        });
      });

      // Save and download
      const finalBytes = await newDoc.save({ useObjectStreams: false });
      const finalBlob = new Blob([finalBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file?.name ? file.name.replace(/\.pptx?$/i, ".pdf") : `presentation_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during conversion.");
    } finally {
      setConverting(false);
    }
  };

  const CheckboxItem = ({ checked, onChange, label, desc, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string; disabled?: boolean }) => (
    <label className={cn("flex items-start gap-2.5 p-2 rounded-lg transition-colors group", disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-[#F9FAFB]")}>
      <div className={cn(
        "mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
        checked && !disabled ? "bg-[#10B981] border-[#10B981]" : "border-[#D1D1CE] bg-card",
        !disabled && "group-hover:border-[#A1A19D]"
      )}>
        {checked && <CheckSquare className={cn("w-3 h-3", disabled ? "text-[#A1A19D]" : "text-white")} />}
        <input type="checkbox" className="hidden" checked={checked} onChange={(e) => !disabled && onChange(e.target.checked)} />
      </div>
      <div>
        <div className="text-[12px] font-semibold text-foreground leading-tight">{label}</div>
        {desc && <div className="text-[11px] text-[#A1A19D] leading-tight mt-0.5">{desc}</div>}
      </div>
    </label>
  );

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-muted relative overflow-hidden">
      {/* ── Left Panel (Preview & Input Area) ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col relative min-h-0 h-full overflow-hidden">
        
        {/* Upload Area */}
        {(!loading && !file) && (
          <div className="absolute inset-0 flex items-center justify-center p-6 md:p-10">
            <div 
              className="w-full max-w-2xl bg-card border-2 border-dashed rounded-3xl p-8 md:p-16 flex flex-col items-center justify-center text-center transition-all border-[#D1D1CE] hover:border-[#F59E0B] hover:bg-[#FFFBEB] cursor-pointer group shadow-sm"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-20 h-20 bg-[#F3F3F2] group-hover:bg-[#FEF3C7] rounded-2xl flex items-center justify-center mb-6 transition-colors shadow-sm border border-border group-hover:border-[#FDE68A]">
                <Presentation className="w-10 h-10 text-[#6B7280] group-hover:text-[#F59E0B] transition-colors" />
              </div>
              <h3 className="text-[22px] font-bold text-foreground mb-2">Upload PowerPoint Presentation</h3>
              <p className="text-[15px] text-muted-foreground mb-8">Drag and drop your PPT or PPTX file here, or click to browse</p>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
                accept=".ppt,.pptx"
                className="hidden"
              />
              <div className="h-12 px-8 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold text-[14px] flex items-center justify-center transition-all shadow-md">
                Select File
              </div>
            </div>
          </div>
        )}

        {/* File Info and Previews */}
        {(loading || file) && (
          <div className="flex-1 flex flex-col overflow-hidden h-full bg-[#1A1A1A]">
            {/* Header overlay for the preview */}
            <div className="h-14 px-4 border-b border-[#333] flex items-center justify-between bg-[#222] z-10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-[#F59E0B]/20 flex items-center justify-center text-[#FCD34D]">
                  <Presentation className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[13px] font-bold text-white truncate max-w-[300px]">{file?.name}</h3>
                  <p className="text-[11px] text-[#A1A19D]">
                    {file ? (file.size / 1024 / 1024).toFixed(2) : "0"} MB • {thumbnails.length > 0 ? `${thumbnails.length} Slides` : "Analyzing..."}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setFile(null);
                  setBasePdfBlob(null);
                  setThumbnails([]);
                  setCurrentPreviewSlide(0);
                }}
                className="text-[12px] font-bold text-[#E8607A] hover:bg-[#E8607A]/10 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-[#E8607A]/30"
              >
                Change File
              </button>
            </div>

            {/* Error State */}
            {error && (
              <div className="m-6 flex items-start gap-3 p-4 bg-[#FEF2F2] rounded-xl border border-[#E8607A]/20 text-[#E8607A] shadow-lg">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-[14px] font-medium">{error}</p>
              </div>
            )}

            {/* Loading State */}
            {loading && !error && (
              <div className="flex-1 flex flex-col items-center justify-center text-[#A1A19D] space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-[#F59E0B]" />
                <p className="text-[14px] font-semibold animate-pulse">Generating Slide Previews...</p>
              </div>
            )}

            {/* Preview Area */}
            {thumbnails.length > 0 && !loading && (
              <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Main Preview */}
                <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden bg-[#111]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={thumbnails[currentPreviewSlide]} 
                    alt={`Slide ${currentPreviewSlide + 1}`} 
                    className="max-h-full max-w-full object-contain shadow-2xl rounded-sm"
                  />
                  
                  {/* Slide Navigation Overlay */}
                  <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                    <button 
                      onClick={() => setCurrentPreviewSlide(s => Math.max(0, s - 1))}
                      disabled={currentPreviewSlide === 0}
                      className="w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white backdrop-blur-md transition-all disabled:opacity-0 pointer-events-auto border border-white/10"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="absolute inset-y-0 right-6 flex items-center pointer-events-none">
                    <button 
                      onClick={() => setCurrentPreviewSlide(s => Math.min(thumbnails.length - 1, s + 1))}
                      disabled={currentPreviewSlide === thumbnails.length - 1}
                      className="w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white backdrop-blur-md transition-all disabled:opacity-0 pointer-events-auto border border-white/10"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Filmstrip */}
                <div className="h-32 bg-[#1A1A1A] border-t border-[#333] p-4 flex gap-3 overflow-x-auto custom-scrollbar flex-shrink-0">
                  {thumbnails.map((thumb, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPreviewSlide(idx)}
                      className={cn(
                        "relative flex-shrink-0 h-full rounded border-2 transition-all overflow-hidden",
                        currentPreviewSlide === idx ? "border-[#F59E0B] shadow-[0_0_0_2px_rgba(245,158,11,0.3)]" : "border-transparent opacity-50 hover:opacity-100"
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumb} alt={`Thumbnail ${idx + 1}`} className="h-full object-contain bg-card" />
                      <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 rounded font-medium backdrop-blur">
                        {idx + 1}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Right Panel (Settings) ───────────────────────────────────────────── */}
      <div className="w-full md:w-[280px] lg:w-[320px] bg-card border-t md:border-t-0 md:border-l border-border flex flex-col flex-shrink-0 z-20 shadow-[0_-4px_24px_rgba(0,0,0,0.02)] lg:shadow-[-4px_0_24px_rgba(0,0,0,0.02)] h-[50vh] md:h-full">
        <div className="px-5 py-4 border-b border-border flex-shrink-0 bg-muted/40 flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#F59E0B]" />
          <h3 className="text-[14px] font-bold text-foreground">Settings</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
          
          {/* Page Size */}
          <div className="space-y-2">
            <p className="text-[12px] font-bold text-foreground">Page Size</p>
            <select 
              value={pageSize} 
              onChange={(e) => setPageSize(e.target.value as PageSize)}
              className="w-full h-10 px-3 border border-[#E5E5E3] rounded-lg text-[13px] font-medium focus:outline-none focus:border-[#F59E0B] bg-card"
            >
              <option value="A4">A4</option>
              <option value="Letter">US Letter</option>
              <option value="Legal">Legal</option>
              <option value="A3">A3</option>
            </select>
          </div>

          {/* Orientation */}
          <div className="space-y-2">
            <p className="text-[12px] font-bold text-foreground">Orientation</p>
            <div className="flex bg-[#F3F3F2] p-1 rounded-lg">
              <button onClick={() => setOrientation("portrait")} className={cn("flex-1 py-1.5 rounded-md text-[12px] font-semibold transition-all", orientation === "portrait" ? "bg-card text-[#F59E0B] shadow-sm" : "text-[#6B7280] hover:text-foreground")}>Portrait</button>
              <button onClick={() => setOrientation("landscape")} className={cn("flex-1 py-1.5 rounded-md text-[12px] font-semibold transition-all", orientation === "landscape" ? "bg-card text-[#F59E0B] shadow-sm" : "text-[#6B7280] hover:text-foreground")}>Landscape</button>
            </div>
          </div>

          {/* Margins */}
          <div className="space-y-2">
            <p className="text-[12px] font-bold text-foreground">Margins</p>
            <div className="flex bg-[#F3F3F2] p-1 rounded-lg">
              {(["none", "small", "medium", "large"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMargins(m)}
                  className={cn(
                    "flex-1 py-1.5 rounded-md text-[11px] font-semibold capitalize transition-all",
                    margins === m ? "bg-card text-[#F59E0B] shadow-sm" : "text-[#6B7280] hover:text-foreground"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          
          {/* Slides Settings */}
          <div className="space-y-2">
            <p className="text-[12px] font-bold text-foreground">Slides Settings</p>
            <div className="space-y-1">
              <CheckboxItem checked={fitSlides} onChange={setFitSlides} label="Fit slides to page" />
              <CheckboxItem checked={preserveRatio} onChange={setPreserveRatio} label="Preserve aspect ratio" />
              <CheckboxItem checked={includeNotes} onChange={setIncludeNotes} label="Include speaker notes" />
            </div>
          </div>
          
          {/* PDF Quality */}
          <div className="space-y-2">
            <p className="text-[12px] font-bold text-foreground">PDF Quality</p>
            <div className="flex bg-[#F3F3F2] p-1 rounded-lg">
              <button onClick={() => setQuality("standard")} className={cn("flex-1 py-1.5 rounded-md text-[12px] font-semibold transition-all", quality === "standard" ? "bg-card text-[#F59E0B] shadow-sm" : "text-[#6B7280] hover:text-foreground")}>Standard</button>
              <button onClick={() => setQuality("high")} className={cn("flex-1 py-1.5 rounded-md text-[12px] font-semibold transition-all", quality === "high" ? "bg-card text-[#F59E0B] shadow-sm" : "text-[#6B7280] hover:text-foreground")}>High Quality</button>
            </div>
          </div>

        </div>
        
        {/* Action Footer */}
        <div className="p-5 bg-muted/40 border-t border-border flex-shrink-0">
          <button
            onClick={handleConvert}
            disabled={converting || loading || !basePdfBlob}
            className={cn(
              "w-full h-12 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md active:scale-[0.98]",
              converting
                ? "bg-[#F59E0B]/80 text-white cursor-wait"
                : (!basePdfBlob || loading)
                ? "bg-[#D1D1CE] text-white cursor-not-allowed"
                : "bg-[#F59E0B] hover:bg-[#D97706] text-white"
            )}
          >
            {converting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Converting...</>
            ) : (
              <><Download className="w-5 h-5" /> Download PDF</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
