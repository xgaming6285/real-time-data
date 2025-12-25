"use client";

import { SymbolSelector } from "./SymbolSelector";
import { TimeframeSelector } from "./TimeframeSelector";
import { Timeframe } from "@/lib/types";

interface HeaderProps {
  symbol: string;
  timeframe: Timeframe;
  onSymbolChange: (symbol: string) => void;
  onTimeframeChange: (timeframe: Timeframe) => void;
  onRefresh: () => void;
}

export function Header({
  symbol,
  timeframe,
  onSymbolChange,
  onTimeframeChange,
  onRefresh,
}: HeaderProps) {
  return (
    <header
      className="flex items-center justify-between px-4 py-3 border-b border-(--border-primary)"
      style={{ backgroundColor: "#1c202e" }}
    >
      {/* Left section - Symbol selector */}
      <div className="flex items-center gap-6">
        <SymbolSelector value={symbol} onChange={onSymbolChange} />
      </div>

      {/* Center section - Timeframe */}
      <TimeframeSelector value={timeframe} onChange={onTimeframeChange} />

      {/* Right section - Actions */}
      <div className="flex items-center gap-3">
        {/* Refresh button */}
        <button
          onClick={onRefresh}
          className="p-2 rounded-lg bg-(--bg-tertiary) border border-(--border-primary) hover:border-(--border-secondary) transition-colors group"
          title="Refresh data"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-(--text-secondary) group-hover:text-(--accent-cyan) transition-colors"
          >
            <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
        </button>

        {/* Settings button */}
        <button
          className="p-2 rounded-lg bg-(--bg-tertiary) border border-(--border-primary) hover:border-(--border-secondary) transition-colors group"
          title="Settings"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-(--text-secondary) group-hover:text-foreground transition-colors"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>

        {/* Connection status */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-(--bg-tertiary) rounded-lg border border-(--border-primary)">
          <div className="w-2 h-2 rounded-full bg-(--accent-green) live-indicator" />
          <span className="text-xs text-(--text-secondary)">MT5 Connected</span>
        </div>

        {/* Profile Icon */}
        <div className="relative cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-linear-to-br from-(--accent-cyan) to-(--accent-purple) flex items-center justify-center">
            <span className="text-sm font-bold text-background">A</span>
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-(--accent-green) border-2 border-(--bg-secondary)" />
        </div>
      </div>
    </header>
  );
}
