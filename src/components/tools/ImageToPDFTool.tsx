"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Upload, X, GripVertical, Download, Loader2,
  CheckCircle2, AlertCircle, RefreshCw, Image as ImageIcon,
  Settings2, LayoutTemplate, Maximize2,
} from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import {
  imagesToPDF,
  downloadPDF,
  validateImageFile,
  createPreviewURL,
  ACCEPTED_EXTENSIONS,
  MAX_IMAGE_COUNT,
  type PageOrientation,
  type PageMarginSize,
  type FitMode,
  type ImageToPDFOptions,
} from "@/lib/imageToPdf";

// ─── Types ─────────────────────────────────────────────────────────────────

interface ImageFile {
  id: string;
  file: File;
  name: string;
  size: number;
  previewUrl: string;
}

type ConvertState = "idle" | "converting" | "done" | "error";

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeImageFile(file: File): ImageFile {
  return {
    id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
    file,
    name: file.name,
    size: file.size,
    previewUrl: createPreviewURL(file),
  };
}

// ─── Option controls ───────────────────────────────────────────────────────

const FIT_MODES: { value: FitMode; label: string; sub: string }[] = [
  { value: "fit", label: "Fit to Page (default)", sub: "Maintains margins & centers image" },
  { value: "fill", label: "Fill Page", sub: "Fills page preserving aspect ratio" },
  { value: "original", label: "Original Size", sub: "1:1 size without scaling up" },
];

const ORIENTATIONS: { value: PageOrientation; label: string; sub: string }[] = [
  { value: "auto", label: "Auto Orientation", sub: "A4 Portrait/Landscape per image" },
  { value: "portrait", label: "Portrait A4", sub: "595 × 842 pt" },
  { value: "landscape", label: "Landscape A4", sub: "842 × 595 pt" },
];

const MARGINS: { value: PageMarginSize; label: string }[] = [
  { value: "none", label: "No margin" },
  { value: "small", label: "Small (5 mm)" },
  { value: "medium", label: "Medium (10 mm)" },
  { value: "large", label: "Large (20 mm)" },
];

// ─── Main component ────────────────────────────────────────────────────────

export function ImageToPDFTool() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [convertState, setConvertState] = useState<ConvertState>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [orientation, setOrientation] = useState<PageOrientation>("auto");
  const [margin, setMargin] = useState<PageMarginSize>("medium");
  const [fitMode, setFitMode] = useState<FitMode>("fit");

  // Drag-to-reorder
  const dragIndexRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Revoke preview URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── File handling ────────────────────────────────────────────────────────

  const addFiles = useCallback((raw: FileList | File[]) => {
    const arr = Array.from(raw);
    const errors: string[] = [];
    const valid: ImageFile[] = [];

    for (const f of arr) {
      const err = validateImageFile(f);
      if (err) { errors.push(err); continue; }
      valid.push(makeImageFile(f));
    }

    setImages((prev) => {
      const combined = [...prev, ...valid].slice(0, MAX_IMAGE_COUNT);
      return combined;
    });

    if (errors.length > 0) {
      setErrorMessage(errors.join("\n"));
      setConvertState("error");
    }

    // Reset result if new images added after a successful run
    setResultBytes(null);
    if (convertState === "done") setConvertState("idle");
  }, [convertState]);

  const removeImage = (id: string) => {
    setImages((prev) => {
      const removed = prev.find((i) => i.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
    if (convertState === "error") { setErrorMessage(null); setConvertState("idle"); }
  };

  // ── Drop zone ─────────────────────────────────────────────────────────────

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false);
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = "";
  };

  // ── Drag-to-reorder ───────────────────────────────────────────────────────

  const handleItemDragStart = (index: number) => { dragIndexRef.current = index; };
  const handleItemDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const from = dragIndexRef.current;
    if (from === null || from === index) return;
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
    dragIndexRef.current = index;
  };
  const handleItemDrop = (e: React.DragEvent) => { e.preventDefault(); dragIndexRef.current = null; };

  // ── Conversion ────────────────────────────────────────────────────────────

  const handleConvert = async () => {
    if (!images.length || convertState === "converting") return;
    setConvertState("converting");
    setProgress(0);
    setErrorMessage(null);
    setResultBytes(null);

    const options: ImageToPDFOptions = { orientation, margin, fitMode };

    try {
      const bytes = await imagesToPDF(
        images.map((i) => i.file),
        options,
        setProgress
      );
      setResultBytes(bytes);
      setConvertState("done");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred.");
      setConvertState("error");
    }
  };

  const handleDownload = () => {
    if (!resultBytes) return;
    downloadPDF(resultBytes, "images.pdf");
  };

  const handleReset = () => {
    images.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    setImages([]);
    setConvertState("idle");
    setProgress(0);
    setErrorMessage(null);
    setResultBytes(null);
  };

  const handleDismissError = () => {
    setConvertState("idle");
    setErrorMessage(null);
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const hasImages = images.length > 0;
  const canAdd = images.length < MAX_IMAGE_COUNT;
  const canConvert = hasImages && convertState !== "converting";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-muted relative overflow-hidden">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(",")}
        multiple
        onChange={handleInputChange}
        className="hidden"
        aria-hidden
      />

      {/* ── Left Panel (Preview Area) ───────────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col relative min-h-0 h-full overflow-hidden"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {/* Full-area Drop Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 z-50 bg-[#E8607A]/5 backdrop-blur-[2px] border-4 border-dashed border-[#E8607A] m-4 rounded-2xl flex items-center justify-center pointer-events-none">
            <div className="bg-card px-6 py-4 rounded-xl shadow-lg flex flex-col items-center border border-[#FFC5D3]">
              <Upload className="w-8 h-8 text-[#E8607A] mb-2 animate-bounce" />
              <p className="text-[15px] font-bold text-foreground">Drop images here</p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 md:p-10 relative custom-scrollbar">
          {/* Drop zone */}
          {(!hasImages || canAdd) && (
            <div
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Upload images"
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-all select-none mb-6",
                hasImages ? "py-8" : "py-20",
                "border-[#D1D1CE] bg-card hover:border-[#E8607A] hover:bg-[#FFF0F3]"
              )}
            >
              <div className="flex flex-col items-center gap-2 pointer-events-none">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-1 bg-[#F3F3F2]">
                  <ImageIcon className="w-5 h-5 text-[#6B7280]" />
                </div>
                <div className="text-center">
                  <p className="text-[15px] font-bold text-foreground">
                    Drag & drop images here
                  </p>
                  <p className="text-[13px] text-[#6B7280] mt-1">
                    or <span className="text-[#E8607A] font-medium">browse files</span>
                  </p>
                </div>
                <p className="text-[11px] text-[#A1A19D] mt-2">
                  JPG, PNG, WebP, GIF, BMP · Up to {MAX_IMAGE_COUNT} images · Max 50 MB each
                </p>
              </div>
            </div>
          )}

          {/* Image thumbnail grid */}
          {hasImages && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[14px] font-bold text-foreground">
                  {images.length} {images.length === 1 ? "image" : "images"}
                  <span className="text-[#A1A19D] font-medium ml-2">· drag to reorder</span>
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {images.map((img, index) => (
                  <div
                    key={img.id}
                    draggable
                    onDragStart={() => handleItemDragStart(index)}
                    onDragOver={(e) => handleItemDragOver(e, index)}
                    onDrop={handleItemDrop}
                    className="relative group bg-card border border-[#E5E5E3] rounded-xl overflow-hidden cursor-grab active:cursor-grabbing select-none hover:border-[#E8607A] transition-all hover:shadow-md animate-slide-up aspect-square"
                  >
                    <img
                      src={img.previewUrl}
                      alt={img.name}
                      className="w-full h-full object-cover pointer-events-none"
                      draggable={false}
                    />

                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />

                    <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-2">
                      <div className="w-6 h-6 bg-black/60 backdrop-blur-sm rounded-md flex items-center justify-center">
                        <span className="text-[11px] font-bold text-white tabular-nums">{index + 1}</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                        className="w-6 h-6 bg-black/60 hover:bg-[#E8607A] backdrop-blur-sm rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                        aria-label={`Remove ${img.name}`}
                      >
                        <X className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <GripVertical className="w-4 h-4 text-white drop-shadow" />
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 pt-8 pb-2">
                      <p className="text-[11px] font-medium text-white truncate">{img.name}</p>
                      <p className="text-[10px] text-white/70">{formatFileSize(img.size)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right Panel (Settings & Action Bar) ────────────────────────────── */}
      <div className="w-full md:w-[280px] lg:w-[320px] bg-card border-t md:border-t-0 md:border-l border-border flex flex-col flex-shrink-0 z-20 shadow-[0_-4px_24px_rgba(0,0,0,0.02)] lg:shadow-[-4px_0_24px_rgba(0,0,0,0.02)] h-[50vh] md:h-full">
        <div className="px-5 py-4 border-b border-border flex-shrink-0 bg-[#FAFAFA]">
          <h2 className="text-[14px] font-bold text-foreground">Settings</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5 font-medium">Configure PDF output</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
          {hasImages ? (
            <>
              {/* Fit Mode */}
              <div className="space-y-3">
                <label className="text-[12px] font-bold text-foreground flex items-center gap-1.5">
                  <Maximize2 className="w-4 h-4 text-[#A1A19D]" />
                  Fit Mode
                </label>
                <div className="flex flex-col gap-2">
                  {FIT_MODES.map((fm) => (
                    <button
                      key={fm.value}
                      onClick={() => setFitMode(fm.value)}
                      disabled={convertState === "converting"}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border text-left transition-all flex items-center justify-between",
                        fitMode === fm.value
                          ? "border-[#E8607A] bg-[#FFF0F3]"
                          : "border-[#E5E5E3] bg-card hover:border-[#A1A19D]",
                        convertState === "converting" && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      <div>
                        <p className={cn("text-[13px] font-bold", fitMode === fm.value ? "text-[#E8607A]" : "text-foreground")}>
                          {fm.label}
                        </p>
                        <p className="text-[12px] text-[#A1A19D] mt-0.5">{fm.sub}</p>
                      </div>
                      <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center", fitMode === fm.value ? "border-[#E8607A]" : "border-[#D1D1CE]")}>
                        {fitMode === fm.value && <div className="w-2 h-2 bg-[#E8607A] rounded-full" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Page orientation */}
              <div className="space-y-3 pt-2">
                <label className="text-[12px] font-bold text-foreground flex items-center gap-1.5">
                  <LayoutTemplate className="w-4 h-4 text-[#A1A19D]" />
                  Page Orientation
                </label>
                <div className="flex flex-col gap-2">
                  {ORIENTATIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setOrientation(o.value)}
                      disabled={convertState === "converting"}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border text-left transition-all flex items-center justify-between",
                        orientation === o.value
                          ? "border-[#E8607A] bg-[#FFF0F3]"
                          : "border-[#E5E5E3] bg-card hover:border-[#A1A19D]",
                        convertState === "converting" && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      <div>
                        <p className={cn("text-[13px] font-bold", orientation === o.value ? "text-[#E8607A]" : "text-foreground")}>
                          {o.label}
                        </p>
                        <p className="text-[12px] text-[#A1A19D] mt-0.5">{o.sub}</p>
                      </div>
                      <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center", orientation === o.value ? "border-[#E8607A]" : "border-[#D1D1CE]")}>
                        {orientation === o.value && <div className="w-2 h-2 bg-[#E8607A] rounded-full" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Margin */}
              <div className="space-y-3 pt-2">
                <label className="text-[12px] font-bold text-foreground">Page Margin</label>
                <div className="grid grid-cols-2 gap-2">
                  {MARGINS.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setMargin(m.value)}
                      disabled={convertState === "converting"}
                      className={cn(
                        "px-3 py-2.5 rounded-lg border text-[13px] font-semibold transition-all",
                        margin === m.value
                          ? "border-[#E8607A] bg-[#FFF0F3] text-[#E8607A]"
                          : "border-[#E5E5E3] bg-card text-[#6B7280] hover:border-[#A1A19D] hover:text-foreground",
                        convertState === "converting" && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center h-full opacity-50 py-10">
              <Settings2 className="w-12 h-12 text-[#A1A19D] mb-3" />
              <p className="text-[14px] font-semibold text-foreground">No settings yet</p>
              <p className="text-[13px] text-muted-foreground mt-1">Upload images to see options</p>
            </div>
          )}
        </div>

        {/* Action bar / Sticky Footer */}
        <div className="p-5 border-t border-border bg-[#FAFAFA] flex-shrink-0 space-y-4">
          {/* Error state */}
          {convertState === "error" && errorMessage && (
            <div className="flex items-start gap-3 p-3 bg-[#FFF0F3] rounded-lg border border-[#E8607A]/20 animate-slide-up">
              <AlertCircle className="w-4 h-4 text-[#E8607A] flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground">Error</p>
                {errorMessage.split("\\n").map((line, i) => (
                  <p key={i} className="text-[12px] text-[#E8607A] mt-0.5">{line}</p>
                ))}
              </div>
              <button onClick={handleDismissError} className="flex-shrink-0 text-[#E8607A] hover:bg-[#FFC5D3] p-1 rounded-md transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Progress */}
          {convertState === "converting" && (
            <div className="space-y-1.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-[#6B7280]">
                  Converting {images.length} {images.length === 1 ? "image" : "images"}…
                </span>
                <span className="text-[12px] font-bold text-foreground tabular-nums">{progress}%</span>
              </div>
              <div className="h-1.5 bg-[#E4E4E2] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#E8607A] rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Success */}
          {convertState === "done" && (
            <div className="flex items-center gap-3 p-3 bg-[#EBFBEE] rounded-lg border border-[#2F9E44]/20 animate-slide-up">
              <CheckCircle2 className="w-5 h-5 text-[#2F9E44] flex-shrink-0" />
              <div className="flex-1">
                <p className="text-[13px] font-bold text-foreground">PDF created!</p>
                <p className="text-[11px] text-[#6B7280] font-medium mt-0.5">
                  {resultBytes ? formatFileSize(resultBytes.byteLength) : ""}
                </p>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col gap-2">
            {convertState === "done" ? (
              <>
                <button
                  id="img-to-pdf-download-btn"
                  onClick={handleDownload}
                  className="w-full h-12 bg-[#E8607A] hover:bg-[#D94D6A] text-white rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Download className="w-5 h-5" />
                  Download PDF
                </button>
                <button
                  id="img-to-pdf-reset-btn"
                  onClick={handleReset}
                  className="w-full h-11 bg-card hover:bg-muted border border-border text-foreground rounded-xl font-bold text-[13px] transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4 text-muted-foreground" />
                  Start over
                </button>
              </>
            ) : (
              <button
                id="img-to-pdf-convert-btn"
                onClick={handleConvert}
                disabled={!canConvert}
                className={cn(
                  "w-full h-12 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all",
                  convertState === "converting"
                    ? "bg-[#E8607A]/80 text-white cursor-wait"
                    : !canConvert
                      ? "bg-muted text-[#A1A19D] cursor-not-allowed border border-border"
                      : "bg-[#111111] hover:bg-[#333333] text-white shadow-md active:scale-[0.98]"
                )}
              >
                {convertState === "converting" ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Converting…</>
                ) : (
                  <><ImageIcon className="w-5 h-5" /> Convert to PDF</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
