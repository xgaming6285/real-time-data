"use client";

import { useState, useRef, useEffect } from "react";
import { ActiveIndicator, IndicatorConfig } from "@/lib/types";

interface IndicatorSelectorProps {
  buttonClassName?: string;
  dropdownClassName?: string;
  activeIndicators?: ActiveIndicator[];
  favoriteIndicators?: string[];
  onAddIndicator?: (name: string, config: IndicatorConfig) => void;
  onRemoveIndicator?: (id: string) => void;
  onUpdateIndicator?: (id: string, config: IndicatorConfig) => void;
  onToggleFavorite?: (indicator: string) => void;
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
  activeIndicators = [],
  favoriteIndicators = [],
  onAddIndicator,
  onRemoveIndicator,
  onUpdateIndicator,
  onToggleFavorite,
}: IndicatorSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  // Internal state removed in favor of props
  // const [favorites, setFavorites] = useState<string[]>([]);
  const [editingIndicator, setEditingIndicator] = useState<{
    name: string;
    config: IndicatorConfig;
    id?: string;
  } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load favorites from local storage - REMOVED, controlled by parent via props
  /*
  useEffect(() => {
    const timer = setTimeout(() => {
      const saved = localStorage.getItem("atlas_indicator_favorites");
      if (saved) {
        setFavorites(JSON.parse(saved));
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  */

  const toggleFavorite = (e: React.MouseEvent, indicator: string) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(indicator);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setEditingIndicator(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleIndicatorClick = (indicator: string) => {
    if (indicator === "Moving Average") {
      setEditingIndicator({
        name: indicator,
        config: {
          period: 14,
          type: "SMA",
          source: "close",
          color: "#2962FF",
          lineWidth: 2,
        },
      });
    } else if (indicator === "RSI") {
      setEditingIndicator({
        name: indicator,
        config: {
          period: 14,
          overbought: 70,
          oversold: 30,
          middle: 50,
          color: "#d4af37",
          lineWidth: 2,
        },
      });
    } else if (indicator === "ZigZag") {
      setEditingIndicator({
        name: indicator,
        config: {
          deviation: 0.1, // Reduced default deviation for Forex
          depth: 10,
          color: "#FF5252",
          lineWidth: 2,
        },
      });
    } else if (indicator === "MACD") {
      setEditingIndicator({
        name: indicator,
        config: {
          fastPeriod: 12,
          slowPeriod: 26,
          signalPeriod: 9,
          color: "#2962FF", // Main line color
          lineWidth: 2,
        },
      });
    } else if (indicator === "CCI") {
      setEditingIndicator({
        name: indicator,
        config: {
          period: 20,
          overbought: 100,
          oversold: -100,
          color: "#FF6D00",
          lineWidth: 2,
        },
      });
    } else if (indicator === "Stochastic Oscillator") {
      setEditingIndicator({
        name: indicator,
        config: {
          kPeriod: 14,
          dPeriod: 3,
          slowing: 3,
          overbought: 80,
          oversold: 20,
          color: "#00E676",
          lineWidth: 2,
        },
      });
    } else {
      // For other indicators, just add them directly for now (or show placeholder)
      if (onAddIndicator) {
        onAddIndicator(indicator, {});
      }
      setIsOpen(false);
    }
  };

  const handleEditActiveIndicator = (indicator: ActiveIndicator) => {
    if (
      indicator.name === "Moving Average" ||
      indicator.name === "RSI" ||
      indicator.name === "ZigZag" ||
      indicator.name === "MACD" ||
      indicator.name === "CCI" ||
      indicator.name === "Stochastic Oscillator"
    ) {
      setEditingIndicator({
        name: indicator.name,
        config: { ...indicator.config },
        id: indicator.id,
      });
    }
  };

  const handleSaveConfig = () => {
    if (editingIndicator) {
      if (editingIndicator.id) {
        if (onUpdateIndicator) {
          onUpdateIndicator(editingIndicator.id, editingIndicator.config);
        }
      } else {
        if (onAddIndicator) {
          onAddIndicator(editingIndicator.name, editingIndicator.config);
        }
      }
      setEditingIndicator(null);
      setIsOpen(false);
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setEditingIndicator(null);
        }}
        className={`flex items-center justify-center gap-2 rounded-lg transition-colors ${
          buttonClassName ||
          "px-3 py-2 bg-(--bg-tertiary) border border-(--border-primary) hover:border-(--border-secondary)"
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
          className={`absolute top-full right-0 sm:left-0 sm:right-auto mt-2 w-fit min-w-[280px] max-w-[85vw] sm:w-[320px] sm:max-w-none max-h-[70vh] z-50 overflow-hidden flex flex-col ${
            dropdownClassName ||
            "bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-2xl"
          }`}
        >
          {editingIndicator ? (
            <div className="flex flex-col min-h-0 flex-1 bg-[#1e222d]">
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <span className="font-medium text-white">
                  Configure {editingIndicator.name}
                </span>
                <button
                  onClick={() => setEditingIndicator(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                {/* Period - common to most, except ZigZag and MACD */}
                {editingIndicator.name !== "ZigZag" &&
                  editingIndicator.name !== "MACD" && (
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400">Period</label>
                      <input
                        type="number"
                        value={editingIndicator.config.period ?? 14}
                        onChange={(e) =>
                          setEditingIndicator({
                            ...editingIndicator,
                            config: {
                              ...editingIndicator.config,
                              period: parseInt(e.target.value),
                            },
                          })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                  )}

                {/* ZigZag specific options */}
                {editingIndicator.name === "ZigZag" && (
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400">
                      Deviation (%)
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={editingIndicator.config.deviation || 0.1}
                      onChange={(e) =>
                        setEditingIndicator({
                          ...editingIndicator,
                          config: {
                            ...editingIndicator.config,
                            deviation: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                    />
                  </div>
                )}

                {/* Moving Average specific options */}
                {editingIndicator.name === "Moving Average" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400">Type</label>
                      <select
                        value={editingIndicator.config.type ?? "SMA"}
                        onChange={(e) =>
                          setEditingIndicator({
                            ...editingIndicator,
                            config: {
                              ...editingIndicator.config,
                              type: e.target.value as "SMA" | "EMA" | "WMA",
                            },
                          })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                      >
                        <option value="SMA">SMA</option>
                        <option value="EMA">EMA</option>
                        <option value="WMA">WMA</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400">Source</label>
                      <select
                        value={editingIndicator.config.source ?? "close"}
                        onChange={(e) =>
                          setEditingIndicator({
                            ...editingIndicator,
                            config: {
                              ...editingIndicator.config,
                              source: e.target.value as
                                | "close"
                                | "open"
                                | "high"
                                | "low",
                            },
                          })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                      >
                        <option value="close">Close</option>
                        <option value="open">Open</option>
                        <option value="high">High</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                  </>
                )}

                {/* RSI specific options */}
                {editingIndicator.name === "RSI" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400">
                        Overbought Level
                      </label>
                      <input
                        type="number"
                        min="50"
                        max="100"
                        value={editingIndicator.config.overbought || 70}
                        onChange={(e) =>
                          setEditingIndicator({
                            ...editingIndicator,
                            config: {
                              ...editingIndicator.config,
                              overbought: parseInt(e.target.value),
                            },
                          })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400">
                        Middle Level
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={editingIndicator.config.middle || 50}
                        onChange={(e) =>
                          setEditingIndicator({
                            ...editingIndicator,
                            config: {
                              ...editingIndicator.config,
                              middle: parseInt(e.target.value),
                            },
                          })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400">
                        Oversold Level
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={editingIndicator.config.oversold || 30}
                        onChange={(e) =>
                          setEditingIndicator({
                            ...editingIndicator,
                            config: {
                              ...editingIndicator.config,
                              oversold: parseInt(e.target.value),
                            },
                          })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                  </>
                )}

                {/* CCI specific options */}
                {editingIndicator.name === "CCI" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400">
                        Overbought Level
                      </label>
                      <input
                        type="number"
                        value={editingIndicator.config.overbought || 100}
                        onChange={(e) =>
                          setEditingIndicator({
                            ...editingIndicator,
                            config: {
                              ...editingIndicator.config,
                              overbought: parseInt(e.target.value),
                            },
                          })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400">
                        Oversold Level
                      </label>
                      <input
                        type="number"
                        value={editingIndicator.config.oversold || -100}
                        onChange={(e) =>
                          setEditingIndicator({
                            ...editingIndicator,
                            config: {
                              ...editingIndicator.config,
                              oversold: parseInt(e.target.value),
                            },
                          })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                  </>
                )}

                {/* MACD specific options */}
                {editingIndicator.name === "MACD" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400">
                        Fast Period
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editingIndicator.config.fastPeriod || 12}
                        onChange={(e) =>
                          setEditingIndicator({
                            ...editingIndicator,
                            config: {
                              ...editingIndicator.config,
                              fastPeriod: parseInt(e.target.value),
                            },
                          })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400">
                        Slow Period
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editingIndicator.config.slowPeriod || 26}
                        onChange={(e) =>
                          setEditingIndicator({
                            ...editingIndicator,
                            config: {
                              ...editingIndicator.config,
                              slowPeriod: parseInt(e.target.value),
                            },
                          })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400">
                        Signal Period
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editingIndicator.config.signalPeriod || 9}
                        onChange={(e) =>
                          setEditingIndicator({
                            ...editingIndicator,
                            config: {
                              ...editingIndicator.config,
                              signalPeriod: parseInt(e.target.value),
                            },
                          })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                  </>
                )}

                {/* Stochastic Oscillator specific options */}
                {editingIndicator.name === "Stochastic Oscillator" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400">%K Period</label>
                      <input
                        type="number"
                        min="1"
                        value={Number(editingIndicator.config.kPeriod) || 14}
                        onChange={(e) =>
                          setEditingIndicator({
                            ...editingIndicator,
                            config: {
                              ...editingIndicator.config,
                              kPeriod: parseInt(e.target.value),
                            },
                          })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400">%D Period</label>
                      <input
                        type="number"
                        min="1"
                        value={Number(editingIndicator.config.dPeriod) || 3}
                        onChange={(e) =>
                          setEditingIndicator({
                            ...editingIndicator,
                            config: {
                              ...editingIndicator.config,
                              dPeriod: parseInt(e.target.value),
                            },
                          })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400">Slowing</label>
                      <input
                        type="number"
                        min="1"
                        value={Number(editingIndicator.config.slowing) || 3}
                        onChange={(e) =>
                          setEditingIndicator({
                            ...editingIndicator,
                            config: {
                              ...editingIndicator.config,
                              slowing: parseInt(e.target.value),
                            },
                          })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400">
                        Overbought Level
                      </label>
                      <input
                        type="number"
                        min="50"
                        max="100"
                        value={editingIndicator.config.overbought || 80}
                        onChange={(e) =>
                          setEditingIndicator({
                            ...editingIndicator,
                            config: {
                              ...editingIndicator.config,
                              overbought: parseInt(e.target.value),
                            },
                          })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400">
                        Oversold Level
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={editingIndicator.config.oversold || 20}
                        onChange={(e) =>
                          setEditingIndicator({
                            ...editingIndicator,
                            config: {
                              ...editingIndicator.config,
                              oversold: parseInt(e.target.value),
                            },
                          })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                  </>
                )}

                {/* Color - common to both */}
                <div className="space-y-2">
                  <label className="text-xs text-gray-400">Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editingIndicator.config.color ?? "#000000"}
                      onChange={(e) =>
                        setEditingIndicator({
                          ...editingIndicator,
                          config: {
                            ...editingIndicator.config,
                            color: e.target.value,
                          },
                        })
                      }
                      className="bg-transparent w-8 h-8 cursor-pointer"
                    />
                    <span className="text-sm text-gray-300">
                      {editingIndicator.config.color}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-400">Line Width</label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={editingIndicator.config.lineWidth ?? 1}
                    onChange={(e) =>
                      setEditingIndicator({
                        ...editingIndicator,
                        config: {
                          ...editingIndicator.config,
                          lineWidth: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full"
                  />
                </div>
              </div>
              <div className="p-4 border-t border-white/10 flex gap-2">
                <button
                  onClick={() => setEditingIndicator(null)}
                  className="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 rounded text-sm text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveConfig}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm text-white"
                >
                  {editingIndicator.id ? "Update" : "Add"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Active Indicators */}
              {activeIndicators.length > 0 && (
                <div className="border-b border-white/10 pb-1">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Active
                  </div>
                  {activeIndicators.map((indicator) => (
                    <div
                      key={indicator.id}
                      className="w-full px-4 py-2 text-left hover:bg-white/5 transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-(--accent-cyan)">
                          {indicator.name}
                        </span>
                        {indicator.name === "Moving Average" && (
                          <span className="text-xs text-gray-500">
                            ({indicator.config.period}, {indicator.config.type})
                          </span>
                        )}
                        {indicator.name === "RSI" && (
                          <span className="text-xs text-gray-500">
                            ({indicator.config.period})
                          </span>
                        )}
                        {indicator.name === "MACD" && (
                          <span className="text-xs text-gray-500">
                            ({indicator.config.fastPeriod},{" "}
                            {indicator.config.slowPeriod},{" "}
                            {indicator.config.signalPeriod})
                          </span>
                        )}
                        {indicator.name === "CCI" && (
                          <span className="text-xs text-gray-500">
                            ({indicator.config.period})
                          </span>
                        )}
                        {indicator.name === "ZigZag" && (
                          <span className="text-xs text-gray-500">
                            ({indicator.config.deviation},{" "}
                            {indicator.config.depth})
                          </span>
                        )}
                        {indicator.name === "Stochastic Oscillator" && (
                          <span className="text-xs text-gray-500">
                            ({indicator.config.kPeriod},{" "}
                            {indicator.config.dPeriod},{" "}
                            {indicator.config.slowing})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditActiveIndicator(indicator)}
                          className="p-1 hover:text-white text-gray-400"
                          title="Settings"
                        >
                          ⚙
                        </button>
                        <button
                          onClick={() =>
                            onRemoveIndicator && onRemoveIndicator(indicator.id)
                          }
                          className="p-1 hover:text-red-400 text-gray-400"
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* List */}
              <div className="flex-1 overflow-y-auto no-scrollbar pt-1">
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Available
                </div>
                {INDICATORS.map((indicator) => {
                  const isFav = favoriteIndicators.includes(indicator);
                  return (
                    <div
                      key={indicator}
                      className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-center gap-3 cursor-pointer border-b border-white/5 last:border-0 group"
                      onClick={() => handleIndicatorClick(indicator)}
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
