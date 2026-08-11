"use client";

import { useState, useRef, useEffect } from "react";
import {
  Upload,
  Download,
  Loader2,
  AlertCircle,
  Edit3,
  Eye,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GITHUB_MARKDOWN_CSS, renderMarkdownToHtml } from "@/lib/markdownStyles";

export function MarkdownToPdfTool() {
  const [markdown, setMarkdown] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [htmlPreview, setHtmlPreview] = useState<string>("");
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);
  const [converting, setConverting] = useState(false);
  const [converted, setConverted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Parse markdown for preview tab using identical parser settings as PDF generator
  useEffect(() => {
    if (activeTab === "preview" && markdown.trim()) {
      const parsed = renderMarkdownToHtml(markdown);
      setHtmlPreview(parsed);
    }
  }, [markdown, activeTab]);

  const readFile = (file: File) => {
    const ext = file.name.toLowerCase();
    if (!ext.endsWith(".md") && !ext.endsWith(".markdown") && !ext.endsWith(".txt")) {
      setError("Please upload a .md, .markdown, or .txt file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setMarkdown(text);
      setFileInfo({ name: file.name, size: file.size });
      setError(null);
      setConverted(false);
    };
    reader.onerror = () => setError("Failed to read file.");
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  };

  const handleConvert = async () => {
    if (!markdown.trim()) return;
    setConverting(true);
    setConverted(false);
    setError(null);

    try {
      const res = await fetch("/api/markdown-to-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate PDF");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileInfo
        ? fileInfo.name.replace(/\.(md|txt|markdown)$/i, ".pdf")
        : `document_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setConverted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setConverting(false);
    }
  };

  const wordCount = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
  const charCount = markdown.length;

  return (
    <div
      className="flex flex-col w-full h-full bg-muted relative overflow-hidden"
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false); }}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-[#E8607A]/5 backdrop-blur-[2px] border-4 border-dashed border-[#E8607A] m-4 rounded-2xl flex items-center justify-center pointer-events-none">
          <div className="bg-card px-8 py-5 rounded-2xl shadow-lg border border-[#FECDD3] flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-[#E8607A] animate-bounce" />
            <p className="text-[15px] font-bold text-foreground">Drop your Markdown file here</p>
            <p className="text-[13px] text-muted-foreground">.md, .markdown, .txt</p>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt"
        className="hidden"
        onChange={(e) => e.target.files && readFile(e.target.files[0])}
      />

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 sm:px-6 py-3 flex-shrink-0 gap-3 flex-wrap">

        {/* Left: Write / Preview toggle */}
        <div className="flex items-center gap-2">
          <div className="flex bg-muted p-1 rounded-xl gap-0.5">
            <button
              onClick={() => setActiveTab("write")}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all",
                activeTab === "write"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Edit3 className="w-3.5 h-3.5" /> Write
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all",
                activeTab === "preview"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Eye className="w-3.5 h-3.5" /> Preview
            </button>
          </div>

          {/* File pill */}
          {fileInfo && (
            <div className="hidden sm:flex items-center gap-1.5 text-[12px] text-muted-foreground font-medium px-3 py-1.5 bg-muted rounded-full border border-border">
              <FileText className="w-3.5 h-3.5 text-[#E8607A]" />
              <span className="truncate max-w-[140px]">{fileInfo.name}</span>
            </div>
          )}
        </div>

        {/* Right: Upload + Convert */}
        <div className="flex items-center gap-2">
          {/* Word count */}
          {markdown.trim() && (
            <span className="hidden sm:block text-[12px] text-muted-foreground font-medium">
              {wordCount.toLocaleString()} words · {charCount.toLocaleString()} chars
            </span>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 bg-muted border border-border hover:bg-card text-foreground rounded-xl text-[13px] font-bold transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload .md</span>
          </button>

          <button
            onClick={handleConvert}
            disabled={converting || !markdown.trim()}
            className={cn(
              "flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-[13px] transition-all shadow-sm active:scale-[0.98]",
              converting
                ? "bg-[#E8607A]/80 text-white cursor-wait"
                : !markdown.trim()
                ? "bg-muted text-muted-foreground cursor-not-allowed border border-border"
                : converted
                ? "bg-[#10B981] hover:bg-[#059669] text-white"
                : "bg-[#E8607A] hover:bg-[#D94D6A] text-white"
            )}
          >
            {converting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Converting…</>
            ) : converted ? (
              <><CheckCircle2 className="w-4 h-4" /> Downloaded</>
            ) : (
              <><Download className="w-4 h-4" /> Convert &amp; Download</>
            )}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 sm:mx-6 mt-3 flex items-center gap-3 px-4 py-3 bg-[#FEF2F2] rounded-xl border border-[#E8607A]/20 text-[#E8607A] shadow-sm flex-shrink-0">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p className="text-[13px] font-semibold">{error}</p>
        </div>
      )}

      {/* ── Editor / Preview Area ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden relative min-h-0">
        {activeTab === "write" ? (
          /* Write tab: full-area textarea */
          <div className="absolute inset-0 flex flex-col">
            {!markdown && (
              /* Empty state drop-zone hint inside editor */
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                <div className="flex flex-col items-center text-center px-8 py-10 rounded-3xl">
                  <div className="w-16 h-16 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-center mb-4">
                    <Edit3 className="w-7 h-7 text-[#E8607A]" />
                  </div>
                  <h3 className="text-[18px] font-bold text-foreground mb-1">Start writing Markdown</h3>
                  <p className="text-[14px] text-muted-foreground max-w-xs">
                    Type directly, paste content, or drag &amp; drop a <code className="text-[13px] bg-muted px-1.5 py-0.5 rounded font-mono">.md</code> file anywhere on this page.
                  </p>
                </div>
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={markdown}
              onChange={(e) => {
                setMarkdown(e.target.value);
                if (fileInfo && !e.target.value) setFileInfo(null);
                if (converted) setConverted(false);
              }}
              spellCheck={false}
              className="absolute inset-0 w-full h-full p-6 sm:p-8 lg:p-10 resize-none outline-none text-[14px] font-mono leading-[1.7] text-foreground bg-card custom-scrollbar z-20 bg-transparent"
              style={{ tabSize: 2 }}
            />
          </div>
        ) : (
          /* Preview tab: rendered markdown in exact A4 page style matching PDF output */
          <div className="absolute inset-0 overflow-y-auto custom-scrollbar bg-[#E5E5E3]/40 p-4 sm:p-8 flex flex-col items-center">
            {markdown.trim() ? (
              <div className="w-full max-w-4xl flex flex-col items-center gap-4">
                <style dangerouslySetInnerHTML={{ __html: GITHUB_MARKDOWN_CSS }} />
                
                {/* Visual A4 PDF Page Representation */}
                <div className="a4-page-preview shadow-2xl transition-all">
                  <div
                    className="markdown-body"
                    dangerouslySetInnerHTML={{ __html: htmlPreview }}
                  />
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <Eye className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-[14px] font-medium">Nothing to preview — write some Markdown first</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
