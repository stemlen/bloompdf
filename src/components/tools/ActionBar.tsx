"use client";

import { useState } from "react";
import { Download, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ProcessState = "idle" | "processing" | "done" | "error";

interface ActionBarProps {
  toolName: string;
  outputFormat: string;
  hasFiles: boolean;
  onProcess: () => void;
}

export function ActionBar({ toolName, outputFormat, hasFiles, onProcess }: ActionBarProps) {
  const [state, setState] = useState<ProcessState>("idle");
  const [progress, setProgress] = useState(0);

  const handleProcess = () => {
    if (!hasFiles || state === "processing") return;
    onProcess();
    setState("processing");
    setProgress(0);

    // Simulate realistic processing
    const steps = [
      { pct: 20, delay: 300 },
      { pct: 45, delay: 700 },
      { pct: 70, delay: 400 },
      { pct: 88, delay: 600 },
      { pct: 100, delay: 400 },
    ];

    let current = 0;
    function tick() {
      if (current >= steps.length) {
        setTimeout(() => setState("done"), 200);
        return;
      }
      setTimeout(() => {
        setProgress(steps[current].pct);
        current++;
        tick();
      }, steps[current].delay);
    }
    tick();
  };

  const handleReset = () => {
    setState("idle");
    setProgress(0);
  };

  return (
    <div className="bg-card border border-[#E5E5E3] rounded-xl p-5 space-y-4">
      {/* Progress bar */}
      {state === "processing" && (
        <div className="space-y-1.5 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[#6B7280]">Processing…</span>
            <span className="text-[12px] font-semibold text-foreground tabular-nums">{progress}%</span>
          </div>
          <div className="h-1.5 bg-[#F3F3F2] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#E8607A] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Done state */}
      {state === "done" && (
        <div className="flex items-center gap-3 p-3 bg-[#EBFBEE] rounded-lg border border-[#2F9E44]/20 animate-slide-up">
          <CheckCircle2 className="w-4 h-4 text-[#2F9E44] flex-shrink-0" />
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-foreground">Processing complete!</p>
            <p className="text-[12px] text-[#6B7280]">Your {outputFormat} file is ready to download.</p>
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex items-center gap-3">
        {state === "done" ? (
          <>
            <button
              className="flex-1 h-10 bg-[#E8607A] hover:bg-[#D94D6A] text-white rounded-lg font-semibold text-[14px] flex items-center justify-center gap-2 transition-colors shadow-sm"
              onClick={() => alert("In a real implementation, this would download your processed file.")}
            >
              <Download className="w-4 h-4" />
              Download {outputFormat}
            </button>
            <button
              onClick={handleReset}
              className="h-10 px-4 bg-[#F3F3F2] hover:bg-[#E5E5E3] text-[#6B7280] hover:text-foreground rounded-lg font-medium text-[13px] transition-colors"
            >
              Process another
            </button>
          </>
        ) : (
          <button
            onClick={handleProcess}
            disabled={!hasFiles || state === "processing"}
            className={cn(
              "flex-1 h-10 rounded-lg font-semibold text-[14px] flex items-center justify-center gap-2 transition-all",
              !hasFiles
                ? "bg-[#F3F3F2] text-[#A1A19D] cursor-not-allowed"
                : state === "processing"
                ? "bg-[#E8607A]/80 text-white cursor-wait"
                : "bg-[#E8607A] hover:bg-[#D94D6A] text-white shadow-sm hover:shadow-md active:scale-[0.98]"
            )}
          >
            {state === "processing" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing…
              </>
            ) : (
              toolName
            )}
          </button>
        )}
      </div>

      {!hasFiles && state === "idle" && (
        <p className="text-[12px] text-[#A1A19D] text-center">
          Upload a file above to get started
        </p>
      )}
    </div>
  );
}
