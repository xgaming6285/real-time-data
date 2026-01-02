"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/context/AdminContext";

interface UserAccount {
  _id: string;
  balance: number;
  equity: number;
  leverage: number;
  isAutoLeverage: boolean;
  currency: string;
  margin: number;
  freeMargin: number;
}

interface TradingAccount {
  _id: string;
  name: string;
  accountNumber: string;
  isActive: boolean;
  live?: UserAccount;
  demo?: UserAccount;
}

interface User {
  _id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  accounts: {
    live: UserAccount | null;
    demo: UserAccount | null;
  };
  tradingAccounts: TradingAccount[];
}

interface EditingUser {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: string;
}

interface EditingAccount {
  _id: string;
  type: "live" | "demo";
  balance: string;
  leverage: string;
  currency: string;
  userId: string; // To refresh user data
}

export default function AdminDashboard() {
  const { admin, loading, logout } = useAdmin();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Edit states
  const [editingUser, setEditingUser] = useState<EditingUser | null>(null);
  const [editingAccount, setEditingAccount] = useState<EditingAccount | null>(
    null
  );

  const [saving, setSaving] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !admin) {
      router.push("/admin-panel");
    } else if (admin) {
      fetchUsers();
    }
  }, [admin, loading, router, fetchUsers]);

  const handleEditUser = (user: User) => {
    setEditingUser({
      _id: user._id,
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
    });
    setError("");
    setSuccess("");
  };

  const handleEditAccount = (
    account: UserAccount,
    type: "live" | "demo",
    userId: string
  ) => {
    setEditingAccount({
      _id: account._id,
      type,
      balance: account.balance.toString(),
      leverage: account.leverage.toString(),
      currency: account.currency,
      userId,
    });
    setError("");
    setSuccess("");
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const updateData: Partial<EditingUser> = {
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role,
      };

      if (editingUser.password) {
        updateData.password = editingUser.password;
      }

      const res = await fetch(`/api/admin/users/${editingUser._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to update user");

      setSuccess("User updated successfully!");
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAccount = async () => {
    if (!editingAccount) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const updateData = {
        balance: parseFloat(editingAccount.balance),
        leverage: parseInt(editingAccount.leverage),
      };

      const res = await fetch(`/api/admin/accounts/${editingAccount._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to update account");

      setSuccess(
        `${
          editingAccount.type === "live" ? "Real" : "Demo"
        } account updated successfully!`
      );
      setEditingAccount(null);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this user? This action cannot be undone."
      )
    ) {
      return;
    }

    setDeletingUserId(userId);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to delete user");

      setSuccess("User deleted successfully!");
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeletingUserId(null);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatBalance = (
    balance: number | undefined,
    currency: string = "USD"
  ) => {
    if (balance === undefined) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(balance);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!admin) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-(--bg-secondary) border-b border-(--border-primary) sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-(--accent-purple) to-(--accent-cyan) flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-(--text-muted)">
                  AtlasX User Management
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">
                  {admin.name}
                </p>
                <p className="text-xs text-(--text-muted)">{admin.email}</p>
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 bg-(--bg-tertiary) border border-(--border-primary) rounded-lg text-(--text-secondary) hover:text-(--accent-red) hover:border-(--accent-red) transition-all flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-(--bg-secondary) border border-(--border-primary) rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-(--accent-cyan)/10 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-(--accent-cyan)"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {users.length}
                </p>
                <p className="text-sm text-(--text-muted)">Total Users</p>
              </div>
            </div>
          </div>

          <div className="bg-(--bg-secondary) border border-(--border-primary) rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-(--accent-purple)/10 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-(--accent-purple)"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {users.filter((u) => u.role === "admin").length}
                </p>
                <p className="text-sm text-(--text-muted)">Admins</p>
              </div>
            </div>
          </div>

          <div className="bg-(--bg-secondary) border border-(--border-primary) rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-(--accent-green)/10 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-(--accent-green)"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {formatBalance(
                    users.reduce(
                      (sum, u) =>
                        sum +
                        (u.tradingAccounts?.reduce(
                          (accSum, ta) => accSum + (ta.live?.balance || 0),
                          0
                        ) || 0),
                      0
                    )
                  )}
                </p>
                <p className="text-sm text-(--text-muted)">
                  Total Live Balance
                </p>
              </div>
            </div>
          </div>

          <div className="bg-(--bg-secondary) border border-(--border-primary) rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-(--accent-orange)/10 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-(--accent-orange)"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {users.reduce(
                    (count, u) => count + (u.tradingAccounts?.length || 0),
                    0
                  )}
                </p>
                <p className="text-sm text-(--text-muted)">
                  Total Trading Accounts
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-[rgba(255,73,118,0.1)] border border-(--accent-red) text-(--accent-red) p-4 rounded-xl mb-6 flex items-center gap-3">
            <svg
              className="w-5 h-5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {error}
            <button
              onClick={() => setError("")}
              className="ml-auto hover:opacity-70"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {success && (
          <div className="bg-[rgba(0,230,118,0.1)] border border-(--accent-green) text-(--accent-green) p-4 rounded-xl mb-6 flex items-center gap-3">
            <svg
              className="w-5 h-5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {success}
            <button
              onClick={() => setSuccess("")}
              className="ml-auto hover:opacity-70"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-(--bg-secondary) border border-(--border-primary) rounded-xl overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-4 border-b border-(--border-primary) flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              User Management
            </h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 bg-(--bg-tertiary) border border-(--border-primary) rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-(--accent-cyan)"
              />
              <svg
                className="w-4 h-4 text-(--text-muted) absolute left-3 top-1/2 -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {loadingUsers ? (
            <div className="p-12 flex items-center justify-center">
              <div className="spinner" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-(--text-muted)">
              {searchQuery ? "No users match your search" : "No users found"}
            </div>
          ) : (
            <div className="divide-y divide-(--border-primary)">
              {filteredUsers.map((user) => (
                <div
                  key={user._id}
                  className="p-6 hover:bg-(--bg-tertiary)/20 transition-colors"
                >
                  {/* User Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-linear-to-br from-(--accent-cyan)/20 to-(--accent-purple)/20 flex items-center justify-center text-(--accent-cyan) font-bold text-lg">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground text-lg">
                            {user.name}
                          </p>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.role === "admin"
                                ? "bg-(--accent-purple)/20 text-(--accent-purple)"
                                : "bg-(--accent-cyan)/20 text-(--accent-cyan)"
                            }`}
                          >
                            {user.role || "user"}
                          </span>
                        </div>
                        <p className="text-sm text-(--text-muted)">
                          {user.email} • Joined {formatDate(user.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="px-3 py-1.5 text-sm text-(--text-muted) hover:text-(--accent-cyan) hover:bg-(--accent-cyan)/10 rounded-lg transition-all flex items-center gap-1.5"
                        title="Edit user"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Edit Info
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user._id)}
                        disabled={
                          deletingUserId === user._id || user._id === admin._id
                        }
                        className="px-3 py-1.5 text-sm text-(--text-muted) hover:text-(--accent-red) hover:bg-(--accent-red)/10 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
                        title={
                          user._id === admin._id
                            ? "Can't delete yourself"
                            : "Delete user"
                        }
                      >
                        {deletingUserId === user._id ? (
                          <div className="w-4 h-4 border-2 border-(--accent-red) border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        )}
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Trading Accounts List */}
                  <div className="pl-0 md:pl-16 space-y-6">
                    {user.tradingAccounts && user.tradingAccounts.length > 0 ? (
                      user.tradingAccounts.map((account) => (
                        <div key={account._id} className="relative">
                          <div className="flex items-center gap-3 mb-3">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                account.isActive
                                  ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                                  : "bg-(--text-muted)"
                              }`}
                              title={account.isActive ? "Active" : "Inactive"}
                            ></span>
                            <h4 className="font-semibold text-foreground">
                              {account.name}
                            </h4>
                            <span className="text-xs font-mono text-(--text-muted) bg-(--bg-tertiary) px-2 py-0.5 rounded border border-(--border-primary)">
                              {account.accountNumber}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Real Account */}
                            <div className="bg-(--bg-tertiary) border border-(--border-primary) rounded-xl p-4 relative group">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-(--accent-green)"></div>
                                  <span className="text-sm font-semibold text-(--accent-green) uppercase tracking-wide">
                                    Real Account
                                  </span>
                                </div>
                                {account.live && (
                                  <button
                                    onClick={() =>
                                      handleEditAccount(
                                        account.live!,
                                        "live",
                                        user._id
                                      )
                                    }
                                    className="p-1.5 text-(--text-muted) hover:text-(--accent-cyan) hover:bg-(--accent-cyan)/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    title="Edit Balance"
                                  >
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                      />
                                    </svg>
                                  </button>
                                )}
                              </div>
                              {account.live ? (
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-(--text-muted) text-sm">
                                      Balance
                                    </span>
                                    <span className="text-foreground font-mono font-medium">
                                      {formatBalance(
                                        account.live.balance,
                                        account.live.currency
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-(--text-muted) text-sm">
                                      Equity
                                    </span>
                                    <span className="text-foreground font-mono">
                                      {formatBalance(
                                        account.live.equity,
                                        account.live.currency
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-(--text-muted) text-sm">
                                      Free Margin
                                    </span>
                                    <span className="text-foreground font-mono">
                                      {formatBalance(
                                        account.live.freeMargin,
                                        account.live.currency
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-(--text-muted) text-sm">
                                      Leverage
                                    </span>
                                    <span className="text-(--text-secondary)">
                                      1:{account.live.leverage}
                                      {account.live.isAutoLeverage && (
                                        <span className="ml-1 text-xs text-(--accent-cyan)">
                                          (Auto)
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-(--text-muted) text-sm italic py-8 text-center">
                                  No real account created
                                </div>
                              )}
                            </div>

                            {/* Demo Account */}
                            <div className="bg-(--bg-tertiary) border border-(--border-primary) rounded-xl p-4 relative group">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-(--accent-orange)"></div>
                                  <span className="text-sm font-semibold text-(--accent-orange) uppercase tracking-wide">
                                    Demo Account
                                  </span>
                                </div>
                                {account.demo && (
                                  <button
                                    onClick={() =>
                                      handleEditAccount(
                                        account.demo!,
                                        "demo",
                                        user._id
                                      )
                                    }
                                    className="p-1.5 text-(--text-muted) hover:text-(--accent-cyan) hover:bg-(--accent-cyan)/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    title="Edit Balance"
                                  >
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                      />
                                    </svg>
                                  </button>
                                )}
                              </div>
                              {account.demo ? (
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-(--text-muted) text-sm">
                                      Balance
                                    </span>
                                    <span className="text-foreground font-mono font-medium">
                                      {formatBalance(
                                        account.demo.balance,
                                        account.demo.currency
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-(--text-muted) text-sm">
                                      Equity
                                    </span>
                                    <span className="text-foreground font-mono">
                                      {formatBalance(
                                        account.demo.equity,
                                        account.demo.currency
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-(--text-muted) text-sm">
                                      Free Margin
                                    </span>
                                    <span className="text-foreground font-mono">
                                      {formatBalance(
                                        account.demo.freeMargin,
                                        account.demo.currency
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-(--text-muted) text-sm">
                                      Leverage
                                    </span>
                                    <span className="text-(--text-secondary)">
                                      1:{account.demo.leverage}
                                      {account.demo.isAutoLeverage && (
                                        <span className="ml-1 text-xs text-(--accent-cyan)">
                                          (Auto)
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-(--text-muted) text-sm italic py-8 text-center">
                                  No demo account created
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 bg-(--bg-tertiary)/30 rounded-xl border border-dashed border-(--border-primary)">
                        <p className="text-(--text-muted) italic">
                          No trading accounts found for this user
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setEditingUser(null)}
          />
          <div className="relative bg-(--bg-secondary) border border-(--border-primary) rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-(--border-primary) flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                Edit User
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 text-(--text-muted) hover:text-foreground transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2 text-(--text-secondary)">
                  Name
                </label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, name: e.target.value })
                  }
                  className="w-full bg-(--bg-tertiary) border border-(--border-primary) rounded-xl px-4 py-3 focus:outline-none focus:border-(--accent-cyan) text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-(--text-secondary)">
                  Email
                </label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, email: e.target.value })
                  }
                  className="w-full bg-(--bg-tertiary) border border-(--border-primary) rounded-xl px-4 py-3 focus:outline-none focus:border-(--accent-cyan) text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-(--text-secondary)">
                  New Password{" "}
                  <span className="text-(--text-muted)">
                    (leave empty to keep current)
                  </span>
                </label>
                <input
                  type="password"
                  value={editingUser.password}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, password: e.target.value })
                  }
                  className="w-full bg-(--bg-tertiary) border border-(--border-primary) rounded-xl px-4 py-3 focus:outline-none focus:border-(--accent-cyan) text-foreground"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-(--text-secondary)">
                  Role
                </label>
                <select
                  value={editingUser.role}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, role: e.target.value })
                  }
                  className="w-full bg-(--bg-tertiary) border border-(--border-primary) rounded-xl px-4 py-3 focus:outline-none focus:border-(--accent-cyan) text-foreground"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-(--border-primary) flex items-center justify-end gap-3">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 bg-(--bg-tertiary) border border-(--border-primary) rounded-lg text-(--text-secondary) hover:text-foreground transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUser}
                disabled={saving}
                className="px-6 py-2 bg-linear-to-r from-(--accent-purple) to-(--accent-cyan) rounded-lg text-white font-medium hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setEditingAccount(null)}
          />
          <div className="relative bg-(--bg-secondary) border border-(--border-primary) rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-(--border-primary) flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                Edit {editingAccount.type === "live" ? "Real" : "Demo"} Account
              </h3>
              <button
                onClick={() => setEditingAccount(null)}
                className="p-1 text-(--text-muted) hover:text-foreground transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2 text-(--text-secondary)">
                  Balance ({editingAccount.currency})
                </label>
                <input
                  type="number"
                  value={editingAccount.balance}
                  onChange={(e) =>
                    setEditingAccount({
                      ...editingAccount,
                      balance: e.target.value,
                    })
                  }
                  className="w-full bg-(--bg-tertiary) border border-(--border-primary) rounded-xl px-4 py-3 focus:outline-none focus:border-(--accent-cyan) text-foreground"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-(--text-secondary)">
                  Leverage
                </label>
                <select
                  value={editingAccount.leverage}
                  onChange={(e) =>
                    setEditingAccount({
                      ...editingAccount,
                      leverage: e.target.value,
                    })
                  }
                  className="w-full bg-(--bg-tertiary) border border-(--border-primary) rounded-xl px-4 py-3 focus:outline-none focus:border-(--accent-cyan) text-foreground"
                >
                  <option value="1">1:1</option>
                  <option value="5">1:5</option>
                  <option value="10">1:10</option>
                  <option value="20">1:20</option>
                  <option value="30">1:30</option>
                  <option value="50">1:50</option>
                  <option value="100">1:100</option>
                  <option value="200">1:200</option>
                  <option value="500">1:500</option>
                </select>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-(--border-primary) flex items-center justify-end gap-3">
              <button
                onClick={() => setEditingAccount(null)}
                className="px-4 py-2 bg-(--bg-tertiary) border border-(--border-primary) rounded-lg text-(--text-secondary) hover:text-foreground transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAccount}
                disabled={saving}
                className="px-6 py-2 bg-linear-to-r from-(--accent-purple) to-(--accent-cyan) rounded-lg text-white font-medium hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
