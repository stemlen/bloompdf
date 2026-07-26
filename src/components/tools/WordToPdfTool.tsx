"use client";

import { useState, useRef } from "react";
import {
  FileText, Settings, Loader2, Download, AlertCircle, CheckSquare, 
  ChevronLeft, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { loadPdfForRendering, renderPageToDataURL } from "@/lib/pdfRender";


export function WordToPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPreviewSlide, setCurrentPreviewSlide] = useState(0);


  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (uploadedFile: File) => {
    if (!uploadedFile.name.toLowerCase().endsWith('.doc') && !uploadedFile.name.toLowerCase().endsWith('.docx')) {
      setError("Please upload a .doc or .docx file.");
      return;
    }

    setFile(uploadedFile);
    setLoading(true);
    setError(null);
    setPdfBlob(null);
    setThumbnails([]);
    setCurrentPreviewSlide(0);

    await convertFile(uploadedFile);
  };

  const convertFile = async (targetFile: File) => {
    try {
      const formData = new FormData();
      formData.append("file", targetFile);

      const res = await fetch("/api/word-to-pdf", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to convert document");
      }

      const blob = await res.blob();
      setPdfBlob(blob);

      // Render thumbnails
      const tempFile = new File([blob], "preview.pdf");
      const pdfDoc = await loadPdfForRendering(tempFile);
      const numPages = pdfDoc.numPages;
      
      const newThumbnails = [];
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

  const handleDownload = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file?.name ? file.name.replace(/\.docx?$/i, ".pdf") : `document_${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-muted relative overflow-hidden">
      {/* ── Left Panel (Preview & Input Area) ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col relative min-h-0 h-full overflow-hidden">
        
        {/* Upload Area */}
        {(!loading && !file) && (
          <div className="absolute inset-0 flex items-center justify-center p-6 md:p-10">
            <div 
              className="w-full max-w-2xl bg-card border-2 border-dashed rounded-3xl p-8 md:p-16 flex flex-col items-center justify-center text-center transition-all border-[#D1D1CE] hover:border-[#2563EB] hover:bg-[#F9FAFB] cursor-pointer group shadow-sm"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-20 h-20 bg-[#F3F3F2] group-hover:bg-[#EFF6FF] rounded-2xl flex items-center justify-center mb-6 transition-colors shadow-sm border border-border group-hover:border-[#BFDBFE]">
                <FileText className="w-10 h-10 text-[#6B7280] group-hover:text-[#2563EB] transition-colors" />
              </div>
              <h3 className="text-[22px] font-bold text-foreground mb-2">Upload Word Document</h3>
              <p className="text-[15px] text-muted-foreground mb-8">Drag and drop your DOC or DOCX file here, or click to browse</p>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
                accept=".doc,.docx"
                className="hidden"
              />
              <div className="h-12 px-8 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-[14px] flex items-center justify-center transition-all shadow-md">
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
                <div className="w-8 h-8 rounded bg-[#2563EB]/20 flex items-center justify-center text-[#60A5FA]">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[13px] font-bold text-white truncate max-w-[300px]">{file?.name}</h3>
                  <p className="text-[11px] text-[#A1A19D]">
                    {file ? (file.size / 1024 / 1024).toFixed(2) : "0"} MB • {thumbnails.length > 0 ? `${thumbnails.length} Pages` : "Analyzing..."}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setFile(null);
                  setPdfBlob(null);
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
                <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
                <p className="text-[14px] font-semibold animate-pulse">Generating PDF...</p>
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
                    alt={`Page ${currentPreviewSlide + 1}`} 
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
                        currentPreviewSlide === idx ? "border-[#2563EB] shadow-[0_0_0_2px_rgba(37,99,235,0.3)]" : "border-transparent opacity-50 hover:opacity-100"
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
        <div className="px-5 py-4 border-b border-border flex-shrink-0 bg-[#FAFAFA] flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#2563EB]" />
          <h3 className="text-[14px] font-bold text-foreground">Settings</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
          <div className="bg-[#EFF6FF] border border-[#BFDBFE] p-4 rounded-xl text-[#1E3A8A]">
            <p className="text-[13px] font-medium leading-relaxed">
              Your document will be converted to PDF using the <strong>exact layout, margins, and page dimensions</strong> defined in the original Word file.
            </p>
          </div>
        </div>
        {/* Action Footer */}
        <div className="p-5 bg-[#FAFAFA] border-t border-border flex-shrink-0">
          <button
            onClick={handleDownload}
            disabled={loading || !pdfBlob}
            className={cn(
              "w-full h-12 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md active:scale-[0.98]",
              loading
                ? "bg-[#2563EB]/80 text-white cursor-wait"
                : !pdfBlob
                ? "bg-[#D1D1CE] text-white cursor-not-allowed"
                : "bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
            )}
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
            ) : (
              <><Download className="w-5 h-5" /> Download PDF</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
