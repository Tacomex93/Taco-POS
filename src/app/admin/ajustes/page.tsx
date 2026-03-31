'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Store,
  Hash,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Database,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

type DbStats = {
  orders: number;
  order_items: number;
  products: number;
  employees: number;
};

export default function AjustesPage() {
  // Local settings (persisted in localStorage for simplicity — no extra DB table needed)
  const [restaurantName, setRestaurantName] = useState('Taquería');
  const [tableCount, setTableCount] = useState('10');
  const [saved, setSaved] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // DB stats
  const [stats, setStats] = useState<DbStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Supabase connection test
  const [connStatus, setConnStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [testing, setTesting] = useState(false);

  const fetchStats = async () => {
    setLoadingStats(true);
    const [o, oi, p, e] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('order_items').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('employees').select('id', { count: 'exact', head: true }),
    ]);
    setStats({
      orders: o.count ?? 0,
      order_items: oi.count ?? 0,
      products: p.count ?? 0,
      employees: e.count ?? 0,
    });
    setLoadingStats(false);
  };

  useEffect(() => {
    (async () => {
      const name = localStorage.getItem('pos_restaurant_name');
      const tables = localStorage.getItem('pos_table_count');
      if (name) setRestaurantName(name);
      if (tables) setTableCount(tables);
      await fetchStats();
    })();
  }, []);

  const handleSaveSettings = () => {
    setSavingSettings(true);
    localStorage.setItem('pos_restaurant_name', restaurantName.trim() || 'Taquería');
    localStorage.setItem('pos_table_count', tableCount);
    setTimeout(() => {
      setSavingSettings(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }, 400);
  };

  const testConnection = async () => {
    setTesting(true);
    setConnStatus('idle');
    const { error } = await supabase.from('employees').select('id').limit(1);
    setConnStatus(error ? 'error' : 'ok');
    setTesting(false);
  };

  const dbStatItems = stats
    ? [
        { label: 'Órdenes', value: stats.orders },
        { label: 'Líneas de pedido', value: stats.order_items },
        { label: 'Productos', value: stats.products },
        { label: 'Empleados', value: stats.employees },
      ]
    : [];

  return (
    <div className="min-h-full space-y-10 bg-[#fafafa] p-8 pb-20 dark:bg-zinc-950 lg:p-12">
      {/* Header */}
      <section className="space-y-1">
        <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-white">
          Ajustes
        </h1>
        <p className="font-medium italic text-zinc-500">
          Configuración general del sistema POS
        </p>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* General settings */}
        <Card className="rounded-[2rem] border-none bg-white shadow-sm dark:bg-zinc-900">
          <CardHeader className="border-b border-zinc-100 p-6 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-950/30">
                <Store className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-black tracking-tight">Negocio</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest">
                  Datos generales del restaurante
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Nombre del restaurante
              </Label>
              <Input
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                placeholder="Taquería El Buen Sabor"
                className="h-12 rounded-2xl border-none bg-zinc-50 font-bold dark:bg-zinc-800"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Número de mesas
              </Label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={tableCount}
                  onChange={(e) => setTableCount(e.target.value)}
                  className="h-12 rounded-2xl border-none bg-zinc-50 pl-12 font-bold dark:bg-zinc-800"
                />
              </div>
              <p className="text-[10px] font-bold text-zinc-400">
                Controla cuántas mesas aparecen en la vista del mesero.
              </p>
            </div>

            <Button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="h-12 w-full rounded-2xl bg-orange-600 font-black text-xs uppercase tracking-widest text-white shadow-xl hover:bg-orange-700 disabled:opacity-50"
            >
              {savingSettings ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" /> Guardado
                </span>
              ) : (
                'Guardar ajustes'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Supabase connection */}
        <Card className="rounded-[2rem] border-none bg-white shadow-sm dark:bg-zinc-900">
          <CardHeader className="border-b border-zinc-100 p-6 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/30">
                <Database className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-black tracking-tight">Base de datos</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest">
                  Supabase · Estado de conexión
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {/* Connection test */}
            <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-5 py-4 dark:bg-zinc-800">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  Conexión Supabase
                </p>
                {connStatus === 'ok' && (
                  <p className="flex items-center gap-2 text-sm font-black text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" /> Conectado correctamente
                  </p>
                )}
                {connStatus === 'error' && (
                  <p className="flex items-center gap-2 text-sm font-black text-red-500">
                    <AlertTriangle className="h-4 w-4" /> Error de conexión
                  </p>
                )}
                {connStatus === 'idle' && (
                  <p className="text-sm font-bold text-zinc-400">Sin verificar</p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={testConnection}
                disabled={testing}
                className="h-10 rounded-xl border-zinc-200 font-black text-[10px] uppercase tracking-widest dark:border-zinc-700"
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="ml-2">Probar</span>
              </Button>
            </div>

            {/* DB stats */}
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Registros en base de datos
              </p>
              {loadingStats ? (
                <div className="flex items-center gap-2 py-4 text-zinc-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs font-bold">Consultando…</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {dbStatItems.map((s) => (
                    <div
                      key={s.label}
                      className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800"
                    >
                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                        {s.label}
                      </p>
                      <p className="mt-1 text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
                        {s.value.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchStats}
                disabled={loadingStats}
                className="h-9 rounded-xl font-black text-[10px] uppercase tracking-widest text-zinc-400"
              >
                <RefreshCw className="mr-2 h-3 w-3" /> Actualizar conteos
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Environment info */}
        <Card className="rounded-[2rem] border-none bg-white shadow-sm dark:bg-zinc-900 lg:col-span-2">
          <CardHeader className="border-b border-zinc-100 p-6 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                <ShieldCheck className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
              </div>
              <div>
                <CardTitle className="text-lg font-black tracking-tight">Entorno</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest">
                  Variables de configuración activas
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <EnvRow
                label="NEXT_PUBLIC_SUPABASE_URL"
                value={process.env.NEXT_PUBLIC_SUPABASE_URL}
              />
              <EnvRow
                label="NEXT_PUBLIC_SUPABASE_ANON_KEY"
                value={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}
                secret
              />
            </div>
            <Separator className="my-6" />
            <p className="text-[10px] font-bold text-zinc-400">
              Para cambiar estas variables edita el archivo{' '}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono dark:bg-zinc-800">
                .env.local
              </code>{' '}
              y reinicia el servidor de desarrollo.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EnvRow({
  label,
  value,
  secret = false,
}: {
  label: string;
  value: string | undefined;
  secret?: boolean;
}) {
  const display = !value
    ? '— no definida —'
    : secret
    ? value.slice(0, 8) + '••••••••••••••••'
    : value;

  return (
    <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800">
      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{label}</p>
      <p className="mt-1 truncate font-mono text-xs font-bold text-zinc-700 dark:text-zinc-200">
        {display}
      </p>
      <Badge
        className={`mt-2 rounded-full border-none text-[8px] font-black uppercase ${
          value
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
            : 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'
        }`}
      >
        {value ? 'Configurada' : 'Faltante'}
      </Badge>
    </div>
  );
}
