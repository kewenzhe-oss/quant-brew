# Untitled

這個股票目錄頁（`/stock`）是整個平台個股研究入口，它解決的設計問題是：**如何讓「進入哪支股票」這個決定本身就成為一種投資教育體驗**——而不只是一個搜尋框。[themarketbrew](https://www.themarketbrew.com/stock)

---

## 資訊架構

頁面從上到下可以清晰地分成五個核心板塊，資訊邏輯是「先讓你找到目標，再讓你理解上下文」。[themarketbrew](https://www.themarketbrew.com/stock)

**板塊 1 — Global Header（全站導航）**

與其他頁面共用，包含 品牌、主產品線入口。這個頁面沒有二級 Tab Nav（不像宏觀頁），因為個股目錄的導航邏輯是「先選賽道，再選個股」，靠頁面本身的分組完成，不需要第二層 Tab 系統。[themarketbrew](https://www.themarketbrew.com/stock)

**板塊 2 — Page Hero（任務定錨層）**

三個元素：大標 `个股研究`、一句副標「按赛道浏览龙头股，实时行情一目了然」、搜尋框。 這一層的功能是回答「這頁能幫我做什麼？」，把預設動作指向兩個路徑：主動搜尋已知股票，或被動瀏覽賽道發現新股票。[themarketbrew](https://www.themarketbrew.com/stock)

**板塊 3 — 最近瀏覽（個人化錨點）**

放在賽道分組的最頂端，顯示 RIVN 和 AAPL 兩支最近訪問的股票。 它的設計意圖是**降低回訪用戶的路徑長度**——不需要重新搜尋或找賽道，直接顯示「你上次看的」，是一個高頻使用者的快捷入口。[themarketbrew](https://www.themarketbrew.com/stock)

**板塊 4 — 賽道分組列表（主體內容層）**

這是頁面 80% 的篇幅。七個賽道群組按「重要性與關注度」排列：[themarketbrew](https://www.themarketbrew.com/stock)

`textMAG 7 科技巨頭   → 市場最廣泛關注的風向標
AI 芯片 & 基礎設施 → 當前敘事最熱的賽道
企業軟件         → AI 應用層，成長股代表
銀行 & 支付      → 利率週期敏感板塊
中概核心         → 針對中文用戶的特供賽道（差異化設計）
消費 & 醫療      → 防御性配置尾端`

這個排序本身就是一種 **隱性的市場優先級教育**。[themarketbrew](https://www.themarketbrew.com/stock)

**板塊 5 — Footer（系統收尾層）**

包含 Explore 其他產品入口（市場日報、流動性、個性化）、全站 Footer 導航、以及風險聲明。[themarketbrew](https://www.themarketbrew.com/stock)

---

## 認知負載

這個頁面的核心設計挑戰是：**用戶面對 40+ 支股票但不應該感到選擇疲勞**。 它用四個策略解決了這個問題：[themarketbrew](https://www.themarketbrew.com/stock)

**策略 1：賽道分組用「一句話投資邏輯」做副標**

每個賽道名稱下面都有一句話解釋「為什麼這個賽道值得關注」：

- MAG 7：`占 S&P 500 近 30% 权重，美股风向标`
- AI 芯片：`AI 军火商，追踪 AI capex 周期健康度`
- 中概：`中国经济复苏预期 + 地缘政治风险溢价`[themarketbrew](https://www.themarketbrew.com/stock)

這些副標把「股票目錄」升級成了「市場認知框架」，用戶在找股票的同時，被動地學會了各個板塊的投資邏輯。這是設計中少見的「知識增值型導航」。[themarketbrew](https://www.themarketbrew.com/stock)

**策略 2：每支股票只展示三個信息**

Ticker 代碼 + 中文公司名 + 當前股價 + 漲跌幅。 沒有 P/E、沒有市值、沒有額外指標——這讓目錄頁保持輕量，深度分析推遲到點擊進入個股頁之後再展示，嚴格遵守「信息在需要時才出現」的 Progressive Disclosure 原則。[themarketbrew](https://www.themarketbrew.com/stock)

**策略 3：漲跌幅的顏色是頁面唯一的顏色信號**

整頁排版克制，唯一使用綠/紅色的地方是漲跌幅數字。 這讓用戶的視線自動被「今天表現異常的股票」吸引，例如 NFLX `-9.74%` 的深紅色在頁面中格外突出——這是 **用顏色做優先級排序** 的典型隱性設計。[themarketbrew](https://www.themarketbrew.com/stock)

**策略 4：搜尋框前置，目錄是補充**

搜尋框放在 Hero 區，並且在搜尋框打開後直接顯示「最近瀏覽」作為快速選項，說明設計者知道大多數用戶是有明確目標的——目錄分組是給不確定要看什麼的用戶提供的 fallback，而不是主動線。[themarketbrew](https://www.themarketbrew.com/stock)

---

## 組件化拆分

用 **Next.js + Tailwind CSS + shadcn/ui** 重構的組件樹：

| 組件名 | 功能 | 備注 |
| --- | --- | --- |
| `StockSearchBar` | 搜尋框 + 下拉結果 + 最近瀏覽快速選項 | 用 `Combobox`（shadcn）實現，綁定 `useLocalStorage` 存最近瀏覽 |
| `RecentlyViewedRow` | 最近瀏覽的股票快捷列表 | 同 `StockTickerCard` 的精簡版 |
| `SectorGroup` | 單個賽道分組容器 | props: `sectorName`, `sectorEnName`, `description`, `tickers[]` |
| `SectorDescription` | 賽道一句話投資邏輯副標 | 這是最有差異化的組件，別做成通用 badge |
| `StockTickerCard` | 單支股票卡片（Ticker + 中文名 + 價格 + 漲跌） | props: `symbol`, `name`, `price`, `changePct`；點擊跳轉 `/stock/[symbol]` |
| `PriceChangeBadge` | 漲跌幅顯示（正 = 綠，負 = 紅） | 抽成獨立組件，個股詳情頁也要用 |
| `StockDirectoryPage` | 整頁組裝，把 `SectorGroup[]` 渲染成目錄 | 數據從 CMS 或靜態 JSON 驅動 |
| `ExploreFooterLinks` | 頁尾 Explore 其他產品入口 | 與 SiteFooter 獨立，可嵌入任意頁面底部 |

**數據模型建議**（TypeScript）：

`tstype SectorGroup = {
  id: string
  name: string         // "MAG 7 科技巨頭"
  nameEn: string       // "Magnificent 7"
  description: string  // "占 S&P 500 近 30% 权重，美股风向标"
  tickers: string[]    // ["AAPL", "MSFT", ...]
}

type TickerQuote = {
  symbol:    string
  nameZh:    string
  price:     number
  changePct: number
}`

股價數據建議用 **SWR + Yahoo Finance API** 每 30 秒刷新，而賽道分組的靜態 JSON 只需要在後台維護一次，不需要頻繁更新。[themarketbrew](https://www.themarketbrew.com/stock)

---

## 亮點與改進

**亮點 1：「賽道副標 = 投資教育」設計**

每個賽道分組下面的一句話，是這個頁面最值得偷的設計。 它不只是分類標籤，而是一個 **微型投資框架**——用 10 個字告訴用戶「這個板塊為什麼值得關注」。這把目錄頁從導航工具升級成了內容產品的一部分。在 Quant-Brew 裡可以把這句話做得更有品牌感，例如換成更具指向性的句式：「追蹤 AI CapEx 週期的溫度計」。[themarketbrew](https://www.themarketbrew.com/stock)

**亮點 2：中概核心賽道的精準用戶定位**

在一個美股平台上單獨建立「中概核心」分組，顯示了對中文目標用戶的精準理解——中文投資者對 BABA、PDD、JD 的關注度遠高於普通美股用戶。 這個設計決策背後是用戶畫像，而不是通用模板。Quant-Brew 可以進一步延伸：加入「港股 ADR 雙掛牌」或「中概監管風險溢價指數」作為這個賽道的特供數據點。[themarketbrew](https://www.themarketbrew.com/stock)