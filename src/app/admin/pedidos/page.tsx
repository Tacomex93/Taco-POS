'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Card,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Search,
  Calendar,
  Clock,
  Loader2,
  Receipt,
  ChevronRight,
  Printer,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
};

type Order = {
  id: string;
  table_id: string;
  status: string;
  total: number;
  comensales: number;
  created_at: string;
  cancel_reason?: string | null;
  paid_at?: string | null;
  cancelled_at?: string | null;
  employees: { full_name: string } | null;
  order_items: OrderItem[] | null;
};

export default function AdminPedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, employees(full_name), order_items(*)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data as Order[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pagada':
        return (
          <Badge className="border-none bg-emerald-500 font-black text-[10px] uppercase text-white hover:bg-emerald-600">
            Pagada
          </Badge>
        );
      case 'abierta':
        return (
          <Badge className="border-none bg-orange-600 font-black text-[10px] uppercase text-white hover:bg-orange-700">
            Abierta
          </Badge>
        );
      case 'cancelada':
        return (
          <Badge variant="destructive" className="font-black text-[10px] uppercase">
            Cancelada
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="font-black text-[10px] uppercase">
            {status}
          </Badge>
        );
    }
  };

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
          alert('Indica un motivo para cancelar el pedido.');
          return;
        }
        patch.cancel_reason = cancelReason.trim();
        patch.cancelled_at = now;
      }

      const { error } = await supabase.from('orders').update(patch).eq('id', orderId);
      if (error) throw error;

      setCancelReason('');
      await fetchOrders();
      // cerrar selección para refrescar UI con el nuevo estado
      setSelected(null);
    } catch (e: unknown) {
      console.error(e);
      alert('No se pudo actualizar el pedido.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filtered = orders.filter((o) => {
    if (filter !== 'all' && o.status !== filter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      o.id.toLowerCase().includes(q) ||
      o.table_id.toLowerCase().includes(q) ||
      (o.employees?.full_name ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-full space-y-10 bg-[#fafafa] p-8 pb-20 animate-fade-in dark:bg-zinc-950 lg:p-12">
      <section className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-white">
            Pedidos
          </h1>
          <p className="font-medium italic text-zinc-500">
            Todos los pedidos del sistema (Supabase)
          </p>
        </div>
        <Button
          variant="outline"
          className="h-12 rounded-2xl font-black text-xs uppercase tracking-widest"
          onClick={() => fetchOrders()}
        >
          Actualizar
        </Button>
      </section>

      <section className="flex flex-col items-center justify-between gap-6 rounded-[2rem] border border-zinc-100 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:flex-row">
        <div className="relative w-full flex-1 md:max-w-md">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por ID, mesa o empleado..."
            className="h-12 rounded-xl border-none bg-zinc-50 pl-12 font-bold dark:bg-zinc-800"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'abierta', 'pagada', 'cancelada'] as const).map((t) => (
            <Button
              key={t}
              type="button"
              onClick={() => setFilter(t)}
              className={cn(
                'h-10 rounded-xl px-4 font-black text-[10px] uppercase tracking-widest transition-all',
                filter === t
                  ? 'bg-zinc-900 text-white shadow-xl dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-transparent text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              )}
            >
              {t === 'all'
                ? 'Todos'
                : t === 'abierta'
                  ? 'Abiertas'
                  : t === 'pagada'
                    ? 'Pagadas'
                    : 'Canceladas'}
            </Button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="flex h-96 flex-col items-center justify-center opacity-30">
          <Loader2 className="h-12 w-12 animate-spin text-orange-600" />
          <p className="mt-4 font-black text-xs uppercase tracking-widest">Cargando pedidos…</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="flex h-96 flex-col items-center justify-center rounded-[4rem] border-4 border-dashed border-zinc-100 opacity-20 dark:border-zinc-900">
              <Receipt className="mb-4 h-24 w-24" />
              <p className="text-xl font-black uppercase tracking-widest">No hay pedidos</p>
            </div>
          ) : (
            filtered.map((order) => (
              <Card
                key={order.id}
                className="group relative overflow-hidden border-none bg-white shadow-sm transition-all duration-300 hover:shadow-xl dark:bg-zinc-900 rounded-[2.5rem] border-l-8 border-transparent hover:border-orange-500"
              >
                <div className="flex flex-col items-center justify-between gap-8 p-8 lg:flex-row">
                  <div className="flex items-center gap-6">
                    <div className="flex h-16 w-16 flex-col items-center justify-center rounded-[1.75rem] bg-zinc-50 text-zinc-400 shadow-inner transition-colors group-hover:bg-orange-50 group-hover:text-orange-600 dark:bg-zinc-800">
                      <span className="text-[9px] font-black uppercase">Mesa</span>
                      <span className="text-3xl font-black italic leading-none">{order.table_id}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h4 className="text-xl font-black uppercase italic tracking-tighter text-zinc-900 dark:text-white">
                          Pedido #{order.id.slice(0, 8)}
                        </h4>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 opacity-80">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(order.created_at).toLocaleDateString('es-MX')}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(order.created_at).toLocaleTimeString('es-MX', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="underline decoration-orange-500/30">
                          {order.employees?.full_name ?? 'Sin asignar'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-1 lg:items-end">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
                      Total
                    </span>
                    <p className="text-4xl font-black italic leading-none tracking-tighter text-zinc-900 dark:text-white">
                      ${Number(order.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="pt-1 text-[9px] font-bold uppercase tracking-widest text-emerald-500">
                      {order.comensales} comensales
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      className="h-14 w-14 rounded-2xl border border-zinc-100 bg-zinc-50 text-zinc-500 shadow-sm transition-all hover:bg-orange-50 hover:text-orange-600 dark:border-zinc-800 dark:bg-zinc-800"
                      type="button"
                    >
                      <Printer className="h-5 w-5" />
                    </Button>
                    <Button
                      className="h-14 rounded-2xl bg-zinc-900 px-8 font-black text-xs uppercase italic tracking-widest text-white shadow-xl transition-all group/btn hover:bg-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                      type="button"
                      onClick={() => setSelected(order)}
                    >
                      Ver detalle <ChevronRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
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
          {selected?.order_items && selected.order_items.length > 0 ? (
            <div className="space-y-2">
              {selected.order_items.map((line) => (
                <div
                  key={line.id}
                  className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800"
                >
                  <span className="font-bold text-zinc-900 dark:text-white">{line.product_name}</span>
                  <span className="font-black text-orange-600">
                    {line.quantity} × ${Number(line.price).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="mt-4 flex justify-between border-t border-zinc-200 pt-4 dark:border-zinc-700">
                <span className="font-black uppercase text-zinc-500">Total</span>
                <span className="text-2xl font-black">
                  ${Number(selected.total).toFixed(2)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm font-bold text-zinc-400">Sin líneas de detalle en la base.</p>
          )}

          {selected?.status === 'abierta' && (
            <div className="mt-6 space-y-4 border-t border-zinc-100 pt-6 dark:border-zinc-800">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  Gestión (admin)
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button
                    className="h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest shadow-xl transition-all disabled:opacity-50"
                    disabled={actionLoadingId === selected?.id}
                    onClick={() => selected && updateOrderStatus(selected.id, 'pagada')}
                  >
                    {actionLoadingId === selected?.id ? 'Actualizando…' : 'Marcar pagada'}
                  </Button>
                  <Button
                    className="h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest shadow-xl transition-all disabled:opacity-50"
                    disabled={actionLoadingId === selected?.id}
                    onClick={() => selected && updateOrderStatus(selected.id, 'cancelada')}
                  >
                    {actionLoadingId === selected?.id ? 'Actualizando…' : 'Cancelar'}
                  </Button>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    Motivo de cancelación (obligatorio si cancelas)
                  </p>
                  <Input
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Ej. cliente se fue / error en cocina / sin disponibilidad…"
                    className="h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-none shadow-sm font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {selected?.status !== 'abierta' && selected?.cancel_reason && (
            <div className="mt-6 rounded-[1.75rem] border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Motivo
              </p>
              <p className="mt-1 text-sm font-bold text-zinc-800 dark:text-zinc-100">
                {selected.cancel_reason}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
