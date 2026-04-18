/**
 * Composes real API hooks with the normalizer.
 *
 * Real data: market_snapshot, key_movers, events; macro when assessable (Phase C)
 * Mock fallback: macro when insufficient inputs.
 *
 * Phase D: narrative is now derived from the same assembled snapshot
 * via deriveNarrative(). The mock narrative is no longer the primary
 * source. It is retained only as a typed import so mockSnapshot.ts
 * still compiles; it is NOT inserted back into the live snapshot.
 */

import { useMemo } from 'react';
import { useMarketOverview } from '@/shared/hooks/useMarketOverview';
import { useSentiment } from '@/shared/hooks/useSentiment';
import { useOpportunities, useCalendar } from '@/shared/hooks/useGlobalMarket';
import { assessMacroDimensions, canAssessMacro } from './assess';
import {
  normalizeMarketSnapshot,
  normalizeKeyMovers,
  normalizeEvents,
} from './normalize';
import { deriveNarrative } from './deriveNarrative';
import { mockMarketIntelligenceSnapshot } from './mockSnapshot';
import type { MarketIntelligenceSnapshot } from './types';

interface UseMarketIntelligenceReturn {
  snapshot: MarketIntelligenceSnapshot;
  isLoading: boolean;
  isPartiallyReal: boolean;
}

export function useMarketIntelligence(): UseMarketIntelligenceReturn {
  const { data: overview, isLoading: loadingOverview } = useMarketOverview();
  const { data: sentiment, isLoading: loadingSentiment } = useSentiment();
  const { data: opportunities } = useOpportunities();
  const { data: calendar } = useCalendar();

  const isLoading = loadingOverview || loadingSentiment;
  const hasRealData = !!overview || !!sentiment;

  const snapshot = useMemo<MarketIntelligenceSnapshot>(() => {
    const marketSnapshot = normalizeMarketSnapshot(overview, sentiment);
    const keyMovers = normalizeKeyMovers(opportunities);
    const events = normalizeEvents(calendar);

    const hasRealTickers = marketSnapshot.indices.length > 0 || marketSnapshot.rates.length > 0;
    const useRealMacro = canAssessMacro(overview, sentiment);

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);

    // ── Assemble partial snapshot (without narrative) ──────────────
    // Narrative must be derived from this same object so the numbers
    // in text are always consistent with the cards/verdict displayed.
    const partialSnapshot: MarketIntelligenceSnapshot = {
      snapshot_id: hasRealTickers
        ? `mis-${dateStr}-${marketSnapshot.session}-live`
        : mockMarketIntelligenceSnapshot.snapshot_id,
      generated_at: now.toISOString(),
      market_session: marketSnapshot.session,

      macro: useRealMacro
        ? assessMacroDimensions(overview, sentiment)
        : mockMarketIntelligenceSnapshot.macro,

      market_snapshot: hasRealTickers
        ? marketSnapshot
        : mockMarketIntelligenceSnapshot.market_snapshot,

      key_movers: keyMovers.length > 0
        ? keyMovers
        : mockMarketIntelligenceSnapshot.key_movers,

      events: events.length > 0
        ? events
        : mockMarketIntelligenceSnapshot.events,

      // Placeholder so the object satisfies the type; will be replaced below.
      narrative: mockMarketIntelligenceSnapshot.narrative,
    };

    // ── Phase D: derive narrative from the assembled snapshot ──────
    // deriveNarrative() reads only the normalised/assessed fields above.
    // It does not touch raw API responses and tolerates partial data.
    const derivedNarrative = deriveNarrative(partialSnapshot);

    return {
      ...partialSnapshot,
      narrative: derivedNarrative,
    };
  }, [overview, sentiment, opportunities, calendar]);

  return {
    snapshot,
    isLoading,
    isPartiallyReal: hasRealData,
  };
}
