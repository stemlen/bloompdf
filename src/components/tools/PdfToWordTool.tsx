"use client";

import { useCallback, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  ScanText,
  ShieldCheck,
  Table,
  Upload,
  X,
} from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { OCR_LANGUAGES, type OCRLanguage } from "@/lib/ocrPdf";
import type { PdfToWordOptions, PdfToWordProgress, PdfToWordResult } from "@/lib/pdfToWord/convert";

type ToolState = "idle" | "ready" | "converting" | "done" | "error";

const MAX_BYTES = 50 * 1024 * 1024;

function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled,
  testId,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <label className={cn("flex items-start gap-3 p-3 rounded-xl border border-[#E5E5E3] bg-card", disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:border-[#E8607A]/40")}>
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-[#E8607A]"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        data-testid={testId}
      />
      <span className="min-w-0">
        <span className="block text-[13px] font-bold text-foreground">{label}</span>
        <span className="block text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{description}</span>
      </span>
    </label>
  );
}

export function PdfToWordTool() {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<ToolState>("idle");
  const [options, setOptions] = useState<PdfToWordOptions>({ ocr: true, ocrLanguage: "eng", includeImages: true });
  const [progress, setProgress] = useState<PdfToWordProgress | null>(null);
  const [result, setResult] = useState<PdfToWordResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = state === "converting";

  const acceptFile = useCallback((f: File | undefined | null) => {
    if (!f) return;
    const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    setResult(null);
    setProgress(null);
    if (!isPdf) {
      setFile(null);
      setError("Please choose a PDF file.");
      setState("error");
      return;
    }
    if (f.size > MAX_BYTES) {
      setFile(null);
      setError(`This file is ${formatFileSize(f.size)}; the limit is 50 MB.`);
      setState("error");
      return;
    }
    setError(null);
    setFile(f);
    setState("ready");
  }, []);

  const handleConvert = async () => {
    if (!file || busy) return;
    setState("converting");
    setError(null);
    setResult(null);
    setProgress({ phase: "loading", pct: 0, message: "Starting…" });
    try {
      const { convertPdfToWord } = await import("@/lib/pdfToWord/convert");
      const res = await convertPdfToWord(file, options, setProgress);
      setResult(res);
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed.");
      setState("error");
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setProgress(null);
    setError(null);
    setState("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!busy) acceptFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-muted relative">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        aria-hidden
        data-testid="pdf-to-word-input"
        onChange={(e) => acceptFile(e.target.files?.[0])}
      />

      {/* ── Left: file + options ─────────────────────────────────────────── */}
      <div className="w-full md:w-[320px] lg:w-[360px] bg-card border-b md:border-b-0 md:border-r border-border flex flex-col flex-shrink-0 z-20 md:h-full max-h-[45vh] md:max-h-none">
        <div className="px-5 py-4 border-b border-border flex-shrink-0 bg-muted/40">
          <h2 className="text-[14px] font-bold text-foreground">PDF to Word</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5 font-medium">Editable .docx, converted on your device</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-5">
          {file && (
            <div className="flex items-center justify-between p-3 bg-[#F8F8F7] border border-[#E5E5E3] rounded-xl shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-[#E8607A]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-foreground truncate" data-testid="pdf-to-word-filename">{file.name}</p>
                  <p className="text-[11px] text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button
                onClick={reset}
                disabled={busy}
                aria-label="Remove file"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[#A1A19D] hover:text-[#E8607A] hover:bg-primary/10 transition-colors disabled:opacity-50 flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wider">Options</h3>
            <Toggle
              label="OCR scanned pages"
              description="Pages without a text layer are read with OCR first, so they come out as editable text."
              checked={options.ocr}
              disabled={busy}
              onChange={(ocr) => setOptions((o) => ({ ...o, ocr }))}
              testId="pdf-to-word-ocr"
            />
            {options.ocr && (
              <label className="block pl-1">
                <span className="text-[11px] font-semibold text-muted-foreground">OCR language</span>
                <select
                  value={options.ocrLanguage}
                  disabled={busy}
                  onChange={(e) => setOptions((o) => ({ ...o, ocrLanguage: e.target.value as OCRLanguage }))}
                  className="mt-1 w-full h-9 rounded-lg border border-[#E5E5E3] bg-card px-2 text-[13px] text-foreground"
                >
                  {OCR_LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Toggle
              label="Include images"
              description="Embed pictures from the PDF in the document."
              checked={options.includeImages}
              disabled={busy}
              onChange={(includeImages) => setOptions((o) => ({ ...o, includeImages }))}
            />
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534]">
            <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Your PDF is converted in this browser tab and is never uploaded. OCR downloads its recognition engine the first time
              it is used.
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Keeps text, headings, bold and italic, reading order of multi-column pages, simple tables and images. Complex layouts
            (forms, charts drawn as vector graphics, equations, text boxes) are simplified, so check the result.
          </p>
        </div>

        <div className="p-5 bg-muted/40 border-t border-border flex-shrink-0">
          {state === "done" && result ? (
            <button
              onClick={handleDownload}
              data-testid="pdf-to-word-download"
              className="w-full h-12 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 bg-[#E8607A] hover:bg-[#D94D6A] text-white shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
            >
              <Download className="w-5 h-5" /> Download .docx
            </button>
          ) : (
            <button
              onClick={handleConvert}
              disabled={!file || busy}
              data-testid="pdf-to-word-convert"
              className={cn(
                "w-full h-12 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all shadow-sm",
                !file ? "bg-[#D1D1CE] text-white cursor-not-allowed" : busy ? "bg-[#E8607A]/80 text-white cursor-wait" : "bg-[#E8607A] hover:bg-[#D94D6A] text-white hover:shadow-md active:scale-[0.98]"
              )}
            >
              {busy ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Converting…
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" /> Convert to Word
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Right: drop zone / progress / result ─────────────────────────── */}
      <div
        className="flex-1 flex flex-col relative min-h-[320px] md:min-h-0 h-full bg-muted"
        onDrop={onDrop}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setIsDragOver(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false);
        }}
      >
        {isDragOver && (
          <div className="absolute inset-0 z-50 bg-[#E8607A]/5 backdrop-blur-[2px] border-4 border-dashed border-[#E8607A] m-4 rounded-2xl flex items-center justify-center pointer-events-none">
            <div className="bg-card px-6 py-4 rounded-xl shadow-lg flex flex-col items-center border border-[#FECDD3]">
              <Upload className="w-8 h-8 text-[#E8607A] mb-2 animate-bounce" />
              <p className="text-[15px] font-bold text-foreground">Drop your PDF here</p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar flex flex-col">
          {error && (
            <div role="alert" data-testid="pdf-to-word-error" className="mb-6 flex items-start gap-3 p-4 bg-[#FEF2F2] rounded-xl border border-[#E8607A]/20 text-[#B42343]">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-[14px] font-medium">{error}</p>
            </div>
          )}

          {!file && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <button
                onClick={() => inputRef.current?.click()}
                data-testid="pdf-to-word-dropzone"
                className="flex flex-col items-center p-8 lg:p-12 border-2 border-dashed border-[#D1D1CE] rounded-3xl hover:border-[#E8607A] hover:bg-card/50 transition-all cursor-pointer group"
              >
                <div className="w-16 h-16 rounded-2xl bg-card shadow-sm border border-border flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-md transition-all">
                  <Upload className="w-7 h-7 text-[#E8607A]" />
                </div>
                <h3 className="text-[20px] font-bold text-foreground mb-2">Choose a PDF or drop it here</h3>
                <p className="text-[14px] text-muted-foreground">It becomes an editable Word document (.docx)</p>
              </button>
            </div>
          )}

          {file && state === "ready" && (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-card shadow-sm border border-border flex items-center justify-center mb-4">
                <FileText className="w-7 h-7 text-[#E8607A]" />
              </div>
              <h3 className="text-[18px] font-bold text-foreground mb-1">Ready to convert</h3>
              <p className="text-[14px] text-muted-foreground">Press “Convert to Word” to start.</p>
            </div>
          )}

          {busy && progress && (
            <div className="flex-1 flex flex-col items-center justify-center" data-testid="pdf-to-word-progress">
              <div className="w-20 h-20 bg-card rounded-3xl flex items-center justify-center shadow-lg border border-border mb-6">
                {progress.phase === "ocr" ? <ScanText className="w-8 h-8 text-[#E8607A]" /> : <Loader2 className="w-8 h-8 text-[#E8607A] animate-spin" />}
              </div>
              <h2 className="text-[20px] font-bold text-foreground mb-2">Converting…</h2>
              <p className="text-muted-foreground text-[14px] mb-6 text-center" aria-live="polite">
                {progress.message}
              </p>
              <div
                className="w-full max-w-sm h-2 bg-[#E4E4E2] rounded-full overflow-hidden shadow-inner"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress.pct}
              >
                <div className="h-full bg-gradient-to-r from-[#E8607A] to-[#D94D6A] rounded-full transition-all duration-300 ease-out" style={{ width: `${progress.pct}%` }} />
              </div>
              <p className="text-[12px] text-muted-foreground mt-2">{progress.pct}%</p>
            </div>
          )}

          {state === "done" && result && (
            <div className="flex-1 flex flex-col items-center justify-center text-center" data-testid="pdf-to-word-summary">
              <div className="w-16 h-16 rounded-full bg-[#ECFDF5] flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
              </div>
              <h2 className="text-[20px] font-bold text-foreground mb-1">Your Word document is ready</h2>
              <p className="text-[14px] text-muted-foreground mb-6">
                {result.fileName} · {formatFileSize(result.blob.size)}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-lg mb-6">
                {[
                  { icon: FileText, label: "Pages", value: result.pageCount },
                  { icon: FileText, label: "Headings", value: result.stats.headings },
                  { icon: Table, label: "Tables", value: result.stats.tables },
                  { icon: ImageIcon, label: "Images", value: result.stats.images },
                ].map((s) => (
                  <div key={s.label} className="bg-card border border-border rounded-xl p-3">
                    <s.icon className="w-4 h-4 text-[#E8607A] mx-auto mb-1" />
                    <p className="text-[18px] font-bold text-foreground leading-none">{s.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              {(result.ocrPages.length > 0 || result.stats.columnsPages > 0) && (
                <p className="text-[12px] text-muted-foreground mb-2">
                  {result.ocrPages.length > 0 && <>OCR used on page{result.ocrPages.length > 1 ? "s" : ""} {result.ocrPages.join(", ")}. </>}
                  {result.stats.columnsPages > 0 && <>Multi-column layout detected on {result.stats.columnsPages} page{result.stats.columnsPages > 1 ? "s" : ""}.</>}
                </p>
              )}
              {result.warnings.map((w) => (
                <p key={w} className="text-[12px] text-[#B45309] mb-1">
                  {w}
                </p>
              ))}
              <button onClick={reset} className="mt-4 inline-flex items-center gap-2 text-[13px] font-bold text-[#E8607A] hover:underline">
                <RefreshCw className="w-4 h-4" /> Convert another PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
