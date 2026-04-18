import type { MarketIntelligenceSnapshot } from './types';

const now = new Date();
const dateStr = now.toISOString().slice(0, 10);

export const mockMarketIntelligenceSnapshot: MarketIntelligenceSnapshot = {
  snapshot_id: `mis-${dateStr}-regular-mock`,
  generated_at: now.toISOString(),
  market_session: 'regular',

  /* ── Macro dimensions ── */
  macro: {
    liquidity: {
      status: 'neutral',
      signal: 'risk_supportive',
      change: 'improving',
      confidence: 72,
      summary:
        '联储鸽派纪要确认年内降息路径不变，两年期美债收益率回落至4.68%。金融条件指数小幅松弛，整体流动性由"偏紧"转向"中性偏松"。',
      metrics: [
        {
          key: 'fed_funds_rate',
          label: '联邦基金利率',
          value: 5.33,
          unit: '%',
          change: 0,
          change_unit: 'bps',
          context: '维持不变，市场预期9月降息',
        },
        {
          key: 'us2y',
          label: '2Y 美债',
          value: 4.68,
          unit: '%',
          change: -0.05,
          change_unit: '%',
          context: '近两周持续回落',
        },
        {
          key: 'ig_oas',
          label: '投资级信用利差',
          value: 88,
          unit: 'bps',
          change: -3,
          change_unit: 'bps',
          context: '年内低位附近',
        },
      ],
      why_it_matters: ['流动性是金融市场定价的基石，直接影响资产折现率与风险溢价。'],
      risks: [],
      watchpoints: ['即将公布的央行声明或点阵图预期调整'],
    },

    economy: {
      status: 'healthy',
      signal: 'risk_supportive',
      change: 'stable',
      confidence: 68,
      summary:
        'ISM制造业PMI回升至49.2，接近荣枯线。初请失业金维持在22万低位，劳动力市场韧性未减。GDP Nowcast指儇2.5%增速，软着陆叙事延续。',
      metrics: [
        {
          key: 'ism_pmi',
          label: 'ISM 制造业PMI',
          value: 49.2,
          unit: 'index',
          change: 1.1,
          change_unit: 'pts',
          context: '回升中，接近荣枯线',
        },
        {
          key: 'initial_claims',
          label: '初请失业金',
          value: 222,
          unit: 'K',
          change: -5,
          change_unit: 'K',
          context: '低位稳定，劳动力市场健康',
        },
        {
          key: 'gdp_nowcast',
          label: 'GDP Nowcast',
          value: 2.5,
          unit: '%',
          change: null,
          change_unit: '%',
          context: '软着陆路径基准',
        },
      ],
      why_it_matters: ['宏观经济基本面是企业盈利和资产周期的终极驱动力。', '模拟数据中包含 PMI / 失业金 / GDP Nowcast，实际接入后将替换指数宽度代理。'],
      risks: [],
      watchpoints: ['ISM PMI 读数是否穿破荣枯线 (50)', '初请失业金是否出现非线性上升'],
    },
    inflation_rates: {
      status: 'watch',
      signal: 'mixed',
      change: 'improving',
      confidence: 65,
      summary:
        'CPI同比降至3.4%，核心PCE维持2.8%仍高于联储目标。10Y在4.35%窄幅波动，2s10s利差收窄至-18bps，倒挂程度缓和。通胀降温趋势确认但最后一英里仍需耐心。',
      metrics: [
        {
          key: 'cpi_yoy',
          label: 'CPI YoY',
          value: 3.4,
          unit: '%',
          change: -0.1,
          change_unit: '%',
          context: '持续回落',
        },
        {
          key: 'pce_core_yoy',
          label: '核心PCE YoY',
          value: 2.8,
          unit: '%',
          change: 0,
          change_unit: '%',
          context: '高于2%目标，下行趋势放缓',
        },
        {
          key: 'us10y',
          label: '10Y 美债',
          value: 4.35,
          unit: '%',
          change: -0.03,
          change_unit: '%',
          context: '窄幅震荡',
        },
        {
          key: 'yield_spread_2s10s',
          label: '2s10s 利差',
          value: -18,
          unit: 'bps',
          change: 4,
          change_unit: 'bps',
          context: '倒挂收窄，软着陆信号',
        },
      ],
      why_it_matters: ['通胀路径决定降息节奏，直接影响利率敏感资产的估值。'],
      risks: ['核心PCE 粘性高于预期可能延迟降息节奏。'],
      watchpoints: ['核心 CPI 与 PCE 环比数据是否出现粘性反弹', '大宗商品价格共振上涨信号'],
    },
    sentiment: {
      status: 'neutral',
      signal: 'risk_supportive',
      change: 'stable',
      confidence: 75,
      summary:
        'VIX处于15.2的年内低位区间，恐惧贪婪指数62分处于"贪婪"区域但未极端。Put/Call比率0.82偏低，期权市场乐观。短期获利回吐风险存在但情绪尚未过热。',
      metrics: [
        {
          key: 'vix',
          label: 'VIX',
          value: 15.2,
          unit: 'index',
          change: -0.8,
          change_unit: 'pts',
          context: '年内低位区间',
        },
        {
          key: 'fear_greed',
          label: '恐惧贪婪指数',
          value: 62,
          unit: 'index',
          change: 3,
          change_unit: 'pts',
          context: '贪婪区域，未触极端',
        },
        {
          key: 'put_call_ratio',
          label: 'Put/Call 比率',
          value: 0.82,
          unit: 'ratio',
          change: -0.04,
          change_unit: 'pts',
          context: '偏低，看涨倾向',
        },
      ],
      why_it_matters: ['情绪维度反映了资金的交易拥挤度和风险偏好的瞬时温度。极端情绪往往预示着均值回归。'],
      risks: [],
      watchpoints: ['VIX 期限结构是否倒挂', '高 Beta 板块是否出现放量滞涨'],
    },

    overall_verdict: {
      stance: 'cautious_offensive',
      confidence: 70,
      one_liner: '谨慎乐观，维持多头但不追涨',
      rationale:
        '流动性转松、经济韧性延续、通胀降温趋势不变三大因素支撑风险偏好。但核心PCE粘性和估值高位限制上行空间，适合维持现有多头仓位，新增头寸需等待回调。',
    },
  },

  /* ── Market snapshot ── */
  market_snapshot: {
    timestamp: now.toISOString(),
    session: 'regular',
    indices: [
      { key: 'spx', label: 'S&P 500', value: 5421.03, change: 40.81, change_percent: 0.76, unit: 'pts' },
      { key: 'ndx', label: 'Nasdaq', value: 17032.66, change: 214.58, change_percent: 1.28, unit: 'pts' },
      { key: 'dji', label: 'Dow Jones', value: 39134.76, change: 183.56, change_percent: 0.47, unit: 'pts' },
    ],
    rates: [
      { key: 'us10y', label: '10Y 美债', value: 4.35, change: -0.03, change_percent: -0.68, unit: '%' },
      { key: 'us2y', label: '2Y 美债', value: 4.68, change: -0.05, change_percent: -1.06, unit: '%' },
      { key: 'dxy', label: '美元指数', value: 104.2, change: -0.35, change_percent: -0.34, unit: 'index' },
    ],
    fx: [],
    crypto: [
      { key: 'btc', label: 'Bitcoin', value: 65200, change: 1780, change_percent: 2.80, unit: '$' },
      { key: 'eth', label: 'Ethereum', value: 3420, change: 86, change_percent: 2.58, unit: '$' },
    ],
    commodities: [
      { key: 'gold', label: '黄金', value: 2348.6, change: 12.4, change_percent: 0.53, unit: '$' },
      { key: 'wti', label: 'WTI 原油', value: 82.17, change: 1.43, change_percent: 1.77, unit: '$' },
    ],
  },

  /* ── Key movers ── */
  key_movers: [
    { symbol: 'NVDA', name: '英伟达', market: 'USStock', price: 131.42, change_percent: 3.2, reason: '数据中心业务预期高于共识，半导体板块全线走高', volume_ratio: 1.6 },
    { symbol: 'AAPL', name: '苹果', market: 'USStock', price: 192.35, change_percent: 1.8, reason: 'AI功能发布预期升温，带动市值重新突破3万亿', volume_ratio: 1.2 },
    { symbol: 'TSM', name: '台积电', market: 'USStock', price: 168.50, change_percent: 2.1, reason: 'Q1财报盘前发布在即，AI芯片代工产能成焦点', volume_ratio: 1.4 },
    { symbol: 'BTC-USDT', name: '比特币', market: 'Crypto', price: 65200, change_percent: 2.8, reason: '风险偏好回升，交易所净流出增加暗示持币意愿增强', volume_ratio: null },
  ],

  /* ── Events ── */
  events: [
    { date: dateStr, time: '20:30', event: '美国费城联储制造业指数', impact: 'high', previous: '15.5', forecast: '8.0', actual: null, country: 'US' },
    { date: dateStr, time: '22:00', event: '联储官员讲话 (Waller)', impact: 'medium', previous: null, forecast: null, actual: null, country: 'US' },
    { date: dateStr, time: null, event: '台积电 (TSM) Q1财报', impact: 'high', previous: null, forecast: null, actual: null, country: 'TW' },
    { date: dateStr, time: null, event: 'Netflix (NFLX) 盘后业绩', impact: 'medium', previous: null, forecast: null, actual: null, country: 'US' },
  ],

  /* ── Narrative ── */
  narrative: {
    macro_verdict: '谨慎乐观，维持多头但不追涨',
    headline_summary:
      '隔夜美股收涨，科技权重领跑；联储鸽派纪要推升降息预期，BTC突破六万五。',
    what_changed: [
      '标普500上涨0.76%，纳斯达克涨1.28%，科技板块领涨',
      '联储会议纪要确认年内降息路径，9月降息概率升至72%',
      '比特币突破65,000美元，24小时涨2.8%',
      '10Y美债收益率回落至4.35%，美元指数走弱至104.2',
      'WTI原油升至82美元上方，EIA库存意外大幅下降',
    ],
    what_matters: [
      '流动性改善中——联储鸽派信号明确，两年期收益率持续回落，金融条件指数松弛',
      '通胀最后一英里仍需关注——核心PCE 2.8%高于目标，利差收窄但仍倒挂',
      '情绪偏乐观但未极端——VIX年内低位，恐惧贪婪62分，追涨需谨慎',
    ],
    what_to_watch: [
      '今日20:30 费城联储制造业指数（前值15.5，预期8.0）',
      '台积电Q1财报——AI芯片代工产能指引是关键',
      'Netflix盘后业绩——订阅用户增长能否延续',
      '联储官员Waller讲话——降息节奏预期管理',
    ],
    dimension_summaries: {
      liquidity:
        '联储鸽派纪要确认年内降息路径不变，两年期美债收益率回落至4.68%。金融条件指数小幅松弛，整体流动性由"偏紧"转向"中性偏松"。',
      economy:
        'ISM制造业PMI回升至49.2，接近荣枯线。初请失业金维持在22万低位，劳动力市场韧性未减。GDP Nowcast指向2.5%增速，软着陆叙事延续。',
      inflation_rates:
        'CPI同比降至3.4%，核心PCE维持2.8%仍高于联储目标。10Y在4.35%窄幅波动，2s10s利差收窄至-18bps，倒挂程度缓和。通胀降温趋势确认但最后一英里仍需耐心。',
      sentiment:
        'VIX处于15.2的年内低位区间，恐惧贪婪指数62分处于"贪婪"区域但未极端。Put/Call比率0.82偏低，期权市场乐观。短期获利回吐风险存在但情绪尚未过热。',
    },
  },
};
