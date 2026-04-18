import { PageLayout } from '@/app/layouts/PageLayout';
import styles from './SettingsPlaceholder.module.css';

export function SettingsPlaceholder() {
  return (
    <PageLayout
      main={
        <div className={styles.placeholder}>
          <h1 className={styles.title}>设置</h1>
          <p className={styles.hint}>
            账户管理、LLM 配置、偏好设置将在后续版本中实现。
          </p>
        </div>
      }
    />
  );
}
