# Macro Intelligence: Information Architecture & Data Matrix (Revised)

## Step 1: 宏观首页 Information Architecture (IA)

**设计原则**：首页是判断层，不是数据仓库。用户在此处只需获取最终结论，而非枯燥的数字罗列。

### A. 页面状态与元数据 (System State)
- **data_completeness**: 宏观数据收集完成度百分比 (例如：95%)。
- **confidence_level**: 当前结论的置信度 (高/中/低，受缺失数据影响)。
- **generated_at**: 宏观状态快照最后生成时间 (ISO时间格式)。
- **stale_data_warning**: 若快照过期，显示醒目警告。
- **missing_dimensions**: 列出收集失败或不可用的数据维度模块。

### B. 当前宏观定调 Hero (Macro Regime / Stance)
- **结论展示**：当前环境属于“进攻 (Risk-On)”、“观望 (Neutral)”还是“防守 (Risk-Off)”？
- **核心文案**：一句高度概括当前市场主线的总结。

### C. 四大维度状态卡 (Dimension Scorecards)
- **流动性 (Liquidity)**：扩张 / 收缩 / 枯竭？
- **经济 (Economy)**：扩张 / 放缓 / 衰退？
- **通胀与利率 (Inflation & Rates)**：降温 / 黏性 / 恶化？
- **市场情绪 (Sentiment)**：极度贪婪 / 中性 / 恐慌？
- *(每个卡片提供点击进入详细分页的入口)*

### D. 核心驱动因素 (Key Drivers)
- **支持风险资产 (Tailwinds)**：列出当前有利于估值扩张的宏观数据点。
- **压制风险资产 (Headwinds)**：列出当前压制估值的负面因素。

### E. 近期异动与前瞻 (Dynamic Insights)
- **What Changed (近期变化)**：过去一段时间引发逻辑转变的宏观事件或数据。
- **What To Watch (接下来看什么)**：即将公布的最关键宏观数据及观察阈值。

---

## Step 2: 四个详细分页统一结构

每个详细分页必须严格遵守以下结构：

1. **当前状态 (Current Status)**：该维度的总体定性评估。
2. **核心结论 (Core Conclusion)**：一句话总结该维度对大盘的影响。
3. **数据质量提示 (Data Quality Banner)**：如有数据源缺失或过期，提示警告及 fallback 状态。
4. **核心指标组 (Key Metrics Grid)**：每个指标必须包含以下卡片/模块：
   - 当前值含义 (Current Value Meaning)
   - 上升/下降解释 (Rising/Falling Means)
   - 对风险资产影响 (Risk Asset Impact)
   - 数据来源 (Data Source & Ticker)
   - 更新时间 (Last Updated)
   - Fallback empty state
5. **图表区域 (Chart Area)**：主副指标对比或趋势图 (带有 empty state fallback)。

---

## Step 3: Data Matrix & Chart Priority

### A. 流动性 (Liquidity)

| Field | US Net Liquidity | Fed Balance Sheet | TGA Balance | RRP Balance | Bank Reserves | NFCI |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **metric_id** | `liq_net_us` | `liq_walcl` | `liq_tga` | `liq_rrp` | `liq_reserves` | `liq_nfci` |
| **display_name** | US Net Liquidity | Fed Balance Sheet | TGA Balance | RRP Balance | Bank Reserves | NFCI |
| **dimension** | Liquidity | Liquidity | Liquidity | Liquidity | Liquidity | Liquidity |
| **product_question** | 美联储是否在实质性“印钞”？ | 美联储总盘子在扩张吗？ | 财政部在吸血还是放水？ | 闲置资金是否回流市场？ | 银行有钱支撑金融系统吗？ | 金融条件紧缩还是宽松？ |
| **current_value_meaning** | 市场中真正可用的美元总量 | 央行资产负债表规模 | 美财政部在央行的支票账户余额 | 停泊在美联储的闲置机构资金 | 商业银行存放在美联储的准备金 | 衡量借贷成本、风险和杠杆的综合指数 |
| **threshold_or_regime** | 相比上周增减量 | 扩表/缩表阶段 | >1T: 高吸血, <500B: 宽松 | >2T: 资金闲置, <500B: 资金枯竭 | <储备底线(约3T): 流动性危机 | >0: 紧缩, <0: 宽松 |
| **rising_means** | 流动性增加 | QE/扩表，投放基础货币 | 财政部吸走资金 | 资金闲置不投入市场 | 银行流动性充裕 | 金融条件收紧，借钱难 |
| **falling_means** | 流动性减少 | QT/缩表，回收基础货币 | 财政部花钱，释放流动性 | 资金从RRP流出，可能买债/股 | 准备金告急，流动性紧张 | 金融条件宽松，借钱易 |
| **normal_risk_asset_impact**| Positive | Positive | Negative | Negative | Positive | Negative |
| **extreme_risk_asset_impact**| Strong Positive | Strong Positive | Strong Negative | Negative | Strong Negative (if too low) | Strong Negative (if >0) |
| **context_dependency** | 需看标普500背离情况 | 危机时扩表未必马上看涨 | 需关注发债计划(QRA) | 受短期美债收益率影响 | QT阶段最核心的观察指标 | 危机爆发时NFCI会飙升 |
| **recommended_source** | FRED (Calculated) | FRED | FRED | FRED | FRED | FRED |
| **source_series_or_ticker**| `WALCL - WDTGAL - RRPONTSYD` | `WALCL` | `WDTGAL` | `RRPONTSYD` | `WRESBAL` | `NFCI` |
| **fallback_source** | None | None | None | None | None | None |
| **free_or_paid** | Free | Free | Free | Free | Free | Free |
| **update_frequency** | Weekly | Weekly | Weekly | Daily | Weekly | Weekly |
| **update_lag** | 1 Week | 1 Week | 1 Week | 1 Day | 1 Week | 1 Week |
| **transform_required** | `US Net Liquidity = normalized(WALCL, USD billions) - normalized(WDTGAL, USD billions) - normalized(RRPONTSYD, USD billions)` | - fetch raw value<br>- confirm source unit from metadata or sanity check<br>- normalize to USD billions<br>- align frequency/date<br>- output canonical_value | - fetch raw value<br>- confirm source unit from metadata or sanity check<br>- normalize to USD billions<br>- align frequency/date<br>- output canonical_value | - fetch raw value<br>- confirm source unit from metadata or sanity check<br>- normalize to USD billions<br>- align frequency/date<br>- output canonical_value | - fetch raw value<br>- confirm source unit from metadata or sanity check<br>- normalize to USD billions<br>- align frequency/date<br>- output canonical_value | - fetch raw value<br>- confirm index unit<br>- output canonical_value |
| **unit_normalization** | Yes | Yes | Yes | Yes | Yes | None |
| **canonical_unit** | Billions (USD) | Billions (USD) | Billions (USD) | Billions (USD) | Billions (USD) | Index Value |
| **access_difficulty** | Easy | Easy | Easy | Easy | Easy | Easy |
| **current_project_status**| existing | existing | existing | existing | missing | existing |
| **data_quality_risks** | 时效滞后 | 无 | 无 | 无 | 无 | 滞后性，修正值 |
| **fallback_plan** | 显示上一期可用数据 | 显示上一期数据 | 显示上一期数据 | 显示上一期数据 | 显示上一期数据 | 显示上一期数据 |
| **chart_needed** | Yes | Yes | Yes | Yes | Yes | Yes |
| **chart_priority** | **P0** | **P0** | **P0** | **P0** | **P0** | **P0** |

### B. 经济基本面 (Economy)

| Field | GDP Growth | ISM Mfg PMI | Unemployment Rate | Initial Claims |
| :--- | :--- | :--- | :--- | :--- |
| **metric_id** | `eco_gdp` | `eco_pmi_mfg` | `eco_unemp` | `eco_claims` |
| **display_name** | GDP Growth | ISM Mfg PMI | Unemployment Rate | Initial Jobless Claims |
| **dimension** | Economy | Economy | Economy | Economy |
| **product_question** | 经济盘子在增长吗？ | 制造业经理人觉得生意好做吗？ | 找工作变难了吗？ | 每周突然失业的人多吗？ |
| **current_value_meaning** | 经济总产出增速 | 制造业扩张/收缩扩散指数 | 劳动人口中失业者比例 | 首次申请失业救济人数 |
| **threshold_or_regime** | >2%: 稳健, <0: 衰退 | >50: 扩张, <50: 收缩 | >4.5%或触发萨姆规则: 衰退 | >300K: 劳动力市场疲软 |
| **rising_means** | 经济强劲 | 制造业景气度好转 | 就业市场恶化 | 裁员潮开启 |
| **falling_means** | 经济放缓 | 制造业陷入收缩 | 就业市场火热 | 企业不愿裁员 |
| **normal_risk_asset_impact**| Positive | Positive | Negative | Negative |
| **extreme_risk_asset_impact**| Neutral (If causes rates up) | Positive | Strong Negative | Strong Negative |
| **context_dependency** | 滞后指标，看Nowcast更好 | 前瞻指标，权重高 | 触发萨姆规则时杀伤力极大 | 高频指标，周度前瞻 |
| **recommended_source** | FRED | FRED / Econoday | FRED | FRED |
| **source_series_or_ticker**| `GDPC1` / `GDP` | `ISM/MAN_PMI` (Check) | `UNRATE` | `ICSA` |
| **fallback_source** | None | TradingEconomics | None | None |
| **free_or_paid** | Free | Med (Hard via FRED) | Free | Free |
| **update_frequency** | Quarterly | Monthly | Monthly | Weekly |
| **update_lag** | 1-2 Months | Few days | 1 Week | 1 Week |
| **transform_required** | - fetch raw value<br>- transform YoY/QoQ %<br>- output canonical_value | - fetch raw value<br>- output canonical_value | - fetch raw value<br>- output canonical_value | - fetch raw value<br>- output canonical_value |
| **unit_normalization** | Yes (% format) | None | Yes (% format) | Convert to Thousands (K) |
| **canonical_unit** | Percent (%) | Index | Percent (%) | Thousands (K) |
| **access_difficulty** | Easy | Hard | Easy | Easy |
| **current_project_status**| missing | missing | missing | missing |
| **data_quality_risks** | 数据常被大幅修正 | 免费API难获取实时数据 | 月更，滞后性强 | 周度波动大 |
| **fallback_plan** | Atlanta Fed Nowcast | None | None | 四周移动平均线 |
| **chart_needed** | No | Yes | Yes | Yes |
| **chart_priority** | P2 | P1 | P1 | P1 |

### C. 通胀与利率 (Inflation & Rates)

| Field | CPI / Core CPI | PCE / Core PCE | US 10Y Treasury | US 2Y Treasury | Yield Curve (10Y-2Y) | DXY |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **metric_id** | `inf_cpi` / `inf_core_cpi` | `inf_pce` / `inf_core_pce` | `inf_us10y` | `inf_us2y` | `inf_yc_10_2` | `inf_dxy` |
| **display_name** | CPI / Core CPI (YoY) | PCE / Core PCE (YoY)| US 10Y Treasury | US 2Y Treasury | Yield Curve (10Y-2Y) | US Dollar Index (DXY) |
| **dimension** | Inflation & Rates | Inflation & Rates | Inflation & Rates | Inflation & Rates | Inflation & Rates | Inflation & Rates |
| **product_question** | 物价涨幅是否失控？ | 美联储最看重的通胀达标了吗？ | 全球无风险资产收益率是多少？ | 市场对美联储近期政策的预期？ | 收益率曲线是否倒挂？ | 全球流动性反向指标在走强吗？ |
| **current_value_meaning** | 消费者物价同比涨幅 | 个人消费支出物价同比涨幅 | 长期资金成本锚定 | 短期利率预期锚定 | 长短期利差，衰退前瞻指标 | 美元相对其他货币的相对强度 |
| **threshold_or_regime** | >3%: 粘性, <2%: 达标 | >2.5%: 粘性, <=2%: 达标 | >4.5%: 杀估值区域 | >5%: 极端紧缩预期 | <0: 倒挂(衰退警报) | >105: 紧缩, <100: 宽松 |
| **rising_means** | 通胀恶化，加息预期起 | 通胀顽固，降息受阻 | 无风险利率升，压制估值 | 预期近期加息或更久高息 | 曲线走陡，可能结束倒挂 | 资金回流美国，抽离全球流动性 |
| **falling_means** | 通胀降温，降息预期起 | 逼近2%目标，鸽派空间大 | 无风险利率降，提振估值 | 预期近期降息 | 曲线倒挂加深，远期悲观 | 美元走弱，全球流动性充裕释放 |
| **normal_risk_asset_impact**| Negative | Negative | Negative | Negative | Complex | Negative |
| **extreme_risk_asset_impact**| Strong Negative (if surging)| Strong Negative | Strong Negative | Strong Negative | Strong Negative (Bull steepening)| Strong Negative |
| **context_dependency** | 结合非农和时薪看 | Fed最看重，决定点阵图 | 科技股受此影响最大 | 对政策最敏感 | 解除倒挂时往往是暴跌开始 | DXY强=跨国企业盈利承压 |
| **recommended_source** | FRED | FRED | FRED | FRED | FRED | yfinance |
| **source_series_or_ticker**| `CPIAUCSL` / `CPILFESL` | `PCEPI` / `PCEPILFE` | `DGS10` | `DGS2` | `T10Y2Y` | `DX-Y.NYB` |
| **fallback_source** | None | None | yfinance `^TNX` | true 2Y treasury ticker/API if available, otherwise missing. **DO NOT** use 13-week bill proxy (`^IRX`). | Calculated: `DGS10 - DGS2` | `UUP` (ETF) |
| **free_or_paid** | Free | Free | Free | Free | Free | Free |
| **update_frequency** | Monthly | Monthly | Daily | Daily | Daily | Daily (Intraday) |
| **update_lag** | ~10 days post month | ~30 days post month | 1 Day | 1 Day | 1 Day | Real-time |
| **transform_required** | - fetch raw value<br>- confirm index base<br>- calc YoY `(Current/LastYear - 1)*100`<br>- output canonical_value | - fetch raw value<br>- confirm index base<br>- calc YoY `(Current/LastYear - 1)*100`<br>- output canonical_value | - fetch raw value<br>- output canonical_value | - fetch raw value<br>- output canonical_value | - fetch raw value<br>- handle nulls<br>- output canonical_value | - fetch raw value<br>- output canonical_value |
| **unit_normalization** | Percent (%) | Percent (%) | Percent (%) | Percent (%) | Basis Points / Percent | Index Value |
| **canonical_unit** | % | % | % | % | % | Index |
| **access_difficulty** | Easy | Easy | Easy | Easy | Easy | Easy |
| **current_project_status**| missing | missing | existing | existing | existing | existing |
| **data_quality_risks** | 注意季调基数效应 | 同上 | 节假日休市无数据 | 同上 | 同上 | API偶尔限流 |
| **fallback_plan** | 显示上月 | 显示上月 | YF兜底 | Missing (Empty State) | 前置计算 | `fallback_usage: trend-only proxy, do not display UUP price as DXY value.` |
| **chart_needed** | Yes | Yes | Yes | Yes | Yes | Yes |
| **chart_priority** | P1 | P1 | **P0** | P1 | P1 | **P0** |

### D. 市场情绪 (Sentiment)

| Field | VIX | Fear & Greed Index | Put/Call Ratio | AAII Sentiment | Credit Spread |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **metric_id** | `sen_vix` | `sen_fgi` | `sen_put_call` | `sen_aaii` | `sen_credit` |
| **display_name** | VIX (Volatility Index) | Fear & Greed Index | Put/Call Ratio | AAII Sentiment | High Yield Credit Spread |
| **dimension** | Sentiment | Sentiment | Sentiment | Sentiment | Sentiment |
| **product_question** | 机构在恐慌避险吗？ | 市场情绪极度贪婪还是恐惧？ | 押注下跌的人多还是上涨的多？ | 散户投资者看好未来半年吗？ | 企业违约风险溢价高吗？ |
| **current_value_meaning** | 标普500期权隐含的未来30天波动率预期 | 结合多维度情绪的综合打分指数 | 整体看跌期权成交量与看涨期权成交量之比 | 散户净看多比例 (Bullish - Bearish) | 高收益(垃圾)债与无风险国债的收益率差值 |
| **threshold_or_regime** | >30: 极度恐慌, <15: 平静 | >75: 极度贪婪, <25: 极度恐惧 | >1.0: 极度看空, <0.7: 极度看多 | 极端看涨(Bullish>50%) / 极端看跌 | >5.0%: 信用风险爆发, <3.5%: 信用宽松 |
| **rising_means** | 市场恐慌加剧，抛售压力大 | 市场趋于狂热，可能见顶 | 看空情绪浓厚，可能酝酿反弹 | 散户看涨情绪高昂 | 企业违约风险上升，流动性趋紧 |
| **falling_means** | 市场趋于平静，慢牛或温和震荡 | 市场趋于恐慌，可能被错杀见底 | 看多情绪沸腾，可能酝酿回调 | 散户看跌情绪高昂 | 信用环境宽松，企业容易低息借钱 |
| **normal_risk_asset_impact**| Negative | Positive (Trend) / Negative (Extreme)| Contrarian (反指) | Contrarian (反指) | Negative |
| **extreme_risk_asset_impact**| Positive (Contrarian bottom signal)| Strong Negative (Sell signal) | Strong Positive (Buy signal) | Strong Negative (Sell signal) | Strong Negative (Liquidity crisis) |
| **context_dependency** | 极高VIX通常是阶段性底部 | 需结合技术面背离使用 | 单日数据噪音大，需看移动平均 | 著名的反向指标 | 金融危机时飙升最快 |
| **recommended_source** | yfinance | CNN (via Scraping or API) | CBOE / yfinance | AAII (Scraping or Paid API) | FRED |
| **source_series_or_ticker**| `^VIX` | `FGI_API` | `PCR` | `AAII_BULL_BEAR` | `BAMLH0A0HYM2` |
| **fallback_source** | CBOE VIX API | None | None | NAIM Exposure Index | None |
| **free_or_paid** | Free | Hard/Paid | Med | Hard/Paid | Free |
| **update_frequency** | Intraday | Daily | Daily | Weekly | Daily |
| **update_lag** | Real-time | 1 Day | 1 Day | 1 Week | 1 Day |
| **transform_required** | - fetch raw value<br>- output canonical_value | - fetch raw value<br>- output canonical_value | - fetch raw value<br>- calculate moving average if needed<br>- output canonical_value | - fetch raw values<br>- calc Net Bullish (Bull - Bear)<br>- output canonical_value | - fetch raw value<br>- output canonical_value |
| **unit_normalization** | Index / Volatility % | Index (0-100) | Ratio | Percent (%) | Percent (%) |
| **canonical_unit** | Index | Index | Ratio | % | % |
| **access_difficulty** | Easy | Hard | Medium | Hard | Easy |
| **current_project_status**| existing | partial | partial | missing | missing |
| **data_quality_risks** | 节假日数据可能平滑 | 无官方API，极易断供 | 偶尔数据延迟 | 抓取可能面临防爬虫机制 | 无 |
| **fallback_plan** | 显示上一期 | 隐藏该组件 | 隐藏该组件 | 隐藏该组件 | 显示上一期 |
| **chart_needed** | Yes | No | No | No | No |
| **chart_priority** | **P0** | P2 | P2 | P2 | P2 |

---

## Step 4: P0 数据契约准备 (Validation Checklist & Schema)

在进入任何图表开发或后端 pipeline 调整之前，必须确保所有 P0 级指标的数据流水线满足以下契约（Data Contract），并输出验证报告。

### P0 Runtime Validation Report Schema
后续需要运行的验证脚本，对于每个 P0 指标，必须输出以下结构的 JSON 对象以证明数据有效性：

```json
{
  "metric_id": "string",
  "source": "string",
  "fetch_success": "boolean",
  "latest_date": "YYYY-MM-DD",
  "latest_raw_value": "float",
  "raw_unit": "string",
  "transform_applied": "string",
  "canonical_value": "float",
  "canonical_unit": "string",
  "previous_value": "float",
  "change_1w": "float",
  "change_1m": "float",
  "history_points": "integer",
  "minimum_history_required": "integer",
  "minimum_history_passed": "boolean",
  "chart_series_shape_valid": "boolean",
  "warnings": ["string"],
  "blocking_errors": ["string"]
}
```

### P0 Metrics Target List (Data Contract Requirements)

1. **US Net Liquidity (`liq_net_us`)**
   - **Expected Canonical Unit**: Billions (USD)
   - **History**: 3 Years Weekly

2. **Fed Balance Sheet (`liq_walcl`)**
   - **Expected Canonical Unit**: Billions (USD)
   - **History**: 3 Years Weekly

3. **TGA Balance (`liq_tga`)**
   - **Expected Canonical Unit**: Billions (USD)
   - **History**: 3 Years Weekly

4. **RRP Balance (`liq_rrp`)**
   - **Expected Canonical Unit**: Billions (USD)
   - **History**: 3 Years Daily

5. **Bank Reserves (`liq_reserves`)**
   - **Expected Canonical Unit**: Billions (USD)
   - **History**: 3 Years Weekly

6. **NFCI (`liq_nfci`)**
   - **Expected Canonical Unit**: Index Value
   - **History**: 3 Years Weekly

7. **VIX (`sen_vix`)**
   - **Expected Canonical Unit**: Index
   - **History**: 1 Year Daily

8. **US Dollar Index (`inf_dxy`)**
   - **Expected Canonical Unit**: Index
   - **History**: 1 Year Daily

9. **US 10Y Treasury (`inf_us10y`)**
   - **Expected Canonical Unit**: Percent (%)
   - **History**: 1 Year Daily

---

### Next Gate: P0 Runtime Data Validation
Only after all P0 metrics pass validation can chart integration begin.
