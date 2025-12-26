'use client';

import { useFavorites } from '@/hooks/useFavorites';
import { useEffect } from 'react';

export default function FavoritesDebugPage() {
  const {
    favorites,
    loading,
    error,
    isAuthenticated,
    addFavorite,
    removeFavorite,
    refresh,
  } = useFavorites();

  useEffect(() => {
    console.log('=== Favorites Debug Page ===');
    console.log('Favorites:', favorites);
    console.log('Loading:', loading);
    console.log('Error:', error);
    console.log('Is Authenticated:', isAuthenticated);
  }, [favorites, loading, error, isAuthenticated]);

  const testSymbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'ETHUSD'];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Favorites Debug Page</h1>

      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-3">Status</h2>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-gray-400">Authenticated:</span>{' '}
            <span className={isAuthenticated ? 'text-green-400' : 'text-red-400'}>
              {isAuthenticated ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Loading:</span>{' '}
            <span>{loading ? 'Yes' : 'No'}</span>
          </div>
          <div>
            <span className="text-gray-400">Error:</span>{' '}
            <span className="text-red-400">{error || 'None'}</span>
          </div>
          <div>
            <span className="text-gray-400">Total Favorites:</span>{' '}
            <span className="text-cyan-400 font-bold">{favorites.length}</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-3">Current Favorites</h2>
        {favorites.length === 0 ? (
          <p className="text-gray-400 text-sm">No favorites yet</p>
        ) : (
          <div className="space-y-2">
            {favorites.map((symbol, index) => (
              <div
                key={symbol}
                className="flex items-center justify-between bg-gray-700 p-3 rounded"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 text-sm w-6">{index + 1}.</span>
                  <span className="font-semibold text-cyan-400">{symbol}</span>
                </div>
                <button
                  onClick={() => removeFavorite(symbol)}
                  className="px-3 py-1 bg-red-500 hover:bg-red-600 rounded text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-3">Test Symbols</h2>
        <p className="text-sm text-gray-400 mb-3">
          Click to add/remove these test symbols:
        </p>
        <div className="space-y-2">
          {testSymbols.map((symbol) => {
            const isFavorite = favorites.includes(symbol);
            return (
              <div
                key={symbol}
                className="flex items-center justify-between bg-gray-700 p-3 rounded"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{isFavorite ? '★' : '☆'}</span>
                  <span className="font-semibold">{symbol}</span>
                </div>
                <button
                  onClick={() => {
                    if (isFavorite) {
                      removeFavorite(symbol);
                    } else {
                      addFavorite(symbol);
                    }
                  }}
                  className={`px-4 py-2 rounded ${
                    isFavorite
                      ? 'bg-yellow-500 hover:bg-yellow-600'
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {isFavorite ? 'Remove' : 'Add'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">Actions</h2>
        <div className="space-y-2">
          <button
            onClick={refresh}
            className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded"
          >
            Refresh Favorites
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('atlas_favorites');
              refresh();
            }}
            className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded"
          >
            Clear LocalStorage & Refresh
          </button>
          <button
            onClick={() => {
              console.log('Current State:');
              console.log('- Favorites:', favorites);
              console.log('- LocalStorage:', localStorage.getItem('atlas_favorites'));
              console.log('- Is Authenticated:', isAuthenticated);
            }}
            className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded"
          >
            Log Current State to Console
          </button>
        </div>
      </div>

      <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-600 rounded">
        <p className="text-sm text-yellow-200">
          <strong>Note:</strong> Check the browser console (F12) for detailed logs
          about what's happening with favorites operations.
        </p>
      </div>
    </div>
  );
}

