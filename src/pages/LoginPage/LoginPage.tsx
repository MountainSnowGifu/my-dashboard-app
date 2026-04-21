import { Navigate } from 'react-router-dom';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { useAuthStore } from '@/store';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.heading}>Sign In</h1>
        <LoginForm />
      </div>
    </div>
  );
}
