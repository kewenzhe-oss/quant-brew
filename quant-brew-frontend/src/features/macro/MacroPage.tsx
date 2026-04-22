import { PageLayout } from '@/app/layouts/PageLayout';
import { MacroDecisionEngine } from './MacroDecisionEngine';
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
      {/* 核心决策与推演引擎，收拢唯一的首页入口 */}
      <MacroDecisionEngine />
    </div>
  );
}
