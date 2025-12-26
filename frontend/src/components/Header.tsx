"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export function Header() {
  const { user, logout, loading } = useAuth();

  return (
    <header
      className="flex items-center justify-between px-4 py-3 border-b border-(--border-primary)"
      style={{ backgroundColor: "#1c202e" }}
    >
      <div className="flex items-center">
        <h1 className="text-xl font-bold text-white">AtlasX</h1>
      </div>

      {/* Right section - Actions */}
      <div className="flex items-center gap-3">
        {!loading && (
          <>
            {user ? (
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-300">
                  Welcome,{" "}
                  <span className="font-semibold text-white">
                    {user.name || user.email || "User"}
                  </span>
                </div>
                {/* Profile Icon */}
                <div className="relative cursor-pointer group">
                  <div className="w-8 h-8 rounded-full bg-linear-to-br from-(--accent-cyan) to-(--accent-purple) flex items-center justify-center">
                    <span className="text-sm font-bold text-background">
                      {(user.name || user.email || "U").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-(--accent-green) border-2 border-(--bg-secondary)" />

                  {/* Dropdown for Logout */}
                  <div className="absolute right-0 top-full pt-2 w-48 hidden group-hover:block z-50">
                    <div className="bg-gray-800 rounded-md shadow-lg py-1 border border-gray-700">
                      <button
                        onClick={logout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-sm text-gray-300 hover:text-white transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </header>
  );
}
