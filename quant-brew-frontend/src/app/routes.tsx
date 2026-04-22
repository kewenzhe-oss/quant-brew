import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './layouts/AppShell';
import { HomePage } from '@/features/home/HomePage';
import { MacroPage } from '@/features/macro/MacroPage';
import { DimensionResearchPage } from '@/features/macro/DimensionResearchPage';
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
      // Layer 2 — Dimension Research Page (Replaces old Factor/Panel drill-down)
      { path: 'macro/:factorKey', element: <DimensionResearchPage /> },
      { path: 'research', element: <ResearchPage /> },
      { path: 'research/:market/:symbol', element: <ResearchPage /> },
      { path: 'watchlist', element: <WatchlistPlaceholder /> },
      { path: 'settings', element: <SettingsPlaceholder /> },
    ],
  },
  { path: 'login', element: <LoginPlaceholder /> },
]);
