"use client";

import type { Tool, ToolOption } from "@/lib/tools";
import { cn } from "@/lib/utils";

interface ToolOptionsProps {
  tool: Tool;
  values: Record<string, string | number | boolean>;
  onChange: (id: string, value: string | number | boolean) => void;
}

function SliderOption({
  option,
  value,
  onChange,
}: {
  option: ToolOption;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[13px] font-medium text-foreground">{option.label}</label>
        <span className="text-[13px] font-semibold text-[#E8607A] tabular-nums">{value}</span>
      </div>
      <input
        type="range"
        min={option.min ?? 0}
        max={option.max ?? 100}
        step={option.step ?? 1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-[#E8607A]"
      />
      {option.description && (
        <p className="text-[11px] text-muted-foreground">{option.description}</p>
      )}
    </div>
  );
}

function RadioOption({
  option,
  value,
  onChange,
}: {
  option: ToolOption;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[13px] font-medium text-foreground">{option.label}</label>
      <div className="flex flex-wrap gap-2">
        {option.options?.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-all",
              value === opt.value
                ? "border-primary bg-primary/10 text-primary font-semibold"
                : "border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SelectOption({
  option,
  value,
  onChange,
}: {
  option: ToolOption;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[13px] font-medium text-foreground">{option.label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 px-3 bg-card border border-border rounded-lg text-[13px] text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
      >
        {option.options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextOption({
  option,
  value,
  onChange,
}: {
  option: ToolOption;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[13px] font-medium text-foreground">{option.label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={option.placeholder}
        className="w-full h-9 px-3 bg-card border border-border rounded-lg text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
      />
      {option.description && (
        <p className="text-[11px] text-muted-foreground">{option.description}</p>
      )}
    </div>
  );
}

function NumberOption({
  option,
  value,
  onChange,
}: {
  option: ToolOption;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[13px] font-medium text-foreground">{option.label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={option.min}
        max={option.max}
        placeholder={option.placeholder}
        className="w-full h-9 px-3 bg-card border border-border rounded-lg text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
      />
    </div>
  );
}

function PageRangeOption({
  option,
  value,
  onChange,
}: {
  option: ToolOption;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[13px] font-medium text-foreground">{option.label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={option.placeholder}
        className="w-full h-9 px-3 bg-card border border-border rounded-lg text-[13px] text-foreground placeholder:text-muted-foreground font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
      />
      {option.description && (
        <p className="text-[11px] text-muted-foreground">{option.description}</p>
      )}
    </div>
  );
}

export function ToolOptions({ tool, values, onChange }: ToolOptionsProps) {
  if (tool.options.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-5">
      <h3 className="text-[13px] font-semibold text-foreground uppercase tracking-wider">
        Options
      </h3>
      {tool.options.map((option) => {
        const val = values[option.id] ?? option.defaultValue;

        switch (option.type) {
          case "slider":
            return (
              <SliderOption
                key={option.id}
                option={option}
                value={val as number}
                onChange={(v) => onChange(option.id, v)}
              />
            );
          case "radio":
            return (
              <RadioOption
                key={option.id}
                option={option}
                value={val as string}
                onChange={(v) => onChange(option.id, v)}
              />
            );
          case "select":
            return (
              <SelectOption
                key={option.id}
                option={option}
                value={val as string}
                onChange={(v) => onChange(option.id, v)}
              />
            );
          case "text":
            return (
              <TextOption
                key={option.id}
                option={option}
                value={val as string}
                onChange={(v) => onChange(option.id, v)}
              />
            );
          case "number":
            return (
              <NumberOption
                key={option.id}
                option={option}
                value={val as number}
                onChange={(v) => onChange(option.id, v)}
              />
            );
          case "pagerange":
            return (
              <PageRangeOption
                key={option.id}
                option={option}
                value={val as string}
                onChange={(v) => onChange(option.id, v)}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
