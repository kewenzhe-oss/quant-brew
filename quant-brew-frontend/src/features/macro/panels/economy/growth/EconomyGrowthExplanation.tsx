import styles from '../../../PanelDetailPage.module.css';

export function EconomyGrowthExplanation() {

  return (
    <>
      <div className={styles.aiContainer}>
        <div className={styles.aiBlock}>
          <h3>What's Happening</h3>
          <p>
            经济扩张动能信号杂音较高。当前消费者信心复苏低于预期 (UMich 代理观测)，而前瞻景气度指数量价齐跌 (Philly Fed 代理验证)，表明终端需求对高利率的耐受度正在逼近极限。
          </p>
        </div>
        
        <div className={styles.aiBlock}>
          <h3>Trend Evolution</h3>
          <p>
            根据代理前缀模型的捕捉，企业端固定产出与居民消费意愿呈现出特定的分化走势。服务业虽仍是定海神针，但工业底盘的同比失速已经成为无法忽视的拖累项。
          </p>
        </div>
        
        <div className={styles.aiBlock}>
          <h3>Market Implication</h3>
          <p>
            需高度警惕宏观周期向「衰退象限」的无序滑落。一旦服务业 PMI 跌破荣枯线，叠加领先指标的断崖式失速，将触发跨资产类别的避险平仓潮。
          </p>
        </div>
      </div>

      <div className={styles.riskWatch}>
        <div className={styles.riskTitle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          Zone 5: Risk Watch
        </div>
        <ul className={styles.riskList}>
          <li>关注下周密歇根大学消费者情绪指数定案，若跌破荣枯支撑将验证需求端衰退。</li>
          <li>紧盯 ISM 制造业新订单分项，衡量企业资本开支的收缩坡度。</li>
        </ul>
      </div>
    </>
  );
}
