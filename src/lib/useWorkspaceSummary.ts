import { useEffect, useState } from 'react';
import type { PurchaseOrder, Role } from '../types';
import { canAccessMenu } from './authorization';
import { poStorageKey } from './procurement';
import { isSummaryOrderList, summarizePurchaseOrders } from './workspaceSummary';
import { HR_EMPLOYEES_KEY, readHrEmployees } from './hrValidation';
import { stockHealth, isInventoryList } from './inventory';
import { commerceStorageKey, inventoryStorageKey, readCommerce } from './commerce';

export function useWorkspaceSummary(isDemo: boolean, ownerId: string, role: Role | null) {
  const [revision, setRevision] = useState(0);
  const [cloud, setCloud] = useState<{ ownerId: string; orders: PurchaseOrder[] } | null>(null);
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    window.addEventListener('storage', refresh);
    window.addEventListener('inventora:data-changed', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('inventora:data-changed', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  useEffect(() => {
    if (isDemo || !canAccessMenu(role, 'po') || !ownerId) return;
    let cancelled = false;
    let unsubscribe = () => {};
    Promise.all([import('../firebase'), import('firebase/firestore')]).then(([{ db }, { collection, onSnapshot }]) => {
      if (cancelled) return;
      unsubscribe = onSnapshot(collection(db, 'purchaseOrders'), snapshot => {
        if (cancelled) return;
        const orders = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setCloud(isSummaryOrderList(orders) ? { ownerId, orders } : null);
      }, () => { if (!cancelled) setCloud(null); });
    }).catch(() => { if (!cancelled) setCloud(null); });
    return () => { cancelled = true; unsubscribe(); };
  }, [isDemo, ownerId, role]);
  const readArray = (key: string): any[] | null => {
    try { const value = JSON.parse(localStorage.getItem(key) ?? 'null'); return Array.isArray(value) ? value : null; }
    catch { return null; }
  };
  // Reading on every revision also covers same-tab writes from the individual modules.
  void revision;
  const candidateOrders = !canAccessMenu(role, 'po') ? null : isDemo ? readArray(poStorageKey(true, ownerId)) : cloud?.ownerId === ownerId ? cloud.orders : null;
  const orders = isSummaryOrderList(candidateOrders) ? candidateOrders : null;
  const storedInventory = (() => {
    if (!canAccessMenu(role, 'stok')) return null;
    try {
      return localStorage.getItem(commerceStorageKey(isDemo)) !== null ? readCommerce(undefined, isDemo).inventory : readArray(inventoryStorageKey(isDemo));
    } catch { return null; }
  })();
  const inventory = isInventoryList(storedInventory) ? storedInventory : null;
  const employees = (() => {
    if (!canAccessMenu(role, 'sdm')) return null;
    try { return localStorage.getItem(HR_EMPLOYEES_KEY) === null ? null : readHrEmployees([]); }
    catch { return null; }
  })();
  return {
    ...summarizePurchaseOrders(orders),
    orders: orders as PurchaseOrder[] | null,
    inventory,
    lowStockCount: inventory ? inventory.filter(item => stockHealth(item).needsReview).length : null,
    totalHeadcount: employees?.length ?? null,
    infrastructureUnits: inventory ? inventory.reduce((sum, item) => sum + (Number(item.stock) || 0), 0) : null,
  };
}
