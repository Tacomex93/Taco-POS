'use client';

/**
 * useOrdersRealtime
 * Hook centralizado de sincronización en tiempo real para pedidos.
 *
 * Estrategia dual:
 *  1. Supabase Realtime (postgres_changes) — latencia ~200ms
 *  2. Polling de fallback cada `pollInterval` ms — por si el WS cae
 *
 * Ciclo de estados de un pedido:
 *
 *  [mesero crea]
 *       │
 *  kitchen_status: pending   ← cocina ve "Nuevo"
 *       │  (cocina toma)
 *  kitchen_status: preparing ← cocina ve "Preparando"
 *       │  (cocina termina)
 *  kitchen_status: ready     ← mesero recibe alerta, caja ve "Listo"
 *       │  (mesero entrega)
 *  kitchen_status: delivered ← ciclo completo
 *       │  (cajero cobra)
 *  status: pagada            ← orden cerrada
 *
 * Quién puede cambiar qué:
 *  - mesero   → crea orden (pending), marca delivered
 *  - cocina   → pending→preparing→ready
 *  - cajero   → status: pagada | cancelada
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type OrderChangeEvent = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown>;
  old: Record<string, unknown>;
};

type Options = {
  /** Nombre único del canal — evita colisiones entre módulos */
  channelName: string;
  /** Callback que se ejecuta en cada cambio */
  onchange: (event: OrderChangeEvent) => void;
  /** Función de refresco completo (para polling fallback) */
  onRefresh: () => void;
  /** Intervalo de polling en ms. Default: 20000 (20s) */
  pollInterval?: number;
  /** Si false, no suscribe (útil para deshabilitar condicionalmente) */
  enabled?: boolean;
};

export function useOrdersRealtime({
  channelName,
  onchange,
  onRefresh,
  pollInterval = 20_000,
  enabled = true,
}: Options): { isConnected: boolean } {
  const connectedRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onchangeRef = useRef(onchange);
  const onRefreshRef = useRef(onRefresh);

  // Keep refs fresh without re-subscribing
  useEffect(() => { onchangeRef.current = onchange; }, [onchange]);
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  const subscribeRef = useRef<() => void>(() => {});

  const subscribe = useCallback(() => {
    if (!enabled) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          connectedRef.current = true;
          setIsConnected(true);
          onchangeRef.current(payload as OrderChangeEvent);
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          connectedRef.current = true;
          setIsConnected(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          connectedRef.current = false;
          setIsConnected(false);
          console.warn(`[useOrdersRealtime] Canal ${channelName} error:`, err);
          setTimeout(() => subscribeRef.current(), 5_000);
        } else if (status === 'CLOSED') {
          connectedRef.current = false;
          setIsConnected(false);
        }
      });

    channelRef.current = channel;
  }, [channelName, enabled]);

  // Keep subscribeRef in sync so the retry closure always calls the latest version
  useEffect(() => { subscribeRef.current = subscribe; }, [subscribe]);

  // Subscribe on mount
  useEffect(() => {
    subscribe();
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [subscribe]);

  // Polling fallback — garantiza consistencia si el WS falla
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      onRefreshRef.current();
    }, pollInterval);
    return () => clearInterval(timer);
  }, [pollInterval, enabled]);

  return { isConnected };
}
