"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Drawing } from "@/lib/types";

export function useDrawings(symbol: string) {
  const { user, loading: authLoading } = useAuth();
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load from API or LocalStorage
  useEffect(() => {
    // If auth is still loading, wait
    if (authLoading) return;

    const loadDrawings = async () => {
      setLoading(true);
      try {
        if (user) {
          // Fetch from API
          const res = await fetch("/api/user/indicators");
          if (res.ok) {
            const data = await res.json();
            console.log("[useDrawings] Loaded from API:", data);
            
            // Drawings might be stored in chartConfig.drawings or similar
            // Assuming the API returns drawings in the response body
            const allDrawings: Drawing[] = data.drawings || [];
            
            // Filter by symbol if needed, but usually we load all and filter in UI?
            // Actually, for performance, we might want to only load for current symbol,
            // but the current API structure seems to return global user config.
            // Let's assume we get all drawings and filter in the component or here.
            // For now, let's keep all drawings in state, as the API returns full config.
            setDrawings(allDrawings);

            // Backup to localStorage
            localStorage.setItem(
              "atlas_drawings",
              JSON.stringify(allDrawings)
            );
          } else {
            throw new Error("Failed to fetch drawings from API");
          }
        } else {
          // Load from LocalStorage for guest users
          const savedDrawings = localStorage.getItem("atlas_drawings");
          if (savedDrawings) {
            setDrawings(JSON.parse(savedDrawings));
          }
        }
      } catch (err) {
        console.error("Error loading drawings:", err);
        setError("Failed to load drawings");
        
        // Fallback to localStorage
        const savedDrawings = localStorage.getItem("atlas_drawings");
        if (savedDrawings) setDrawings(JSON.parse(savedDrawings));
      } finally {
        setLoading(false);
      }
    };

    loadDrawings();
  }, [user, authLoading]);

  const updateDrawings = async (newDrawings: Drawing[]) => {
    // Optimistic update
    setDrawings(newDrawings);
    localStorage.setItem("atlas_drawings", JSON.stringify(newDrawings));

    if (user) {
      try {
        await fetch("/api/user/indicators", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ drawings: newDrawings }),
        });
      } catch (e) {
        console.error("Failed to sync drawings to API", e);
      }
    }
  };

  return {
    drawings,
    updateDrawings,
    loading,
    error,
  };
}

