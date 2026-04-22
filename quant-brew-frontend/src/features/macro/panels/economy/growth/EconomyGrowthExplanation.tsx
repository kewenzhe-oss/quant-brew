import styles from '../../../PanelDetailPage.module.css';

export function EconomyGrowthExplanation() {

  // We are safely rendering static proxy warnings here, per user constraint
  return (
    <div className={styles.aiStructure}>
      <p>
        <strong>当前发生了什么 (Current State):</strong> 经济扩张动能信号杂音较高。
        其中，消费者信心 (Consumer Confidence) 因核心数据源限制，正使用 UMich (密歇根大学消费者信心指数) 进行测算替代；并使用 Philly Fed (费城联储领先指标) 作为 LEI (领先经济指数) 的观测推演代理。
      </p>
      <p>
        <strong>趋势如何演变 (Trend Evolution):</strong> 根据代理前缀模型的捕捉，企业端固定产出与居民消费意愿呈现出特定的分化走势。当前图表库已开始调拨 UMich 及 Philly Fed 真实截面历史对齐校验。
      </p>
      <p>
        <strong>这对市场意味着什么 (Market Implication):</strong> 需要高度关注代理数据是否出现断崖式失速，这将直接推升模型底部配置的『衰退概率』，引发跨资产避险潮。
      </p>
    </div>
  );
}
