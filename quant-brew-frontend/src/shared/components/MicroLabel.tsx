import styles from './MicroLabel.module.css';

interface MicroLabelProps {
  children: React.ReactNode;
  color?: 'default' | 'gold' | 'up' | 'down';
}

export function MicroLabel({ children, color = 'default' }: MicroLabelProps) {
  return (
    <span className={`${styles.label} ${styles[color]}`}>{children}</span>
  );
}
