# Untitled

以下是針對 **QuantDinger AI Asset Analysis** 頁面的深度逆向工程分析報告。

---

## 2. 資訊架構與板塊邏輯

這個頁面採用**三欄式 Dashboard 佈局**，主資訊流從左至右遞進，整體邏輯是：「市場概覽 → 個股篩選 → 深度分析」，符合量化交易者的思維順序 。[quantdinger](https://ai.quantdinger.com/#/ai-asset-analysis)

**板塊劃分（左→中→右）：**

| 板塊位置 | 板塊名稱 | 核心功能 | 資訊邏輯 |
| --- | --- | --- | --- |
| 頂部橫欄 | **全局導航欄** | 功能模組跳轉（分析/市場/IDE/Bot），用戶設定、主題切換 | 功能入口集中，永不消失 |
| 左欄 | **AI Opportunity Radar** | 橫向滾動的熱門股票信號卡（Ticker/價格/24H漲跌/Bullish-Bearish信號），按漲跌幅排序 | 「全市場掃瞄→找到最強信號」，作為觸發器引導用戶進入分析 |
| 中欄上方 | **Global Market Pulse** | F&G 指數、VIX、DXY、各國指數走勢（US/EU/JP/KR），按 Tab 切換 Crypto/Commodities/Forex/Sectors | 宏觀情緒先行，為個股分析定基調 |
| 中欄下方 | **Economic Calendar** | 即將發布的重大事件（Non-Farm/Fed Rate/CPI 等），帶預期值方向箭頭 | 時間維度的風險提示，告知用戶「未來什麼事會動市場」 |
| 中欄核心 | **AI Analysis Engine** | 股票分析觸發區（Dropdown 選標的 + Analyze 按鈕），展示分析結果（Multi-horizon/Indicator Matrix/Watchlist Synergy） | 整個頁面的主要行動點，承接左欄信號的轉化 |
| 右欄 | **My Watchlist** | 個人持倉清單（含資產類型、即時報價、漲跌幅、刪除/鬧鐘操作） | 個性化錨點，確保用戶始終有「私有資產」可快速進入分析 |

資訊遞進邏輯清晰：**市場發生了什麼** → **宏觀環境是否支撐** → **未來有什麼事件風險** → **針對我的資產做 AI 深度分析** 。[quantdinger](https://ai.quantdinger.com/#/ai-asset-analysis)

---

## 3. 減法設計與認知負載

這個頁面信息密度極高（20+ 個股票 + 全球指數 + 日曆 + Watchlist），但它通過以下機制避免「數據轟炸」：[quantdinger](https://ai.quantdinger.com/#/ai-asset-analysis)

**隱性設計手法：**

- **自動滾動橫幅（Radar Ticker）**：左欄的股票信號不是靜態列表，而是橫向輪播，用戶在視覺上只感知「當前 1 張卡片」，大幅縮小單次認知窗口。這比展開 20 行表格溫和得多
- **Tab 式分類切換（Crypto/Commodities/Sectors/Forex）**：市場數據只顯示當前分類，其他類目收納於 Tab 標籤，將「4 個市場的數據集」壓縮成「1 個視窗」
- **Signal 語義化標籤（Bullish / Bearish / Oversold / Consolidation）**：不讓用戶解讀數字，直接給出結論語言。用戶不需要理解 RSI = 28，只需看到「Oversold」就能行動
- **經濟日曆的方向箭頭（↑ / ↓）**：預期值不靠顏色，改用 ↑↓ 符號表達方向，在弱化視覺複雜度的同時保留語義
- **右側 Watchlist 的操作圖示後置（錢包/鬧鐘/刪除）**：操作圖示預設弱化，只在交互時顯現（hover reveal），避免每一行都充斥三個按鈕圖示的噪音
- **「Page Style Setting」面板收納**：深色/淺色、主題色、Weak Mode 等設定全部收納在右上角的齒輪 Panel，不占用主介面空間

---

## 4. 交互與組件化預測

以下是以 **Next.js + Tailwind CSS + shadcn/ui** 重構時，建議拆分的核心 React 組件 ：[quantdinger](https://ai.quantdinger.com/#/ai-asset-analysis)

**佈局層（Layout Components）：**

- `<AppShell>` — 整個三欄佈局的外殼，管理 sidebar/main/right-panel 的響應式排列，包含 dark/light mode context
- `<TopNavBar>` — 頂部功能導航欄（含折疊選單圖示、用戶 Avatar、Notification Bell、語言切換、Settings 觸發器）
- `<SettingsDrawer>` — 從 shadcn/ui `<Sheet>` 實現，包含主題色選擇器、Weak Mode Toggle、Multi-Tab Toggle

**數據展示層（Data Display Components）：**

- `<OpportunityRadar>` — 橫向自動滾動的信號卡走馬燈，每個子元素為 `<SignalCard ticker price change signal description />`，信號用 `variant="bullish" | "bearish" | "oversold" | "consolidation"` 驅動顏色
- `<GlobalMarketPulse>` — shadcn/ui `<Tabs>` 包裹，每個 Tab 內是一組 `<IndexChip>` (國旗 Emoji + 代碼 + 指數值 + 漲跌幅)；上方固定顯示 F&G/VIX/DXY 三個宏觀指標 `<MacroIndicatorBadge>`
- `<EconomicCalendar>` — 按日期分組的事件列表，每行是 `<CalendarEventRow time country event direction forecastValue />`，方向用 `<ArrowUpIcon>` / `<ArrowDownIcon>` 從 lucide-react 取用
- `<Watchlist>` — shadcn/ui `<ScrollArea>` 包裹，每行是 `<WatchlistItem ticker type name price change />` + hover 顯示的操作 Icon 組

**核心功能層（Feature Components）：**

- `<AnalysisEngine>` — 頁面的主 CTA 區域，包含 shadcn/ui `<Select>` 選標的、`<Button variant="default">Analyze</Button>`，以及分析結果的三張 Feature Card（Multi-horizon/Indicator Matrix/Watchlist Synergy）
- `<AnalysisResultPanel>` — 分析結果渲染區，動態呈現 AI 返回內容，包含 `<TimeframeConsensus>` 和 `<QuantIndicatorMatrix>` 子組件
- `<AnalysisHistoryModal>` — shadcn/ui `<Dialog>` 實現，記錄歷史分析請求

**通用原子組件（Atoms）：**

- `<SignalBadge>` — 接受 `"bullish" | "bearish" | "oversold" | "consolidation"`，輸出對應顏色/圖示
- `<TickerDisplay>` — 標準化的 `Ticker + 市場旗標 + 價格 + 漲跌幅` 顯示原子
- `<CountryFlagEmoji>` — 將市場 code 轉換成對應國旗 Emoji 的工具組件
- `<RefreshButton>` — 帶旋轉動畫的重整圖示按鈕，包含 loading state

---

## 5. 亮點與改進建議

## 值得「偷」的 2 個亮點

**亮點一：Signal-First 信息設計（語義化信號層）**

QuantDinger 最聰明的地方是把量化分析的輸出從「數字」轉化為「結論語言」再配上顏色——Bullish / Bearish / Oversold / Consolidation。這個設計讓工具從「數據查詢平台」升級為「決策輔助系統」。對於 Quant-Brew，你完全可以把這個模式套用到美股個股卡片上：將 RSI + MACD + 成交量的複合信號轉化為一個統一的「勢能標籤」，讓用戶第一眼抓到結論 。[quantdinger](https://ai.quantdinger.com/#/ai-asset-analysis)

**亮點二：宏觀→中觀→微觀的三層資訊遞進**

頁面設計的資訊流是刻意構建的：先感知全球市場情緒（F&G/VIX），再看特定市場（指數 Ticker），最後觸發個股分析。這種「由上至下的信息funnel」比「把所有數據並排展示」的設計認知成本低得多。在 Quant-Brew 上，可以複製這個邏輯：大盤情緒圖 → 板塊熱度 → 個股投研報告，形成完整的閱讀路徑 。[quantdinger](https://ai.quantdinger.com/#/ai-asset-analysis)

## 本地化 Quant-Brew 的改造建議

針對「極簡中文美股投研平台」的定位，以下是具體改造方向：

**排版本地化：**

- **字體置換**：Ant Design 的默認字體（PingFang / Microsoft YaHei）在密集數字環境下筆畫顯得薄。建議改用 **思源黑體 CN（Noto Sans SC）+ Tabular Nums**，數字部分使用等寬字體（`font-variant-numeric: tabular-nums`），避免漲跌幅數字換行時列不對齊
- **繁/簡語境的字距調整**：中文字符本身已有「天然間距」，行距（`line-height`）建議設置在 `1.7–1.8`，比英文 `1.5` 更寬鬆，避免密集中文段落閱讀疲勞

**美股聚焦的精簡化：**

- 移除 A股/港股的多市場切換 Tab，改為**美股板塊熱度地圖**（類似 Finviz 的 S&P 500 Sector Heat Map），更直觀地展示美股當日資金流向
- 經濟日曆只保留「影響美股」的重大事件（Fed/CPI/NFP/PCE/財報），並加入「事件重要性評分」（3 顆星制），幫助用戶快速判斷優先級

**極簡視覺改造：**

- 目前 QuantDinger 使用了 Ant Design 的默認藍（`#1677ff`），在深色模式下較為刺眼。Quant-Brew 可以改為**低飽和度青綠（類似 `oklch(0.55 0.10 190)`）**作為 Accent，搭配近黑色背景（`#141414`），整體感更接近 Bloomberg Terminal 的「專業工具」氣質
- **去掉 Emoji 國旗**：雖然直觀，但在極簡定位下顯得瑣碎；改用兩字母的國家代碼 `badge`（`US` / `EU` / `JP`）以小型 `-text-xs` 字號呈現，更乾淨