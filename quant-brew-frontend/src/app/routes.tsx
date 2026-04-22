import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './layouts/AppShell';
import { HomePage } from '@/features/home/HomePage';
import { MacroPage } from '@/features/macro/MacroPage';
import { FactorPage } from '@/features/macro/FactorPage';
import { PanelDetailPage } from '@/features/macro/PanelDetailPage';
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
      // Layer 2 — Factor page  (/macro/liquidity, /macro/economy, …)
      { path: 'macro/:factorKey', element: <FactorPage /> },
      // Layer 3 — Panel Detail page  (/macro/liquidity/us, /macro/economy/growth, …)
      { path: 'macro/:factorKey/:panelKey', element: <PanelDetailPage /> },
      { path: 'research', element: <ResearchPage /> },
      { path: 'research/:market/:symbol', element: <ResearchPage /> },
      { path: 'watchlist', element: <WatchlistPlaceholder /> },
      { path: 'settings', element: <SettingsPlaceholder /> },
    ],
  },
  { path: 'login', element: <LoginPlaceholder /> },
]);
