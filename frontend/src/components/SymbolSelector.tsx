"use client";

import { useState, useRef, useEffect } from "react";
import { useSymbols } from "@/hooks/useSymbols";
import { SymbolInfo } from "@/lib/types";

interface SymbolSelectorProps {
  value: string;
  onChange: (symbol: string) => void;
}

export function SymbolSelector({ value, onChange }: SymbolSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { symbols, categories, loading, searchSymbols } = useSymbols();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const searchResults = search ? searchSymbols(search) : [];

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

  const renderSymbolItem = (sym: SymbolInfo) => (
    <button
      key={sym.symbol}
      onClick={() => handleSelect(sym.symbol)}
      className="w-full px-3 py-2 text-left hover:bg-(--bg-hover) transition-colors flex items-center justify-between group"
    >
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground group-hover:text-(--accent-cyan)">
          {sym.symbol}
        </span>
        <span className="text-xs text-(--text-muted) truncate max-w-[200px]">
          {sym.description}
        </span>
      </div>
      {sym.digits !== undefined && (
        <span className="text-xs text-(--text-muted)">{sym.digits} digits</span>
      )}
    </button>
  );

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="flex items-center gap-2 px-3 py-2 bg-(--bg-tertiary) border border-(--border-primary) rounded-lg hover:border-(--border-secondary) transition-colors"
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
        <div className="absolute top-full left-0 mt-2 w-80 bg-(--bg-secondary) border border-(--border-primary) rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-(--border-primary)">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search symbols..."
              className="w-full px-3 py-2 text-sm"
            />
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="spinner" />
              </div>
            ) : search ? (
              // Search results
              searchResults.length > 0 ? (
                <div className="py-1">
                  {searchResults.map(renderSymbolItem)}
                </div>
              ) : (
                <div className="py-8 text-center text-(--text-muted) text-sm">
                  No symbols found
                </div>
              )
            ) : (
              // Categories view
              <div className="py-1">
                {categories.slice(0, 5).map((category) => (
                  <div key={category}>
                    <div className="px-3 py-1.5 text-xs font-medium text-(--text-muted) uppercase tracking-wider bg-background">
                      {category}
                    </div>
                    {symbols[category]?.slice(0, 10).map(renderSymbolItem)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
