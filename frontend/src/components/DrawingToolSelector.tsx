"use client";

import { useState, useRef, useEffect } from "react";

interface DrawingToolSelectorProps {
  buttonClassName?: string;
  dropdownClassName?: string;
  onToolSelect?: (tool: string) => void;
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
}: DrawingToolSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          buttonClassName ||
          "bg-(--bg-tertiary) border border-(--border-primary) hover:border-(--border-secondary)"
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
          className={`absolute top-full right-0 mt-2 w-fit min-w-[220px] max-w-[85vw] sm:w-[280px] sm:max-w-none z-50 overflow-hidden flex flex-col py-1 ${
            dropdownClassName ||
            "bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-2xl"
          }`}
        >
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
      )}
    </div>
  );
}
