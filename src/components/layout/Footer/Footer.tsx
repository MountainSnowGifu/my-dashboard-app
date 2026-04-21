import styles from "./Footer.module.css";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <p className={styles.text}>
        &copy; {currentYear} My Dashboard App &mdash; Internal use only
      </p>
    </footer>
  );
}
