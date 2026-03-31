'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Loader2, ChefHat, Clock, Flame, CheckCircle2,
  Truck, Bell, RefreshCw, LogOut, Volume2, Wifi, WifiOff, CloudOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KitchenStatus } from '@/lib/types';
import { useOrdersRealtime } from '@/hooks/use-orders-realtime';
import { useOfflineQueue } from '@/hooks/use-offline-queue';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationBell } from '@/components/NotificationBell';

type OrderItem = {
  id: string; product_name: string; quantity: number; seat_number: number | null;
};
type KitchenOrder = {
  id: string; table_id: string; comensales: number;
  kitchen_status: KitchenStatus; created_at: string;
  order_items: OrderItem[];
};

const STATUS: Record<KitchenStatus, {
  label: string; bg: string; border: string; badge: string;
  next: KitchenStatus | null; action: string; icon: React.ElementType;
}> = {
  pending:   { label: 'Nuevo',      bg: 'bg-red-50 dark:bg-red-950/20',        border: 'border-red-300 dark:border-red-800',        badge: 'bg-red-500 text-white',     next: 'preparing', action: 'Tomar pedido', icon: Bell },
  preparing: { label: 'Preparando', bg: 'bg-orange-50 dark:bg-orange-950/20',  border: 'border-orange-300 dark:border-orange-800',  badge: 'bg-orange-500 text-white',  next: 'ready',     action: 'Marcar listo', icon: Flame },
  ready:     { label: 'Listo ✓',   bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-300 dark:border-emerald-800', badge: 'bg-emerald-500 text-white', next: 'delivered', action: 'Entregar',     icon: CheckCircle2 },
  delivered: { label: 'Entregado',  bg: 'bg-zinc-50 dark:bg-zinc-900',         border: 'border-zinc-200 dark:border-zinc-800',      badge: 'bg-zinc-400 text-white',    next: null,        action: '',             icon: Truck },
};

const COLUMNS: KitchenStatus[] = ['pending', 'preparing', 'ready'];

const ageMin = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

export default function CocinaPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [employee, setEmployee] = useState<{ full_name: string } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevPendingIds = useRef<Set<string>>(new Set());
  const audioCtx = useRef<AudioContext | null>(null);

  const {
    isOnline, pendingCount,
    cacheOrders, getCachedOrders,
    enqueue, syncQueue, applyLocalUpdate,
  } = useOfflineQueue();

  const { notifications, unreadCount, markAllRead, markRead, clear } = useNotifications({ role: 'admin' });

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = localStorage.getItem('pos_employee_session');
    if (!s) { router.push('/login'); return; }
    const emp = JSON.parse(s);
    if (!['cocina', 'admin'].includes(emp.role)) { router.push('/login'); return; }
    setEmployee(emp);
  }, [router]);

  // ── Audio ─────────────────────────────────────────────────────────────────
  const playBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioCtx.current) audioCtx.current = new AudioContext();
      const ctx = audioCtx.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
    } catch {}
  }, [soundEnabled]);

  // ── Fetch & cache ─────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    if (!isOnline) {
      // Offline: serve from cache
      const cached = getCachedOrders();
      if (cached.length > 0) {
        setOrders(cached as KitchenOrder[]);
        setLoading(false);
      }
      return;
    }

    const { data, error } = await supabase
      .from('orders')
      .select('id, table_id, comensales, kitchen_status, created_at, order_items(id, product_name, quantity, seat_number)')
      .eq('status', 'abierta')
      .in('kitchen_status', ['pending', 'preparing', 'ready'])
      .order('created_at', { ascending: true });

    if (error || !data) {
      // Fallback to cache on network error
      const cached = getCachedOrders();
      setOrders(cached as KitchenOrder[]);
      setLoading(false);
      return;
    }

    const rows = data as KitchenOrder[];

    // Detect new pending → beep
    const newPendingIds = new Set(rows.filter(o => o.kitchen_status === 'pending').map(o => o.id));
    const hasNew = [...newPendingIds].some(id => !prevPendingIds.current.has(id));
    if (hasNew && prevPendingIds.current.size > 0) playBeep();
    prevPendingIds.current = newPendingIds;

    // Persist to cache
    cacheOrders(rows);
    setOrders(rows);
    setLoading(false);
  }, [isOnline, getCachedOrders, cacheOrders, playBeep]);

  // Initial load — use cache immediately, then fetch
  useEffect(() => {
    const cached = getCachedOrders();
    if (cached.length > 0) {
      setOrders(cached as KitchenOrder[]);
      setLoading(false);
    }
    fetchOrders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync queue when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncQueue().then(() => fetchOrders());
    }
  }, [isOnline, pendingCount, syncQueue, fetchOrders]);

  // ── Realtime ──────────────────────────────────────────────────────────────
  const { isConnected } = useOrdersRealtime({
    channelName: 'cocina-orders',
    onchange: () => fetchOrders(),
    onRefresh: fetchOrders,
    pollInterval: 15_000,
  });

  // ── Advance order status ──────────────────────────────────────────────────
  const advance = async (order: KitchenOrder) => {
    const cfg = STATUS[order.kitchen_status];
    if (!cfg.next) return;
    setUpdating(order.id);

    // Optimistic update locally
    const updated = applyLocalUpdate(order.id, cfg.next);
    setOrders(updated.filter(o =>
      COLUMNS.includes(o.kitchen_status as KitchenStatus)
    ) as KitchenOrder[]);

    if (isOnline) {
      const { error } = await supabase
        .from('orders')
        .update({ kitchen_status: cfg.next })
        .eq('id', order.id);

      if (error) {
        // Failed online — enqueue for retry
        enqueue(order.id, cfg.next);
      } else {
        await fetchOrders();
      }
    } else {
      // Offline — enqueue for later sync
      enqueue(order.id, cfg.next);
    }

    setUpdating(null);
  };

  const grouped = COLUMNS.reduce((acc, s) => {
    acc[s] = orders.filter(o => o.kitchen_status === s);
    return acc;
  }, {} as Record<KitchenStatus, KitchenOrder[]>);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">

      {/* ── Offline banner ── */}
      {!isOnline && (
        <div className="shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/20 border-b border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-widest">
          <CloudOff className="w-3.5 h-3.5" />
          Sin conexión — mostrando datos en caché
          {pendingCount > 0 && <span className="ml-2 bg-amber-500 text-black px-2 py-0.5 rounded-full">{pendingCount} cambios pendientes</span>}
        </div>
      )}

      {/* ── Pending sync banner ── */}
      {isOnline && pendingCount > 0 && (
        <div className="shrink-0 flex items-center justify-center gap-2 px-4 py-1.5 bg-blue-500/20 border-b border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-widest">
          <Loader2 className="w-3 h-3 animate-spin" />
          Sincronizando {pendingCount} cambios pendientes...
        </div>
      )}

      {/* ── Header ── */}
      <header className="h-14 shrink-0 flex items-center justify-between px-5 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <p className="font-black text-sm uppercase tracking-widest leading-none">Cocina</p>
            <p className="text-[10px] font-semibold text-zinc-400">{employee?.full_name ?? '—'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Connection status */}
          {isOnline
            ? isConnected
              ? <Wifi className="w-3.5 h-3.5 text-emerald-500" aria-label="Tiempo real activo" />
              : <Wifi className="w-3.5 h-3.5 text-zinc-600" aria-label="Conectando..." />
            : <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" aria-label="Sin internet" />
          }

          {/* Notification bell */}
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAllRead={markAllRead}
            onMarkRead={markRead}
            onClear={clear}
          />

          <button
            type="button"
            onClick={() => setSoundEnabled(s => !s)}
            className={cn('h-9 w-9 rounded-xl flex items-center justify-center transition-colors',
              soundEnabled ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-zinc-500')}
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={fetchOrders}
            className="h-9 w-9 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-zinc-700 transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
          <button
            type="button"
            onClick={() => { localStorage.removeItem('pos_employee_session'); router.push('/login'); }}
            className="h-9 w-9 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-red-900/50 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Stats bar ── */}
      <div className="shrink-0 flex items-center gap-4 px-5 py-2 bg-zinc-900 border-b border-zinc-800">
        {COLUMNS.map(s => {
          const cfg = STATUS[s];
          const count = grouped[s]?.length ?? 0;
          return (
            <div key={s} className="flex items-center gap-2">
              <span className={cn('w-2 h-2 rounded-full', cfg.badge.split(' ')[0])} />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{cfg.label}</span>
              <span className={cn('text-sm font-black tabular-nums',
                count > 0 && s === 'pending' ? 'text-red-400' : 'text-zinc-300')}>
                {count}
              </span>
            </div>
          );
        })}
        <div className="ml-auto text-[10px] font-semibold text-zinc-500">
          {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* ── Kanban ── */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center opacity-30">
          <Loader2 className="h-12 w-12 animate-spin text-orange-600" />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden grid grid-cols-3 gap-0 divide-x divide-zinc-800">
          {COLUMNS.map(status => {
            const cfg = STATUS[status];
            const Icon = cfg.icon;
            const colOrders = grouped[status] ?? [];
            return (
              <div key={status} className="flex flex-col overflow-hidden">
                <div className={cn('shrink-0 flex items-center justify-between px-4 py-3 border-b border-zinc-800',
                  status === 'pending' ? 'bg-red-950/30' : status === 'preparing' ? 'bg-orange-950/30' : 'bg-emerald-950/30')}>
                  <div className="flex items-center gap-2">
                    <Icon className={cn('w-4 h-4',
                      status === 'pending' ? 'text-red-400' : status === 'preparing' ? 'text-orange-400' : 'text-emerald-400')} />
                    <span className="font-black text-sm uppercase tracking-widest">{cfg.label}</span>
                  </div>
                  <span className={cn('text-lg font-black tabular-nums',
                    status === 'pending' && colOrders.length > 0 ? 'text-red-400 animate-pulse' : 'text-zinc-400')}>
                    {colOrders.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {colOrders.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 opacity-20">
                      <Icon className="w-10 h-10 mb-3" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Sin pedidos</p>
                    </div>
                  )}
                  {colOrders.map(order => {
                    const age = ageMin(order.created_at);
                    const isUrgent = age >= 15 && status !== 'ready';
                    const isPending = updating === order.id;
                    return (
                      <div key={order.id}
                        className={cn('rounded-2xl border-2 overflow-hidden transition-all',
                          cfg.border, cfg.bg,
                          isUrgent && 'border-red-500 shadow-lg shadow-red-900/30',
                          isPending && 'opacity-70')}>
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/10 dark:border-white/5">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xl text-zinc-900 dark:text-white">Mesa {order.table_id}</span>
                            <span className="text-[10px] font-bold text-zinc-500">{order.comensales}p</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {isUrgent && (
                              <span className="text-[9px] font-black uppercase tracking-widest text-red-500 animate-pulse">¡Urgente!</span>
                            )}
                            <span className={cn('flex items-center gap-1 text-[10px] font-black',
                              age >= 15 ? 'text-red-500' : age >= 8 ? 'text-orange-500' : 'text-zinc-400')}>
                              <Clock className="w-3 h-3" /> {age}m
                            </span>
                            <span className="text-[9px] text-zinc-400">{fmtTime(order.created_at)}</span>
                          </div>
                        </div>

                        <div className="px-4 py-3 space-y-1.5">
                          {order.order_items.map(item => (
                            <div key={item.id} className="flex items-baseline justify-between gap-2">
                              <span className="font-bold text-sm text-zinc-900 dark:text-white leading-tight">{item.product_name}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                {item.seat_number != null && (
                                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">C{item.seat_number}</span>
                                )}
                                <span className="font-black text-lg text-zinc-900 dark:text-white tabular-nums">×{item.quantity}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {cfg.next && (
                          <div className="px-3 pb-3">
                            <button
                              type="button"
                              onClick={() => advance(order)}
                              disabled={isPending}
                              className={cn(
                                'w-full h-10 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2',
                                status === 'pending' ? 'bg-red-500 hover:bg-red-400 text-white'
                                  : status === 'preparing' ? 'bg-orange-500 hover:bg-orange-400 text-white'
                                  : 'bg-emerald-500 hover:bg-emerald-400 text-white'
                              )}
                            >
                              {isPending
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <><Icon className="w-4 h-4" /> {cfg.action}{!isOnline && ' (offline)'}</>
                              }
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
