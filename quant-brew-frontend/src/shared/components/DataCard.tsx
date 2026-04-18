import styles from './DataCard.module.css';

interface DataCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function DataCard({ title, children, className }: DataCardProps) {
  return (
    <div className={`${styles.card} ${className ?? ''}`}>
      {title && <h3 className={styles.title}>{title}</h3>}
      <div className={styles.body}>{children}</div>
    </div>
  );
}
