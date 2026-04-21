import styles from "./Header.module.css";
import { useUiStore } from "@/store";
import { useTheme } from "@/app/providers/ThemeProvider";
import { IconMenu, IconMoon, IconSun } from "@/components/icons";

export function Header() {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const { theme, toggleTheme } = useTheme();

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          className={styles.menuButton}
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <IconMenu />
        </button>
      </div>

      <div className={styles.right}>
        <button
          className={styles.themeToggle}
          onClick={toggleTheme}
          aria-label={
            theme === "light" ? "Switch to dark mode" : "Switch to light mode"
          }
        >
          <span className={styles.iconWrap}>
            {theme === "light" ? <IconMoon /> : <IconSun />}
          </span>
          <span>{theme === "light" ? "Dark mode" : "Light mode"}</span>
        </button>
      </div>
    </header>
  );
}
