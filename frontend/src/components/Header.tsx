"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useAccount, AccountMode } from "@/hooks/useAccount";

export function Header() {
  const { user, logout, loading } = useAuth();
  const { account, mode, switchMode, switchingMode } = useAccount();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const formatBalance = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleModeSwitch = async (newMode: AccountMode) => {
    await switchMode(newMode);
    setDropdownOpen(false);
  };

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
                {/* Profile Icon with Account Mode */}
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    {/* Balance Display */}
                    <div className="flex flex-col items-end">
                      <span
                        className={`text-xs font-medium uppercase tracking-wider ${
                          mode === "demo"
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {mode === "demo" ? "DEMO" : "LIVE"}
                      </span>
                      <span className="text-sm font-bold text-white tabular-nums">
                        {account ? formatBalance(account.balance) : "$0.00"}
                      </span>
                    </div>

                    {/* Avatar */}
                    <div className="relative">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                          mode === "demo"
                            ? "bg-gradient-to-br from-amber-400 to-orange-500"
                            : "bg-gradient-to-br from-emerald-400 to-cyan-500"
                        } ${dropdownOpen ? "ring-2 ring-white/30" : ""}`}
                      >
                        <span className="text-sm font-bold text-white">
                          {(user.name || user.email || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      </div>
                      {/* Online indicator */}
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1c202e] ${
                          mode === "demo" ? "bg-amber-400" : "bg-emerald-400"
                        }`}
                      />
                    </div>

                    {/* Dropdown arrow */}
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${
                        dropdownOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setDropdownOpen(false)}
                      />

                      {/* Menu */}
                      <div className="absolute right-0 top-full mt-2 w-64 z-50 bg-[#252a3a] rounded-xl shadow-2xl border border-white/10 overflow-hidden">
                        {/* Account Mode Section */}
                        <div className="p-3 border-b border-white/10">
                          <div className="text-xs text-gray-400 uppercase tracking-wider mb-3 px-1">
                            Account Mode
                          </div>
                          <div className="space-y-1">
                            {/* Live Mode */}
                            <button
                              onClick={() => handleModeSwitch("live")}
                              disabled={switchingMode}
                              className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                                mode === "live"
                                  ? "bg-emerald-500/20 border border-emerald-500/30"
                                  : "hover:bg-white/5"
                              } ${
                                switchingMode
                                  ? "opacity-50 cursor-wait"
                                  : "cursor-pointer"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    mode === "live"
                                      ? "bg-emerald-500"
                                      : "bg-gray-600"
                                  }`}
                                >
                                  <svg
                                    className="w-4 h-4 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                </div>
                                <div className="text-left">
                                  <div
                                    className={`text-sm font-medium ${
                                      mode === "live"
                                        ? "text-emerald-400"
                                        : "text-gray-300"
                                    }`}
                                  >
                                    Live Account
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Real trading
                                  </div>
                                </div>
                              </div>
                              <div className="text-sm font-bold text-white tabular-nums">
                                $0.00
                              </div>
                            </button>

                            {/* Demo Mode */}
                            <button
                              onClick={() => handleModeSwitch("demo")}
                              disabled={switchingMode}
                              className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                                mode === "demo"
                                  ? "bg-amber-500/20 border border-amber-500/30"
                                  : "hover:bg-white/5"
                              } ${
                                switchingMode
                                  ? "opacity-50 cursor-wait"
                                  : "cursor-pointer"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    mode === "demo"
                                      ? "bg-amber-500"
                                      : "bg-gray-600"
                                  }`}
                                >
                                  <svg
                                    className="w-4 h-4 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                    />
                                  </svg>
                                </div>
                                <div className="text-left">
                                  <div
                                    className={`text-sm font-medium ${
                                      mode === "demo"
                                        ? "text-amber-400"
                                        : "text-gray-300"
                                    }`}
                                  >
                                    Demo Account
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Practice trading
                                  </div>
                                </div>
                              </div>
                              <div className="text-sm font-bold text-white tabular-nums">
                                $10,000.00
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* User Actions */}
                        <div className="p-2">
                          <button
                            onClick={logout}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                              />
                            </svg>
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
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
