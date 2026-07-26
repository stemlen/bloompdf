"use client";

import { useState, useRef, useEffect } from "react";
import {
  X, Upload, Loader2, CheckCircle2, AlertCircle, RefreshCw,
  ClipboardList, Plus, FileEdit, LayoutGrid, ChevronLeft, ChevronRight, TextCursorInput
} from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { validatePDFFile } from "@/lib/splitPdf";
import { loadPdfForRendering, renderPageToDataURL } from "@/lib/pdfRender";

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolState = "idle" | "loading" | "ready" | "processing" | "done" | "error";

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

export function FormsTool() {
  const [pdfInfo, setPdfInfo] = useState<PDFInfo | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [toolState, setToolState] = useState<ToolState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [thumbnails, setThumbnails] = useState<PageThumb[]>([]);
  const [currentPreviewSlide, setCurrentPreviewSlide] = useState(0);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      const limit = Math.min(total, 50);
      const newThumbs: PageThumb[] = [];
      for (let i = 1; i <= limit; i++) {
        const dataUrl = await renderPageToDataURL(pdfDoc, i, 0.5);
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
    setToolState("idle"); setErrorMessage(null);
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-muted relative">
      <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleInputChange} className="hidden" />

      {/* Left Panel */}
      <div className="w-full md:w-[320px] lg:w-[360px] bg-card border-r border-border flex flex-col flex-shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] h-[40vh] md:h-full">
        <div className="px-5 py-4 border-b border-border flex-shrink-0 bg-muted/40">
          <h2 className="text-[14px] font-bold text-foreground">PDF Forms</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5 font-medium">Create and fill interactive fields</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {!pdfInfo ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center h-full">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                 <ClipboardList className="w-5 h-5 text-[#E8607A]" />
              </div>
              <p className="text-[13px] font-bold text-foreground">No file selected</p>
              <p className="text-[12px] text-muted-foreground mt-1">Upload a PDF to manage forms</p>
            </div>
          ) : (
            <div className="p-5 flex flex-col gap-6">
              
              {/* File Info */}
              <div className="flex items-center justify-between p-3 bg-[#F8F8F7] border border-[#E5E5E3] rounded-xl shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-4 h-4 text-[#E8607A]" />
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

              {/* Placeholder Tools */}
              <div className="space-y-3">
                 <label className="text-[12px] font-bold text-foreground">Form Tools</label>
                 
                 <div className="grid grid-cols-2 gap-2">
                    <button className="h-[72px] flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/40 text-[#A1A19D] hover:border-[#E8607A] hover:bg-primary/10 hover:text-[#E8607A] transition-colors group">
                       <TextCursorInput className="w-5 h-5" />
                       <span className="text-[11px] font-bold">Text Field</span>
                    </button>
                    <button className="h-[72px] flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/40 text-[#A1A19D] hover:border-[#E8607A] hover:bg-primary/10 hover:text-[#E8607A] transition-colors group">
                       <Plus className="w-5 h-5" />
                       <span className="text-[11px] font-bold">Checkbox</span>
                    </button>
                    <button className="h-[72px] flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/40 text-[#A1A19D] hover:border-[#E8607A] hover:bg-primary/10 hover:text-[#E8607A] transition-colors group">
                       <Plus className="w-5 h-5" />
                       <span className="text-[11px] font-bold">Radio Button</span>
                    </button>
                    <button className="h-[72px] flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/40 text-[#A1A19D] hover:border-[#E8607A] hover:bg-primary/10 hover:text-[#E8607A] transition-colors group">
                       <FileEdit className="w-5 h-5" />
                       <span className="text-[11px] font-bold">Signature</span>
                    </button>
                 </div>
                 
                 <div className="p-4 bg-[#F8F8F7] rounded-xl border border-border mt-4">
                    <p className="text-[12px] text-muted-foreground text-center italic">
                       Form editor is under construction. Future updates will enable drag-and-drop form field creation.
                    </p>
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
                   <ClipboardList className="w-7 h-7 text-[#E8607A]" />
                </div>
                <h3 className="text-[20px] font-bold text-foreground mb-2">Upload a PDF Document</h3>
                <p className="text-[14px] text-muted-foreground">Load a document to add or fill form fields</p>
              </button>
            </div>
          ) : (
             <div className="flex-1 w-full bg-muted/40 rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between sticky top-0 z-20">
                   <h3 className="text-[14px] font-bold text-foreground flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4 text-[#A1A19D]" /> Form Workspace
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
                      <div className="relative inline-block max-h-full shadow-2xl rounded-sm bg-card">
                         {/* eslint-disable-next-line @next/next/no-img-element */}
                         <img src={thumbnails[currentPreviewSlide].dataUrl} alt="Preview" className="max-h-[65vh] object-contain transition-all" />
                         
                         {/* Future Form Overlay Container */}
                         <div className="absolute inset-0 pointer-events-none border-[2px] border-dashed border-[#E8607A]/0" />
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
             <button
               disabled={true}
               className="flex-1 md:flex-none h-11 px-8 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all shadow-md w-full md:w-auto bg-muted text-[#A1A19D] cursor-not-allowed border border-border"
             >
               <ClipboardList className="w-4 h-4" /> Save Form
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
