import styles from './LoginPlaceholder.module.css';

export function LoginPlaceholder() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.brand}>Quant-Brew</h1>
        <p className={styles.subtitle}>市场研究 · 智能分析</p>
        <div className={styles.form}>
          <input
            className={styles.input}
            type="text"
            placeholder="用户名"
            autoComplete="username"
          />
          <input
            className={styles.input}
            type="password"
            placeholder="密码"
            autoComplete="current-password"
          />
          <button className={styles.button}>登录</button>
        </div>
        <p className={styles.hint}>
          认证流程将在后续版本中完善
        </p>
      </div>
    </div>
  );
}
