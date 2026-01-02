"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { ActiveIndicator } from "@/lib/types";

export function useIndicators() {
  const { user, loading: authLoading } = useAuth();
  const [favoriteIndicators, setFavoriteIndicators] = useState<string[]>([]);
  const [activeIndicators, setActiveIndicators] = useState<ActiveIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load from API or LocalStorage
  useEffect(() => {
    // If auth is still loading, wait
    if (authLoading) return;

    const loadIndicators = async () => {
      setLoading(true);
      try {
        if (user) {
          // Fetch from API
          const res = await fetch("/api/user/indicators");
          if (res.ok) {
            const data = await res.json();
            console.log("[useIndicators] Loaded from API:", data);
            
            // Only update state if data exists, otherwise keep defaults (empty arrays)
            // But we should respect empty arrays from DB if they mean "no indicators"
            setFavoriteIndicators(data.favoriteIndicators || []);
            setActiveIndicators(data.activeIndicators || []);

            // Backup to localStorage to keep it fresh
            localStorage.setItem(
              "atlas_indicator_favorites",
              JSON.stringify(data.favoriteIndicators || [])
            );
            localStorage.setItem(
              "atlas_active_indicators",
              JSON.stringify(data.activeIndicators || [])
            );
          } else {
            throw new Error("Failed to fetch indicators from API");
          }
        } else {
          // Load from LocalStorage for guest users
          const savedFavs = localStorage.getItem("atlas_indicator_favorites");
          if (savedFavs) {
            setFavoriteIndicators(JSON.parse(savedFavs));
          }

          const savedActive = localStorage.getItem("atlas_active_indicators");
          if (savedActive) {
            setActiveIndicators(JSON.parse(savedActive));
          }
        }
      } catch (err) {
        console.error("Error loading indicators:", err);
        setError("Failed to load indicators");
        
        // Fallback to localStorage on error even if logged in
        const savedFavs = localStorage.getItem("atlas_indicator_favorites");
        if (savedFavs) setFavoriteIndicators(JSON.parse(savedFavs));

        const savedActive = localStorage.getItem("atlas_active_indicators");
        if (savedActive) setActiveIndicators(JSON.parse(savedActive));
      } finally {
        setLoading(false);
      }
    };

    loadIndicators();
  }, [user, authLoading]);

  const updateActiveIndicators = async (indicators: ActiveIndicator[]) => {
    // Optimistic update
    setActiveIndicators(indicators);
    localStorage.setItem("atlas_active_indicators", JSON.stringify(indicators));

    if (user) {
      try {
        await fetch("/api/user/indicators", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activeIndicators: indicators }),
        });
      } catch (e) {
        console.error("Failed to sync active indicators to API", e);
        // We don't revert state here because local storage is still valid
      }
    }
  };

  const updateFavoriteIndicators = async (favorites: string[]) => {
    // Optimistic update
    setFavoriteIndicators(favorites);
    localStorage.setItem("atlas_indicator_favorites", JSON.stringify(favorites));

    if (user) {
      try {
        await fetch("/api/user/indicators", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ favoriteIndicators: favorites }),
        });
      } catch (e) {
        console.error("Failed to sync favorite indicators to API", e);
      }
    }
  };

  return {
    activeIndicators,
    favoriteIndicators,
    updateActiveIndicators,
    updateFavoriteIndicators,
    loading,
    error,
  };
}

