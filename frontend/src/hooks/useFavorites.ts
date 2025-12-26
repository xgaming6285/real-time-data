'use client';

import { useState, useEffect, useCallback } from 'react';

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is authenticated
  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me');
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  // Load favorites from API or localStorage
  const loadFavorites = useCallback(async () => {
    console.log('[useFavorites] Loading favorites...');
    try {
      const authenticated = await checkAuth();
      console.log('[useFavorites] Authentication status:', authenticated);
      setIsAuthenticated(authenticated);

      if (authenticated) {
        // Load from database
        console.log('[useFavorites] Fetching from /api/user/favorites');
        const response = await fetch('/api/user/favorites');
        
        if (response.ok) {
          const data = await response.json();
          console.log('[useFavorites] Loaded favorites from API:', data.favorites);
          setFavorites(data.favorites || []);
          setError(null);
          
          // Sync to localStorage as backup
          localStorage.setItem('atlas_favorites', JSON.stringify(data.favorites || []));
        } else {
          const errorData = await response.json();
          console.error('[useFavorites] Failed to fetch favorites:', errorData);
          throw new Error('Failed to fetch favorites');
        }
      } else {
        // Load from localStorage for non-authenticated users
        console.log('[useFavorites] User not authenticated, loading from localStorage');
        const saved = localStorage.getItem('atlas_favorites');
        if (saved) {
          const parsed = JSON.parse(saved);
          console.log('[useFavorites] Loaded from localStorage:', parsed);
          setFavorites(parsed);
        } else {
          console.log('[useFavorites] No localStorage data found');
        }
      }
    } catch (err) {
      console.error('Error loading favorites:', err);
      setError(err instanceof Error ? err.message : 'Failed to load favorites');
      
      // Fallback to localStorage
      const saved = localStorage.getItem('atlas_favorites');
      if (saved) {
        setFavorites(JSON.parse(saved));
      }
    } finally {
      setLoading(false);
    }
  }, [checkAuth]);

  // Initialize favorites
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  // Add a favorite
  const addFavorite = useCallback(async (symbol: string) => {
    console.log('[useFavorites] Adding favorite:', symbol, 'isAuthenticated:', isAuthenticated);
    try {
      if (isAuthenticated) {
        // Update in database
        console.log('[useFavorites] Sending POST to /api/user/favorites');
        const response = await fetch('/api/user/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log('[useFavorites] API response:', data);
          setFavorites(data.favorites);
          localStorage.setItem('atlas_favorites', JSON.stringify(data.favorites));
        } else {
          const errorData = await response.json();
          console.error('[useFavorites] API error:', errorData);
          throw new Error('Failed to add favorite');
        }
      } else {
        // Update localStorage
        console.log('[useFavorites] Using localStorage, current favorites:', favorites);
        const newFavorites = [...favorites, symbol];
        console.log('[useFavorites] New favorites:', newFavorites);
        setFavorites(newFavorites);
        localStorage.setItem('atlas_favorites', JSON.stringify(newFavorites));
      }
    } catch (err) {
      console.error('Error adding favorite:', err);
      setError(err instanceof Error ? err.message : 'Failed to add favorite');
    }
  }, [favorites, isAuthenticated]);

  // Remove a favorite
  const removeFavorite = useCallback(async (symbol: string) => {
    console.log('[useFavorites] Removing favorite:', symbol, 'isAuthenticated:', isAuthenticated);
    try {
      if (isAuthenticated) {
        // Update in database
        console.log('[useFavorites] Sending DELETE to /api/user/favorites');
        const response = await fetch(`/api/user/favorites?symbol=${encodeURIComponent(symbol)}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          const data = await response.json();
          console.log('[useFavorites] API response:', data);
          setFavorites(data.favorites);
          localStorage.setItem('atlas_favorites', JSON.stringify(data.favorites));
        } else {
          const errorData = await response.json();
          console.error('[useFavorites] API error:', errorData);
          throw new Error('Failed to remove favorite');
        }
      } else {
        // Update localStorage
        console.log('[useFavorites] Using localStorage, current favorites:', favorites);
        const newFavorites = favorites.filter((f) => f !== symbol);
        console.log('[useFavorites] New favorites:', newFavorites);
        setFavorites(newFavorites);
        localStorage.setItem('atlas_favorites', JSON.stringify(newFavorites));
      }
    } catch (err) {
      console.error('Error removing favorite:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove favorite');
    }
  }, [favorites, isAuthenticated]);

  // Toggle favorite (add or remove)
  const toggleFavorite = useCallback(async (symbol: string) => {
    console.log('[useFavorites] Toggle favorite called for:', symbol);
    console.log('[useFavorites] Current favorites:', favorites);
    console.log('[useFavorites] Is in favorites?', favorites.includes(symbol));
    
    if (favorites.includes(symbol)) {
      console.log('[useFavorites] Removing from favorites');
      await removeFavorite(symbol);
    } else {
      console.log('[useFavorites] Adding to favorites');
      await addFavorite(symbol);
    }
  }, [favorites, addFavorite, removeFavorite]);

  // Update all favorites at once
  const updateFavorites = useCallback(async (newFavorites: string[]) => {
    try {
      if (isAuthenticated) {
        // Update in database
        const response = await fetch('/api/user/favorites', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ favorites: newFavorites }),
        });

        if (response.ok) {
          const data = await response.json();
          setFavorites(data.favorites);
          localStorage.setItem('atlas_favorites', JSON.stringify(data.favorites));
        } else {
          throw new Error('Failed to update favorites');
        }
      } else {
        // Update localStorage
        setFavorites(newFavorites);
        localStorage.setItem('atlas_favorites', JSON.stringify(newFavorites));
      }
    } catch (err) {
      console.error('Error updating favorites:', err);
      setError(err instanceof Error ? err.message : 'Failed to update favorites');
    }
  }, [isAuthenticated]);

  // Migrate localStorage favorites to database
  const migrateFavoritesToDatabase = useCallback(async () => {
    try {
      const saved = localStorage.getItem('atlas_favorites');
      if (saved && isAuthenticated) {
        const localFavorites = JSON.parse(saved);
        if (localFavorites.length > 0) {
          await updateFavorites(localFavorites);
          console.log('Successfully migrated favorites to database');
        }
      }
    } catch (err) {
      console.error('Error migrating favorites:', err);
    }
  }, [isAuthenticated, updateFavorites]);

  return {
    favorites,
    loading,
    error,
    isAuthenticated,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    updateFavorites,
    migrateFavoritesToDatabase,
    refresh: loadFavorites,
  };
}

