import { useParams, Link, Navigate } from 'react-router-dom';
import { PANELS, FACTOR_LABELS, PANEL_LABELS, FactorType, FACTORS } from '@/shared/market-intelligence/macroRegistry';
import { PageLayout } from '@/app/layouts/PageLayout';
import styles from './FactorPage.module.css';

export function FactorPage() {
  const { factorKey } = useParams<{ factorKey: string }>();
  
  if (!factorKey || !FACTORS.includes(factorKey as FactorType)) {
    return <Navigate to="/macro" replace />;
  }

  const factor = factorKey as FactorType;
  const panels = PANELS[factor];

  const main = (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>{FACTOR_LABELS[factor]}</h1>
        <p className={styles.subtitle}>Select an analytical panel to drill down into structural details.</p>
      </header>

      <div className={styles.grid}>
        {panels.map(panel => (
          <Link key={panel} to={`/macro/${factor}/${panel}`} className={styles.card}>
            <h2 className={styles.panelTitle}>{PANEL_LABELS[panel]}</h2>
            <div className={styles.panelAction}>View Analysis &rarr;</div>
          </Link>
        ))}
      </div>
    </div>
  );

  return <PageLayout main={main} />;
}
