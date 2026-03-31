'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  Calendar,
  Clock,
  AlertTriangle,
  ChevronRight,
  Mail,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Order = {
  id: string;
  table_id: string;
  status: 'abierta' | 'pagada' | 'cancelada' | string;
  total: number;
  created_at: string;
  comensales: number;
  employees?: { full_name: string } | null;
};

function formatAgeMinutes(createdAt: string) {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, Math.round(diffMs / 60000));
}

export default function AdminAlertasPage() {
  const [loading, setLoading] = useState(true);
  const [minutes, setMinutes] = useState(15);
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);
  const [sending, setSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('orders')
      .select('*, employees(full_name)')
      .eq('status', 'abierta')
      .lt('created_at', cutoff)
      .order('created_at', { ascending: true })
      .limit(50);

    if (!error && data) setOrders(data as Order[]);
    setLoading(false);
  }, [minutes]);

  useEffect(() => {
    (async () => { await fetchOrders(); })();
  }, [fetchOrders, refreshToken]);

  const handleSendEmail = async () => {
    if (!orders.length) return;
    setSending(true);
    try {
      const res = await fetch('/api/send-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'delayed_orders',
          items: orders.map((o) => ({
            name: `Pedido #${o.id.slice(0, 8)} — Mesa ${o.table_id}`,
            detail: `${formatAgeMinutes(o.created_at)} min · $${Number(o.total).toFixed(2)} · ${o.employees?.full_name ?? 'Sin asignar'}`,
          })),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setEmailSent(true);
        setTimeout(() => setEmailSent(false), 3000);
      } else {
        alert('Error al enviar: ' + data.error);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert('Error: ' + msg);
    }
    setSending(false);
  };

  return (
    <div className="min-h-full space-y-10 bg-[#fafafa] p-8 pb-20 animate-fade-in dark:bg-zinc-950 lg:p-12">
      <section className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-white">
            Alertas
          </h1>
          <p className="font-medium italic text-zinc-500">
            Pedidos abiertos con retraso (gestión de cocina/caja)
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              Umbral (min)
            </span>
            <Input
              value={String(minutes)}
              onChange={(e) => setMinutes(Math.max(1, Number(e.target.value || 0)))}
              className="h-12 w-28 rounded-2xl border-none bg-white dark:bg-zinc-900 font-black"
              inputMode="numeric"
            />
          </div>
          {orders.length > 0 && (
            <Button
              onClick={handleSendEmail}
              disabled={sending || emailSent}
              className={cn(
                'h-12 rounded-2xl px-6 font-black text-xs uppercase tracking-widest shadow-xl transition-all',
                emailSent
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-orange-600 text-white hover:bg-black'
              )}
            >
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> :
               emailSent ? <CheckCircle2 className="mr-2 h-4 w-4" /> :
               <Mail className="mr-2 h-4 w-4" />}
              {emailSent ? 'Enviado' : `Notificar (${orders.length})`}
            </Button>
          )}
          <Button
            variant="outline"
            className="h-12 rounded-2xl font-black text-xs uppercase tracking-widest"
            onClick={() => setRefreshToken((x) => x + 1)}
            disabled={loading}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Revisando…
              </span>
            ) : (
              'Actualizar'
            )}
          </Button>
        </div>
      </section>

      <Card className="rounded-[2.5rem] border-none bg-white shadow-sm dark:bg-zinc-900">
        <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-8 py-6">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-3 text-2xl font-black tracking-tighter">
              <AlertTriangle className="h-6 w-6 text-orange-600" /> Pedidos atrasados
            </CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              Total: {orders.length}
            </CardDescription>
          </div>
          <Badge className="rounded-full border-none bg-orange-50 text-orange-700 font-black">
            ≥ {minutes} min
          </Badge>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 opacity-30">
              <Loader2 className="h-12 w-12 animate-spin text-orange-600" />
              <p className="mt-4 font-black text-xs uppercase tracking-widest">
                Consultando…
              </p>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[2.5rem] border-4 border-dashed border-zinc-100 py-14 opacity-20 dark:border-zinc-900">
              <AlertTriangle className="h-12 w-12 text-zinc-400 mb-4" />
              <p className="text-xl font-black uppercase tracking-widest">Sin alertas</p>
              <p className="mt-2 text-sm font-bold text-zinc-400 text-center">
                No hay pedidos abiertos más viejos que el umbral actual.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => {
                const ageMin = formatAgeMinutes(o.created_at);
                return (
                  <div
                    key={o.id}
                    className="flex flex-col gap-3 rounded-[2rem] border border-zinc-100 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-800/40"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-zinc-900">
                          <Clock className="h-6 w-6 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-black uppercase tracking-widest text-[10px] text-zinc-400">
                            Pedido #{o.id.slice(0, 8)}
                          </p>
                          <p className="text-xl font-black italic">
                            Mesa {o.table_id}
                          </p>
                        </div>
                      </div>
                      <Badge className="rounded-full border-none bg-orange-100 text-orange-700 font-black">
                        {ageMin} min
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      <span className="inline-flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(o.created_at).toLocaleDateString('es-MX')}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(o.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                        Total: ${Number(o.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

