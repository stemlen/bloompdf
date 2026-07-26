"use client";

import { useState } from "react";
import {
  Globe, Code, Monitor, Laptop, Tablet, Smartphone, FileText,
  Settings, Loader2, Download, AlertCircle, Maximize, CheckSquare, Square
} from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadFile } from "@/lib/splitPdf";

type InputType = "url" | "html";
type ScreenSize = "desktop" | "laptop" | "tablet" | "mobile";
type PageSize = "A4" | "Letter" | "Legal" | "A3";
type Margins = "none" | "small" | "medium" | "large";
type Orientation = "portrait" | "landscape";

export function HtmlToPdfTool() {
  // Input
  const [inputType, setInputType] = useState<InputType>("url");
  const [inputValue, setInputValue] = useState("https://example.com");

  // Settings
  const [screenSize, setScreenSize] = useState<ScreenSize>("desktop");
  const [pageSize, setPageSize] = useState<PageSize>("A4");
  const [margins, setMargins] = useState<Margins>("medium");
  const [orientation, setOrientation] = useState<Orientation>("portrait");

  // Features
  const [blockAds, setBlockAds] = useState(true);
  const [removePopups, setRemovePopups] = useState(true);
  const [printFriendly, setPrintFriendly] = useState(false);
  const [removeCookieBanners, setRemoveCookieBanners] = useState(true);

  // PDF Settings
  const [singlePage, setSinglePage] = useState(false);
  const [backgroundGraphics, setBackgroundGraphics] = useState(true);
  const [scaleToFit, setScaleToFit] = useState(true);

  // State
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildPayload = (action: "preview" | "pdf") => ({
    action,
    inputType,
    inputValue,
    screenSize,
    pageSize,
    margins,
    orientation,
    features: {
      blockAds,
      removePopups,
      printFriendly,
      removeCookieBanners,
    },
    pdfSettings: {
      singlePage,
      backgroundGraphics,
      scaleToFit,
    }
  });

  const handlePreview = async () => {
    if (!inputValue.trim()) return;
    setLoadingPreview(true);
    setError(null);
    try {
      const res = await fetch("/api/html-to-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload("preview"))
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate preview");
      setPreviewImage(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConvert = async () => {
    if (!inputValue.trim()) return;
    setConverting(true);
    setError(null);
    try {
      const res = await fetch("/api/html-to-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload("pdf"))
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate PDF");
      }
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = inputType === "url" ? `website_${Date.now()}.pdf` : `document_${Date.now()}.pdf`;
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

  // Helper for rendering checkboxes
  const CheckboxItem = ({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) => (
    <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-[#F9FAFB] cursor-pointer transition-colors group">
      <div className={cn(
        "mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
        checked ? "bg-[#10B981] border-[#10B981]" : "border-[#D1D1CE] bg-card group-hover:border-[#A1A19D]"
      )}>
        {checked && <CheckSquare className="w-3 h-3 text-white" />}
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
        
        {/* URL / HTML Input Area */}
        <div className="bg-card border-b border-[#E5E5E3] p-6 lg:p-8 flex-shrink-0 z-10 shadow-sm relative">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-[20px] font-bold text-foreground mb-2">Convert Web Page to PDF</h2>
            <p className="text-[14px] text-muted-foreground mb-6">Enter a URL or paste raw HTML code to generate a high-quality PDF document.</p>
            
            <div className="flex items-center bg-[#F3F3F2] p-1 rounded-xl w-max mb-6">
              <button 
                onClick={() => setInputType("url")}
                className={cn("flex items-center gap-2 px-6 py-2.5 rounded-lg text-[14px] font-bold transition-all", inputType === "url" ? "bg-card text-[#2563EB] shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                <Globe className="w-4 h-4" /> URL
              </button>
              <button 
                onClick={() => setInputType("html")}
                className={cn("flex items-center gap-2 px-6 py-2.5 rounded-lg text-[14px] font-bold transition-all", inputType === "html" ? "bg-card text-[#2563EB] shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                <Code className="w-4 h-4" /> Raw HTML
              </button>
            </div>

            <div className="flex items-start gap-3">
              {inputType === "url" ? (
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Globe className="w-5 h-5 text-[#A1A19D]" />
                  </div>
                  <input
                    type="url"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="https://example.com"
                    onKeyDown={(e) => e.key === 'Enter' && handlePreview()}
                    className="w-full h-12 pl-12 pr-4 bg-card border-2 border-[#E5E5E3] focus:border-[#2563EB] rounded-xl text-[15px] outline-none transition-all"
                  />
                </div>
              ) : (
                <div className="flex-1 relative">
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="<html><body><h1>Hello World</h1></body></html>"
                    className="w-full h-40 p-4 bg-card border-2 border-[#E5E5E3] focus:border-[#2563EB] rounded-xl text-[13px] font-mono outline-none transition-all resize-none custom-scrollbar"
                  />
                </div>
              )}
              
              <button
                onClick={handlePreview}
                disabled={loadingPreview || !inputValue.trim()}
                className={cn(
                  "h-12 px-8 rounded-xl font-bold text-[14px] flex items-center justify-center transition-all shadow-sm flex-shrink-0",
                  loadingPreview
                    ? "bg-[#2563EB]/80 text-white cursor-wait"
                    : !inputValue.trim()
                    ? "bg-muted text-[#A1A19D] cursor-not-allowed border border-border"
                    : "bg-[#2563EB] hover:bg-[#1D4ED8] text-white hover:shadow-md"
                )}
              >
                {loadingPreview ? <Loader2 className="w-5 h-5 animate-spin" /> : "Preview"}
              </button>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="absolute top-48 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-4 bg-[#FEF2F2] rounded-2xl border border-[#E8607A]/20 text-[#E8607A] shadow-xl z-50 animate-slide-up">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-[14px] font-bold">{error}</p>
          </div>
        )}

        {/* Preview Area */}
        <div className="flex-1 flex flex-col bg-[#FAFAFA] relative overflow-hidden">
          {previewImage ? (
            <div className="absolute inset-0 flex items-start justify-center p-8 overflow-y-auto custom-scrollbar bg-[#F3F3F2]">
              <div className="bg-card rounded-lg shadow-xl overflow-hidden border border-border max-w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={previewImage} 
                  alt="Webpage Preview" 
                  className="w-full h-auto max-w-[1200px]"
                />
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center opacity-60">
              <div className="w-24 h-24 bg-[#E5E5E3] rounded-3xl flex items-center justify-center mb-6">
                <Globe className="w-12 h-12 text-[#A1A19D]" />
              </div>
              <h3 className="text-[18px] font-bold text-foreground mb-2">No Preview Available</h3>
              <p className="text-[14px] text-muted-foreground max-w-[300px]">Enter a URL and click Preview to see how your web page will look as a PDF.</p>
            </div>
          )}
          
          {loadingPreview && (
            <div className="absolute inset-0 bg-card/80 backdrop-blur-sm flex flex-col items-center justify-center z-40">
              <Loader2 className="w-10 h-10 animate-spin text-[#2563EB] mb-4" />
              <p className="text-[16px] font-bold text-foreground">Loading Preview...</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Right Panel (Settings) ───────────────────────────────────────────── */}
      <div className="w-full md:w-[280px] lg:w-[320px] bg-card border-t md:border-t-0 md:border-l border-border flex flex-col flex-shrink-0 z-20 shadow-[0_-4px_24px_rgba(0,0,0,0.02)] lg:shadow-[-4px_0_24px_rgba(0,0,0,0.02)] h-[50vh] md:h-full">
        <div className="px-5 py-4 border-b border-border flex-shrink-0 bg-[#FAFAFA] flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#2563EB]" />
          <h3 className="text-[14px] font-bold text-foreground">Conversion Settings</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
          
          {/* Screen Size (Viewport) */}
          <div className="space-y-3">
            <p className="text-[12px] font-bold text-foreground uppercase tracking-wider">Viewport Size</p>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => setScreenSize("desktop")} 
                className={cn("flex flex-col items-center justify-center gap-2 p-3 border rounded-xl transition-all", screenSize === "desktop" ? "bg-[#EFF6FF] border-[#2563EB] text-[#2563EB]" : "bg-card border-[#E5E5E3] text-muted-foreground hover:border-[#2563EB]/50 hover:bg-[#FAFAFA]")}
              >
                <Monitor className="w-6 h-6" />
                <span className="text-[12px] font-bold">Desktop</span>
              </button>
              <button 
                onClick={() => setScreenSize("laptop")} 
                className={cn("flex flex-col items-center justify-center gap-2 p-3 border rounded-xl transition-all", screenSize === "laptop" ? "bg-[#EFF6FF] border-[#2563EB] text-[#2563EB]" : "bg-card border-[#E5E5E3] text-muted-foreground hover:border-[#2563EB]/50 hover:bg-[#FAFAFA]")}
              >
                <Laptop className="w-6 h-6" />
                <span className="text-[12px] font-bold">Laptop</span>
              </button>
              <button 
                onClick={() => setScreenSize("tablet")} 
                className={cn("flex flex-col items-center justify-center gap-2 p-3 border rounded-xl transition-all", screenSize === "tablet" ? "bg-[#EFF6FF] border-[#2563EB] text-[#2563EB]" : "bg-card border-[#E5E5E3] text-muted-foreground hover:border-[#2563EB]/50 hover:bg-[#FAFAFA]")}
              >
                <Tablet className="w-6 h-6" />
                <span className="text-[12px] font-bold">Tablet</span>
              </button>
              <button 
                onClick={() => setScreenSize("mobile")} 
                className={cn("flex flex-col items-center justify-center gap-2 p-3 border rounded-xl transition-all", screenSize === "mobile" ? "bg-[#EFF6FF] border-[#2563EB] text-[#2563EB]" : "bg-card border-[#E5E5E3] text-muted-foreground hover:border-[#2563EB]/50 hover:bg-[#FAFAFA]")}
              >
                <Smartphone className="w-6 h-6" />
                <span className="text-[12px] font-bold">Mobile</span>
              </button>
            </div>
          </div>
          
          {/* Layout */}
          <div className="space-y-4">
            <p className="text-[12px] font-bold text-foreground uppercase tracking-wider">Page Layout</p>
            
            <div className="space-y-2">
              <label className="text-[12px] font-semibold text-muted-foreground">Page Size</label>
              <select 
                value={pageSize} 
                onChange={(e) => setPageSize(e.target.value as PageSize)}
                className="w-full h-10 px-3 border border-[#E5E5E3] rounded-lg text-[13px] font-bold focus:outline-none focus:border-[#2563EB] bg-card text-foreground"
              >
                <option value="A4">A4</option>
                <option value="Letter">US Letter</option>
                <option value="Legal">Legal</option>
                <option value="A3">A3</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-[12px] font-semibold text-muted-foreground">Orientation</label>
              <div className="flex bg-[#F3F3F2] p-1 rounded-lg">
                <button onClick={() => setOrientation("portrait")} className={cn("flex-1 py-1.5 rounded-md text-[13px] font-bold transition-all", orientation === "portrait" ? "bg-card text-[#2563EB] shadow-sm" : "text-muted-foreground hover:text-foreground")}>Portrait</button>
                <button onClick={() => setOrientation("landscape")} className={cn("flex-1 py-1.5 rounded-md text-[13px] font-bold transition-all", orientation === "landscape" ? "bg-card text-[#2563EB] shadow-sm" : "text-muted-foreground hover:text-foreground")}>Landscape</button>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[12px] font-semibold text-muted-foreground">Margins</label>
              <div className="flex bg-[#F3F3F2] p-1 rounded-lg">
                {(["none", "small", "medium", "large"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMargins(m)}
                    className={cn(
                      "flex-1 py-1.5 rounded-md text-[12px] font-bold capitalize transition-all",
                      margins === m ? "bg-card text-[#2563EB] shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Cleanup Features */}
          <div className="space-y-3">
            <p className="text-[12px] font-bold text-foreground uppercase tracking-wider">Web Cleanup</p>
            <div className="space-y-1">
              <label className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-[#F9FAFB] transition-colors group">
                <div className={cn("w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors", blockAds ? "bg-[#2563EB] border-[#2563EB]" : "border-[#D1D1CE] bg-card group-hover:border-[#A1A19D]")}>
                  {blockAds && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className="text-[13px] font-bold text-foreground">Block ads & trackers</div>
              </label>
              <label className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-[#F9FAFB] transition-colors group">
                <div className={cn("w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors", removePopups ? "bg-[#2563EB] border-[#2563EB]" : "border-[#D1D1CE] bg-card group-hover:border-[#A1A19D]")}>
                  {removePopups && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className="text-[13px] font-bold text-foreground">Remove popups</div>
              </label>
              <label className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-[#F9FAFB] transition-colors group">
                <div className={cn("w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors", removeCookieBanners ? "bg-[#2563EB] border-[#2563EB]" : "border-[#D1D1CE] bg-card group-hover:border-[#A1A19D]")}>
                  {removeCookieBanners && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className="text-[13px] font-bold text-foreground">Hide cookie banners</div>
              </label>
              <label className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-[#F9FAFB] transition-colors group">
                <div className={cn("w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors", printFriendly ? "bg-[#2563EB] border-[#2563EB]" : "border-[#D1D1CE] bg-card group-hover:border-[#A1A19D]")}>
                  {printFriendly && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className="text-[13px] font-bold text-foreground">Print-friendly mode</div>
              </label>
            </div>
          </div>
          
          {/* PDF Settings */}
          <div className="space-y-3">
            <p className="text-[12px] font-bold text-foreground uppercase tracking-wider">Advanced PDF Options</p>
            <div className="space-y-1">
              <label className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-[#F9FAFB] transition-colors group">
                <div className={cn("w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors", backgroundGraphics ? "bg-[#2563EB] border-[#2563EB]" : "border-[#D1D1CE] bg-card group-hover:border-[#A1A19D]")}>
                  {backgroundGraphics && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className="text-[13px] font-bold text-foreground">Include backgrounds</div>
              </label>
              <label className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-[#F9FAFB] transition-colors group">
                <div className={cn("w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors", scaleToFit ? "bg-[#2563EB] border-[#2563EB]" : "border-[#D1D1CE] bg-card group-hover:border-[#A1A19D]")}>
                  {scaleToFit && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className="text-[13px] font-bold text-foreground">Scale to fit width</div>
              </label>
              <label className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-[#F9FAFB] transition-colors group">
                <div className={cn("w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors", singlePage ? "bg-[#2563EB] border-[#2563EB]" : "border-[#D1D1CE] bg-card group-hover:border-[#A1A19D]")}>
                  {singlePage && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className="text-[13px] font-bold text-foreground">Output as single long page</div>
              </label>
            </div>
          </div>

        </div>
        
        {/* Action Footer */}
        <div className="p-5 bg-[#FAFAFA] border-t border-border flex-shrink-0">
          <button
            onClick={handleConvert}
            disabled={converting || !inputValue.trim()}
            className={cn(
              "w-full h-14 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]",
              converting
                ? "bg-[#2563EB]/80 text-white cursor-wait"
                : !inputValue.trim()
                ? "bg-[#D1D1CE] text-white cursor-not-allowed shadow-none"
                : "bg-[#2563EB] hover:bg-[#1D4ED8] text-white hover:shadow-lg"
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
