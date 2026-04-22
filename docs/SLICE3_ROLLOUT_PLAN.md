# Slice 3 Rollout Plan & Migration Template

This document outlines the standard procedure for migrating the remaining Macro Panels into the strict `PanelContract` schema implemented in Slice 3.1.

## 1. Migration Template
To onboard a new panel, simply declare a specific contract in `src/shared/market-intelligence/macroRegistry.ts` using the pre-approved exact registry variables, and bind it to `CONTRACT_REGISTRY`.

```typescript
export const NEW_PANEL: PanelContract = {
  id: '[specific_id]',
  factor: '[factor_id]',
  title: '[Panel Display Title]',
  snapshots: [
    { key: '[strict_data_key]', label: '[Metric Name]', description: '[1-liner logic context]' },
    // Repeat strictly for exactly the designated Data Inventory
  ],
  charts: [
    { key: '[strict_data_key]', title: '[Chart Name]', description: '[Why this matters]' },
    // Repeat strictly for exactly the designated Chart requirements
  ]
};
```

## 2. Factor-by-Factor Rollout Sequence

**Phase 1: Liquidity & Sentiment Validation**
- [x] `liquidity` -> `us` (Reference Validation Completed)
- [ ] `liquidity` -> `global`
- [ ] `sentiment` -> `volatility` (Safest path: VIX is connected)

**Phase 2: Fundamental Machinery (Economy)**
- [ ] `economy` -> `employment` (Connect unrate, payems, ic4wsa via aliasing mapped keys)
- [ ] `economy` -> `growth` (Connect ISMs and Indpro via aliasing mapped keys)
- [ ] `economy` -> `credit`

**Phase 3: Core Complex (Inflation & Rates)**
- [ ] `inflationRates` -> `inflation`
- [ ] `inflationRates` -> `rates`
- [ ] `inflationRates` -> `commodities`

**Phase 4: Remaining Sentiments**
- [ ] `sentiment` -> `fearGreed`
- [ ] `sentiment` -> `riskAppetite`

## 3. Data Aliasing Rule
If the user-specified keys (e.g. `dollar_index`) mismatch backend historical fetches (e.g. `dxy`), this must firmly be resolved inside the `historyApi.ts` integration bounds or `useMacroSeries` interceptor. The `PanelContract` layout definition **must permanently abide** by the original User keys.
