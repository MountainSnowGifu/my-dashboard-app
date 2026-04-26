import { NavLink } from "react-router-dom";
import styles from "./Sidebar.module.css";
import { useUiStore } from "@/store";
import { menuItems } from "@/config/menu";
import { classNames } from "@/utils/helpers";
import { IconDashboard, IconPeople, IconAssessment } from "@/components/icons";

const iconMap: Record<string, React.ReactNode> = {
  dashboard: <IconDashboard />,
  people: <IconPeople />,
  assessment: <IconAssessment />,
};

export function Sidebar() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);

  return (
    <>
      <div
        className={classNames(
          styles.backdrop,
          sidebarOpen && styles.backdropVisible,
        )}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={classNames(styles.sidebar, !sidebarOpen && styles.collapsed)}
      >
        <div className={styles.logo}>
          <span className={styles.logoText}>
            {sidebarOpen ? "Dashboard" : "D"}
          </span>
        </div>
        <nav className={styles.nav}>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end
              aria-label={item.label}
              title={!sidebarOpen ? item.label : undefined}
              className={({ isActive }) =>
                classNames(styles.navItem, isActive && styles.navItemActive)
              }
            >
              <span className={styles.icon}>
                {iconMap[item.icon] ?? item.icon}
              </span>
              {sidebarOpen && (
                <span className={styles.label}>{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
