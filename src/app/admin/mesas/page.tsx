'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Clock, Utensils, ChevronRight } from 'lucide-react';

type Order = {
  id: string;
  table_id: string;
  status: 'abierta' | 'pagada' | 'cancelada' | string;
  total: number;
  comensales: number;
  created_at: string;
  employees?: { full_name: string } | null;
};

type MesaSummary = {
  table_id: string;
  status: 'abierta' | 'pagada';
  comensales: number;
  total: number;
  last_order_at: string;
  last_employee?: string;
};

export default function AdminMesasPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, employees(full_name)')
      .in('status', ['abierta', 'pagada'])
      .order('created_at', { ascending: false })
      .limit(200);

    if (!error && data) setOrders(data as Order[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => { await fetchOrders(); })();
  }, [fetchOrders, refreshToken]);

  const mesas = useMemo(() => {
    const map = new Map<string, MesaSummary>();
    for (const o of orders) {
      const existing = map.get(o.table_id);
      if (!existing) {
        map.set(o.table_id, {
          table_id: o.table_id,
          status: o.status === 'abierta' ? 'abierta' : 'pagada',
          comensales: o.comensales ?? 1,
          total: Number(o.total ?? 0),
          last_order_at: o.created_at,
          last_employee: o.employees?.full_name ?? undefined,
        });
        continue;
      }

      const isOpen = o.status === 'abierta';
      existing.status = isOpen ? 'abierta' : existing.status;
      existing.total += Number(o.total ?? 0);

      if (new Date(o.created_at).getTime() > new Date(existing.last_order_at).getTime()) {
        existing.last_order_at = o.created_at;
        existing.last_employee = o.employees?.full_name ?? existing.last_employee;
        existing.comensales = o.comensales ?? existing.comensales;
      }
    }

    const list = [...map.values()].filter((m) => m.status === 'abierta' || m.status === 'pagada');
    list.sort((a, b) => new Date(b.last_order_at).getTime() - new Date(a.last_order_at).getTime());
    return list;
  }, [orders]);

  const ageMinutes = useCallback((iso: string) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    return Math.max(0, Math.round(diffMs / 60000));
  }, []);

  return (
    <div className="min-h-full space-y-10 bg-[#fafafa] p-8 pb-20 animate-fade-in dark:bg-zinc-950 lg:p-12">
      <section className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-white">
            Mesas
          </h1>
          <p className="font-medium italic text-zinc-500">Monitoreo rápido por mesa (derivado de orders)</p>
        </div>

        <Button
          variant="outline"
          className="h-12 rounded-2xl font-black text-xs uppercase tracking-widest"
          onClick={() => setRefreshToken((x) => x + 1)}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Actualizar'}
        </Button>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-30">
            <Loader2 className="h-12 w-12 animate-spin text-orange-600" />
            <p className="mt-4 font-black text-xs uppercase tracking-widest">Cargando mesas…</p>
          </div>
        ) : mesas.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center rounded-[2.5rem] border-4 border-dashed border-zinc-100 py-14 opacity-20 dark:border-zinc-900">
            <Utensils className="h-12 w-12 text-zinc-400 mb-4" />
            <p className="text-xl font-black uppercase tracking-widest">Sin mesas activas</p>
            <p className="mt-2 text-sm font-bold text-zinc-400 text-center">
              No hay órdenes con estado abierta/pagada para mostrar.
            </p>
          </div>
        ) : (
          mesas.map((m) => (
            <Card
              key={m.table_id}
              className="rounded-[2.5rem] border-none bg-white shadow-sm dark:bg-zinc-900"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl font-black italic tracking-tight">
                      Mesa {m.table_id}
                    </CardTitle>
                    <CardDescription className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                      {m.status === 'abierta' ? 'Abierta' : 'Pagada'}
                    </CardDescription>
                  </div>
                  <Badge
                    className={
                      m.status === 'abierta'
                        ? 'rounded-full border-none bg-orange-100 text-orange-700 font-black'
                        : 'rounded-full border-none bg-emerald-100 text-emerald-700 font-black'
                    }
                  >
                    {m.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pb-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Comensales</p>
                    <p className="text-3xl font-black italic tracking-tight">{m.comensales}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total acumulado</p>
                    <p className="text-3xl font-black italic tracking-tight">
                      ${m.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-zinc-900">
                        <Clock className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                          Última orden
                        </p>
                        <p className="mt-1 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                          Hace {ageMinutes(m.last_order_at)} min
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Atendió</p>
                      <p className="mt-1 text-xs font-bold text-zinc-700 dark:text-zinc-200">
                        {m.last_employee ?? '—'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    className="h-10 rounded-2xl font-black text-xs uppercase tracking-widest"
                    onClick={() => {
                      // Navegación simple: abre pedidos (sin filtro).
                      window.location.href = '/admin/pedidos';
                    }}
                  >
                    Ver pedidos <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

