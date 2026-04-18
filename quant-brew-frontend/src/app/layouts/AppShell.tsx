import { Outlet } from 'react-router-dom';
import { MacroStrip } from './MacroStrip';
import styles from './AppShell.module.css';

export function AppShell() {
  return (
    <div className={styles.shell}>
      <MacroStrip />
      <div className={styles.body}>
        <Outlet />
      </div>
    </div>
  );
}
