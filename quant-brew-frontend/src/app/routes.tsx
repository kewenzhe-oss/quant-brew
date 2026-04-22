import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './layouts/AppShell';
import { HomePage } from '@/features/home/HomePage';
import { MacroPage } from '@/features/macro/MacroPage';
import { MacroDomainPage } from '@/features/macro/MacroDomainPage';
import { MacroDimensionPage } from '@/features/macro/MacroDimensionPage';
import { ResearchPage } from '@/features/research/ResearchPage';
import { WatchlistPlaceholder } from '@/features/watchlist/WatchlistPlaceholder';
import { SettingsPlaceholder } from '@/features/settings/SettingsPlaceholder';
import { LoginPlaceholder } from '@/features/auth/LoginPlaceholder';

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      // Layer 1 — Macro overview
      { path: 'macro', element: <MacroPage /> },
      // Layer 2 — Domain page  (/macro/liquidity, /macro/economy, …)
      { path: 'macro/:domainKey', element: <MacroDomainPage /> },
      // Layer 3 — Detail/dimension page  (/macro/liquidity/us, /macro/economy/growth, …)
      { path: 'macro/:domainKey/:dimensionKey', element: <MacroDimensionPage /> },
      { path: 'research', element: <ResearchPage /> },
      { path: 'research/:market/:symbol', element: <ResearchPage /> },
      { path: 'watchlist', element: <WatchlistPlaceholder /> },
      { path: 'settings', element: <SettingsPlaceholder /> },
    ],
  },
  { path: 'login', element: <LoginPlaceholder /> },
]);
