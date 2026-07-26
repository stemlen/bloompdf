"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  FileText, Settings, Loader2, Download, AlertCircle, 
  Upload, Edit3, Eye, File, AlignLeft, AlignCenter, AlignRight, AlignJustify
} from "lucide-react";
import { cn } from "@/lib/utils";

type FontFamily = "sans-serif" | "serif" | "monospace" | "Inter";
type FontSize = "10pt" | "12pt" | "14pt" | "16pt";
type LineSpacing = "1" | "1.5" | "2";
type Alignment = "left" | "center" | "right" | "justify";
type Orientation = "portrait" | "landscape";
type Margin = "small" | "medium" | "large";

export function TextToPdfTool() {
  const [text, setText] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  
  // Settings
  const [fontFamily, setFontFamily] = useState<FontFamily>("sans-serif");
  const [fontSize, setFontSize] = useState<FontSize>("12pt");
  const [lineSpacing, setLineSpacing] = useState<LineSpacing>("1.5");
  const [alignment, setAlignment] = useState<Alignment>("left");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [margin, setMargin] = useState<Margin>("medium");
  
  // State
  const [fileInfo, setFileInfo] = useState<{name: string, size: number} | null>(null);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    // Rough estimate: A typical A4 page holds about 3000 chars in 12pt, 1.5 spacing.
    const charsPerPage = fontSize === "10pt" ? 4000 : 
                         fontSize === "12pt" ? 3000 : 
                         fontSize === "14pt" ? 2200 : 1800;
    const estimatedPages = Math.max(1, Math.ceil(chars / (lineSpacing === "2" ? charsPerPage * 0.75 : charsPerPage)));
    return { chars, words, pages: text.trim() ? estimatedPages : 0 };
  }, [text, fontSize, lineSpacing]);

  const handleFileUpload = (uploadedFile: File) => {
    if (!uploadedFile.name.toLowerCase().endsWith('.txt') && 
        !uploadedFile.name.toLowerCase().endsWith('.text')) {
      setError("Please upload a .txt file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setText(content);
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
    if (!text.trim()) return;
    setConverting(true);
    setError(null);
    try {
      const res = await fetch("/api/text-to-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          fontFamily,
          fontSize,
          lineSpacing,
          alignment,
          orientation,
          margin
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
      a.download = fileInfo ? fileInfo.name.replace(/\.(txt|text)$/i, ".pdf") : `document_${Date.now()}.pdf`;
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

  const previewStyle = {
    fontFamily: fontFamily === "Inter" ? "'Inter', sans-serif" : 
                fontFamily === "sans-serif" ? "Arial, Helvetica, sans-serif" : 
                fontFamily === "serif" ? "'Times New Roman', Times, serif" : "monospace",
    fontSize: fontSize === "10pt" ? "13px" : 
              fontSize === "12pt" ? "16px" : 
              fontSize === "14pt" ? "19px" : "21px", // rough pt to px translation for screen
    lineHeight: lineSpacing,
    textAlign: alignment,
    padding: margin === "small" ? "20px" : margin === "medium" ? "40px" : "60px",
    whiteSpace: "pre-wrap" as const,
    wordWrap: "break-word" as const,
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
                <Upload className="w-4 h-4" /> Upload .txt
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
                accept=".txt,.text"
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
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (fileInfo && !e.target.value) setFileInfo(null);
                }}
                placeholder="Start typing your plain text here...&#10;&#10;Or upload a .txt file using the button above."
                className="absolute inset-0 w-full h-full p-6 lg:p-8 resize-none outline-none text-[15px] leading-relaxed text-foreground bg-card custom-scrollbar"
              />
            ) : (
              <div className="absolute inset-0 overflow-y-auto custom-scrollbar bg-muted/40 p-6 lg:p-8">
                {text.trim() ? (
                  <div 
                    className="max-w-4xl mx-auto bg-card shadow-sm border border-border rounded-lg min-h-[800px]"
                    style={previewStyle}
                  >
                    {text}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-[#A1A19D]">
                    <Eye className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-[14px] font-medium">Nothing to preview</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Status Bar */}
          <div className="border-t border-[#E5E5E3] bg-muted/40 px-6 py-2.5 flex items-center justify-between text-[12px] font-medium text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>{stats.words.toLocaleString()} words</span>
              <span>{stats.chars.toLocaleString()} characters</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              <span>~{stats.pages} page{stats.pages !== 1 ? 's' : ''} (estimated)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel (Settings) ───────────────────────────────────────────── */}
      <div className="w-full md:w-[280px] lg:w-[320px] bg-card border-t md:border-t-0 md:border-l border-border flex flex-col flex-shrink-0 z-20 shadow-[0_-4px_24px_rgba(0,0,0,0.02)] lg:shadow-[-4px_0_24px_rgba(0,0,0,0.02)] h-[50vh] md:h-full">
        <div className="px-5 py-4 border-b border-border flex-shrink-0 bg-muted/40 flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#E8607A]" />
          <h3 className="text-[14px] font-bold text-foreground">PDF Settings</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
          
          {/* Typography */}
          <div className="space-y-4">
            <p className="text-[12px] font-bold text-foreground uppercase tracking-wider">Typography</p>
            
            <div className="space-y-2">
              <label className="text-[12px] font-semibold text-muted-foreground">Font Family</label>
              <select 
                value={fontFamily} 
                onChange={(e) => setFontFamily(e.target.value as FontFamily)}
                className="w-full h-10 px-3 border border-[#E5E5E3] rounded-lg text-[13px] font-bold focus:outline-none focus:border-[#E8607A] bg-card text-foreground"
              >
                <option value="sans-serif">Arial / Sans-Serif</option>
                <option value="Inter">Inter (Modern Sans)</option>
                <option value="serif">Times New Roman / Serif</option>
                <option value="monospace">Courier New / Monospace</option>
              </select>
            </div>
            
            <div className="flex gap-3">
              <div className="space-y-2 flex-1">
                <label className="text-[12px] font-semibold text-muted-foreground">Size</label>
                <select 
                  value={fontSize} 
                  onChange={(e) => setFontSize(e.target.value as FontSize)}
                  className="w-full h-10 px-3 border border-[#E5E5E3] rounded-lg text-[13px] font-bold focus:outline-none focus:border-[#E8607A] bg-card text-foreground"
                >
                  <option value="10pt">10 pt</option>
                  <option value="12pt">12 pt</option>
                  <option value="14pt">14 pt</option>
                  <option value="16pt">16 pt</option>
                </select>
              </div>
              <div className="space-y-2 flex-1">
                <label className="text-[12px] font-semibold text-muted-foreground">Spacing</label>
                <select 
                  value={lineSpacing} 
                  onChange={(e) => setLineSpacing(e.target.value as LineSpacing)}
                  className="w-full h-10 px-3 border border-[#E5E5E3] rounded-lg text-[13px] font-bold focus:outline-none focus:border-[#E8607A] bg-card text-foreground"
                >
                  <option value="1">Single</option>
                  <option value="1.5">1.5 Lines</option>
                  <option value="2">Double</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Formatting */}
          <div className="space-y-4">
            <p className="text-[12px] font-bold text-foreground uppercase tracking-wider">Formatting</p>
            
            <div className="space-y-2">
              <label className="text-[12px] font-semibold text-muted-foreground">Alignment</label>
              <div className="flex bg-[#F3F3F2] p-1 rounded-lg">
                <button onClick={() => setAlignment("left")} className={cn("flex-1 py-1.5 flex justify-center rounded-md text-[13px] transition-all", alignment === "left" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")} title="Align Left">
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setAlignment("center")} className={cn("flex-1 py-1.5 flex justify-center rounded-md text-[13px] transition-all", alignment === "center" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")} title="Align Center">
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button onClick={() => setAlignment("right")} className={cn("flex-1 py-1.5 flex justify-center rounded-md text-[13px] transition-all", alignment === "right" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")} title="Align Right">
                  <AlignRight className="w-4 h-4" />
                </button>
                <button onClick={() => setAlignment("justify")} className={cn("flex-1 py-1.5 flex justify-center rounded-md text-[13px] transition-all", alignment === "justify" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")} title="Justify">
                  <AlignJustify className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[12px] font-semibold text-muted-foreground">Orientation</label>
              <div className="flex bg-[#F3F3F2] p-1 rounded-lg">
                <button onClick={() => setOrientation("portrait")} className={cn("flex-1 py-1.5 rounded-md text-[12px] font-bold transition-all", orientation === "portrait" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>Portrait</button>
                <button onClick={() => setOrientation("landscape")} className={cn("flex-1 py-1.5 rounded-md text-[12px] font-bold transition-all", orientation === "landscape" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>Landscape</button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[12px] font-semibold text-muted-foreground">Margins</label>
              <div className="flex bg-[#F3F3F2] p-1 rounded-lg">
                <button onClick={() => setMargin("small")} className={cn("flex-1 py-1.5 rounded-md text-[12px] font-bold transition-all", margin === "small" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>Small</button>
                <button onClick={() => setMargin("medium")} className={cn("flex-1 py-1.5 rounded-md text-[12px] font-bold transition-all", margin === "medium" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>Medium</button>
                <button onClick={() => setMargin("large")} className={cn("flex-1 py-1.5 rounded-md text-[12px] font-bold transition-all", margin === "large" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>Large</button>
              </div>
            </div>
          </div>

        </div>
        
        {/* Action Footer */}
        <div className="p-5 bg-muted/40 border-t border-border flex-shrink-0">
          <button
            onClick={handleConvert}
            disabled={converting || !text.trim()}
            className={cn(
              "w-full h-14 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]",
              converting
                ? "bg-[#E8607A]/80 text-white cursor-wait"
                : !text.trim()
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
