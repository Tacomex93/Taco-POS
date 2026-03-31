'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  Calendar,
  Clock,
  ChevronRight,
  Flame,
  UtensilsCrossed,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Order = {
  id: string;
  table_id: string;
  status: 'abierta' | 'pagada' | 'cancelada';
  total: number;
  comensales: number;
  created_at: string;
  cancel_reason?: string | null;
  paid_at?: string | null;
  cancelled_at?: string | null;
  employees?: { full_name: string } | null;
};

export default function AdminCocinaPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, employees(full_name)')
      .in('status', ['abierta', 'pagada', 'cancelada'])
      .order('created_at', { ascending: false });

    if (!error && data) setOrders(data as Order[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => { await fetchOrders(); })();
  }, [fetchOrders]);

  const grouped = useMemo(() => {
    return {
      abiertas: orders.filter((o) => o.status === 'abierta'),
      pagadas: orders.filter((o) => o.status === 'pagada'),
      canceladas: orders.filter((o) => o.status === 'cancelada'),
    };
  }, [orders]);

  const updateOrderStatus = async (orderId: string, nextStatus: 'pagada' | 'cancelada') => {
    setActionLoadingId(orderId);
    try {
      const patch: Record<string, unknown> = { status: nextStatus };
      const now = new Date().toISOString();
      if (nextStatus === 'pagada') {
        patch.paid_at = now;
      }
      if (nextStatus === 'cancelada') {
        if (!cancelReason.trim()) {
          alert('Indica un motivo para cancelar.');
          return;
        }
        patch.cancel_reason = cancelReason.trim();
        patch.cancelled_at = now;
      }
      const { error } = await supabase.from('orders').update(patch).eq('id', orderId);
      if (error) throw error;

      setCancelReason('');
      setSelected(null);
      await fetchOrders();
    } catch (e) {
      console.error(e);
      alert('No se pudo actualizar el pedido.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const Column = ({
    title,
    badge,
    icon: Icon,
    items,
    tone,
  }: {
    title: string;
    badge: string;
    icon: React.ElementType;
    items: Order[];
    tone: string;
  }) => {
    return (
      <Card className="rounded-[2rem] border border-zinc-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-2xl', tone)}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-black tracking-tight">{title}</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  {badge}
                </CardDescription>
              </div>
            </div>
            <Badge className="rounded-full border-none bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              {items.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="max-h-[70vh] space-y-3 overflow-y-auto pr-2">
          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center opacity-40">
              <UtensilsCrossed className="h-8 w-8 mb-3" />
              <p className="text-xs font-bold uppercase tracking-widest">Sin pedidos</p>
            </div>
          )}
          {items.map((o) => (
            <button
              key={o.id}
              type="button"
              className="w-full rounded-[1.5rem] border border-zinc-100 bg-zinc-50 p-4 text-left transition-all hover:shadow-md hover:border-orange-500/20 dark:border-zinc-800 dark:bg-zinc-800/40"
              onClick={() => {
                setSelected(o);
                setCancelReason('');
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    Pedido #{o.id.slice(0, 8)}
                  </p>
                  <p className="mt-1 text-xl font-black italic text-zinc-900 dark:text-white">
                    Mesa {o.table_id}
                  </p>
                </div>
                <Badge
                  className={cn(
                    'rounded-full border-none font-black text-[10px] uppercase tracking-widest',
                    o.status === 'abierta' ? 'bg-orange-100 text-orange-700' : o.status === 'pagada'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  )}
                >
                  {o.status === 'abierta' ? 'Abierta' : o.status === 'pagada' ? 'Lista' : 'Cancelada'}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> {new Date(o.created_at).toLocaleDateString('es-MX')}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />{' '}
                  {new Date(o.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="mt-3 text-right">
                <p className="text-base font-black italic text-zinc-900 dark:text-white">
                  ${Number(o.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-full space-y-10 bg-[#fafafa] p-8 pb-20 animate-fade-in dark:bg-zinc-950 lg:p-12">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-white">Cocina</h1>
          <p className="font-medium italic text-zinc-500">
            Vista por estado: pedidos abiertos (pendientes) y listos (pagados)
          </p>
        </div>
        <Button
          variant="outline"
          className="h-12 rounded-2xl font-black text-xs uppercase tracking-widest"
          onClick={fetchOrders}
          disabled={loading}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Actualizando…
            </span>
          ) : (
            'Actualizar'
          )}
        </Button>
      </section>

      {loading ? (
        <div className="flex h-[70vh] flex-col items-center justify-center opacity-30">
          <Loader2 className="h-12 w-12 animate-spin text-orange-600" />
          <p className="mt-4 font-black text-xs uppercase tracking-widest">Cargando pedidos…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Column
            title="Pendientes"
            badge="Abiertas"
            icon={Flame}
            items={grouped.abiertas}
            tone="bg-orange-600"
          />
          <Column
            title="Listos"
            badge="Pagadas"
            icon={ChevronRight}
            items={grouped.pagadas}
            tone="bg-emerald-600"
          />
          <Column
            title="Cancelados"
            badge="No se sirven"
            icon={UtensilsCrossed}
            items={grouped.canceladas}
            tone="bg-red-600"
          />
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[2rem] border-none bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="font-black uppercase italic">
              Pedido #{selected?.id.slice(0, 8)}
            </DialogTitle>
            <DialogDescription className="font-bold uppercase tracking-widest">
              Mesa {selected?.table_id} · Estado: {selected?.status}
            </DialogDescription>
          </DialogHeader>

          {selected?.status === 'abierta' ? (
            <div className="mt-2 space-y-4 border-t border-zinc-100 pt-6 dark:border-zinc-800">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button
                  className="h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest disabled:opacity-50"
                  disabled={actionLoadingId === selected?.id}
                  onClick={() => selected && updateOrderStatus(selected.id, 'pagada')}
                >
                  {actionLoadingId === selected?.id ? 'Actualizando…' : 'Marcar listo'}
                </Button>
                <Button
                  className="h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest disabled:opacity-50"
                  disabled={actionLoadingId === selected?.id}
                  onClick={() => selected && updateOrderStatus(selected.id, 'cancelada')}
                >
                  {actionLoadingId === selected?.id ? 'Actualizando…' : 'Cancelar'}
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  Motivo de cancelación
                </p>
                <Input
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ej. cliente se fue / falta de producto…"
                  className="h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-none shadow-sm font-bold"
                />
              </div>
            </div>
          ) : (
            <div className="mt-2 rounded-[1.75rem] border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Detalle</p>
              <p className="mt-1 text-sm font-bold text-zinc-800 dark:text-zinc-100">
                {selected?.status === 'cancelada'
                  ? selected?.cancel_reason
                    ? `Motivo: ${selected.cancel_reason}`
                    : 'Cancelado sin motivo'
                  : 'Pedido pagado / listo'}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

