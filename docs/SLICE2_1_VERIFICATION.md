# Slice 2.1 封板验收报告

## 1. 修改文件清单
本次切片严格限制了作用域，仅新增/修改以下 4 个文件：
- `quant-brew-frontend/src/shared/api/macroHistory.ts` ([NEW] 包含强转适配器)
- `quant-brew-frontend/src/shared/hooks/useMacroSeries.ts` ([MODIFY] 切换为基于 React Query 的标准化 Hook)
- `quant-brew-frontend/src/features/macro/DimensionModuleGroup.tsx` ([MODIFY] 加入隔离强行拦截所有非 us10y 的请求)
- `quant-brew-frontend/src/features/macro/DimensionChart.tsx` ([MODIFY] 支持 isLoading、Empty 与报错回退的三态渲染)

## 2. 对接的 Endpoint
`GET /api/global-market/series/us10y`
底层直接代理至后端的公开时序路由，未经 `@login_required` 污染。

## 3. 真实 Response Sample
```json
{
  "code": 1,
  "data": {
    "label": "10Y 美债收益率",
    "metric": "us10y",
    "points": [
      {
        "time": "2024-04-21",
        "value": 4.405
      },
      {
        "time": "2024-04-22",
        "value": 4.389
      }
    ],
    "ticker": "^TNX",
    "unit": "%"
  }
}
```

## 4. Adapter 映射规则
在 `macroHistory.ts` 中拦截 payload 后，明确将 `Points` 内嵌对象提纯并做 `Number()` 兜底强转：
`[{ time: "2024-04-21", value: 4.405 }]` 
严格满足 Lightweight Charts 使用 YYYY-MM-DD 或 Unix 时间戳的 `LineData/WhitespaceData` 接口约定。并剥离了 `label`、`ticker`、`unit` 这类属于前端 `constants` 控制的字典数据，避免双端定义冲突。

## 5. 数据流路径
`UI Component` → `useMacroSeries('us10y')` → `React Query Cache` → `historyApi.getSeries()` → `client.ts` 拆解 `{code, data}` -> `historyApi` Adapter 层重现 `{time, value}` -> 返回图表组件进行 Canvas 挂载。

## 6. DoD 结论
- 原则性未破坏：没有涉及任何针对 `assess.ts` 的判词管辖权越界修改。
- 静态严格：`npm run build` TypeScript 100% 验证通过。
- 图表三态：拥有完整的【加载中】、【空置/未接通】、【挂载报错退回空置】流转支持。

## 7. 当前强限制边界
所有尝试拉取 `dxy`、`vix`、`cpi` 等的请求都会在 Props 进入 `useMacroSeries` 前被拦截降级为 `null`，确保除了 **10Y美债收益率** 有资格调用外，界面严格保持空态保护。
