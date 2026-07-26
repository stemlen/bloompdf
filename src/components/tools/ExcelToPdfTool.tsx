"use client";

import { useState, useRef } from "react";
import {
  FileSpreadsheet, Settings, Loader2, Download, AlertCircle, CheckSquare, 
  ChevronLeft, ChevronRight, CheckCircle2, Circle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { loadPdfForRendering, renderPageToDataURL } from "@/lib/pdfRender";

export function ExcelToPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPreviewSlide, setCurrentPreviewSlide] = useState(0);

  // Settings
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [conversionMode, setConversionMode] = useState<"all" | "selected">("all");
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isXls = file?.name.toLowerCase().endsWith(".xls");

  const handleFileUpload = async (uploadedFile: File) => {
    if (!uploadedFile.name.endsWith('.xls') && !uploadedFile.name.endsWith('.xlsx')) {
      setError("Please upload an .xls or .xlsx file.");
      return;
    }

    setFile(uploadedFile);
    setLoading(true);
    setError(null);
    setPdfBlob(null);
    setThumbnails([]);
    setCurrentPreviewSlide(0);
    setAvailableSheets([]);
    setConversionMode("all");
    setSelectedSheets([]);

    try {
      // Analyze file to get sheets if xlsx
      if (uploadedFile.name.toLowerCase().endsWith('.xlsx')) {
        const formData = new FormData();
        formData.append("file", uploadedFile);
        formData.append("action", "analyze");

        const analyzeRes = await fetch("/api/excel-to-pdf", {
          method: "POST",
          body: formData,
        });

        if (analyzeRes.ok) {
          const { sheets } = await analyzeRes.json();
          if (sheets && sheets.length > 0) {
            setAvailableSheets(sheets);
            setSelectedSheets([...sheets]); // Select all by default
          }
        }
      }

      await convertFile(uploadedFile, "all", []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const convertFile = async (targetFile: File, mode: "all" | "selected", sheets: string[]) => {
    try {
      const formData = new FormData();
      formData.append("file", targetFile);
      formData.append("action", "convert");
      
      if (mode === "selected" && sheets.length > 0) {
        formData.append("selectedSheets", JSON.stringify(sheets));
      }

      const res = await fetch("/api/excel-to-pdf", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to convert spreadsheet");
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
    }
  };

  const handleApplySettings = async () => {
    if (file) {
      setLoading(true);
      setError(null);
      await convertFile(file, conversionMode, selectedSheets);
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file?.name ? file.name.replace(/\.xlsx?$/i, ".pdf") : `document_${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const toggleSheet = (sheetName: string) => {
    setSelectedSheets(prev => 
      prev.includes(sheetName) 
        ? prev.filter(s => s !== sheetName)
        : [...prev, sheetName]
    );
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
                <FileSpreadsheet className="w-10 h-10 text-[#6B7280] group-hover:text-[#2563EB] transition-colors" />
              </div>
              <h3 className="text-[22px] font-bold text-foreground mb-2">Upload Excel Spreadsheet</h3>
              <p className="text-[15px] text-muted-foreground mb-8">Drag and drop your XLS or XLSX file here, or click to browse</p>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
                accept=".xls,.xlsx"
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
                <div className="w-8 h-8 rounded bg-[#10B981]/20 flex items-center justify-center text-[#34D399]">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[13px] font-bold text-white truncate max-w-[300px]">{file?.name}</h3>
                  <p className="text-[11px] text-[#A1A19D]">
                    {file ? (file.size / 1024 / 1024).toFixed(2) : "0"} MB • {thumbnails.length > 0 ? `${thumbnails.length} Pages` : "Analyzing..."}
                    {availableSheets.length > 0 && ` • ${availableSheets.length} Sheets`}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setFile(null);
                  setPdfBlob(null);
                  setThumbnails([]);
                  setCurrentPreviewSlide(0);
                  setAvailableSheets([]);
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
                <Loader2 className="w-8 h-8 animate-spin text-[#10B981]" />
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
                    className="max-h-full max-w-full object-contain shadow-2xl rounded-sm bg-card"
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
                        currentPreviewSlide === idx ? "border-[#10B981] shadow-[0_0_0_2px_rgba(16,185,129,0.3)]" : "border-transparent opacity-50 hover:opacity-100"
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
          <Settings className="w-4 h-4 text-[#10B981]" />
          <h3 className="text-[14px] font-bold text-foreground">Conversion Settings</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
          
          <div className="bg-[#ECFDF5] border border-[#A7F3D0] p-4 rounded-xl text-[#065F46]">
            <p className="text-[13px] font-medium leading-relaxed">
              Your document will be converted using the <strong>exact page dimensions, scaling, margins, and print settings</strong> defined in the original Excel file.
            </p>
          </div>

          {/* Worksheet Selection */}
          <div className="space-y-3">
            <p className="text-[13px] font-bold text-foreground">Worksheets to Convert</p>
            
            <div className="flex flex-col gap-2">
              <label className={cn(
                "flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all",
                conversionMode === "all" ? "border-[#10B981] bg-[#ECFDF5]" : "border-[#E5E5E3] bg-card hover:bg-[#F9FAFB]"
              )}>
                <input 
                  type="radio" 
                  name="conv_mode" 
                  value="all"
                  checked={conversionMode === "all"}
                  onChange={() => setConversionMode("all")}
                  className="hidden"
                />
                {conversionMode === "all" ? (
                  <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
                ) : (
                  <Circle className="w-5 h-5 text-[#D1D1CE]" />
                )}
                <span className="text-[13px] font-semibold text-foreground">Convert all worksheets</span>
              </label>

              <label className={cn(
                "flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all",
                conversionMode === "selected" ? "border-[#10B981] bg-[#ECFDF5]" : "border-[#E5E5E3] bg-card hover:bg-[#F9FAFB]",
                isXls && "opacity-50 cursor-not-allowed"
              )}>
                <input 
                  type="radio" 
                  name="conv_mode" 
                  value="selected"
                  checked={conversionMode === "selected"}
                  onChange={() => !isXls && setConversionMode("selected")}
                  disabled={isXls || availableSheets.length === 0}
                  className="hidden"
                />
                {conversionMode === "selected" ? (
                  <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
                ) : (
                  <Circle className="w-5 h-5 text-[#D1D1CE]" />
                )}
                <div className="flex flex-col">
                  <span className="text-[13px] font-semibold text-foreground">Convert selected worksheets</span>
                  {isXls && <span className="text-[11px] text-[#A1A19D]">Not supported for legacy .xls</span>}
                </div>
              </label>
            </div>

            {/* Sheet Checklist */}
            {conversionMode === "selected" && availableSheets.length > 0 && (
              <div className="mt-3 bg-[#FAFAFA] border border-[#E5E5E3] rounded-xl overflow-hidden animate-slide-up">
                <div className="max-h-[200px] overflow-y-auto p-2 custom-scrollbar space-y-1">
                  {availableSheets.map(sheet => (
                    <label key={sheet} className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-card transition-colors group">
                      <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
                        selectedSheets.includes(sheet) ? "bg-[#10B981] border-[#10B981]" : "border-[#D1D1CE] bg-card group-hover:border-[#A1A19D]"
                      )}>
                        {selectedSheets.includes(sheet) && <CheckSquare className="w-3 h-3 text-white" />}
                        <input 
                          type="checkbox" 
                          className="hidden" 
                          checked={selectedSheets.includes(sheet)} 
                          onChange={() => toggleSheet(sheet)} 
                        />
                      </div>
                      <div className="text-[13px] font-semibold text-foreground truncate">{sheet}</div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {(file && !loading && !error) && (
            <div className="pt-2">
              <button 
                onClick={handleApplySettings}
                disabled={conversionMode === "selected" && selectedSheets.length === 0}
                className="w-full h-11 border border-border bg-card rounded-xl text-[13px] font-bold text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply Settings & Convert
              </button>
            </div>
          )}

        </div>
        
        {/* Action Footer */}
        <div className="p-5 bg-[#FAFAFA] border-t border-border flex-shrink-0">
          <button
            onClick={handleDownload}
            disabled={loading || !pdfBlob}
            className={cn(
              "w-full h-12 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md active:scale-[0.98]",
              loading
                ? "bg-[#10B981]/80 text-white cursor-wait"
                : !pdfBlob
                ? "bg-[#D1D1CE] text-white cursor-not-allowed shadow-none"
                : "bg-[#10B981] hover:bg-[#059669] text-white"
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
