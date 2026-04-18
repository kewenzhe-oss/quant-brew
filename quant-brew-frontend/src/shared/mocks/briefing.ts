import type { Briefing } from '@/shared/api/types';

export const mockBriefingArchive: Briefing[] = [
  {
    id: 0,
    type: 'evening',
    date: (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })(),
    title: '晚报',
    headline_summary: '科技板块尾盘回落，纳指收窄涨幅至+0.3%，市场静候联储纪要。',
    sections: [],
    generated_at: new Date().toISOString(),
  },
  {
    id: -1,
    type: 'morning',
    date: (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })(),
    title: '早报',
    headline_summary: '亚太走强带动欧股高开，美期货小幅上扬，原油库存数据成焦点。',
    sections: [],
    generated_at: new Date().toISOString(),
  },
  {
    id: -2,
    type: 'evening',
    date: (() => { const d = new Date(); d.setDate(d.getDate() - 2); return d.toISOString().slice(0, 10); })(),
    title: '晚报',
    headline_summary: '半导体ETF创周内新高，英伟达财报超预期，AI算力主线持续发酵。',
    sections: [],
    generated_at: new Date().toISOString(),
  },
];

export const mockBriefing: Briefing = {
  id: 1,
  type: 'morning',
  date: new Date().toISOString().slice(0, 10),
  title: '早报',
  headline_summary: '隔夜美股收涨，科技权重领跑；联储鸽派纪要推升降息预期，BTC 突破六万五。',
  generated_at: new Date().toISOString(),
  sections: [
    {
      headline: '隔夜美股收涨，科技权重领跑',
      body: '美东时间周四，三大指数集体收涨。标普500指数上涨0.74%，纳斯达克综合指数上涨1.26%，道琼斯工业平均指数上涨0.47%。科技板块表现强劲，英伟达（NVDA）上涨3.2%，苹果（AAPL）上涨1.8%。市场情绪受到两大因素驱动：一是前夜美联储会议纪要偏鸽，确认年内降息仍在预期之内；二是英伟达盘后发布的数据中心业务预期高于市场共识，带动半导体板块全线走高。',
      mentioned_symbols: [
        { market: 'USStock', symbol: 'NVDA', name: '英伟达' },
        { market: 'USStock', symbol: 'AAPL', name: '苹果' },
      ],
    },
    {
      headline: '美联储信号解读：鸽派基调延续',
      body: '联储会议纪要显示，多数委员认为当前利率水平"已经足够限制性"，在通胀持续回落的情况下可考虑逐步放松政策。市场对此解读偏正面，联邦基金期货显示9月降息概率升至72%。值得注意的是，两年期美债收益率回落至4.68%，与十年期利差进一步收窄至-18bps，倒挂程度有所缓和。美元指数（DXY）小幅走弱至104.2。',
    },
    {
      headline: '加密市场跟涨，BTC 突破六万五',
      body: '受风险偏好回升影响，比特币突破65,000美元关口，24小时涨幅2.8%。以太坊同步上行，报3,420美元。链上数据显示交易所净流出增加，暗示持币意愿增强。不过，衍生品市场资金费率已处于较高水平，短期追涨需谨慎。Coinbase 溢价率回归正值，美国买盘有所回暖。',
      mentioned_symbols: [
        { market: 'Crypto', symbol: 'BTC-USDT', name: '比特币' },
        { market: 'Crypto', symbol: 'ETH-USDT', name: '以太坊' },
      ],
    },
    {
      headline: '今日关注',
      body: '今日重点关注美国4月费城联储制造业指数（20:30），以及多位联储官员讲话。财报方面，台积电（TSM）将于今日盘前发布Q1财报，市场密切关注AI芯片代工产能指引。此外，Netflix（NFLX）盘后公布业绩，关注订阅用户增长是否延续上季势头。宏观层面，留意原油价格波动——EIA库存意外大幅下降，WTI原油已升至82美元上方。',
      mentioned_symbols: [
        { market: 'USStock', symbol: 'TSM', name: '台积电' },
        { market: 'USStock', symbol: 'NFLX', name: 'Netflix' },
      ],
    },
  ],
};
