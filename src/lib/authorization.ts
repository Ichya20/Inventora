import type { Role } from '../types';

export const ROLES: readonly Role[] = ['Super Admin', 'Warehouse Manager', 'Finance Manager', 'HR Manager'];

export function isRole(value: unknown): value is Role {
  return ROLES.includes(value as Role);
}

export function canAccessMenu(role: Role | null, menu: string): boolean {
  if (!role) return false;
  const menus = ['overview', 'stok', 'po', 'purchase', 'new-po', 'keuangan', 'analytics', 'billing', 'sdm', 'settings'];
  if (!menus.includes(menu)) return false;
  if (role === 'Super Admin') return true;
  if (role === 'Warehouse Manager') return ['overview', 'stok', 'po', 'purchase', 'new-po'].includes(menu);
  if (role === 'Finance Manager') return ['overview', 'po', 'keuangan', 'analytics', 'billing'].includes(menu);
  return role === 'HR Manager' && ['overview', 'sdm'].includes(menu);
}

export function canPerformPoAction(role: Role | null, action: 'create' | 'approve' | 'receive' | 'pay'): boolean {
  if (role === 'Super Admin') return true;
  return action === 'create' || action === 'receive'
    ? role === 'Warehouse Manager'
    : role === 'Finance Manager';
}
