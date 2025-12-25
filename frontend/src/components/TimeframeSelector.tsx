"use client";

import { Timeframe, TIMEFRAME_OPTIONS } from "@/lib/types";

interface TimeframeSelectorProps {
  value: Timeframe;
  onChange: (timeframe: Timeframe) => void;
}

export function TimeframeSelector({ value, onChange }: TimeframeSelectorProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-(--bg-tertiary) rounded-lg border border-(--border-primary)">
      {TIMEFRAME_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`
            px-2.5 py-1.5 text-xs font-medium rounded-md transition-all
            ${
              value === option.value
                ? "bg-(--accent-cyan) text-background"
                : "text-(--text-secondary) hover:text-foreground hover:bg-(--bg-hover)"
            }
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
