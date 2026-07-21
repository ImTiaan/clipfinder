import styles from "@/components/AnimatedBackground.module.css";

export default function AnimatedBackground() {
  return (
    <div className={styles.container} aria-hidden="true">
      <div className={styles.burstWrap}>
        <div className={styles.burst} />
      </div>
      <div className={styles.grid} />
    </div>
  );
}
