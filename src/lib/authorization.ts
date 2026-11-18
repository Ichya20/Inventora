import type { Role } from '../types';

export const STAFF_ROLES: readonly Role[] = ['Super Admin', 'Warehouse Manager', 'Finance Manager', 'HR Manager'];
export const ROLES: readonly Role[] = [...STAFF_ROLES, 'User'];

export function isRole(value: unknown): value is Role {
  return ROLES.includes(value as Role);
}

export function isStaffRole(value: unknown): value is Role {
  return STAFF_ROLES.includes(value as Role);
}

export function resolveAccountRole(claim: unknown): Role | null {
  // A verified account needs no custom claim for basic access. Staff privileges
  // still come exclusively from a valid Firebase custom claim.
  if (claim === undefined || claim === null) return 'User';
  return isRole(claim) ? claim : null;
}

export function canAccessMenu(role: Role | null, menu: string): boolean {
  if (!role) return false;
  const menus = ['overview', 'stok', 'pos', 'po', 'purchase', 'new-po', 'keuangan', 'analytics', 'billing', 'sdm', 'settings'];
  if (!menus.includes(menu)) return false;
  if (role === 'Super Admin') return true;
  if (role === 'User') return ['overview', 'settings'].includes(menu);
  if (role === 'Warehouse Manager') return ['overview', 'stok', 'pos', 'po', 'purchase', 'new-po'].includes(menu);
  if (role === 'Finance Manager') return ['overview', 'pos', 'po', 'keuangan', 'analytics', 'billing'].includes(menu);
  return role === 'HR Manager' && ['overview', 'sdm'].includes(menu);
}

export function canPerformPoAction(role: Role | null, action: 'create' | 'approve' | 'receive' | 'pay'): boolean {
  if (role === 'Super Admin') return true;
  return action === 'create' || action === 'receive'
    ? role === 'Warehouse Manager'
    : role === 'Finance Manager';
}
