"use client";

export function Header() {
  return (
    <header
      className="flex items-center justify-end px-4 py-3 border-b border-(--border-primary)"
      style={{ backgroundColor: "#1c202e" }}
    >
      {/* Right section - Actions */}
      <div className="flex items-center gap-3">
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
