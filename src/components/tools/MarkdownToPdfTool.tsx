"use client";

import { useState, useRef, useEffect } from "react";
import {
  FileText, Settings, Loader2, Download, AlertCircle, 
  Upload, Edit3, Eye, CheckSquare, File
} from "lucide-react";
import { cn } from "@/lib/utils";
import { marked } from "marked";

type Theme = "default" | "professional" | "modern" | "minimal";
type Orientation = "portrait" | "landscape" | "auto";

export function MarkdownToPdfTool() {
  const [markdown, setMarkdown] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [htmlPreview, setHtmlPreview] = useState<string>("");
  
  // Settings
  const [theme, setTheme] = useState<Theme>("default");
  const [orientation, setOrientation] = useState<Orientation>("auto");
  
  // State
  const [fileInfo, setFileInfo] = useState<{name: string, size: number} | null>(null);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse markdown for preview
  useEffect(() => {
    if (activeTab === "preview") {
      try {
        const parsed = marked.parse(markdown);
        setHtmlPreview(parsed as string);
      } catch (err) {
        console.error("Markdown parsing error", err);
      }
    }
  }, [markdown, activeTab]);

  const handleFileUpload = (uploadedFile: File) => {
    if (!uploadedFile.name.toLowerCase().endsWith('.md') && 
        !uploadedFile.name.toLowerCase().endsWith('.markdown') && 
        !uploadedFile.name.toLowerCase().endsWith('.txt')) {
      setError("Please upload a .md or .txt file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setMarkdown(text);
      setFileInfo({
        name: uploadedFile.name,
        size: uploadedFile.size
      });
      setError(null);
    };
    reader.onerror = () => {
      setError("Failed to read file.");
    };
    reader.readAsText(uploadedFile);
  };

  const handleConvert = async () => {
    if (!markdown.trim()) return;
    setConverting(true);
    setError(null);
    try {
      const res = await fetch("/api/markdown-to-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markdown,
          theme,
          orientation
        })
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate PDF");
      }
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileInfo ? fileInfo.name.replace(/\.(md|txt|markdown)$/i, ".pdf") : `document_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-muted relative overflow-hidden">
      {/* ── Left Panel (Preview & Input Area) ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col relative min-h-0 h-full overflow-hidden">
        
        {/* Editor Area */}
        <div className="flex-1 flex flex-col bg-card">
          <div className="flex items-center justify-between border-b border-[#E5E5E3] px-6 py-4 bg-muted/40">
            <div className="flex bg-[#E5E5E3] p-1 rounded-lg">
              <button 
                onClick={() => setActiveTab("write")}
                className={cn("flex items-center gap-2 px-5 py-1.5 rounded-md text-[13px] font-bold transition-all", activeTab === "write" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                <Edit3 className="w-4 h-4" /> Write
              </button>
              <button 
                onClick={() => setActiveTab("preview")}
                className={cn("flex items-center gap-2 px-5 py-1.5 rounded-md text-[13px] font-bold transition-all", activeTab === "preview" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                <Eye className="w-4 h-4" /> Preview
              </button>
            </div>
            
            <div className="flex items-center gap-4">
              {fileInfo && (
                <div className="hidden lg:flex items-center gap-2 text-[12px] text-muted-foreground font-medium px-3 py-1 bg-[#F3F3F2] rounded-full">
                  <File className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[150px]">{fileInfo.name}</span>
                  <span>({(fileInfo.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-[#F3F3F2] hover:bg-[#E5E5E3] text-foreground rounded-lg text-[13px] font-bold transition-colors"
              >
                <Upload className="w-4 h-4" /> Upload .md
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
                accept=".md,.markdown,.txt"
                className="hidden"
              />
            </div>
          </div>
          
          {error && (
            <div className="mx-6 mt-4 flex items-center gap-3 px-4 py-3 bg-[#FEF2F2] rounded-xl border border-[#E8607A]/20 text-[#E8607A] shadow-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-[13px] font-bold">{error}</p>
            </div>
          )}

          <div className="flex-1 overflow-hidden relative">
            {activeTab === "write" ? (
              <textarea
                value={markdown}
                onChange={(e) => {
                  setMarkdown(e.target.value);
                  if (fileInfo && !e.target.value) setFileInfo(null);
                }}
                placeholder="# Start typing your Markdown here...&#10;&#10;Or upload a .md file using the button above."
                className="absolute inset-0 w-full h-full p-6 lg:p-8 resize-none outline-none text-[14px] font-mono leading-relaxed text-foreground bg-card custom-scrollbar"
              />
            ) : (
              <div className="absolute inset-0 overflow-y-auto custom-scrollbar bg-muted/40 p-6 lg:p-8">
                {markdown.trim() ? (
                  <div 
                    className="prose prose-sm max-w-4xl mx-auto bg-card p-8 lg:p-12 shadow-sm border border-border rounded-lg"
                    dangerouslySetInnerHTML={{ __html: htmlPreview }}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-[#A1A19D]">
                    <Eye className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-[14px] font-medium">Nothing to preview</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Right Panel (Settings) ───────────────────────────────────────────── */}
      <div className="w-full md:w-[280px] lg:w-[320px] bg-card border-t md:border-t-0 md:border-l border-border flex flex-col flex-shrink-0 z-20 shadow-[0_-4px_24px_rgba(0,0,0,0.02)] lg:shadow-[-4px_0_24px_rgba(0,0,0,0.02)] h-[50vh] md:h-full">
        <div className="px-5 py-4 border-b border-border flex-shrink-0 bg-muted/40 flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#E8607A]" />
          <h3 className="text-[14px] font-bold text-foreground">Conversion Settings</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
          
          {/* Themes */}
          <div className="space-y-3">
            <p className="text-[12px] font-bold text-foreground uppercase tracking-wider">PDF Theme</p>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => setTheme("default")} 
                className={cn("flex flex-col items-center justify-center p-4 border rounded-xl transition-all", theme === "default" ? "bg-primary/10 border-[#E8607A] text-[#E8607A]" : "bg-card border-[#E5E5E3] text-muted-foreground hover:border-[#E8607A]/50 hover:bg-muted/40")}
              >
                <span className="text-[13px] font-bold mb-1 text-inherit">Default</span>
                <span className="text-[11px] opacity-70">Clean & simple</span>
              </button>
              <button 
                onClick={() => setTheme("professional")} 
                className={cn("flex flex-col items-center justify-center p-4 border rounded-xl transition-all", theme === "professional" ? "bg-primary/10 border-[#E8607A] text-[#E8607A]" : "bg-card border-[#E5E5E3] text-muted-foreground hover:border-[#E8607A]/50 hover:bg-muted/40")}
              >
                <span className="text-[13px] font-bold mb-1 text-inherit font-serif">Professional</span>
                <span className="text-[11px] opacity-70">Formal reports</span>
              </button>
              <button 
                onClick={() => setTheme("modern")} 
                className={cn("flex flex-col items-center justify-center p-4 border rounded-xl transition-all", theme === "modern" ? "bg-primary/10 border-[#E8607A] text-[#E8607A]" : "bg-card border-[#E5E5E3] text-muted-foreground hover:border-[#E8607A]/50 hover:bg-muted/40")}
              >
                <span className="text-[13px] font-bold mb-1 text-inherit tracking-tight">Modern</span>
                <span className="text-[11px] opacity-70">Sleek & vibrant</span>
              </button>
              <button 
                onClick={() => setTheme("minimal")} 
                className={cn("flex flex-col items-center justify-center p-4 border rounded-xl transition-all", theme === "minimal" ? "bg-primary/10 border-[#E8607A] text-[#E8607A]" : "bg-card border-[#E5E5E3] text-muted-foreground hover:border-[#E8607A]/50 hover:bg-muted/40")}
              >
                <span className="text-[13px] font-bold mb-1 text-inherit font-light">Minimal</span>
                <span className="text-[11px] opacity-70">Pure focus</span>
              </button>
            </div>
          </div>
          
          {/* Layout */}
          <div className="space-y-4">
            <p className="text-[12px] font-bold text-foreground uppercase tracking-wider">Page Layout</p>
            
            <div className="space-y-2">
              <label className="text-[12px] font-semibold text-muted-foreground">Orientation</label>
              <div className="flex bg-[#F3F3F2] p-1 rounded-lg">
                <button onClick={() => setOrientation("auto")} className={cn("flex-1 py-1.5 rounded-md text-[12px] font-bold transition-all", orientation === "auto" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>Auto</button>
                <button onClick={() => setOrientation("portrait")} className={cn("flex-1 py-1.5 rounded-md text-[12px] font-bold transition-all", orientation === "portrait" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>Portrait</button>
                <button onClick={() => setOrientation("landscape")} className={cn("flex-1 py-1.5 rounded-md text-[12px] font-bold transition-all", orientation === "landscape" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>Landscape</button>
              </div>
            </div>
          </div>

        </div>
        
        {/* Action Footer */}
        <div className="p-5 bg-muted/40 border-t border-border flex-shrink-0">
          <button
            onClick={handleConvert}
            disabled={converting || !markdown.trim()}
            className={cn(
              "w-full h-14 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]",
              converting
                ? "bg-[#E8607A]/80 text-white cursor-wait"
                : !markdown.trim()
                ? "bg-[#D1D1CE] text-white cursor-not-allowed shadow-none"
                : "bg-[#E8607A] hover:bg-[#D64E68] text-white hover:shadow-lg"
            )}
          >
            {converting ? (
              <><Loader2 className="w-6 h-6 animate-spin" /> Converting...</>
            ) : (
              <><Download className="w-6 h-6" /> Download PDF</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
