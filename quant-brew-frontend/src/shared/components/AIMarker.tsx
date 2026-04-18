import styles from './AIMarker.module.css';

interface AIMarkerProps {
  label?: string;
  children: React.ReactNode;
}

export function AIMarker({ label = 'AI 综述', children }: AIMarkerProps) {
  return (
    <div className={styles.wrapper}>
      <span className={styles.label}>{label}</span>
      {children}
    </div>
  );
}
