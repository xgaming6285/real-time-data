"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useSymbols } from "@/hooks/useSymbols";
import { SymbolInfo } from "@/lib/types";

interface SymbolSelectorProps {
  value: string;
  onChange: (symbol: string) => void;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
}

// Icons components
const Icons = {
  Currencies: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  Crypto: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M11.5 4h5a3.5 3.5 0 0 1 0 7h-2" />
      <path d="M14.5 11h-2" />
      <path d="M16.5 13h2a3.5 3.5 0 0 1 0 7h-5" />
      <path d="M11 20v-9" />
      <path d="M7 20v-9" />
      <path d="M9 1v3" />
      <path d="M9 20v3" />
    </svg>
  ),
  Commodities: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 2.69l5.74 5.88a5.88 5.88 0 0 1-8.32 8.32l-2.43-2.44A5.88 5.88 0 0 1 12 2.69z" />
      <path d="M12 2.69l-3.32 3.42" />
    </svg>
  ),
  Stocks: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Indices: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  Favorites: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  Default: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  ),
};

const getCategoryIcon = (category: string) => {
  const lower = category.toLowerCase();
  if (lower.includes("currency") || lower.includes("forex"))
    return Icons.Currencies;
  if (lower.includes("crypto")) return Icons.Crypto;
  if (
    lower.includes("commodity") ||
    lower.includes("metal") ||
    lower.includes("energy") ||
    lower.includes("oil")
  )
    return Icons.Commodities;
  if (lower.includes("stock") || lower.includes("share")) return Icons.Stocks;
  if (lower.includes("index") || lower.includes("indices"))
    return Icons.Indices;
  if (lower === "favorites") return Icons.Favorites;
  return Icons.Default;
};

export function SymbolSelector({
  value,
  onChange,
  className = "",
  buttonClassName,
  dropdownClassName,
}: SymbolSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [favorites, setFavorites] = useState<string[]>([]);

  const { symbols, categories, loading } = useSymbols();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize selected category
  useEffect(() => {
    if (!selectedCategory && categories.length > 0) {
      // Defer state update to avoid synchronous update warning during render phase if strictly interpreted
      const timer = setTimeout(() => setSelectedCategory(categories[0]), 0);
      return () => clearTimeout(timer);
    }
  }, [categories, selectedCategory]);

  // Load favorites from local storage
  useEffect(() => {
    // Wrap in timeout or check for window to ensure client-side only and avoid hydration mismatch if needed
    // but here just avoiding sync state update warning
    const timer = setTimeout(() => {
      const saved = localStorage.getItem("atlas_favorites");
      if (saved) {
        setFavorites(JSON.parse(saved));
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const toggleFavorite = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    const newFavorites = favorites.includes(symbol)
      ? favorites.filter((f) => f !== symbol)
      : [...favorites, symbol];

    setFavorites(newFavorites);
    localStorage.setItem("atlas_favorites", JSON.stringify(newFavorites));
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

  const handleSelect = (symbol: string) => {
    onChange(symbol);
    setSearch("");
    setIsOpen(false);
  };

  const filteredSymbols = useMemo(() => {
    let result: SymbolInfo[] = [];

    if (selectedCategory === "Favorites") {
      // Collect all symbols that are favorites
      Object.values(symbols).forEach((catSymbols) => {
        catSymbols.forEach((sym) => {
          if (favorites.includes(sym.symbol)) {
            result.push(sym);
          }
        });
      });
    } else if (selectedCategory && symbols[selectedCategory]) {
      result = symbols[selectedCategory];
    } else {
      // Fallback or search global if needed, but for now specific category
      if (search) {
        // If searching globally (optional, but requested behavior seems to be within category or simple list)
        // For now let's search within the selected category if set, or all if not?
        // The previous implementation searched all.
        // Let's search ALL if search is active, OR search within category.
        // Screenshot has search inside the content pane.
        // Let's stick to: If search has text, filter the CURRENT view (selected category).
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      // If we are in a category, filter that category.
      // If we want to search everything, we might need a "Search Results" virtual category or just filter everything?
      // Let's filter the current result set.
      result = result.filter(
        (sym) =>
          sym.symbol.toLowerCase().includes(q) ||
          sym.description.toLowerCase().includes(q)
      );
    }

    return result;
  }, [symbols, selectedCategory, favorites, search]);

  const renderSymbolItem = (sym: SymbolInfo) => {
    const isFav = favorites.includes(sym.symbol);
    return (
      <div
        key={sym.symbol}
        className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-center justify-between group cursor-pointer border-b border-white/5 last:border-0"
        onClick={() => handleSelect(sym.symbol)}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => toggleFavorite(e, sym.symbol)}
            className={`text-lg ${
              isFav ? "text-yellow-400" : "text-gray-600 hover:text-yellow-400"
            }`}
          >
            {isFav ? "★" : "☆"}
          </button>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground group-hover:text-(--accent-cyan)">
              {sym.symbol}
            </span>
            <span className="text-xs text-(--text-muted) truncate max-w-[150px]">
              {sym.description}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-sm font-medium text-(--accent-cyan)">+88%</span>
          {/* Mocked payout/change */}
        </div>
      </div>
    );
  };

  const allCategories = useMemo(() => {
    // Add Favorites at the end or beginning? Screenshot has it in the list.
    return [...categories, "Favorites"];
  }, [categories]);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          buttonClassName ||
          "bg-(--bg-tertiary) border border-(--border-primary) hover:border-(--border-secondary)"
        }`}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="22,7 13.5,15.5 8.5,10.5 2,17" />
          <polyline points="16,7 22,7 22,13" />
        </svg>
        <span className="font-semibold text-(--accent-cyan)">{value}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        >
          <polyline points="6,9 12,15 18,9" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={`absolute top-full left-0 mt-2 w-[600px] h-[450px] z-50 overflow-hidden flex flex-row ${
            dropdownClassName ||
            "bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-2xl"
          }`}
        >
          {/* Sidebar */}
          <div className="w-1/3 border-r border-white/10 flex flex-col">
            <div className="p-4 border-b border-white/10">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                Asset Class
              </span>
            </div>
            <div className="overflow-y-auto flex-1 py-2">
              {allCategories.map((cat) => {
                const Icon = getCategoryIcon(cat);
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
                      isActive
                        ? "bg-white/10 text-(--accent-cyan) border-l-2 border-(--accent-cyan)"
                        : "text-gray-400 hover:bg-white/5 hover:text-white border-l-2 border-transparent"
                    }`}
                  >
                    <Icon />
                    <span className="text-sm font-medium">{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="w-2/3 flex flex-col">
            {/* Search */}
            <div className="p-3 border-b border-white/10">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-white/5 text-white pl-9 pr-4 py-2 rounded border border-white/10 focus:border-(--accent-cyan) focus:outline-none text-sm"
                />
                <svg
                  className="absolute left-3 top-2.5 text-gray-500"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
            </div>

            {/* Header for list */}
            <div className="px-4 py-2 flex justify-between text-xs text-gray-500 font-medium uppercase tracking-wider border-b border-white/5">
              <span>Asset</span>
              <span>Payout</span>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="spinner" />
                </div>
              ) : filteredSymbols.length > 0 ? (
                filteredSymbols.map(renderSymbolItem)
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  No symbols found
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
