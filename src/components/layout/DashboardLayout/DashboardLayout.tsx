import { Outlet } from 'react-router-dom';
import styles from './DashboardLayout.module.css';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { MatrixRain } from '@/components/effects/MatrixRain';
import { useUiStore } from '@/store';

export function DashboardLayout() {
  const matrixRainEnabled = useUiStore((s) => s.matrixRainEnabled);

  return (
    <div className={styles.layout}>
      {matrixRainEnabled && <MatrixRain />}
      <Sidebar />
      <div className={styles.main}>
        <Header />
        <main className={styles.content}>
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
