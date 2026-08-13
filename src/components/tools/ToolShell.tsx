"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ChevronRight, Star, Info,
  Combine, Scissors, Trash2, FileOutput, LayoutGrid, ScanLine,
  PackageMinus, Wrench, ScanText, Image as ImageIcon, FileText, Table, Globe,
  ImageDown, FileEdit, Monitor, Sheet, Archive, PenLine, RotateCw,
  Hash, Droplets, Crop, ClipboardList,
} from "lucide-react";
import type { Tool } from "@/lib/tools";
import { getCategoryById, getCategoryBgStyle } from "@/lib/categories";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { useRecent } from "@/lib/hooks/useRecent";
import { DropZone, type UploadedFile } from "./DropZone";
import { ToolOptions } from "./ToolOptions";
import { ActionBar } from "./ActionBar";
import { MergePDFTool } from "./MergePDFTool";
import { CompressPDFTool } from "./CompressPDFTool";
import { ImageToPDFTool } from "./ImageToPDFTool";
import { SplitPDFTool } from "./SplitPDFTool";
import { RemovePagesTool } from "./RemovePagesTool";
import { RotatePDFTool } from "./RotatePDFTool";
import { ExtractPagesTool } from "./ExtractPagesTool";
import { OrganizePDFTool } from "./OrganizePDFTool";
import { AddPageNumbersTool } from "./AddPageNumbersTool";
import { AddWatermarkTool } from "./AddWatermarkTool";
import { CropPdfTool } from "./CropPdfTool";
import { ScanToPDFTool } from "./ScanToPDFTool";
import { HtmlToPdfTool } from "./HtmlToPdfTool";
import { PptxToPdfTool } from "./PptxToPdfTool";
import { WordToPdfTool } from "./WordToPdfTool";
import { ExcelToPdfTool } from "./ExcelToPdfTool";
import { OCRPDFTool } from "./OCRPDFTool";
import { RepairPDFTool } from "./RepairPDFTool";
import { FormsTool } from "./FormsTool";
import { MarkdownToPdfTool } from "./MarkdownToPdfTool";
import { TextToPdfTool } from "./TextToPdfTool";
import { ProtectPdfTool } from "./ProtectPdfTool";
import { UnlockPdfTool } from "./UnlockPdfTool";
import { ToolIcon } from "@/components/icons/ToolIcons";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  Combine, Scissors, Trash2, FileOutput, LayoutGrid, ScanLine,
  PackageMinus, Wrench, ScanText, Image: ImageIcon, FileText, Table, Globe,
  ImageDown, FileEdit, Monitor, Sheet, Archive, PenLine, RotateCw,
  Hash, Droplets, Crop, ClipboardList,
  PresentationIcon: Monitor,
};

interface ToolShellProps {
  tool: Tool;
}

export function ToolShell({ tool }: ToolShellProps) {
  const category = getCategoryById(tool.categoryId);
  const { isFavorite, toggle, mounted: favMounted } = useFavorites();
  const { addRecent } = useRecent();

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [optionValues, setOptionValues] = useState<Record<string, string | number | boolean>>(() => {
    const defaults: Record<string, string | number | boolean> = {};
    for (const opt of tool.options) {
      defaults[opt.id] = opt.defaultValue;
    }
    return defaults;
  });

  // Track this tool as recently used
  useEffect(() => {
    addRecent(tool.slug);
  }, [tool.slug, addRecent]);

  const handleOptionChange = (id: string, value: string | number | boolean) => {
    setOptionValues((prev) => ({ ...prev, [id]: value }));
  };

  const Icon = iconMap[tool.icon] ?? FileText;
  const fav = isFavorite(tool.slug);

  const renderTool = () => {
    if (tool.slug === "merge-pdf") return <MergePDFTool />;
    if (tool.slug === "compress-pdf") return <CompressPDFTool />;
    if (tool.slug === "jpg-to-pdf") return <ImageToPDFTool />;
    if (tool.slug === "split-pdf") return <SplitPDFTool />;
    if (tool.slug === "remove-pages") return <RemovePagesTool />;
    if (tool.slug === "rotate-pdf") return <RotatePDFTool />;
    if (tool.slug === "extract-pages") return <ExtractPagesTool />;
    if (tool.slug === "organize-pdf") return <OrganizePDFTool />;
    if (tool.slug === "add-page-numbers") return <AddPageNumbersTool />;
    if (tool.slug === "add-watermark") return <AddWatermarkTool />;
    if (tool.slug === "crop-pdf") return <CropPdfTool />;
    if (tool.slug === "scan-to-pdf") return <ScanToPDFTool />;
    if (tool.slug === "html-to-pdf") return <HtmlToPdfTool />;
    if (tool.slug === "powerpoint-to-pdf") return <PptxToPdfTool />;
    if (tool.slug === "word-to-pdf") return <WordToPdfTool />;
    if (tool.slug === "excel-to-pdf") return <ExcelToPdfTool />;
    if (tool.slug === "ocr-pdf") return <OCRPDFTool />;
    if (tool.slug === "repair-pdf") return <RepairPDFTool />;
    if (tool.slug === "pdf-forms") return <FormsTool />;
    if (tool.slug === "markdown-to-pdf") return <MarkdownToPdfTool />;
    if (tool.slug === "text-to-pdf") return <TextToPdfTool />;
    if (tool.slug === "protect-pdf") return <ProtectPdfTool />;
    if (tool.slug === "unlock-pdf") return <UnlockPdfTool />;

    return (
      <>
        {/* Drop zone */}
        <div>
          <h2 className="text-[13px] font-semibold text-foreground mb-2">
            {tool.acceptMultiple ? "Upload Files" : "Upload File"}
          </h2>
          <DropZone
            acceptedTypes={tool.acceptedTypes}
            acceptMultiple={tool.acceptMultiple}
            files={files}
            onFilesChange={setFiles}
            maxFiles={tool.maxFiles}
          />
        </div>

        {/* Options */}
        {tool.options.length > 0 && (
          <ToolOptions
            tool={tool}
            values={optionValues}
            onChange={handleOptionChange}
          />
        )}

        {/* Action */}
        <ActionBar
          toolName={tool.name}
          outputFormat={tool.outputFormat}
          hasFiles={files.length > 0}
          onProcess={() => {
            console.log("Processing with options:", optionValues);
          }}
        />
      </>
    );
  };

  if (tool.layoutType === "workspace") {
    return (
      <div className="flex flex-col h-[calc(100vh-70px)] sm:h-[calc(100vh-100px)] min-h-[600px] sm:min-h-[700px] bg-card border border-border rounded-lg sm:rounded-2xl overflow-hidden shadow-xs">
        {/* Compact Workspace Header */}
        <div className="h-14 bg-muted/30 border-b border-border flex items-center px-4 sm:px-6 justify-between flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
                <ToolIcon slug={tool.slug} size={36} />
             </div>
             <div>
                <nav className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">
                  <Link href="/" className="hover:text-foreground transition-colors">Tools</Link>
                  <ChevronRight className="w-2.5 h-2.5" />
                  <Link href={`/#${tool.categoryId}`} className="hover:text-foreground transition-colors">{category?.label}</Link>
                </nav>
                <h1 className="text-[15px] font-bold text-foreground leading-none tracking-tight">{tool.name}</h1>
             </div>
          </div>
          <div className="flex items-center gap-3">
            {favMounted && (
              <button
                onClick={() => toggle(tool.slug)}
                className={cn(
                  "flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12px] font-bold transition-all border",
                  fav
                    ? "bg-primary/10 text-primary border-primary/30 shadow-sm"
                    : "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground shadow-xs"
                )}
                aria-label={fav ? "Remove from favorites" : "Add to favorites"}
              >
                <Star className={cn("w-3.5 h-3.5", fav && "fill-current")} />
                <span className="hidden sm:inline">{fav ? "Favorited" : "Favorite"}</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Workspace Content */}
        <div className="flex-1 overflow-hidden relative">
           {renderTool()}
        </div>
      </div>
    );
  }

  // Original Form Layout
  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-[58px] z-20">
        <div className="max-w-3xl mx-auto px-5 py-3">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-[12px] text-muted-foreground mb-3" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-foreground transition-colors">
              All Tools
            </Link>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/#${tool.categoryId}`} className="hover:text-foreground transition-colors">
              {category?.label}
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-muted-foreground font-medium">{tool.name}</span>
          </nav>

          {/* Tool identity */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
              <ToolIcon slug={tool.slug} size={48} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-[18px] font-bold text-foreground leading-tight">
                  {tool.name}
                </h1>
                {favMounted && (
                  <button
                    onClick={() => toggle(tool.slug)}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all",
                      fav
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    aria-label={fav ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Star className={cn("w-3 h-3", fav && "fill-current")} />
                    {fav ? "Favorited" : "Favorite"}
                  </button>
                )}
              </div>
              <p className="text-[13px] text-muted-foreground mt-0.5">{tool.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-5 py-8 pb-24 space-y-5">
        {/* Info box */}
        <div className="flex items-start gap-3 p-4 bg-muted/50 border border-border rounded-xl">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            {tool.longDescription}
          </p>
        </div>

        {renderTool()}

        {/* Tips */}
        <div className="pt-4 border-t border-border">
          <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            About this tool
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-lg p-3">
              <p className="text-[11px] text-muted-foreground mb-0.5">Output format</p>
              <p className="text-[13px] font-semibold text-foreground">{tool.outputFormat}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-3">
              <p className="text-[11px] text-muted-foreground mb-0.5">Max file size</p>
              <p className="text-[13px] font-semibold text-foreground">50 MB</p>
            </div>
            {tool.acceptMultiple && (
              <div className="bg-card border border-border rounded-lg p-3">
                <p className="text-[11px] text-muted-foreground mb-0.5">Max files</p>
                <p className="text-[13px] font-semibold text-foreground">{tool.maxFiles ?? 20}</p>
              </div>
            )}
            <div className="bg-card border border-border rounded-lg p-3">
              <p className="text-[11px] text-muted-foreground mb-0.5">Accepted types</p>
              <p className="text-[13px] font-semibold text-foreground">
                {tool.acceptedTypes.map((t) => t.toUpperCase().replace(".", "")).join(", ")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
