export interface MenuItem {
  path: string;
  label: string;
  icon: string;
}

export const menuItems: MenuItem[] = [
  { path: "/dashboard", label: "Database", icon: "dashboard" },
];
