import { PageLayout } from '@/app/layouts/PageLayout';
import { MacroJudgment } from './MacroJudgment';
import { MacroNarrative } from './MacroNarrative';
import { IndexGrid } from './IndexGrid';
import { SentimentDashboard } from './SentimentDashboard';
import { CommoditiesStrip } from './CommoditiesStrip';
import { EconomicCalendar } from './EconomicCalendar';
import { MacroContextPanel } from './MacroContextPanel';
import styles from './MacroPage.module.css';

export function MacroPage() {
  return (
    <PageLayout
      main={<MacroMainContent />}
      context={<MacroContextPanel />}
    />
  );
}

function MacroMainContent() {
  return (
    <div className={styles.macroLayout}>
      {/* 核心 Judgment 视窗 */}
      <MacroJudgment />

      {/* Legacy 模块折叠保留，满足 "validation-oriented" 而非删除条件 */}
      <details className={styles.legacyToggle}>
        <summary>原始市场数据视角 (Raw Data Validation)</summary>
        <MacroNarrative />
        <IndexGrid />
        <SentimentDashboard />
        <CommoditiesStrip />
        <EconomicCalendar />
      </details>
    </div>
  );
}
