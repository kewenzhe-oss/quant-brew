# Quant-Brew Macro Data Reference v1

**版本**：v1.0  
**建立日期**：2026-04-19  
**狀態**：Source of Truth — Macro 四板塊開發基準  
**維護者**：Quant-Brew 前端工程團隊  

> **原則**：本文檔是 Macro 頁面的數據規格基準。所有 Macro 相關的前後端開發決策必須先對照本文檔。任何不在本文檔中的指標，不得在沒有更新此文檔的前提下直接實作。

---

## 一、Macro 頁頂層問題

```
當前宏觀環境，對風險資產是支撐還是壓制？
```

這是整個 Macro 頁回答的唯一問題。所有四個板塊的指標選取、判讀方向、圖表選擇，都必須服務於這個問題的回答。

**判讀輸出格式**（對應 `assess.ts` VerdictStance）：

| Stance | 含義 |
|---|---|
| `offensive` | 宏觀整體支撐，多頭邏輯通暢 |
| `cautious_offensive` | 基本支撐，但有局部風險需關注 |
| `neutral` | 多空因素交織，無明確方向 |
| `cautious_defensive` | 逆風為主，但未到系統性風險 |
| `defensive` | 宏觀環境明顯壓制風險資產 |

---

## 二、四個板塊總覽

| 板塊 | 核心問題 | 判斷目標 | 在首頁的角色 |
|---|---|---|---|
| **流動性** | 市場上的錢是多了還是少了？ | 偏松 / 中性 / 偏緊 | 錨定資金環境底色 |
| **經濟** | 實體經濟在擴張還是收縮？ | 健康 / 觀察 / 承壓 | 判斷企業盈利基礎 |
| **通脹與利率** | 通脹是否還在壓制降息？ | 路徑清晰 / 待定 / 粘性 | 決定估值折現率方向 |
| **情緒** | 市場在恐慌還是貪婪？ | 恐懼 / 中性 / 貪婪 | 捕捉短期定價偏差 |

**因果優先級**：流動性 → 通脹與利率 → 經濟 → 情緒（前者是後者的基礎）

---

## 三、四個板塊完整數據清單

### 板塊 A：流動性

> **核心問題**：美聯儲在注水還是抽水？資金成本貴不貴？美元供給在收縮還是擴張？

| 指標 | 代碼 / 來源 | 用途 | 當前狀態 | 優先級 | 備注 |
|---|---|---|---|---|---|
| 美聯儲總資產 WALCL | `WALCL` / FRED via yfinance | 淨流動性計算分子 | ⚠️ FRED 連線斷開 | P1 | fed_liquidity.py 框架已有 |
| 財政部帳戶 TGA | `WTREGEN` / FRED via yfinance | 淨流動性扣除項 | ⚠️ FRED 連線斷開 | P1 | 同上 |
| 隔夜逆回購 RRP | `RRPONTSYD` / FRED via yfinance | 淨流動性扣除項 | ⚠️ FRED 連線斷開 | P1 | 同上 |
| **淨流動性** | 計算值：WALCL − TGA − RRP | 流動性量化核心 | ⚠️ 依賴 WALCL/TGA/RRP | P1 | 邏輯已有，等 FRED 修復 |
| 10Y 美債收益率 | `^TNX` / yfinance | 無風險利率 / 資金成本代理 | ✅ 可用 | P1 | us10y.value = 4.25% |
| 2Y/10Y 利差 | 計算值 | 收益率曲線形態 | ✅ 部分可用 | P1 | yield_curve.spread = 0.64bps |
| 美元指數 DXY | `DX-Y.NYB` / yfinance | 全球美元流動性代理 | ✅ 可用 | P1 | dxy.value = 98.28 |
| M2 貨幣供應 | `M2SL` / FRED via yfinance | 廣義貨幣傳導 | 🔴 未接入 | P2 | FRED ticker，可後補 |
| 2Y 美債收益率 | `^IRX` / yfinance | 短端利率 / 政策預期 | ✅ /series/us2y 已通 | P2 | 用於計算利差 |
| 準備金餘額 WRESBAL | `WRESBAL` / FRED | 銀行體系準備金 | 🔴 未接入 | Later | 精細流動性分析用 |
| SOFR | Fed / FRED | 實際融資成本 | 🔴 未接入 | Later | 可用 ^SOFR 近似 |
| 信用利差 HY | FRED `BAMLH0A0HYM2` | 風險偏好拐點信號 | 🔴 未接入 | Later | 精細判讀用 |

**歷史圖表（流動性板塊）**：

| 圖表 | Ticker | 狀態 |
|---|---|---|
| 10Y 美債收益率走勢 | `^TNX` | ✅ /series/us10y 已通 |
| DXY 走勢 | `DX-Y.NYB` | ✅ /series/dxy 已通 |
| 淨流動性走勢 | 計算值 | ⚠️ 依賴 FRED 修復 |

---

### 板塊 B：經濟

> **核心問題**：企業端和消費者端的活動強度如何？就業市場是否開始鬆動？

| 指標 | 代碼 / 來源 | 用途 | 當前狀態 | 優先級 | 備注 |
|---|---|---|---|---|---|
| ISM 製造業 PMI | ISM 官網（無公開 API）| 製造業景氣核心 | 🔴 未接入 | P1 | 需找代理數據源 |
| 初請失業金 | `IC4WSA` / FRED via yfinance | 就業市場即時信號 | 🔴 未接入 | P1 | 周度數據 |
| 非農就業人數 | `PAYEMS` / FRED via yfinance | 月度就業全景 | 🔴 未接入 | P1 | FRED ticker |
| 失業率 | `UNRATE` / FRED via yfinance | 勞動力市場健康度 | 🔴 未接入 | P1 | FRED ticker |
| GDP Nowcast | Atlanta Fed GDPNow | 實時 GDP 增速估算 | 🔴 未接入 | P2 | 無官方 API，需代理 |
| 消費者信心 | Conference Board / Michigan | 消費端前瞻信號 | 🔴 未接入 | P2 | 月度數據 |
| 零售銷售 | `RSXFS` / FRED | 消費支出現況 | 🔴 未接入 | P2 | FRED ticker |
| 工業產出 IP | `INDPRO` / FRED | 製造業活動 | 🔴 未接入 | Later | PMI 接入後再考慮 |
| 宽基指數廣度（代理）| SPX 成分股漲跌比 | 缺乏實體數據時的替代 | ⚠️ 部分（用 overview 指數）| P1 | 目前 assessEconomy 已使用 |

> **當前 assessEconomy 的工作方式**：無任何直接經濟數據，用 overview.us_indices 廣度作代理，置信度 30-40%（極低，需升級）。

**歷史圖表（經濟板塊）**：

| 圖表 | Ticker | 狀態 |
|---|---|---|
| SPX 走勢（代理）| `^GSPC` | ✅ /series/spx 已通 |
| 失業率走勢 | `UNRATE` FRED | 🔴 待接 |
| 初請失業金走勢 | `IC4WSA` FRED | 🔴 待接 |

---

### 板塊 C：通脹與利率

> **核心問題**：通脹是否還在制約美聯儲降息？利率路徑是否已定價？

| 指標 | 代碼 / 來源 | 用途 | 當前狀態 | 優先級 | 備注 |
|---|---|---|---|---|---|
| CPI 同比 | `CPIAUCSL` / FRED via yfinance | 通脹核心指標 | 🔴 未接入 | P1 | 月度，FRED ticker |
| 核心 CPI | `CPILFESL` / FRED | 更穩定的通脹信號 | 🔴 未接入 | P1 | FRED ticker |
| 核心 PCE | `PCEPILFE` / FRED via yfinance | 美聯儲首要參考指標 | 🔴 未接入 | P1 | 月度 |
| 10Y 美債收益率 | `^TNX` / yfinance | 利率定價錨點 | ✅ 可用 | P1 | us10y.value = 4.25% |
| 2Y 美債收益率 | `^IRX` / yfinance | 政策利率預期反映 | ✅ /series/us2y | P1 | — |
| 2Y/10Y 利差 | 計算值 | 曲線形態 / 衰退信號 | ✅ yield_curve.spread | P1 | 0.64bps，曲線轉正 |
| 5Y 盈虧平衡通脹預期 | `T5YIE` / FRED | 市場對通脹路徑預期 | 🔴 未接入 | P2 | FRED ticker |
| 10Y 盈虧平衡通脹預期 | `T10YIE` / FRED | 長端通脹錨定 | 🔴 未接入 | P2 | FRED ticker |
| 聯邦基金期貨（降息預期）| CME FedWatch | 降息路徑定價 | 🔴 未接入 | P2 | 無直接免費 API |
| PPI（生產者物價）| `PPIACO` / FRED | 上游通脹傳導信號 | 🔴 未接入 | Later | — |

> **當前 assessInflationRates 的工作方式**：使用 us10y.value = 4.25% 作唯一直接數據，CPI/PCE 缺失時以名義利率代理判讀，置信度 55-65%。

**歷史圖表（通脹板塊）**：

| 圖表 | Ticker | 狀態 |
|---|---|---|
| 10Y 美債走勢 | `^TNX` | ✅ /series/us10y 已通 |
| CPI 同比走勢 | `CPIAUCSL` FRED | 🔴 待接（P1） |
| 核心 PCE 走勢 | `PCEPILFE` FRED | 🔴 待接（P1） |

---

### 板塊 D：情緒

> **核心問題**：市場在為風險定價保險還是在追逐動量？情緒是否到達拐點？

| 指標 | 代碼 / 來源 | 用途 | 當前狀態 | 優先級 | 備注 |
|---|---|---|---|---|---|
| VIX 隱含波動率 | `^VIX` / yfinance | 恐慌程度 | ✅ 可用 | P1 | vix.value = 17.48 |
| Fear & Greed 指數 | CNN Money | 綜合情緒合成指標 | ✅ 可用 | P1 | value = 29, "Fear" |
| Put/Call 比率 | CBOE 代理 | 期權市場情緒 | ✅ 可用 | P1 | put_call_ratio = 0.852 |
| VXN（納指波動率）| `^VXN` / yfinance | 科技股情緒 | ⚠️ 已有 fetch，未驗證 | P2 | fetch_vxn() 在 sentiment.py |
| GVZ（黃金波動率）| `^GVZ` / yfinance | 避險需求情緒 | ⚠️ 已有 fetch，未驗證 | P2 | fetch_gvz() 在 sentiment.py |
| AAII 牛熊調查 | AAII 官網 | 散戶情緒 | 🔴 未接入 | P2 | 週度，無官方 API |
| 期限結構（VIX term）| VX 期貨 | 短期 vs 長期恐慌 | 🔴 未接入 | Later | 複雜度高 |

**歷史圖表（情緒板塊）**：

| 圖表 | Ticker | 狀態 |
|---|---|---|
| VIX 走勢 | `^VIX` | ✅ /series/vix 已通 |
| Fear & Greed 走勢 | CNN（計算值）| 🔴 無歷史 API |
| S&P 500 走勢（代理）| `^GSPC` | ✅ /series/spx 已通 |

---

## 四、各板塊 v1 最小必要數據集

> 原則：v1 must-have = 缺少這些數據，Macro 頁面的判讀結論無法成立。

### 流動性 v1 最小集

```
必有（已有）：
  us10y = 4.25%
  yield_curve.spread = 0.64bps
  dxy = 98.28

可接受暫缺（顯示「數據待接入」）：
  WALCL / TGA / RRP（FRED 斷線中）
```

### 經濟 v1 最小集

```
必有（當前缺失，需接入）：
  - 初請失業金 IC4WSA（FRED，P1）
  - 失業率 UNRATE（FRED，P1）

暫代（已有，低置信度）：
  - us_indices 廣度代理
```

### 通脹與利率 v1 最小集

```
必有（當前缺失，需接入）：
  - CPI YoY：CPIAUCSL（FRED，P1）
  - 核心 PCE YoY：PCEPILFE（FRED，P1）

已有（保留）：
  - us10y = 4.25%
  - yield_curve.spread = 0.64bps
```

### 情緒 v1 最小集

```
已有，v1 完整：
  - VIX = 17.48
  - fear_greed = 29, "Fear"
  - put_call_ratio = 0.852
```

---

## 五、因果鏈結構（Quant-Brew 宏觀判斷骨架）

```
┌─────────────────────────────────────────────────────┐
│            流動性（資金環境底色）                      │
│  淨流動性（WALCL−TGA−RRP）→ 資金供給總量              │
│  10Y 美債 → 資金成本                                  │
│  DXY → 全球美元供給                                   │
└──────────────┬──────────────────────────────────────┘
               │
               ▼ 影響政策空間
┌─────────────────────────────────────────────────────┐
│           通脹與利率（政策制約因子）                   │
│  CPI / 核心 PCE → 通脹粘性判斷                       │
│  10Y / 2Y / 利差 → 聯儲政策路徑定價                  │
│  → 決定：降息空間是否打開？                            │
└──────────────┬──────────────────────────────────────┘
               │
               ▼ 傳導至
┌─────────────────────────────────────────────────────┐
│               經濟（實體基本面）                       │
│  PMI / 就業（失業率 / 初請）→ 景氣週期位置             │
│  GDP Nowcast → 增速方向                               │
│  → 決定：企業盈利預期是否下修？                        │
└──────────────┬──────────────────────────────────────┘
               │
               ▼ 反映在
┌─────────────────────────────────────────────────────┐
│               情緒（市場定價偏差）                     │
│  VIX / Fear&Greed / Put/Call → 情绪拥挤度             │
│  → 決定：定價是否偏離基本面？是否有逆向機會？           │
└─────────────────────────────────────────────────────┘

最終輸出：
  支撐程度 = f(流動性偏松, 通脹下行, 經濟韌性, 情緒未過熱)
  壓制程度 = f(流動性偏緊, 通脹粘性, 經濟走弱, 情緒恐慌/過熱)
```

**跨維度矛盾處理規則**（已在 `deriveNarrative.ts` 實作）：

| 矛盾組合 | 解讀 |
|---|---|
| 流動性偏緊 + 經濟健康 | 需關注兩者收斂節奏，短期可支撐 |
| 情緒樂觀 + 通脹逆風 | 情緒與基本面分歧，注意均值回歸 |
| 流動性偏松 + 通脹未降 | 聯儲兩難，利率路徑不確定性高 |
| 情緒恐慌 + 流動性偏松 | 反向信號，短期超賣反彈窗口 |

---

## 六、當前 Repo 可復用能力映射

### ✅ 已有，直接可用

| 能力 | 位置 | 狀態 |
|---|---|---|
| us10y.value / change | sentiment.py + normalize.ts | 完全可用 |
| yield_curve.spread | sentiment.py + normalize.ts | 完全可用 |
| dxy.value / change_percent | sentiment.py + normalize.ts | 完全可用 |
| vix.value / change_percent | sentiment.py + normalize.ts | 完全可用 |
| fear_greed.value / label | sentiment.py + normalize.ts | 完全可用 |
| put_call_ratio.value / status | sentiment.py + normalize.ts | 完全可用 |
| 歷史 series API | /api/global-market/series/:key | 已部署（us10y/vix/dxy/spx/us2y/gold） |
| 情緒板塊完整評估 | assess.ts assessSentimentDimension() | 置信度 70%+ |
| 通脹板塊利率代理評估 | assess.ts assessInflationRates() | 可用，缺 CPI/PCE，置信度 55-65% |
| 流動性板塊利率代理評估 | assess.ts assessLiquidity() | 可用，FRED 斷線時代理，置信度 45% |

### ⚠️ 框架已有，數據源斷開

| 能力 | 位置 | 問題 |
|---|---|---|
| WALCL / TGA / RRP | fed_liquidity.py | FRED yfinance 返回空值，需調試 |
| VXN / GVZ | sentiment.py fetch_vxn() fetch_gvz() | 有 fetch，前端 normalize 未承接 |

### 🔴 完全缺失，需新接（P1）

| 能力 | 建議數據源 |
|---|---|
| CPI YoY | FRED `CPIAUCSL` via yfinance |
| 核心 PCE YoY | FRED `PCEPILFE` via yfinance |
| 初請失業金 | FRED `IC4WSA` via yfinance |
| 失業率 | FRED `UNRATE` via yfinance |

### ❌ 先不做

| 能力 | 原因 |
|---|---|
| CME FedWatch 降息概率 | 無穩定免費 API |
| AAII 牛熊調查 | 無官方 API |
| VIX 期限結構 | 需期貨數據，複雜度高 |
| GDP Nowcast | 無結構化 API |

---

## 七、推薦開發順序

### 第一優先：補齊通脹與利率板塊

**理由**：通脹是當前市場最關鍵驅動因子，`assessInflationRates()` 框架已完整，只差真實數據。CPI/PCE 接入後置信度從 55% → 80%+。

**具體步驟**：

1. 在 `global_market.py /series/:metric_key` 白名單新增：
   ```python
   "cpi_yoy":      {"ticker": "CPIAUCSL",  "label": "CPI 同比",  "unit": "%"},
   "pce_core_yoy": {"ticker": "PCEPILFE",  "label": "核心 PCE", "unit": "%"},
   ```
   > 注意：FRED 月度數據在 yfinance 中 `period="1y"` 可能只返回 12 筆，正常。

2. 擴展 `GET /api/global-market/sentiment` 回應，加入 `inflation` 字段：
   ```json
   "inflation": {
     "cpi_yoy": 2.4,
     "pce_core_yoy": 2.6,
     "source": "FRED via yfinance"
   }
   ```

3. 前端 `normalize.ts` 的 `normalizeSentiment()` 承接 `inflation` 字段

4. `assess.ts assessInflationRates()` 補充 CPI/PCE 規則（框架已預設）

### 第二優先：補齊經濟板塊

**理由**：`assessEconomy()` 目前置信度 30%，是四個板塊中最不可靠的。

**具體步驟**：

1. 新端點 `GET /api/global-market/economic-indicators`（或復用 `/series/` 白名單）：
   ```python
   "unemployment":   {"ticker": "UNRATE",  ...},
   "initial_claims": {"ticker": "IC4WSA",  ...},
   "nonfarm_payroll":{"ticker": "PAYEMS",  ...},
   ```

2. 前端新增 `useEconomicIndicators()` hook

3. `assess.ts assessEconomy()` 補充就業規則（`initial_claims`/`unemployment_rate` 框架已定義）

### 第三優先：修復 FRED 連線 (WALCL/TGA/RRP)

1. 嘗試 `period="5d"` 替代 `period="30d"`（FRED 週度數據窗口問題）
2. 備用方案：直接 HTTP 請求 FRED CSV API（不需 API Key）：
   ```
   https://fred.stlouisfed.org/graph/fredgraph.csv?id=WALCL
   ```

### 維持現狀：情緒板塊

情緒板塊 v1 數據全到位，置信度 70%+，暫不需改動。

### 不要現在做的事

| 事項 | 原因 |
|---|---|
| ISM PMI 接入 | 無穩定免費數據源 |
| GDP Nowcast | API 複雜，效益低於就業數據 |
| 消費者信心指數 | 月度，就業數據接入後再考慮 |
| 任何 AI 生成文案 | 數據未對齊前 AI 會放大錯誤 |
| Watchlist / Home BriefingService | 不在本輪範圍 |

---

## 附錄：當前已驗證真實數據值（2026-04-19）

```
流動性：
  us10y         = 4.25%（中性偏高）
  yield_spread  = 0.64bps（曲線剛轉正，倒挂結束）
  dxy           = 98.28（美元走弱）
  fed_liquidity = unavailable（FRED 斷線）

通脹與利率（代理中）：
  CPI YoY   = 未接入（P1 代辦）
  PCE Core  = 未接入（P1 代辦）
  → 目前以 us10y 代理判讀，置信度 55-65%

經濟（代理中）：
  unemployment   = 未接入（P1 代辦）
  initial_claims = 未接入（P1 代辦）
  → 目前以 S&P 500 廣基指數廣度代理，置信度 30-40%

情緒（完整）：
  VIX           = 17.48（中性偏低）
  fear_greed    = 29 / "Fear"（情緒偏悲觀）
  put/call      = 0.852（輕度避險）
```

---

*最後更新：2026-04-19 | 下次審查節點：CPI/PCE 和初請失業金接入後*

STOP — data reference only, no implementation yet.
