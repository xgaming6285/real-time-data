"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      login(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="bg-(--bg-secondary) p-8 rounded-lg shadow-lg w-full max-w-md border border-(--border-primary)">
        <h2 className="text-2xl font-bold mb-6 text-center text-(--accent-cyan)">
          Login to AtlasX
        </h2>

        {error && (
          <div className="bg-[rgba(255,73,118,0.1)] border border-(--accent-red) text-(--accent-red) p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-(--text-secondary)">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-(--bg-tertiary) border border-(--border-primary) rounded p-2 focus:outline-none focus:border-(--accent-cyan) text-foreground"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-(--text-secondary)">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-(--bg-tertiary) border border-(--border-primary) rounded p-2 focus:outline-none focus:border-(--accent-cyan) text-foreground"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-(--accent-cyan) hover:bg-[#00b8e6] text-background font-bold py-2 px-4 rounded transition-colors disabled:opacity-50"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-(--text-muted)">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-(--accent-cyan) hover:underline"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
