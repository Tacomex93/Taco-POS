'use client';

/**
 * useOfflineQueue
 * Persiste órdenes en localStorage y encola actualizaciones de estado
 * cuando no hay conexión. Al recuperar internet, sincroniza automáticamente.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { KitchenStatus } from '@/lib/types';

type QueuedUpdate = {
  id: string;
  orderId: string;
  nextStatus: KitchenStatus;
  timestamp: number;
};

type CachedOrder = {
  id: string;
  table_id: string;
  comensales: number;
  kitchen_status: KitchenStatus;
  created_at: string;
  order_items: { id: string; product_name: string; quantity: number; seat_number: number | null }[];
};

const CACHE_KEY = 'pos_kitchen_orders';
const QUEUE_KEY = 'pos_kitchen_queue';

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(QUEUE_KEY) : null;
      return raw ? (JSON.parse(raw) as unknown[]).length : 0;
    } catch { return 0; }
  });
  const syncingRef = useRef(false);

  // ── Persist orders to localStorage ──────────────────────────────────────
  const cacheOrders = useCallback((orders: CachedOrder[]) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(orders));
    } catch {}
  }, []);

  const getCachedOrders = useCallback((): CachedOrder[] => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, []);

  // ── Queue management ─────────────────────────────────────────────────────
  const getQueue = useCallback((): QueuedUpdate[] => {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, []);

  const saveQueue = useCallback((queue: QueuedUpdate[]) => {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      setPendingCount(queue.length);
    } catch {}
  }, []);

  const enqueue = useCallback((orderId: string, nextStatus: KitchenStatus) => {
    const queue = getQueue();
    // Replace existing update for same order (only keep latest)
    const filtered = queue.filter(q => q.orderId !== orderId);
    saveQueue([...filtered, { id: crypto.randomUUID(), orderId, nextStatus, timestamp: Date.now() }]);
  }, [getQueue, saveQueue]);

  // ── Sync queue to Supabase ───────────────────────────────────────────────
  const syncQueue = useCallback(async () => {
    if (syncingRef.current) return;
    const queue = getQueue();
    if (queue.length === 0) return;

    syncingRef.current = true;
    const failed: QueuedUpdate[] = [];

    for (const item of queue) {
      const { error } = await supabase
        .from('orders')
        .update({ kitchen_status: item.nextStatus })
        .eq('id', item.orderId);

      if (error) failed.push(item);
    }

    saveQueue(failed);
    syncingRef.current = false;
    return failed.length === 0;
  }, [getQueue, saveQueue]);

  // ── Apply update locally (optimistic) ───────────────────────────────────
  const applyLocalUpdate = useCallback((orderId: string, nextStatus: KitchenStatus) => {
    const orders = getCachedOrders();
    const updated = orders.map(o =>
      o.id === orderId ? { ...o, kitchen_status: nextStatus } : o
    ).filter(o => !['delivered'].includes(o.kitchen_status) || nextStatus !== 'delivered');
    cacheOrders(updated);
    return updated;
  }, [getCachedOrders, cacheOrders]);

  // ── Online/offline listeners ─────────────────────────────────────────────
  useEffect(() => {
    const onOnline = async () => {
      setIsOnline(true);
      await syncQueue();
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [syncQueue, getQueue]);

  return {
    isOnline,
    pendingCount,
    cacheOrders,
    getCachedOrders,
    enqueue,
    syncQueue,
    applyLocalUpdate,
  };
}
