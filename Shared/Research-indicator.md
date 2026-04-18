# Untitled

這是針對 **QuantDinger Strategy & Live** 頁面（即 Indicator IDE 與策略回測模組）的完整逆向工程分析報告。

---

## 2. 資訊架構與板塊邏輯

這個頁面本質上是一個**「策略工廠」**：從信號定義、代碼編寫、AI 輔助生成，到回測驗證，整條工作流全部集中在一頁完成 。資訊流是**線性的、工具化的**，不像 AI Analysis 頁面那樣要同時感知多個板塊——用戶的注意力在這裡是**深度聚焦而非廣度掃描**。[quantdinger](https://ai.quantdinger.com/#/indicator-ide)

**板塊劃分（左欄 + 右欄 雙欄式）：**

| 板塊 | 位置 | 核心功能 | 資訊邏輯 |
| --- | --- | --- | --- |
| **控制欄（Control Bar）** | 頂部固定橫欄 | 選擇 Watchlist 標的、Timeframe（1m→1W）、指標（Indicator Dropdown） | 三個輸入確定「分析對象」，作為整頁所有操作的前提條件 |
| **工具欄（Action Toolbar）** | 代碼區正上方 | Quick Trade / Code Editor / Save / Delete / Deploy / Copy / Pause 等 7 個圖示按鈕 | 對當前策略的 CRUD 操作，功能完備但不干擾主視野 |
| **代碼編輯器（Code Editor）** | 左欄主體 | Python-like 語法的指標/策略代碼輸入區，帶代碼品質檢查（Code Quality Check） | 核心創作區域，用戶在此定義交易邏輯 |
| **AI 生成器（AI Generator）** | 代碼編輯器下方 | 自然語言輸入框 + 快速指標模板按鈕（SMA/EMA/RSI/MACD/BB...共 14 種） | 當用戶不會寫代碼時的「後備通道」，降低使用門檻 |
| **回測參數面板（Backtest Params）** | 右欄上方 | 時間範圍（1M/3M/6M/1Y/2Y/3Y）、資金、槓桿、手續費、滑點、方向（Long/Short/Both）、MTF 精度 | 對策略的現實約束配置，Run Backtest 是右欄的唯一主要 CTA |
| **回測結果面板（Backtest Results）** | 右欄下方 | 顯示回測輸出（初始為空態 placeholder） | 最終的「交付物」，用戶整個工作流的終點 |
| **Smart Tuning** | 右欄 Tab | AI 輔助自動調參功能（與 Backtest Results 共用 Tab 切換） | 進階功能，對初級用戶不可見，按需展開 |

資訊遞進邏輯：**選對象 → 寫/生成策略 → 配置回測參數 → 跑回測 → 看結果/調參**，是一條完整的量化策略驗證閉環 。[quantdinger](https://ai.quantdinger.com/#/indicator-ide)

---

## 3. 減法設計與認知負載

這個頁面面對的是**最高密度的信息情境**（代碼 + 大量參數 + 技術術語），但它用以下方式把認知壓力控制在可接受範圍內 ：[quantdinger](https://ai.quantdinger.com/#/indicator-ide)

**主要手法：**

- **工具欄只用圖示（Icon-only Toolbar）**：7 個操作按鈕（Save/Delete/Deploy/Copy...）全部用圖示呈現，不顯示文字標籤，將橫向寬度壓縮到最低，讓代碼區獲得最大化的垂直空間
- **時間範圍的快捷鍵優先（1M/3M/6M/1Y/2Y/3Y）**：日期範圍提供 6 個預設快速選項，DatePicker 是備用選項而非主要入口。用戶 80% 的使用場景都被一次點擊解決，DatePicker 的複雜度被有效隱藏
- **AI 指標模板的 Chip 列表（SMA/EMA/RSI...）**：14 個常用指標以小 Chip 標籤呈現，而不是 Dropdown，讓用戶在不離開當前上下文的情況下一鍵插入模板代碼——這是「零摩擦的指引」設計
- **Smart Tuning 收納為 Tab**：進階的 AI 調參功能和 Backtest Results 共用同一個 Tab 容器，初次用戶只看到「結果」，不被「調參」的複雜性嚇到
- **空態設計（Empty State）作為指引**：回測結果區在未執行時顯示 "Select an indicator and click Run Backtest"，不是空白，而是用一句話替代了整個 Onboarding 引導彈窗——認知引導成本降到極低
- **代碼品質提示（Code Quality Check）**：嵌在代碼編輯器底部而非彈窗，讓用戶在不中斷心流的情況下得到反饋
- **Backetest 參數的 `# @strategy` 注釋機制**：Stop Loss / Take Profit / Entry % 等參數不是獨立的 UI 表單，而是直接寫在代碼注釋中（`# @strategy stopLossPct 0.02`），這把「代碼即配置」的理念貫徹到底，大幅減少右側面板的欄位數量

---

## 4. 交互與組件化預測

以下是以 **Next.js + Tailwind CSS + shadcn/ui** 重構 Strategy & Live 頁面的組件拆分建議 ：[quantdinger](https://ai.quantdinger.com/#/indicator-ide)

**佈局層（Layout Components）：**

- `<StrategyPageShell>` — 整頁的雙欄佈局（左欄 IDE / 右欄 Backtest），管理欄寬比例（建議 `60/40` 或可拖拉調整），搭配 `react-resizable-panels` 實現分隔線拖拉
- `<StrategyControlBar>` — 頁面頂部三選一控制列：`<WatchlistSelect>` + `<TimeframeRadioGroup>` + `<IndicatorSelect>`，三者作為全局 state 下傳至子組件

**左欄（IDE Panel）：**

- `<StrategyToolbar>` — Icon-only 工具欄，7 個 shadcn/ui `<Button variant="ghost" size="icon">` 排列，每個配 `<Tooltip>` 提示名稱（Quick Trade / Save / Delete / Deploy / Copy / Pause / Guide Link）
- `<CodeEditor>` — 整合 **Monaco Editor**（VS Code 同款，`@monaco-editor/react`）或輕量版 **CodeMirror 6**，支援 Python syntax highlight + 代碼補全；底部嵌入 `<CodeQualityBadge>` 狀態指示器
- `<AIGeneratorPanel>` — 自然語言輸入 `<Textarea>` + `<Button>Generate Code</Button>` + 14 個指標快捷 `<Badge>` Chip；點擊 Chip 觸發模板插入至 `<CodeEditor>`
- `<IndicatorChipBar>` — 獨立的 14 個 Chip 組件（SMA/EMA/RSI/MACD/BB/ATR/CCI/WR/MFI/ADX/OBV/ADOSC/AD/KDJ），每個 `onClick` 觸發 `insertTemplate(indicator)` 函數

**右欄（Backtest Panel）：**

- `<BacktestParamsForm>` — 整個回測參數表單，包含以下子組件：
    - `<DateRangeQuickPicker>` — 6 個快捷按鈕（1M/3M/6M/1Y/2Y/3Y）+ shadcn/ui `<DateRangePicker>` 作為精確輸入後備
    - `<CapitalInputGroup>` — Initial Capital / Leverage / Commission / Slippage 四個 shadcn/ui `<NumberInput>`（帶 ↑↓ stepper）
    - `<TradeDirectionToggle>` — 三選一 Radio（Long / Short / Both），每個配對應方向圖示
    - `<MTFToggle>` — High-Precision MTF Checkbox，附簡短說明文字
- `<RunBacktestButton>` — 頁面右欄的唯一主要 CTA，`<Button variant="default" size="lg">` 帶 Thunderbolt 圖示，loading state 時顯示進度動畫
- `<BacktestResultTabs>` — shadcn/ui `<Tabs>` 包裹兩個 Tab：
    - `<BacktestResultsPanel>` — 顯示回測輸出（績效指標卡片 + 資金曲線圖 + 交易記錄表），空態時顯示 `<BacktestEmptyState>`
    - `<SmartTuningPanel>` — AI 自動調參介面，進階功能區

**通用原子組件（Atoms）：**

- `<BacktestEmptyState>` — "Select an indicator and click Run Backtest" 的空態組件，包含圖示 + 文字 + 指引箭頭
- `<CodeQualityBadge>` — 顯示代碼品質狀態的 Badge（Pass / Warning / Error），帶顏色語義
- `<StrategyAnnotationParser>` — 解析代碼中 `# @strategy` 注釋並同步到 Backtest Form 的工具 hook（`useStrategyAnnotations`）
- `<TutorialLink>` — "Read Dev Guide" 外部連結，附 `target="_blank"` 與 `<ArrowRightIcon>`

---

## 5. 亮點與改進建議

## 值得「偷」的 2 個亮點

**亮點一：`# @strategy` 代碼注釋即配置（Code-as-Config）**

這是這個頁面最有創意的設計決策。Stop Loss、Take Profit、Entry Size 等回測參數**不是在 UI 表單裡設定的，而是直接寫在代碼注釋中**（`# @strategy stopLossPct 0.02`），系統自動解析注釋來驅動回測引擎 。這個設計的好處是：策略代碼本身就是完整的文件，你 Fork 一個策略就帶走了所有參數配置，不需要截圖記錄 UI 設定。對 Quant-Brew 的啟發：**凡是「高級用戶才需要的參數」，都可以放進代碼層，而不是無限膨脹 UI 表單**。[quantdinger](https://ai.quantdinger.com/#/indicator-ide)

**亮點二：AI 指標 Chip 模板的「零摩擦插入」**

14 個常用指標以 Chip 的形式排在 AI 輸入框旁邊，一鍵點擊直接將模板代碼插入至光標位置 。這比「從 Dropdown 選模板→複製→貼上」少了至少 3 個步驟，對「想改現成指標但不想從零寫」的中級用戶（正好是最多的群體）體驗極佳。在 Quant-Brew 的策略工具中，可以把這個模式擴展到「美股常用因子」的快速插入——例如 `P/E`、`EPS Surprise`、`Short Float` 等研究因子模板 Chip。[quantdinger](https://ai.quantdinger.com/#/indicator-ide)

## 本地化 Quant-Brew 的改造建議

**針對美股投研場景的功能調整：**

- **資產類型聚焦**：目前 Watchlist Dropdown 預設顯示 Cryptocurrency（BTC/USDT），對美股投研平台用戶是心理摩擦點。Quant-Brew 應將預設改為 **US Equities**，並在 Selector 的第一層直接顯示 SP500 成分股的搜尋框，而非先選資產類型再選標的
- **回測時間軸語境化**：快捷時間選項（1M/3M/6M/1Y/2Y/3Y）對美股應加入**「財報季周期對齊」選項**，例如 `TTM`（過去 12 個月）或 `FY24`（某一財年），讓回測邏輯與基本面分析週期對齊
- **移除 Leverage 欄位的預設值顯眼性**：Leverage 欄位預設 `1x` 並允許調到 `125x`，這是 Crypto 交易所的邏輯。在美股語境中，可以將 Leverage 替換為 `Position Sizing`（倉位比例 %），更符合美股散戶的心智模型

**排版與視覺調整：**

- **代碼編輯器主題**：目前使用 Ant Design 的默認風格。對於 Quant-Brew，建議代碼區採用 **VS Code Dark+** 或 **One Dark Pro** 主題（Monaco Editor 內建支援），搭配全頁深色背景，強化「專業工具」氛圍，與 Bloomberg Terminal 的視覺語言一致
- **工具欄改為「文字 + 圖示」混合**：Icon-only Toolbar 對首次使用者有學習成本，建議在 Quant-Brew 中對 **Save / Run Backtest / AI Generate** 三個最核心的操作保留文字標籤（`<Button>`），其餘次要操作（Copy/Delete）才 Icon-only。這符合「常用操作明確化，次要操作收納化」的最小認知負載原則
- **繁體中文注釋支援**：示例代碼中的注釋目前是簡體中文（`"简单布林带反转思路示例"`），對台港用戶形成小障礙。Quant-Brew 應預設繁體策略模板，並在 Dev Guide 提供中文（繁）文件，降低非英語用戶的使用門檻