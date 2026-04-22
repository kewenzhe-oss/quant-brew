import { useSentiment } from '@/shared/hooks/useSentiment';
import styles from '../../../components/Components.module.css';

export function UsLiquidityExplanation() {
  const { data: sentiment } = useSentiment();

  const netLiq = sentiment?.fed_liquidity?.net_liquidity;
  const tga = sentiment?.fed_liquidity?.tga;
  const dxy = sentiment?.dxy?.value;

  let stateText = "数据正在加载，请稍候...";
  let trendText = "数据正在加载，请稍候...";
  let marketText = "数据正在加载，请稍候...";

  if (netLiq !== undefined && netLiq !== null) {
    stateText = `当前美国净流动性约为 $${netLiq}B。财政部TGA账户余额 $${tga}B。${dxy ? '美元指数报 ' + dxy + '。' : ''}`;
    trendText = netLiq > 5500 ? "净流动性当前处于较高水位，这意味着资金面相对充裕。" : "净流动性扩张动能边际放缓。核心依赖于 TGA 余量消耗和 RRP 的流动性转移。";
    marketText = netLiq > 5500 ? "宽裕的流动性对抗跌的风险资产（如美股和加密货币）形成下行支撑力。" : "若叠加美元指数走强，可能对高估值科技股和加密市场带来一定挤压。";
  }

  return (
    <div className={styles.aiStructure}>
      <p><strong>当前发生了什么 (Current State):</strong> {stateText}</p>
      <p><strong>趋势如何演变 (Trend Evolution):</strong> {trendText}</p>
      <p><strong>这对市场意味着什么 (Market Implication):</strong> {marketText}</p>
    </div>
  );
}
