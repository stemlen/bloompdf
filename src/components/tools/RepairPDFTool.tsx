"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  X,
  Upload,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileText,
  Wrench,
  Shield,
  Activity,
  FileSearch,
  Zap,
  Settings2,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  FileDown,
} from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import {
  analyseAndRepairPDF,
  analysePDF,
  downloadPDFBytes,
  downloadReportText,
  DEFAULT_REPAIR_OPTIONS,
  type RepairOptions,
  type RepairMode,
  type HealthAnalysis,
  type RepairResult,
  type RepairProgressEvent,
  type PDFIssue,
} from "@/lib/repairPdf";

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolState =
  | "idle"
  | "analysing"
  | "ready"
  | "repairing"
  | "done"
  | "error";

// ─── Sub-components ───────────────────────────────────────────────────────────

function HealthScoreRing({ score }: { score: number }) {
  const radius = 60;
  const stroke = 10;
  const normalised = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalised;
  const progress = circumference - (score / 100) * circumference;

  const color =
    score >= 90 ? "#10B981"
    : score >= 70 ? "#3B82F6"
    : score >= 50 ? "#F59E0B"
    : "#EF4444";

  const label =
    score >= 90 ? "Excellent"
    : score >= 70 ? "Good"
    : score >= 50 ? "Fair"
    : "Poor";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={normalised} fill="none" stroke="#F3F3F2" strokeWidth={stroke} />
          <circle
            cx="60" cy="60" r={normalised}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={progress}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[32px] font-bold tabular-nums leading-none" style={{ color }}>
            {score}
          </span>
          <span className="text-[14px] text-[#A1A19D] font-bold leading-none mt-1">/100</span>
        </div>
      </div>
      <span className="text-[16px] font-bold" style={{ color }}>{label}</span>
    </div>
  );
}

function IssueBadge({ issue }: { issue: PDFIssue }) {
  const styles = {
    critical: "bg-[#FFF0F3] text-[#E8607A] border-[#FECDD3]",
    warning:  "bg-[#FFFBEB] text-[#F59E0B] border-[#FDE68A]",
    info:     "bg-[#EFF6FF] text-[#3B82F6] border-[#BFDBFE]",
  };
  const icons = {
    critical: <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />,
    warning:  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />,
    info:     <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />,
  };
  return (
    <div className={cn("flex items-start gap-3 p-4 rounded-xl border", styles[issue.severity])}>
      {icons[issue.severity]}
      <div className="min-w-0">
        <p className="font-bold text-[14px] leading-snug">{issue.title}</p>
        <p className="text-[13px] opacity-90 mt-1 leading-relaxed">{issue.description}</p>
      </div>
      {issue.fixable && (
        <span className="ml-auto flex-shrink-0 text-[11px] font-bold bg-current/10 px-2 py-1 rounded-md self-start uppercase tracking-wider">
          Fixable
        </span>
      )}
    </div>
  );
}

function OptionToggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-start gap-3 p-3 rounded-xl border text-left transition-all w-full",
        checked ? "border-[#E8607A]/40 bg-[#FFF0F3]" : "border-[#E5E5E3] bg-card hover:border-[#E8607A]/30",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className={cn(
        "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
        checked ? "bg-[#E8607A] border-[#E8607A]" : "border-[#D1D1CE] bg-card"
      )}>
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className={cn("text-[13px] font-bold leading-snug block", checked ? "text-[#E8607A]" : "text-foreground")}>{label}</span>
        {description && (
          <span className="text-[11px] text-muted-foreground mt-1 leading-relaxed block">{description}</span>
        )}
      </div>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RepairPDFTool() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [toolState, setToolState] = useState<ToolState>("idle");
  const [isDragOver, setIsDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Analysis
  const [analysis, setAnalysis] = useState<HealthAnalysis | null>(null);

  // Repair result
  const [result, setResult] = useState<RepairResult | null>(null);

  // Progress
  const [progressEvent, setProgressEvent] = useState<RepairProgressEvent | null>(null);

  // Options
  const [options, setOptions] = useState<RepairOptions>({ ...DEFAULT_REPAIR_OPTIONS });

  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  useEffect(() => () => { abortRef.current = true; }, []);

  const setOption = <K extends keyof RepairOptions>(key: K) =>
    (value: RepairOptions[K]) => setOptions((prev) => ({ ...prev, [key]: value }));

  // ── File handling ──────────────────────────────────────────────────────────

  const handleFiles = useCallback(async (raw: FileList | File[]) => {
    const f = raw[0];
    if (!f) return;

    if (!f.name.toLowerCase().endsWith(".pdf") && f.type !== "application/pdf") {
      setErrorMessage("Please upload a PDF file.");
      setToolState("error");
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setErrorMessage("File exceeds the 50 MB limit.");
      setToolState("error");
      return;
    }

    setFile(f);
    setAnalysis(null);
    setResult(null);
    setErrorMessage(null);
    setToolState("analysing");
    setProgressEvent(null);
    abortRef.current = false;

    try {
      const res = await analysePDF(f, (ev) => {
        if (!abortRef.current) setProgressEvent(ev);
      });
      if (!abortRef.current) {
        setAnalysis(res);
        setToolState("ready");
      }
    } catch (e) {
      if (!abortRef.current) {
        setErrorMessage(e instanceof Error ? e.message : "Analysis failed.");
        setToolState("error");
      }
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false);
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleFiles(e.target.files);
    e.target.value = "";
  };

  // ── Reset ──────────────────────────────────────────────────────────────────

  const handleReset = () => {
    abortRef.current = true;
    setFile(null);
    setAnalysis(null);
    setResult(null);
    setErrorMessage(null);
    setProgressEvent(null);
    setToolState("idle");
  };
  
  const handleDismissError = () => {
    setErrorMessage(null);
    setToolState(analysis ? "ready" : "idle");
  };

  // ── Repair ─────────────────────────────────────────────────────────────────

  const handleRepair = async () => {
    if (!file || toolState === "repairing") return;

    setToolState("repairing");
    setResult(null);
    setErrorMessage(null);
    setProgressEvent(null);
    abortRef.current = false;

    try {
      const res = await analyseAndRepairPDF(file, options, (ev) => {
        if (!abortRef.current) setProgressEvent(ev);
      });
      if (!abortRef.current) {
        setResult(res);
        setAnalysis(res.analysis);
        setToolState("done");
      }
    } catch (e) {
      if (!abortRef.current) {
        setErrorMessage(e instanceof Error ? e.message : "Repair failed unexpectedly.");
        setToolState("error");
      }
    }
  };

  // ── Downloads ──────────────────────────────────────────────────────────────

  const handleDownloadPDF = () => {
    if (!result || !file) return;
    const name = file.name.replace(/\.pdf$/i, "_repaired.pdf");
    downloadPDFBytes(result.pdfBytes, name);
  };

  const handleDownloadReport = () => {
    if (!result || !file) return;
    const name = file.name.replace(/\.pdf$/i, "_repair_report.txt");
    downloadReportText(result.reportText, name);
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const isProcessing = toolState === "analysing" || toolState === "repairing";
  const canRepair = toolState === "ready" && !!analysis;

  const phaseLabel: Record<string, string> = {
    analysing:  "Analysing",
    repairing:  "Repairing",
    optimising: "Optimising",
    finalising: "Finalising",
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-muted relative">
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={handleInputChange} className="hidden" aria-hidden />

      {/* ── Left Panel: Sidebar ────────────────────────────────────────────── */}
      <div className="w-full md:w-[320px] lg:w-[360px] bg-card border-r border-border flex flex-col flex-shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] h-[40vh] md:h-full">
        <div className="px-5 py-4 border-b border-border flex-shrink-0 bg-[#FAFAFA]">
          <h2 className="text-[14px] font-bold text-foreground">Repair PDF</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5 font-medium">Fix corrupted or damaged files</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
          {!file ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#FFF0F3] flex items-center justify-center mb-3">
                 <Wrench className="w-5 h-5 text-[#E8607A]" />
              </div>
              <p className="text-[13px] font-bold text-foreground">No file selected</p>
              <p className="text-[12px] text-muted-foreground mt-1">Upload a PDF to diagnose and repair</p>
            </div>
          ) : (
            <div className="p-5 flex flex-col gap-6">
              {/* File Info */}
              <div className="flex items-center justify-between p-3 bg-[#F8F8F7] border border-[#E5E5E3] rounded-xl shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-[#FFF0F3] rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-[#E8607A]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-foreground truncate">{file.name}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      {formatFileSize(file.size)} 
                      {analysis?.pageCount != null && (
                        <>
                          <span className="text-[#D1D1CE]">•</span> 
                          {analysis.pageCount} pages
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  disabled={isProcessing}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-[#A1A19D] hover:text-[#E8607A] hover:bg-[#FFF0F3] transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Settings (Only show when ready or repairing or done) */}
              {toolState !== "analysing" && (
                <div className="space-y-6">
                   {/* Repair Mode */}
                   <div className="space-y-3">
                      <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <Zap className="w-4 h-4 text-[#A1A19D]" /> Repair Mode
                      </h3>
                      <div className="space-y-2">
                         {([
                           {
                             value: "quick" as RepairMode,
                             label: "Quick Repair",
                             desc: "Rebuilds catalog in a clean container. Best for minor corruption.",
                             badge: "Recommended",
                           },
                           {
                             value: "deep" as RepairMode,
                             label: "Deep Repair",
                             desc: "Renders pages individually. Best for heavily corrupted files.",
                             badge: null,
                           },
                         ]).map((opt) => (
                           <button
                             key={opt.value}
                             type="button"
                             disabled={isProcessing || toolState === "done"}
                             onClick={() => setOption("mode")(opt.value)}
                             className={cn(
                               "w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all",
                               options.mode === opt.value
                                 ? "border-[#E8607A] bg-[#FFF0F3] shadow-sm"
                                 : "border-[#E5E5E3] bg-card hover:border-[#E8607A]/40",
                               (isProcessing || toolState === "done") && "opacity-60 cursor-not-allowed"
                             )}
                           >
                             <div className={cn(
                               "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                               options.mode === opt.value ? "bg-[#E8607A]" : "bg-[#F3F3F2]"
                             )}>
                               <Wrench className={cn("w-4 h-4", options.mode === opt.value ? "text-white" : "text-muted-foreground")} />
                             </div>
                             <div className="flex-1 min-w-0">
                               <div className="flex items-center gap-2">
                                 <span className={cn("text-[13px] font-bold", options.mode === opt.value ? "text-[#E8607A]" : "text-foreground")}>
                                   {opt.label}
                                 </span>
                                 {opt.badge && (
                                   <span className="text-[9px] font-bold bg-[#E8607A] text-white px-2 py-0.5 rounded-full">{opt.badge}</span>
                                 )}
                               </div>
                               <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{opt.desc}</p>
                             </div>
                           </button>
                         ))}
                      </div>
                   </div>

                   {/* Repair Options */}
                   <div className="space-y-3">
                      <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                         <Settings2 className="w-4 h-4 text-[#A1A19D]" /> Options
                      </h3>
                      <div className="space-y-2">
                         <OptionToggle label="Fix corrupted structure"
                           description="Rebuild document catalog and hierarchy"
                           checked={options.fixStructure} onChange={setOption("fixStructure")} disabled={isProcessing || toolState === "done"} />
                         <OptionToggle label="Rebuild XRef table"
                           description="Regenerate cross-reference entries"
                           checked={options.rebuildXref} onChange={setOption("rebuildXref")} disabled={isProcessing || toolState === "done"} />
                         <OptionToggle label="Recover readable pages"
                           description="Copy recoverable pages into new document"
                           checked={options.recoverPages} onChange={setOption("recoverPages")} disabled={isProcessing || toolState === "done"} />
                         <OptionToggle label="Optimise repaired file"
                           description="Use streams to reduce output size"
                           checked={options.optimizeOutput} onChange={setOption("optimizeOutput")} disabled={isProcessing || toolState === "done"} />
                      </div>
                   </div>

                   {/* Recovery Settings */}
                   <div className="space-y-3">
                      <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                         <Shield className="w-4 h-4 text-[#A1A19D]" /> Recovery
                      </h3>
                      <div className="space-y-2">
                         <OptionToggle label="Preserve original quality"
                           description="Higher resolution rendering"
                           checked={options.preserveQuality} onChange={setOption("preserveQuality")} disabled={isProcessing || toolState === "done"} />
                         <OptionToggle label="Maximum page recovery"
                           description="Try harder to recover, lower quality"
                           checked={options.maximizePageRecovery} onChange={setOption("maximizePageRecovery")} disabled={isProcessing || toolState === "done"} />
                      </div>
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
              <p className="text-[15px] font-bold text-foreground">Drop damaged PDF here</p>
            </div>
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 relative custom-scrollbar flex flex-col">
           
           {!file ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                 <button 
                   onClick={() => inputRef.current?.click()}
                   className="flex flex-col items-center p-8 lg:p-12 border-2 border-dashed border-[#D1D1CE] rounded-3xl hover:border-[#E8607A] hover:bg-card/50 transition-all cursor-pointer group"
                 >
                    <div className="w-16 h-16 rounded-2xl bg-card shadow-sm border border-border flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-md transition-all">
                       <Wrench className="w-7 h-7 text-[#E8607A]" />
                    </div>
                    <h3 className="text-[20px] font-bold text-foreground mb-2">Upload a damaged PDF</h3>
                    <p className="text-[14px] text-muted-foreground">We will automatically analyze its health</p>
                 </button>
              </div>
           ) : toolState === "analysing" && !analysis ? (
              <div className="flex-1 flex flex-col items-center justify-center animate-fade-in">
                 <div className="w-20 h-20 bg-card rounded-3xl flex items-center justify-center shadow-lg border border-border mb-6 relative">
                    <FileSearch className="w-8 h-8 text-[#E8607A]" />
                    <div className="absolute -inset-2 border-4 border-[#E8607A]/20 rounded-full animate-ping" />
                 </div>
                 <h2 className="text-[24px] font-bold text-foreground mb-2">Analysing PDF...</h2>
                 <p className="text-muted-foreground text-[15px] mb-8">{progressEvent?.step ?? "Reading file structure"}</p>
                 <div className="w-full max-w-sm h-2 bg-[#E4E4E2] rounded-full overflow-hidden shadow-inner">
                   <div
                     className="h-full bg-gradient-to-r from-[#E8607A] to-[#D94D6A] rounded-full transition-all duration-300 ease-out"
                     style={{ width: `${progressEvent?.pct ?? 5}%` }}
                   />
                 </div>
              </div>
           ) : analysis && (
              <div className="w-full max-w-3xl mx-auto space-y-8 pb-8 animate-slide-up">
                 {/* Top Level Health Summary */}
                 <div className="bg-card rounded-3xl border border-border shadow-sm p-8 flex flex-col md:flex-row items-center gap-8 lg:gap-12">
                    <HealthScoreRing score={analysis.healthScore} />
                    
                    <div className="flex-1 space-y-4 text-center md:text-left">
                       <div>
                          <h2 className="text-[24px] font-bold text-foreground mb-1">Health Analysis Report</h2>
                          <p className="text-[14px] text-muted-foreground">We found {analysis.issues.length} {analysis.issues.length === 1 ? "issue" : "issues"} in your document.</p>
                       </div>
                       
                       <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                          <div className="px-4 py-2 rounded-xl bg-[#F8F8F7] border border-border">
                             <p className="text-[11px] font-bold text-[#A1A19D] uppercase tracking-wider mb-0.5">Repairability</p>
                             <p className="text-[14px] font-bold text-foreground">{analysis.repairabilityStatus}</p>
                          </div>
                          <div className={cn(
                             "px-4 py-2 rounded-xl border",
                             analysis.recoveryProbability === "High" ? "bg-[#ECFDF5] border-[#10B981]/30" 
                             : analysis.recoveryProbability === "Medium" ? "bg-[#FFFBEB] border-[#F59E0B]/30"
                             : "bg-[#FFF0F3] border-[#E8607A]/30"
                          )}>
                             <p className={cn(
                               "text-[11px] font-bold uppercase tracking-wider mb-0.5",
                               analysis.recoveryProbability === "High" ? "text-[#10B981]" 
                               : analysis.recoveryProbability === "Medium" ? "text-[#F59E0B]"
                               : "text-[#E8607A]"
                             )}>Recovery Probability</p>
                             <p className={cn(
                               "text-[14px] font-bold",
                               analysis.recoveryProbability === "High" ? "text-[#10B981]" 
                               : analysis.recoveryProbability === "Medium" ? "text-[#F59E0B]"
                               : "text-[#E8607A]"
                             )}>{analysis.recoveryProbability}</p>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Structural Flags Grid */}
                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                   {[
                     { label: "PDF Header",    ok: analysis.hasValidHeader },
                     { label: "EOF Marker",    ok: analysis.hasValidEOF },
                     { label: "XRef Table",    ok: analysis.hasXref },
                     { label: "Trailer Dict",  ok: analysis.hasTrailer },
                     { label: "Metadata",      ok: analysis.metadataIntact },
                     { label: "Encryption",    ok: !analysis.hasEncryption, neutralFalse: true },
                   ].map(({ label, ok, neutralFalse }) => (
                     <div key={label} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
                       <div className={cn(
                         "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm",
                         ok ? "bg-[#ECFDF5] text-[#10B981]" : neutralFalse ? "bg-[#FFFBEB] text-[#F59E0B]" : "bg-[#FFF0F3] text-[#E8607A]"
                       )}>
                         {ok
                           ? <CheckCircle2 className="w-5 h-5" />
                           : neutralFalse
                             ? <AlertTriangle className="w-5 h-5" />
                             : <X className="w-5 h-5" />}
                       </div>
                       <span className="text-[13px] font-bold text-foreground">{label}</span>
                     </div>
                   ))}
                 </div>

                 {/* Issues List */}
                 {analysis.issues.length > 0 ? (
                   <div className="space-y-4">
                     <h3 className="text-[16px] font-bold text-foreground flex items-center gap-2">
                       <AlertTriangle className="w-5 h-5 text-[#E8607A]" />
                       Detected Issues
                     </h3>
                     <div className="grid gap-3">
                       {analysis.issues.map((issue) => (
                         <IssueBadge key={issue.id} issue={issue} />
                       ))}
                     </div>
                   </div>
                 ) : (
                   <div className="flex flex-col items-center justify-center p-8 bg-card rounded-2xl border border-border text-center">
                     <div className="w-12 h-12 bg-[#ECFDF5] rounded-full flex items-center justify-center mb-3">
                        <CheckCircle2 className="w-6 h-6 text-[#10B981]" />
                     </div>
                     <p className="text-[16px] font-bold text-foreground">No major structural issues detected</p>
                     <p className="text-[14px] text-muted-foreground mt-1">The file appears healthy, but running a repair can still clean and normalize its structure.</p>
                   </div>
                 )}

                 {/* Results Overaly */}
                 {toolState === "done" && result && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-fade-in">
                       <div className="w-full max-w-md bg-card rounded-3xl shadow-2xl overflow-hidden animate-slide-up flex flex-col">
                          <div className="p-8 flex flex-col items-center text-center border-b border-border bg-gradient-to-b from-[#ECFDF5] to-white">
                             <div className="w-20 h-20 bg-card rounded-full flex items-center justify-center shadow-lg mb-4 border border-[#10B981]/20">
                                <CheckCircle2 className="w-10 h-10 text-[#10B981]" />
                             </div>
                             <h2 className="text-[24px] font-bold text-foreground mb-2">Repair Successful!</h2>
                             <p className="text-[15px] text-muted-foreground">
                               Recovered <strong className="text-foreground">{result.pagesRecovered}</strong> of {result.totalPagesAttempted} pages
                             </p>
                          </div>
                          
                          <div className="p-6 overflow-y-auto max-h-[300px] custom-scrollbar bg-[#F8F8F7]">
                             <h4 className="text-[12px] font-bold text-[#A1A19D] uppercase tracking-wider mb-3">Actions Taken</h4>
                             <div className="space-y-3">
                               {result.repairActions.map((action, i) => (
                                 <div key={i} className="flex items-start gap-2.5">
                                   <CheckCircle2 className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" />
                                   <p className="text-[13px] font-medium text-foreground">{action}</p>
                                 </div>
                               ))}
                               {result.warnings.map((w, i) => (
                                 <div key={i} className="flex items-start gap-2.5">
                                   <AlertTriangle className="w-4 h-4 text-[#F59E0B] flex-shrink-0 mt-0.5" />
                                   <p className="text-[13px] font-medium text-muted-foreground">{w}</p>
                                 </div>
                               ))}
                             </div>
                          </div>

                          <div className="p-6 bg-card flex flex-col gap-3">
                             <button
                               onClick={handleDownloadPDF}
                               className="w-full h-12 bg-[#E8607A] hover:bg-[#D94D6A] text-white rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 transition-colors shadow-md"
                             >
                               <Download className="w-5 h-5" />
                               Download Repaired PDF
                             </button>
                             <div className="flex gap-3">
                               <button
                                 onClick={handleDownloadReport}
                                 className="flex-1 h-11 bg-card border border-border hover:bg-[#F8F8F7] text-foreground rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 transition-colors"
                               >
                                 <FileDown className="w-4 h-4" />
                                 Report
                               </button>
                               <button
                                 onClick={handleReset}
                                 className="flex-1 h-11 bg-card border border-border hover:bg-[#F8F8F7] text-foreground rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 transition-colors"
                               >
                                 <RefreshCw className="w-4 h-4" />
                                 Close
                               </button>
                             </div>
                          </div>
                       </div>
                    </div>
                 )}
              </div>
           )}
        </div>

        {/* Sticky Action Bar */}
        <div className="bg-card border-t border-border h-[80px] px-6 flex items-center justify-between flex-shrink-0 shadow-[0_-8px_24px_rgba(0,0,0,0.02)] z-30 relative">
          
          {errorMessage && toolState === "error" && (
            <div className="absolute -top-16 right-6 flex items-center gap-3 p-3 bg-[#FFF0F3] rounded-xl border border-[#E8607A]/20 shadow-lg animate-slide-up max-w-sm">
              <AlertCircle className="w-5 h-5 text-[#E8607A] flex-shrink-0" />
              <p className="text-[12px] font-semibold text-foreground leading-tight">
                {errorMessage}
              </p>
              <button onClick={handleDismissError} className="p-1 hover:bg-[#FFC5D3] rounded-lg text-[#E8607A]">
                 <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Left Controls (Progress Bar if repairing) */}
          <div className="flex-1 max-w-md hidden md:block">
             {toolState === "repairing" && progressEvent && (
                <div className="space-y-1.5 w-full pr-8 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-muted-foreground">
                      {phaseLabel[progressEvent.phase] ?? "Processing"}...
                    </span>
                  </div>
                  <div className="h-2 bg-[#F3F3F2] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#E8607A] rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${progressEvent.pct}%` }}
                    />
                  </div>
                </div>
             )}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3 w-full md:w-auto">
             <button
               onClick={handleRepair}
               disabled={!canRepair || isProcessing}
               className={cn(
                 "flex-1 md:flex-none h-11 px-8 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all w-full md:w-auto",
                 isProcessing
                   ? "bg-[#E8607A]/80 text-white cursor-wait"
                   : !canRepair
                   ? "bg-muted text-[#A1A19D] cursor-not-allowed border border-border"
                   : "bg-[#111111] hover:bg-[#333333] text-white shadow-md active:scale-[0.98]"
               )}
             >
               {toolState === "repairing" ? (
                 <>
                   <Loader2 className="w-4 h-4 animate-spin" />
                   Repairing...
                 </>
               ) : (
                 <>
                   <Wrench className="w-4 h-4" />
                   Start Repair
                 </>
               )}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
