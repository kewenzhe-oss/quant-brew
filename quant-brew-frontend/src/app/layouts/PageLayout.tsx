import styles from './PageLayout.module.css';

interface PageLayoutProps {
  main: React.ReactNode;
  context?: React.ReactNode;
}

export function PageLayout({ main, context }: PageLayoutProps) {
  return (
    <div className={styles.layout}>
      <main className={styles.main}>{main}</main>
      {context && (
        <aside className={styles.context}>{context}</aside>
      )}
    </div>
  );
}
