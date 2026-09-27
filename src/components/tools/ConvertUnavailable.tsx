"use client";

import Link from "next/link";
import { CloudOff } from "lucide-react";
import { CONVERT_UNAVAILABLE_MESSAGE } from "@/lib/convertApi";
import { cn } from "@/lib/utils";

interface Props {
  /** Tool name shown in the heading, e.g. "Word to PDF" */
  toolName: string;
  className?: string;
  compact?: boolean;
}

const ALTERNATIVES = [
  { slug: "jpg-to-pdf", name: "JPG to PDF" },
  { slug: "markdown-to-pdf", name: "Markdown to PDF" },
  { slug: "text-to-pdf", name: "Text to PDF" },
  { slug: "merge-pdf", name: "Merge PDF" },
];

/**
 * Shown by server-backed converters while the conversion backend is disabled
 * (NEXT_PUBLIC_CONVERT_ENABLED !== "true") or unreachable.
 */
export function ConvertUnavailable({ toolName, className, compact }: Props) {
  return (
    <div
      role="status"
      data-testid="convert-unavailable"
      className={cn(
        "w-full max-w-2xl bg-card border border-[#F59E0B]/30 rounded-3xl flex flex-col items-center text-center shadow-sm",
        compact ? "p-5" : "p-6 sm:p-10",
        className
      )}
    >
      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#FFFBEB] rounded-2xl flex items-center justify-center mb-4 border border-[#F59E0B]/20">
        <CloudOff className="w-7 h-7 sm:w-8 sm:h-8 text-[#D97706]" />
      </div>
      <h3 className="text-[18px] sm:text-[22px] font-bold text-foreground mb-2">
        {toolName} is temporarily unavailable
      </h3>
      <p className="text-[13px] sm:text-[14px] text-muted-foreground leading-relaxed max-w-md">
        {CONVERT_UNAVAILABLE_MESSAGE}
      </p>
      {!compact && (
        <div className="mt-6 w-full">
          <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Works right now, 100% in your browser
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {ALTERNATIVES.map((t) => (
              <Link
                key={t.slug}
                href={`/tools/${t.slug}`}
                className="px-3 py-1.5 rounded-full border border-border bg-muted text-[12px] font-semibold text-foreground hover:border-[#E8607A] hover:text-[#E8607A] transition-colors"
              >
                {t.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
