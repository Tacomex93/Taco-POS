'use client';

import { useState, useCallback, useRef } from 'react';
import { useOrdersRealtime, OrderChangeEvent } from './use-orders-realtime';

export type Notification = {
  id: string;
  type: 'ready' | 'new_order' | 'cancelled';
  title: string;
  body: string;
  tableId: string;
  orderId: string;
  timestamp: Date;
  read: boolean;
};

type Options = {
  /** Qué tipos de eventos escuchar */
  role: 'mesero' | 'cajero' | 'admin';
};

export function useNotifications({ role }: Options) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const audioCtx = useRef<AudioContext | null>(null);

  const playTone = useCallback((freq: number) => {
    try {
      if (!audioCtx.current) audioCtx.current = new AudioContext();
      const ctx = audioCtx.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  }, []);

  const push = useCallback((n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    setNotifications(prev => [
      { ...n, id: crypto.randomUUID(), timestamp: new Date(), read: false },
      ...prev.slice(0, 49), // max 50
    ]);
  }, []);

  const handleChange = useCallback((event: OrderChangeEvent) => {
    const row = event.new as Record<string, unknown>;
    const tableId = String(row.table_id ?? '');
    const orderId = String(row.id ?? '');

    if (event.eventType === 'INSERT') {
      // Mesero/admin: nueva orden creada
      if (role === 'admin') {
        push({ type: 'new_order', title: 'Nueva orden', body: `Mesa ${tableId} abrió una orden`, tableId, orderId });
        playTone(660);
      }
    }

    if (event.eventType === 'UPDATE') {
      const ks = row.kitchen_status as string;
      const status = row.status as string;

      // Mesero: cocina marcó orden lista
      if ((role === 'mesero' || role === 'admin') && ks === 'ready') {
        push({ type: 'ready', title: '¡Orden lista!', body: `Mesa ${tableId} — listo para servir`, tableId, orderId });
        playTone(880);
      }

      // Cajero/admin: orden cancelada
      if ((role === 'cajero' || role === 'admin') && status === 'cancelada') {
        push({ type: 'cancelled', title: 'Orden cancelada', body: `Mesa ${tableId} canceló su orden`, tableId, orderId });
        playTone(330);
      }
    }
  }, [role, push, playTone]);

  useOrdersRealtime({
    channelName: `notifications-${role}`,
    onchange: handleChange,
    onRefresh: () => {},
    pollInterval: 60_000,
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const clear = useCallback(() => setNotifications([]), []);

  return { notifications, unreadCount, markAllRead, markRead, clear };
}
