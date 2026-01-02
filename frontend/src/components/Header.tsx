"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useAccount, AccountMode, TradingAccountWithBalances } from "@/hooks/useAccount";

export function Header() {
  const { user, logout, loading } = useAuth();
  const { 
    account, 
    mode, 
    tradingAccounts,
    activeTradingAccount,
    switchMode, 
    switchTradingAccount,
    createTradingAccount,
    transferFunds,
    switchingMode,
    switchingAccount,
  } = useAccount();
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showAccountManager, setShowAccountManager] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Create account form state
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountColor, setNewAccountColor] = useState("#3b82f6");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  
  // Transfer form state
  const [transferFromId, setTransferFromId] = useState("");
  const [transferToId, setTransferToId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferMode, setTransferMode] = useState<AccountMode>("demo");
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);

  const formatBalance = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleModeSwitch = async (newMode: AccountMode) => {
    if (mode === newMode || switchingMode) return;
    await switchMode(newMode);
  };

  const handleAccountSwitch = async (accountId: string) => {
    await switchTradingAccount(accountId);
    setDropdownOpen(false);
    setShowAccountManager(false);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountName.trim()) {
      setCreateError("Account name is required");
      return;
    }
    
    setCreating(true);
    setCreateError(null);
    
    const result = await createTradingAccount(newAccountName.trim(), newAccountColor);
    
    if (result.success) {
      setNewAccountName("");
      setNewAccountColor("#3b82f6");
      setShowCreateModal(false);
    } else {
      setCreateError(result.error || "Failed to create account");
    }
    
    setCreating(false);
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(transferAmount);
    if (!transferFromId || !transferToId || !amount || amount <= 0) {
      setTransferError("Please fill in all fields");
      return;
    }
    
    if (transferFromId === transferToId) {
      setTransferError("Cannot transfer to the same account");
      return;
    }
    
    setTransferring(true);
    setTransferError(null);
    
    const result = await transferFunds(transferFromId, transferToId, amount, transferMode);
    
    if (result.success) {
      setTransferFromId("");
      setTransferToId("");
      setTransferAmount("");
      setShowTransferModal(false);
    } else {
      setTransferError(result.error || "Failed to transfer");
    }
    
    setTransferring(false);
  };

  const colorOptions = [
    "#3b82f6", // Blue
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#ef4444", // Red
    "#8b5cf6", // Violet
    "#ec4899", // Pink
    "#06b6d4", // Cyan
    "#f97316", // Orange
  ];

  // Get active account balances
  const activeAccountData = tradingAccounts.find(a => a.isActive);
  const liveBalance = activeAccountData?.balances.live.balance ?? 0;
  const demoBalance = activeAccountData?.balances.demo.balance ?? 10000;

  return (
    <>
      <header
        className="flex items-center justify-between px-4 py-3 border-b border-(--border-primary)"
        style={{ backgroundColor: "#1c202e" }}
      >
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-white">AtlasX</h1>
        </div>

        {/* Right section - Actions */}
        <div className="flex items-center gap-4">
          {!loading && (
            <>
              {user ? (
                <>
                  {/* Account Mode Toggle - Separate from profile menu */}
                  <div className="flex items-center gap-2">
                    {/* Mode Toggle Switch */}
                    <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10">
                      {/* Live Button */}
                      <button
                        onClick={() => handleModeSwitch("live")}
                        disabled={switchingMode}
                        className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          mode === "live"
                            ? "bg-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/10"
                            : "text-gray-400 hover:text-gray-300"
                        } ${switchingMode ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
                      >
                        <div className={`w-2 h-2 rounded-full ${mode === "live" ? "bg-emerald-400 animate-pulse" : "bg-gray-600"}`} />
                        <span>Live</span>
                        <span className={`tabular-nums text-xs ${mode === "live" ? "text-emerald-300" : "text-gray-500"}`}>
                          {formatBalance(liveBalance)}
                        </span>
                      </button>
                      
                      {/* Demo Button */}
                      <button
                        onClick={() => handleModeSwitch("demo")}
                        disabled={switchingMode}
                        className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          mode === "demo"
                            ? "bg-amber-500/20 text-amber-400 shadow-lg shadow-amber-500/10"
                            : "text-gray-400 hover:text-gray-300"
                        } ${switchingMode ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
                      >
                        <div className={`w-2 h-2 rounded-full ${mode === "demo" ? "bg-amber-400 animate-pulse" : "bg-gray-600"}`} />
                        <span>Demo</span>
                        <span className={`tabular-nums text-xs ${mode === "demo" ? "text-amber-300" : "text-gray-500"}`}>
                          {formatBalance(demoBalance)}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Separator */}
                  <div className="w-px h-8 bg-white/10" />

                  {/* Profile & Account Section */}
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-gray-300 hidden sm:block">
                      Welcome,{" "}
                      <span className="font-semibold text-white">
                        {user.name || user.email || "User"}
                      </span>
                    </div>
                    
                    {/* Profile Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center gap-2 cursor-pointer group"
                      >
                        {/* Trading Account Badge */}
                        {activeTradingAccount && (
                          <div 
                            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white/90"
                            style={{ backgroundColor: `${(activeTradingAccount as TradingAccountWithBalances).color || '#3b82f6'}30`, borderColor: `${(activeTradingAccount as TradingAccountWithBalances).color || '#3b82f6'}50` }}
                          >
                            <div 
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: (activeTradingAccount as TradingAccountWithBalances).color || '#3b82f6' }}
                            />
                            {activeTradingAccount.name}
                          </div>
                        )}

                        {/* Avatar */}
                        <div className="relative">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all bg-gradient-to-br from-cyan-400 to-blue-500 ${dropdownOpen ? "ring-2 ring-white/30" : ""}`}
                          >
                            <span className="text-sm font-bold text-white">
                              {(user.name || user.email || "U")
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                          </div>
                          {/* Mode indicator dot */}
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
                          <div className="absolute right-0 top-full mt-2 w-72 z-50 bg-[#252a3a] rounded-xl shadow-2xl border border-white/10 overflow-hidden">
                            {/* User Info */}
                            <div className="p-3 border-b border-white/10 bg-white/5">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                                  <span className="text-sm font-bold text-white">
                                    {(user.name || user.email || "U").charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-white">{user.name || "User"}</div>
                                  <div className="text-xs text-gray-400">{user.email}</div>
                                </div>
                              </div>
                            </div>

                            {/* Trading Account Section */}
                            <div className="p-3 border-b border-white/10">
                              <div className="flex items-center justify-between mb-3">
                                <div className="text-xs text-gray-400 uppercase tracking-wider px-1">
                                  Trading Accounts
                                </div>
                                <button
                                  onClick={() => {
                                    setShowAccountManager(true);
                                    setDropdownOpen(false);
                                  }}
                                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                                >
                                  Manage
                                </button>
                              </div>
                              
                              {/* Account Quick Switcher */}
                              <div className="space-y-1 max-h-40 overflow-y-auto">
                                {tradingAccounts.map((ta) => (
                                  <button
                                    key={ta._id}
                                    onClick={() => handleAccountSwitch(ta._id)}
                                    disabled={switchingAccount}
                                    className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-all ${
                                      ta.isActive
                                        ? "bg-white/10 border border-white/20"
                                        : "hover:bg-white/5"
                                    } ${switchingAccount ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: ta.color || '#3b82f6' }}
                                      />
                                      <span className={`text-sm font-medium ${ta.isActive ? 'text-white' : 'text-gray-300'}`}>
                                        {ta.name}
                                      </span>
                                    </div>
                                    {ta.isActive && (
                                      <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="p-2 border-b border-white/10 grid grid-cols-2 gap-2">
                              <button
                                onClick={() => {
                                  setShowCreateModal(true);
                                  setDropdownOpen(false);
                                }}
                                className="flex items-center justify-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                New Account
                              </button>
                              <button
                                onClick={() => {
                                  setShowTransferModal(true);
                                  setDropdownOpen(false);
                                }}
                                className="flex items-center justify-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                Transfer
                              </button>
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
                </>
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

      {/* Account Manager Modal */}
      {showAccountManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAccountManager(false)}
          />
          <div className="relative bg-[#1c202e] rounded-2xl shadow-2xl border border-white/10 w-full max-w-2xl max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Manage Accounts</h2>
              <button
                onClick={() => setShowAccountManager(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-3">
                {tradingAccounts.map((ta) => (
                  <div
                    key={ta._id}
                    className={`p-4 rounded-xl border transition-all ${
                      ta.isActive 
                        ? "bg-white/5 border-cyan-500/30" 
                        : "bg-white/[0.02] border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: ta.color || '#3b82f6' }}
                        >
                          {ta.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{ta.name}</span>
                            {ta.isActive && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{ta.accountNumber}</div>
                        </div>
                      </div>
                      
                      {!ta.isActive && (
                        <button
                          onClick={() => handleAccountSwitch(ta._id)}
                          disabled={switchingAccount}
                          className="px-3 py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors"
                        >
                          Switch
                        </button>
                      )}
                    </div>
                    
                    {/* Balances */}
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                        <div className="text-xs text-emerald-400/70 uppercase tracking-wider mb-1">Live</div>
                        <div className="text-lg font-bold text-emerald-400 tabular-nums">
                          {formatBalance(ta.balances.live.balance)}
                        </div>
                      </div>
                      <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                        <div className="text-xs text-amber-400/70 uppercase tracking-wider mb-1">Demo</div>
                        <div className="text-lg font-bold text-amber-400 tabular-nums">
                          {formatBalance(ta.balances.demo.balance)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Add Account Button */}
              <button
                onClick={() => {
                  setShowCreateModal(true);
                  setShowAccountManager(false);
                }}
                className="mt-4 w-full p-4 border-2 border-dashed border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-white/20 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Account Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative bg-[#1c202e] rounded-2xl shadow-2xl border border-white/10 w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Create New Account</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateAccount} className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Account Name</label>
                <input
                  type="text"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  placeholder="e.g., Savings, Trading, Scalping"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                  maxLength={50}
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewAccountColor(color)}
                      className={`w-8 h-8 rounded-full transition-all ${
                        newAccountColor === color ? "ring-2 ring-white ring-offset-2 ring-offset-[#1c202e]" : ""
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              
              {createError && (
                <div className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
                  {createError}
                </div>
              )}
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowTransferModal(false)}
          />
          <div className="relative bg-[#1c202e] rounded-2xl shadow-2xl border border-white/10 w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Transfer Funds</h2>
              <button
                onClick={() => setShowTransferModal(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleTransfer} className="p-4 space-y-4">
              {/* Mode Selection */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Transfer Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTransferMode("live")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      transferMode === "live"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-white/5 text-gray-400 border border-transparent hover:bg-white/10"
                    }`}
                  >
                    Live Funds
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransferMode("demo")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      transferMode === "demo"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-white/5 text-gray-400 border border-transparent hover:bg-white/10"
                    }`}
                  >
                    Demo Funds
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">From Account</label>
                <select
                  value={transferFromId}
                  onChange={(e) => setTransferFromId(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="">Select source account</option>
                  {tradingAccounts.map((ta) => (
                    <option key={ta._id} value={ta._id}>
                      {ta.name} ({formatBalance(
                        transferMode === "live" ? ta.balances.live.balance : ta.balances.demo.balance
                      )})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">To Account</label>
                <select
                  value={transferToId}
                  onChange={(e) => setTransferToId(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="">Select destination account</option>
                  {tradingAccounts
                    .filter(ta => ta._id !== transferFromId)
                    .map((ta) => (
                      <option key={ta._id} value={ta._id}>
                        {ta.name}
                      </option>
                    ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
              
              {transferError && (
                <div className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
                  {transferError}
                </div>
              )}
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferring || !transferFromId || !transferToId || !transferAmount}
                  className="flex-1 px-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {transferring ? "Transferring..." : "Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
