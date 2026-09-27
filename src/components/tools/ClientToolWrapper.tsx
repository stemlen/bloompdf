"use client";

import { createContext, useContext } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ChevronRight, Loader2 } from "lucide-react";
import type { Tool } from "@/lib/tools";
import { getCategoryById } from "@/lib/categories";
import { ToolIcon } from "@/components/icons/ToolIcons";

// ToolShell uses browser-only APIs (pdf.js, canvas, localStorage), so it is
// rendered client-side only. next/dynamic still server-renders the `loading`
// component, so the static HTML gets the tool header (with its <h1>) from
// ToolShellPlaceholder below. `loading` receives no props, hence the context.
const ToolContext = createContext<Tool | null>(null);

function ToolShellPlaceholder() {
  const tool = useContext(ToolContext);
  if (!tool) return null;
  const category = getCategoryById(tool.categoryId);

  if (tool.layoutType === "workspace") {
    return (
      <div className="flex flex-col h-[calc(100vh-70px)] sm:h-[calc(100vh-100px)] min-h-[600px] sm:min-h-[700px] bg-card border border-border rounded-lg sm:rounded-2xl overflow-hidden shadow-xs">
        <div className="h-14 bg-muted/30 border-b border-border flex items-center px-4 sm:px-6 flex-shrink-0">
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
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" aria-hidden />
          <p className="text-[13px] text-muted-foreground max-w-md">{tool.description}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <div className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-5 py-3">
          <nav className="flex items-center gap-1.5 text-[12px] text-muted-foreground mb-3" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-foreground transition-colors">All Tools</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/#${tool.categoryId}`} className="hover:text-foreground transition-colors">{category?.label}</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-muted-foreground font-medium">{tool.name}</span>
          </nav>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
              <ToolIcon slug={tool.slug} size={48} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[18px] font-bold text-foreground leading-tight">{tool.name}</h1>
              <p className="text-[13px] text-muted-foreground mt-0.5">{tool.description}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-5 py-8 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" aria-hidden />
      </div>
    </div>
  );
}

const ToolShell = dynamic(() => import("./ToolShell").then((m) => m.ToolShell), {
  ssr: false,
  loading: () => <ToolShellPlaceholder />,
});

interface Props {
  tool: Tool;
}

export function ClientToolWrapper({ tool }: Props) {
  return (
    <ToolContext.Provider value={tool}>
      <ToolShell tool={tool} />
    </ToolContext.Provider>
  );
}
