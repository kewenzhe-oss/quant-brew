import { useCallback, useSyncExternalStore } from 'react';
import type { SymbolSearchResult } from '@/shared/api/types';

const STORAGE_KEY = 'qb_recent_symbols';
const MAX_ITEMS = 20;
const EMPTY: SymbolSearchResult[] = [];

type Listener = () => void;
const listeners = new Set<Listener>();

function readFromStorage(): SymbolSearchResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed as SymbolSearchResult[];
  } catch {
    return EMPTY;
  }
}

// Cached snapshot — useSyncExternalStore requires referential stability
// when the underlying data hasn't changed.
let cachedSnapshot: SymbolSearchResult[] = readFromStorage();

function emitChange() {
  cachedSnapshot = readFromStorage();
  for (const fn of listeners) fn();
}

function writeItems(items: SymbolSearchResult[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  emitChange();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): SymbolSearchResult[] {
  return cachedSnapshot;
}

/**
 * Shared recent-symbols hook backed by localStorage.
 * Used by Research AssetEntry, Watchlist AddAssetModal, and global SearchOverlay.
 *
 * Uses useSyncExternalStore so all mounted consumers re-render
 * when addRecent is called from any component.
 */
export function useRecentSymbols() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const addRecent = useCallback(
    (market: string, symbol: string, name: string) => {
      const current = readFromStorage();
      const filtered = current.filter(
        (s) => !(s.market === market && s.symbol === symbol),
      );
      const next: SymbolSearchResult[] = [
        { market, symbol, name },
        ...filtered,
      ].slice(0, MAX_ITEMS);
      writeItems(next);
    },
    [],
  );

  const clearRecent = useCallback(() => {
    writeItems([]);
  }, []);

  return { items, addRecent, clearRecent };
}
