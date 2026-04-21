import type { User } from '@/types/auth';

export function isAdmin(user: User): boolean {
  return user.role === 'admin';
}

export function hasPermission(user: User, requiredRole: User['role']): boolean {
  const roleHierarchy: Record<User['role'], number> = {
    viewer: 0,
    user: 1,
    admin: 2,
  };
  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

export function getDisplayName(user: User): string {
  return user.name || user.email;
}
