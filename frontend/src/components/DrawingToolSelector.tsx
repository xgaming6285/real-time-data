"use client";

import { useState, useRef, useEffect } from "react";
import { Drawing, DrawingConfig } from "@/lib/types";

interface DrawingToolSelectorProps {
  buttonClassName?: string;
  dropdownClassName?: string;
  onToolSelect?: (tool: string) => void;
  drawings?: Drawing[];
  symbol?: string;
  onRemoveDrawing?: (id: string) => void;
  onUpdateDrawing?: (id: string, config: DrawingConfig) => void;
}

// Icons components for drawing tools
const ToolIcons = {
  "Horizontal Line": () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="3" y1="12" x2="21" y2="12" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  ),
  "Vertical Line": () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="12" y1="3" x2="12" y2="21" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  ),
  Ray: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="3" y1="21" x2="21" y2="3" />
      <circle cx="3" cy="21" r="2" fill="currentColor" />
    </svg>
  ),
  "Fibonacci Retracement": () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="3" y1="21" x2="21" y2="3" />
      <line x1="3" y1="17" x2="17" y2="3" strokeDasharray="2 2" />
      <line x1="3" y1="13" x2="13" y2="3" strokeDasharray="2 2" />
      <line x1="3" y1="9" x2="9" y2="3" strokeDasharray="2 2" />
    </svg>
  ),
  "Fibonacci Fan": () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="3" y1="21" x2="21" y2="3" />
      <line x1="3" y1="21" x2="21" y2="12" />
      <line x1="3" y1="21" x2="12" y2="3" />
    </svg>
  ),
  "Trend Line": () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="3" y1="21" x2="21" y2="3" />
      <circle cx="3" cy="21" r="2" fill="currentColor" />
      <circle cx="21" cy="3" r="2" fill="currentColor" />
    </svg>
  ),
  "Parallel Channel": () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="3" y1="16" x2="21" y2="4" />
      <line x1="3" y1="20" x2="21" y2="8" />
      <circle cx="3" cy="16" r="2" fill="currentColor" />
      <circle cx="21" cy="4" r="2" fill="currentColor" />
    </svg>
  ),
  Rectangle: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  ),
  "Andrew's Pitchfork": () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="21" y1="3" x2="21" y2="21" />
      <line x1="3" y1="12" x2="21" y2="3" />
      <line x1="3" y1="12" x2="21" y2="21" />
    </svg>
  ),
};

const TOOLS = Object.keys(ToolIcons);

export function DrawingToolSelector({
  buttonClassName,
  dropdownClassName,
  onToolSelect,
  drawings = [],
  symbol,
  onRemoveDrawing,
  onUpdateDrawing,
}: DrawingToolSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [editingDrawing, setEditingDrawing] = useState<{
    id: string;
    type: string;
    config: DrawingConfig;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter drawings for current symbol
  const activeDrawings = symbol 
    ? drawings.filter((d) => d.symbol === symbol)
    : drawings;

  // Load favorites from local storage
  useEffect(() => {
    const timer = setTimeout(() => {
      const saved = localStorage.getItem("atlas_drawing_favorites");
      if (saved) {
        setFavorites(JSON.parse(saved));
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const toggleFavorite = (e: React.MouseEvent, tool: string) => {
    e.stopPropagation();
    const newFavorites = favorites.includes(tool)
      ? favorites.filter((f) => f !== tool)
      : [...favorites, tool];

    setFavorites(newFavorites);
    localStorage.setItem(
      "atlas_drawing_favorites",
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
        setEditingDrawing(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEditDrawing = (drawing: Drawing) => {
    setEditingDrawing({
      id: drawing.id,
      type: drawing.type,
      config: {
        color: drawing.config?.color ?? "#2962ff",
        lineWidth: drawing.config?.lineWidth ?? 2,
      },
    });
  };

  const handleSaveConfig = () => {
    if (editingDrawing && onUpdateDrawing) {
      onUpdateDrawing(editingDrawing.id, editingDrawing.config);
    }
    setEditingDrawing(null);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center gap-2 rounded-lg transition-colors ${
          buttonClassName ||
          "px-3 py-2 bg-(--bg-tertiary) border border-(--border-primary) hover:border-(--border-secondary)"
        }`}
        title="Drawing Tools"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 19l7-7 3 3-7 7-3-3z" />
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
          <path d="M2 2l7.586 7.586" />
          <circle cx="11" cy="11" r="2" />
        </svg>
      </button>

      {isOpen && (
        <div
          className={`absolute top-full right-0 sm:left-0 sm:right-auto mt-2 w-fit min-w-[200px] max-w-[85vw] sm:w-[280px] sm:max-w-none max-h-[70vh] z-50 overflow-hidden flex flex-col ${
            dropdownClassName ||
            "bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-2xl"
          }`}
        >
          {editingDrawing ? (
            <div className="flex flex-col min-h-0 flex-1 bg-[#1e222d]">
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <span className="font-medium text-white">
                  Edit {editingDrawing.type}
                </span>
                <button
                  onClick={() => setEditingDrawing(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                {/* Color */}
                <div className="space-y-2">
                  <label className="text-xs text-gray-400">Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editingDrawing.config.color ?? "#2962ff"}
                      onChange={(e) =>
                        setEditingDrawing({
                          ...editingDrawing,
                          config: {
                            ...editingDrawing.config,
                            color: e.target.value,
                          },
                        })
                      }
                      className="bg-transparent w-8 h-8 cursor-pointer"
                    />
                    <span className="text-sm text-gray-300">
                      {editingDrawing.config.color}
                    </span>
                  </div>
                </div>
                {/* Line Width */}
                <div className="space-y-2">
                  <label className="text-xs text-gray-400">Line Width</label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={editingDrawing.config.lineWidth ?? 2}
                    onChange={(e) =>
                      setEditingDrawing({
                        ...editingDrawing,
                        config: {
                          ...editingDrawing.config,
                          lineWidth: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 text-center">
                    {editingDrawing.config.lineWidth}px
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-white/10 flex gap-2">
                <button
                  onClick={() => setEditingDrawing(null)}
                  className="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 rounded text-sm text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveConfig}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm text-white"
                >
                  Update
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Active Drawings */}
              {activeDrawings.length > 0 && (
                <div className="border-b border-white/10 pb-1">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Active ({activeDrawings.length})
                  </div>
                  {activeDrawings.map((drawing) => {
                    const Icon = ToolIcons[drawing.type as keyof typeof ToolIcons];
                    return (
                      <div
                        key={drawing.id}
                        className="w-full px-4 py-2 text-left hover:bg-white/5 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2">
                          {Icon && (
                            <div 
                              className="w-4 h-4 flex items-center justify-center"
                              style={{ color: drawing.config?.color ?? "#2962ff" }}
                            >
                              <Icon />
                            </div>
                          )}
                          <span className="text-sm font-medium text-(--accent-cyan)">
                            {drawing.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditDrawing(drawing)}
                            className="p-1 hover:text-white text-gray-400"
                            title="Settings"
                          >
                            ⚙
                          </button>
                          <button
                            onClick={() =>
                              onRemoveDrawing && onRemoveDrawing(drawing.id)
                            }
                            className="p-1 hover:text-red-400 text-gray-400"
                            title="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Available Tools */}
              <div className="flex-1 overflow-y-auto no-scrollbar py-1">
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Tools
                </div>
                {TOOLS.map((tool) => {
                  const Icon = ToolIcons[tool as keyof typeof ToolIcons];
                  const isFav = favorites.includes(tool);
                  return (
                    <div
                      key={tool}
                      className="w-full px-4 py-2.5 text-left hover:bg-white/5 transition-colors flex items-center gap-3 cursor-pointer group"
                      onClick={() => {
                        onToolSelect?.(tool);
                        setIsOpen(false);
                      }}
                    >
                      <div className="w-5 h-5 flex items-center justify-center text-gray-400 group-hover:text-white">
                        <Icon />
                      </div>
                      <span className="text-sm font-medium text-foreground flex-1 group-hover:text-(--accent-cyan)">
                        {tool}
                      </span>
                      <button
                        onClick={(e) => toggleFavorite(e, tool)}
                        className={`text-lg opacity-0 group-hover:opacity-100 transition-opacity ${
                          isFav
                            ? "text-yellow-400 opacity-100"
                            : "text-gray-600 hover:text-yellow-400"
                        }`}
                      >
                        {isFav ? "★" : "☆"}
                      </button>
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
