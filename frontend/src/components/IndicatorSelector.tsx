"use client";

import { useState, useRef, useEffect } from "react";

interface IndicatorSelectorProps {
  buttonClassName?: string;
  dropdownClassName?: string;
}

const INDICATORS = [
  "Accelerator Oscillator",
  "ADX",
  "Alligator",
  "Aroon",
  "Average True Range",
  "Awesome Oscillator",
  "Bears Power",
  "Bollinger Bands",
  "Bollinger Bands Width",
  "Bulls Power",
  "CCI",
  "Donchian Channels",
  "DeMarker",
  "Envelopes",
  "Fractal",
  "Fractal Chaos Bands",
  "Ichimoku Kinko Hyo",
  "Keltner Channel",
  "MACD",
  "Momentum",
  "Moving Average",
  "OsMA",
  "Parabolic SAR",
  "RSI",
  "Rate of Change",
  "Schaff Trend Cycle",
  "Stochastic Oscillator",
  "SuperTrend",
  "Vortex",
  "Williams %R",
  "ZigZag",
];

export function IndicatorSelector({
  buttonClassName,
  dropdownClassName,
}: IndicatorSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load favorites from local storage
  useEffect(() => {
    const timer = setTimeout(() => {
      const saved = localStorage.getItem("atlas_indicator_favorites");
      if (saved) {
        setFavorites(JSON.parse(saved));
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const toggleFavorite = (e: React.MouseEvent, indicator: string) => {
    e.stopPropagation();
    const newFavorites = favorites.includes(indicator)
      ? favorites.filter((f) => f !== indicator)
      : [...favorites, indicator];

    setFavorites(newFavorites);
    localStorage.setItem(
      "atlas_indicator_favorites",
      JSON.stringify(newFavorites)
    );
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => {
          setIsOpen(!isOpen);
        }}
        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          buttonClassName ||
          "bg-(--bg-tertiary) border border-(--border-primary) hover:border-(--border-secondary)"
        }`}
        title="Indicators"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="4" y1="21" x2="4" y2="14" />
          <line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" />
          <line x1="20" y1="12" x2="20" y2="3" />
          <line x1="1" y1="14" x2="7" y2="14" />
          <line x1="9" y1="8" x2="15" y2="8" />
          <line x1="17" y1="16" x2="23" y2="16" />
        </svg>
      </button>

      {isOpen && (
        <div
          className={`absolute top-full left-0 mt-2 w-[300px] max-h-[450px] z-50 overflow-hidden flex flex-col ${
            dropdownClassName ||
            "bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-2xl"
          }`}
        >
          {/* List */}
          <div className="flex-1 overflow-y-auto no-scrollbar pt-1">
            {INDICATORS.map((indicator) => {
              const isFav = favorites.includes(indicator);
              return (
                <div
                  key={indicator}
                  className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-center gap-3 cursor-pointer border-b border-white/5 last:border-0 group"
                >
                  <button
                    onClick={(e) => toggleFavorite(e, indicator)}
                    className={`text-lg ${
                      isFav
                        ? "text-yellow-400"
                        : "text-gray-600 hover:text-yellow-400"
                    }`}
                  >
                    {isFav ? "★" : "☆"}
                  </button>
                  <span className="text-sm font-medium text-foreground group-hover:text-(--accent-cyan)">
                    {indicator}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
