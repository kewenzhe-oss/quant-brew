import type { SymbolSearchResult } from '@/shared/api/types';

export interface SectorGroup {
  id: string;
  name: string;
  description: string;
  tickers: SymbolSearchResult[];
}

export const sectorGroups: SectorGroup[] = [
  {
    id: 'mag7',
    name: 'MAG 7 科技巨头',
    description: '占 S&P 500 近 30% 权重，美股风向标',
    tickers: [
      { market: 'USStock', symbol: 'AAPL', name: 'Apple' },
      { market: 'USStock', symbol: 'MSFT', name: 'Microsoft' },
      { market: 'USStock', symbol: 'NVDA', name: 'NVIDIA' },
      { market: 'USStock', symbol: 'GOOGL', name: 'Alphabet' },
      { market: 'USStock', symbol: 'AMZN', name: 'Amazon' },
      { market: 'USStock', symbol: 'META', name: 'Meta' },
      { market: 'USStock', symbol: 'TSLA', name: 'Tesla' },
    ],
  },
  {
    id: 'ai-infra',
    name: 'AI 芯片 & 基础设施',
    description: '追踪 AI CapEx 周期的温度计',
    tickers: [
      { market: 'USStock', symbol: 'NVDA', name: 'NVIDIA' },
      { market: 'USStock', symbol: 'AMD', name: 'AMD' },
      { market: 'USStock', symbol: 'TSM', name: '台积电' },
      { market: 'USStock', symbol: 'AVGO', name: 'Broadcom' },
      { market: 'USStock', symbol: 'MRVL', name: 'Marvell' },
    ],
  },
  {
    id: 'china-core',
    name: '中概核心',
    description: '中国经济预期 + 地缘政治风险溢价',
    tickers: [
      { market: 'USStock', symbol: 'BABA', name: '阿里巴巴' },
      { market: 'USStock', symbol: 'PDD', name: '拼多多' },
      { market: 'USStock', symbol: 'JD', name: '京东' },
      { market: 'USStock', symbol: 'BIDU', name: '百度' },
      { market: 'USStock', symbol: 'NIO', name: '蔚来' },
    ],
  },
  {
    id: 'crypto-core',
    name: '加密核心',
    description: '追踪链上资金与宏观风险偏好联动',
    tickers: [
      { market: 'Crypto', symbol: 'BTC/USDT', name: 'Bitcoin' },
      { market: 'Crypto', symbol: 'ETH/USDT', name: 'Ethereum' },
      { market: 'Crypto', symbol: 'SOL/USDT', name: 'Solana' },
    ],
  },
];
