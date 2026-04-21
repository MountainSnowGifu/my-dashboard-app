import { useState, type FormEvent } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useLogin } from '@/features/auth/hooks/useAuth';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const loginMutation = useLogin();
  const emailError = isSubmitted && email.trim().length === 0 ? 'Email is required.' : undefined;
  const passwordError = isSubmitted && password.trim().length === 0 ? 'Password is required.' : undefined;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);

    if (email.trim().length === 0 || password.trim().length === 0) {
      return;
    }

    loginMutation.mutate({ email, password });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email@example.com"
        required
        error={emailError}
      />
      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
        required
        error={passwordError}
      />
      {loginMutation.isError && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)' }}>
          Login failed. Please check your credentials.
        </p>
      )}
      <Button type="submit" isLoading={loginMutation.isPending}>
        Sign In
      </Button>
    </form>
  );
}
