"use client";

import { useState, useRef, useEffect } from "react";
import { ChartType, CHART_TYPE_OPTIONS } from "@/lib/types";

interface ChartTypeSelectorProps {
  value: ChartType;
  onChange: (chartType: ChartType) => void;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
}

export function ChartTypeSelector({
  value,
  onChange,
  className = "",
  buttonClassName,
  dropdownClassName,
}: ChartTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleSelect = (chartType: ChartType) => {
    onChange(chartType);
    setIsOpen(false);
  };

  const currentOption = CHART_TYPE_OPTIONS.find((opt) => opt.value === value);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors min-w-[80px] justify-between w-full ${
          buttonClassName ||
          "bg-(--bg-tertiary) border border-(--border-primary) hover:border-(--border-secondary)"
        }`}
        title={`Chart Type: ${currentOption?.label}`}
      >
        <span className="text-lg">{currentOption?.icon}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform text-(--text-secondary) ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <polyline points="6,9 12,15 18,9" />
        </svg>
      </button>

      {isOpen && (
        <div
          className={`absolute top-full left-0 mt-2 w-full min-w-[140px] z-50 overflow-hidden py-1 ${
            dropdownClassName ||
            "bg-(--bg-secondary) border border-(--border-primary) rounded-lg shadow-xl"
          }`}
        >
          {CHART_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`w-full px-3 py-2 text-left hover:bg-(--bg-hover) transition-colors flex items-center gap-2 group
                ${value === option.value ? "bg-(--bg-tertiary)" : ""}
              `}
            >
              <span className="text-lg">{option.icon}</span>
              <span
                className={`text-sm font-medium ${
                  value === option.value
                    ? "text-(--accent-cyan)"
                    : "text-foreground group-hover:text-(--accent-cyan)"
                }`}
              >
                {option.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
