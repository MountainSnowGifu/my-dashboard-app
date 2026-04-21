import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export function NotFoundPage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        gap: 'var(--spacing-md)',
      }}
    >
      <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700 }}>404</h1>
      <p style={{ color: 'var(--color-text-muted)' }}>Page not found</p>
      <Link to="/dashboard">
        <Button variant="primary">Back to Dashboard</Button>
      </Link>
    </div>
  );
}
