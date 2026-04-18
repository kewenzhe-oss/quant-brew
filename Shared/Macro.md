# Untitled

這個宏觀儀表板頁面比盤前早報更複雜，它解決的是一個更難的設計問題：**如何把 20+ 個宏觀指標組織成一個「可閱讀的判斷框架」，而不是一個讓人恐懼的彭博終端**。[themarketbrew](https://www.themarketbrew.com/macro)

---

## 資訊架構

整頁按「先給結論，再給子維度，最後給原始數據」的精英分析師報告結構排列，共七個板塊。[themarketbrew](https://www.themarketbrew.com/macro)

**板塊 1 — Global Header（導航層）**

與早報共用的全站 Header，承載 品牌定位 + 產品矩陣入口。值得注意的是宏觀這一欄有獨立的二級 Tab 導航（`总览 / 流动性 / 经济基本面 / 通胀与利率 / 市场情绪 / 周报`），說明這個頁面是整個宏觀子產品的聚合總覽，而不是孤立的單頁。[themarketbrew](https://www.themarketbrew.com/macro)

**板塊 2 — Dashboard Hero（問題錨定層）**

這是設計最精妙的一層。它沒有直接丟數據，而是先用一個問題框架定錨：

> 「四個維度回答一個問題：現在該進攻還是防守？」[themarketbrew](https://www.themarketbrew.com/macro)
> 

再列出四個維度的一句話解釋（流動性 / 經濟 / 通脹利率 / 情緒），最後給出當天的「信號燈」狀態（觀察、壓力等）。這個設計把用戶從「讀數據的人」轉變成了「接受答案的人」，認知成本大幅降低。[themarketbrew](https://www.themarketbrew.com/macro)

**板塊 3 — Master Verdict（總判斷層）**

一段 AI 生成的宏觀總結：`中性偏进攻 -- 经济基本面强韧...`，緊接一段更長的深度分析段落。這是整頁信息密度最高、閱讀回報最大的部分，相當於分析師報告的 Executive Summary。[themarketbrew](https://www.themarketbrew.com/macro)

**板塊 4–7 — 四個子儀表板（數據論據層）**

按「流動性 → 經濟基本面 → 通脹與利率 → 市場情緒」的邏輯，每個模塊的內部結構完全一致：

`text小標 + 一句話小結
↓
核心指標橫列（3–5 個數字卡片）
↓
TradingView 圖表（歷史趨勢）
↓
術語解釋段落（括號注釋每個指標的通俗含義）`

這種模塊一致性讓用戶建立了「掃描模式」——只要看第一個子模塊，後面三個的閱讀路徑就是一樣的，大幅提升掃描效率。[themarketbrew](https://www.themarketbrew.com/macro)

---

## 認知負載

這個頁面管理 20+ 個指標但沒有讓人崩潰，靠的是三個核心策略：[themarketbrew](https://www.themarketbrew.com/macro)

**策略 1：結論前置（倒金字塔結構）**

先給「進攻還是防守」的最終判斷，再給「中性偏進攻」的具體論證，最後才是原始指標。用戶在第一屏就能完成決策，往下滾動是為了驗證論據，而不是為了尋找結論。[themarketbrew](https://www.themarketbrew.com/macro)

**策略 2：術語括號注釋系統**

每個宏觀術語都在段落裡做了原地解釋，格式為：

> `代表真實資金供給的淨流動性(淨流動性 $6.0萬億)`
> 
> 
> `消費者對未來的信心水平(UMCSENT 56.6)`[themarketbrew](https://www.themarketbrew.com/macro)
> 

這個設計讓這個頁面對非專業用戶也可讀，而不需要另起一個「名詞解釋」頁面。它的技術成本極低（只需 LLM prompt 的輸出格式規範），但用戶感知的親切度大幅提升。[themarketbrew](https://www.themarketbrew.com/macro)

**策略 3：每個子模塊用一句話小結**

每個儀表板模塊頂部都有一句 **方向性小結**（而非列舉數據），例如：

> 「流動性環境整體偏緊，宏觀資金供給處於近一年較低水平」
> 
> 
> 「投資者主觀情緒高度緊張，但客觀拋壓並未失控」[themarketbrew](https://www.themarketbrew.com/macro)
> 

用戶可以在 5 秒內掃完四個子板塊的方向判斷，再按需深入看具體數據。這是非常成熟的「摘要層 + 詳情層」分離設計。[themarketbrew](https://www.themarketbrew.com/macro)

**隱性設計細節：**

- 指標數字卡片橫排排列（4–5 個一行），視覺上是「掃描組」不是「列表」，眼睛處理速度更快。[themarketbrew](https://www.themarketbrew.com/macro)
- 圖表只顯示一條歷史線，不同時展示多個指標，避免視覺干擾；用戶需要切換指標才能看另一條線，製造了「主動探索」而非「被動接收」的操作感。[themarketbrew](https://www.themarketbrew.com/macro)
- Tab 導航（总览/流动性/经济基本面...）把整個宏觀系統的深度隱藏在 URL 層，讓總覽頁不需要承載所有子維度的所有數據。[themarketbrew](https://www.themarketbrew.com/macro)

---

## 組件化拆分

用 **Next.js + Tailwind CSS + shadcn/ui** 重構，我建議這樣拆分組件樹：

| 組件名 | 功能 | 備注 |
| --- | --- | --- |
| `MacroSubNav` | 二級 Tab 導航（总览/流动性/经济...） | 可抽成通用 `SubNavTabs`，宏觀各子頁複用 |
| `MacroHeroPanel` | 問題錨定 + 四維度狀態 + 信號燈 | 「進攻/防守」這個框架是品牌核心，不要做成通用組件 |
| `MacroSignalBadge` | 單個維度的信號狀態（觀察/壓力/健康） | 可做成 `variant` prop：`neutral` / `risk` / `healthy` |
| `MasterVerdictBlock` | AI 總判斷 + 長段深度分析 | 支持 streaming 渲染，段落需要支援 Markdown |
| `DashboardSection` | 子儀表板容器（流動性/經濟/通脹/情緒） | 每個 Section 的結構完全一致，可用同一個 template |
| `MetricCardRow` | 核心指標橫排卡片組 | 每張卡片含：指標名、數值、週變化、一句通俗描述 |
| `MetricCard` | 單個數據卡片 | props: `label`, `value`, `change`, `unit`, `description` |
| `TradingViewChart` | TradingView Lightweight Charts 封裝 | 傳入 `series` data，支援 click-to-switch 指標 |
| `ChartSwitchLabel` | 「正在看 XX 的歷史趨勢」切換提示 | 顯示當前圖表模式 + 可切換的指標列表 |
| `SectionNarrative` | 每個子板塊底部的術語解釋段落 | 支援 `**粗體**` 術語標注 + `(括號注釋)` 系統 |
| `SectionCTALink` | 「深入分析 →」跳轉到子頁 | 放在每個 Section 頭部 |
| `WeeklyReportCTA` | 查看完整周報入口 | 獨立組件，可複用於 Footer |
| `AIChat Trigger` | 「和 AI 聊聊」按鈕 | 帶 `context=macro` query param，注入當日儀表板數據 |

組件樹的關鍵架構決策是：**`DashboardSection` 是最核心的複用組件**，它接受 `title`、`metrics[]`、`chartData`、`narrative`、`deepLinkHref` 這幾個 props，然後渲染 MetricCardRow + TradingViewChart + SectionNarrative。四個子儀表板只需要傳不同的 props，不需要寫四份不同的 JSX。

---

## 亮點與改進

**亮點 1：「問題框架錨定」設計**

把整個 20+ 指標的儀表板濃縮成一個核心問題——「現在該進攻還是防守？」——然後讓所有數據都服務於回答這個問題。 這是從「工具產品」到「判斷產品」的本質飛躍。你可以在 Quant-Brew 宏觀頁的 Hero 區直接複用這個框架，但要換成更有品牌感的表述，例如：「市場現在的聲調是什麼？」。[themarketbrew](https://www.themarketbrew.com/macro)

**亮點 2：術語括號注釋系統**

每個專業術語後面緊跟通俗解釋，格式統一，且是 AI 自動生成的 。這個設計技巧讓產品的受眾從「只有機構投資者」擴展到了「有學習意願的散戶」，是最低成本的用戶門檻降低方案。你可以在 Quant-Brew 的信號解釋、評分說明、個股分析裡全面應用這套括號注釋體系。[themarketbrew](https://www.themarketbrew.com/macro)