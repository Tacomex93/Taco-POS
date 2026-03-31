'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  fetchLast7DaysSeries,
  fetchTodayOrderStats,
  fetchTopProductsByQuantity,
} from '@/lib/admin-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  ShoppingBag, 
  DollarSign, 
  CheckCircle2, 
  Flame,
  Star,
  Coffee,
  Zap,
  Heart,
  Store,
  ChevronRight,
  TrendingUp,
  CalendarDays,
  Sparkles,
  ArrowUpRight,
  Loader2
} from "lucide-react";
import { 
  Bar, 
  BarChart, 
  CartesianGrid, 
  XAxis, 
  Area,
  AreaChart,
  Cell
} from "recharts";
import { 
  ChartConfig, 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart";

const DEMO_CHART = [
  { day: 'Lun', sales: 4500, orders: 42 },
  { day: 'Mar', sales: 5200, orders: 48 },
  { day: 'Mie', sales: 4800, orders: 45 },
  { day: 'Jue', sales: 6100, orders: 55 },
  { day: 'Vie', sales: 8900, orders: 82 },
  { day: 'Sab', sales: 9500, orders: 95 },
  { day: 'Dom', sales: 7800, orders: 70 },
];

const chartConfig = {
  sales: {
    label: "Ventas ($)",
    color: "#ea580c",
  },
  orders: {
    label: "Órdenes",
    color: "#10b981",
  },
} satisfies ChartConfig;

const rankColors = [
  'text-orange-600 bg-orange-50 dark:bg-orange-950/40',
  'text-zinc-600 bg-zinc-100 dark:bg-zinc-800',
  'text-amber-700 bg-amber-50 dark:bg-amber-950/30',
  'text-red-600 bg-red-50 dark:bg-red-950/30',
];

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    salesToday: 0,
    ordersToday: 0,
    paidToday: 0,
    openToday: 0,
    pctVsYesterday: null as number | null,
  });
  const [series, setSeries] = useState<{ day: string; sales: number; orders: number }[]>([]);
  const [topItems, setTopItems] = useState<{ name: string; units: number; revenue: number }[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [s, w, t] = await Promise.all([
        fetchTodayOrderStats(),
        fetchLast7DaysSeries(),
        fetchTopProductsByQuantity(4),
      ]);
      if (cancelled) return;
      setStats({
        salesToday: s.salesToday,
        ordersToday: s.ordersToday,
        paidToday: s.paidToday,
        openToday: s.openToday,
        pctVsYesterday: s.pctVsYesterday,
      });
      setSeries(w.series.length ? w.series : DEMO_CHART);
      setTopItems(t.items);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    []
  );

  const chartData = series.length ? series : DEMO_CHART;

  const maxOrders = Math.max(...chartData.map((d) => d.orders), 1);

  const fmtMoney = (n: number) =>
    `$${n.toLocaleString('es-MX', { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;

  const kpiStats = useMemo(() => {
    const subVentas =
      stats.pctVsYesterday != null
        ? `${stats.pctVsYesterday >= 0 ? '+' : ''}${stats.pctVsYesterday}% vs ayer`
        : 'Sin datos ayer';
    return [
      {
        title: 'Ventas de hoy',
        value: fmtMoney(stats.salesToday),
        sub: subVentas,
        icon: DollarSign,
        accent: 'from-orange-500 to-amber-500',
        trend: stats.pctVsYesterday != null ? `${stats.pctVsYesterday >= 0 ? '+' : ''}${stats.pctVsYesterday}%` : '—',
      },
      {
        title: 'Órdenes (hoy)',
        value: String(stats.ordersToday),
        sub: `${stats.openToday} abiertas · ${stats.paidToday} pagadas`,
        icon: ShoppingBag,
        accent: 'from-emerald-500 to-teal-500',
        trend: 'Hoy',
      },
      {
        title: 'Top producto',
        value: topItems[0]?.name ?? '—',
        sub: topItems[0] ? `${topItems[0].units} uds · ${fmtMoney(topItems[0].revenue)}` : 'Sin ventas recientes',
        icon: Heart,
        accent: 'from-rose-500 to-orange-500',
        trend: '30 días',
      },
      {
        title: 'En curso',
        value: String(stats.openToday),
        sub: 'Órdenes abiertas ahora',
        icon: Zap,
        accent: 'from-sky-500 to-blue-600',
        trend: 'Live',
      },
    ];
  }, [stats, topItems]);

  const bestDay = useMemo(() => {
    let max = 0;
    let label = chartData[0]?.day ?? '—';
    for (const d of chartData) {
      if (d.orders > max) {
        max = d.orders;
        label = d.day;
      }
    }
    return { label, count: max };
  }, [chartData]);

  return (
    <div className="relative min-h-full overflow-hidden">
      {/* Ambient background */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[#f8f9fc] dark:bg-zinc-950"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-24 right-0 h-[420px] w-[520px] rounded-full bg-orange-500/15 blur-3xl dark:bg-orange-600/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-32 left-0 h-[380px] w-[480px] rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-600/5"
        aria-hidden
      />

      <div className="relative space-y-10 px-6 py-8 sm:px-8 lg:space-y-12 lg:px-10 lg:py-10 xl:px-12">
        {/* Hero */}
        <section className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400">
              <Sparkles className="h-3.5 w-3.5 text-orange-500" />
              Panel principal
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                Hola de nuevo, Admin
              </h1>
              <p className="text-base font-medium leading-relaxed text-zinc-600 dark:text-zinc-400">
                Resumen del día en un vistazo. Hoy toca vender buenos{' '}
                <span className="font-semibold text-orange-600 dark:text-orange-400">tacos</span> y
                mantener el ritmo en cocina y caja.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="inline-flex items-center gap-2 rounded-2xl bg-white/90 px-3 py-2 font-semibold shadow-sm ring-1 ring-zinc-200/80 dark:bg-zinc-900/90 dark:ring-zinc-800">
                <CalendarDays className="h-4 w-4 text-orange-500" />
                <span className="capitalize">{todayLabel}</span>
              </span>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-stretch lg:w-auto lg:min-w-[320px]">
            <div className="flex flex-1 items-center gap-4 rounded-[1.75rem] border border-zinc-200/80 bg-white/90 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-900/20">
                <Store className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  Sucursal
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm font-black text-emerald-600 dark:text-emerald-400">
                  Abierta
                  <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                </p>
              </div>
            </div>
            <Link
              href="/admin/caja"
              className={cn(
                buttonVariants({ variant: 'default', size: 'lg' }),
                'h-auto rounded-[1.75rem] bg-zinc-900 px-6 py-4 text-white shadow-lg shadow-zinc-900/15 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 font-black gap-2'
              )}
            >
              Ir a caja
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* KPI grid */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {loading && (
            <div className="col-span-full flex items-center justify-center gap-2 rounded-[1.75rem] border border-zinc-200/80 bg-white/80 py-6 text-sm font-bold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/80">
              <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
              Sincronizando con Supabase…
            </div>
          )}
          {kpiStats.map((stat) => (
            <Card
              key={stat.title}
              className={cn(
                'group relative overflow-hidden border border-zinc-200/80 bg-white/90 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/80',
                'rounded-[1.75rem]'
              )}
            >
              <div
                className={cn(
                  'pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br opacity-20 blur-2xl transition-opacity group-hover:opacity-30',
                  stat.accent
                )}
              />
              <CardContent className="relative p-6">
                <div className="flex items-start justify-between gap-4">
                  <div
                    className={cn(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md',
                      stat.accent
                    )}
                  >
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <Badge
                    variant="secondary"
                    className="rounded-full border-0 bg-emerald-50 font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                  >
                    {stat.trend}
                  </Badge>
                </div>
                <div className="mt-5 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
                    {stat.value}
                  </p>
                  <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{stat.sub}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Charts */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          <Card className="border border-zinc-200/80 bg-white/90 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 lg:col-span-2 rounded-[2rem]">
            <CardHeader className="flex flex-col gap-4 border-b border-zinc-100 p-6 pb-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between sm:p-8 sm:pb-6">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
                  Ritmo semanal
                  <Flame className="h-7 w-7 text-orange-500" />
                </CardTitle>
                <CardDescription className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                  Ventas pagadas · últimos 7 días
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="rounded-full border-0 bg-orange-50 font-bold text-orange-700 dark:bg-orange-950/50 dark:text-orange-300">
                  <TrendingUp className="mr-1 h-3.5 w-3.5" />
                  Tendencia al alza
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-2 sm:p-8 sm:pt-4">
              <ChartContainer config={chartConfig} className="aspect-[16/9] w-full min-h-[280px] sm:min-h-[320px]">
                <AreaChart data={chartData} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ea580c" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="6 6" vertical={false} className="stroke-zinc-200/80 dark:stroke-zinc-800" />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 700, fill: 'currentColor' }}
                    className="text-zinc-400"
                    dy={10}
                  />
                  <ChartTooltip
                    cursor={{ className: 'stroke-orange-500/30' }}
                    content={<ChartTooltipContent className="rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950" />}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#ea580c"
                    fillOpacity={1}
                    fill="url(#colorSales)"
                    strokeWidth={3}
                    animationDuration={1200}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border border-zinc-800 bg-zinc-950 text-white shadow-xl rounded-[2rem]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/15 via-transparent to-orange-500/10" />
            <CardHeader className="relative space-y-1 p-6 pb-2 sm:p-8 sm:pb-4">
              <CardTitle className="text-2xl font-black tracking-tight">Órdenes por día</CardTitle>
              <CardDescription className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Comparativo rápido
              </CardDescription>
            </CardHeader>
            <CardContent className="relative space-y-6 p-6 pt-2 sm:p-8 sm:pt-4">
              <ChartContainer config={chartConfig} className="aspect-[4/3] w-full min-h-[220px] [&_.recharts-cartesian-axis-tick_text]:fill-zinc-500">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800 }} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        indicator="dot"
                        className="border border-white/10 bg-zinc-900 text-white shadow-2xl"
                      />
                    }
                  />
                  <Bar dataKey="orders" radius={[12, 12, 12, 12]} barSize={18}>
                    {chartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === 5 ? '#f97316' : '#10b981'}
                        fillOpacity={0.85 - index * 0.04}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-300">
                      Mejor día: {bestDay.label}
                    </span>
                  </div>
                  <Badge className="rounded-full border-0 bg-emerald-500/20 font-black text-emerald-200">
                    {bestDay.count} órdenes
                  </Badge>
                </div>
                <div className="mt-4 space-y-2">
                  {chartData.slice(4, 7).map((d) => (
                    <div key={d.day} className="flex items-center gap-3 text-xs">
                      <span className="w-10 font-black text-zinc-500">{d.day}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-orange-400"
                          style={{ width: `${(d.orders / maxOrders) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-black tabular-nums text-zinc-300">{d.orders}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Lists + reminder */}
        <section className="grid grid-cols-1 gap-6 pb-8 lg:grid-cols-2 lg:gap-8 lg:pb-12">
          <Card className="border border-zinc-200/80 bg-white/90 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 rounded-[2rem]">
            <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-zinc-100 p-6 dark:border-zinc-800 sm:p-8">
              <div>
                <CardTitle className="text-xl font-black tracking-tight text-zinc-900 dark:text-white">
                  Lo más pedido
                </CardTitle>
                <CardDescription className="mt-1 text-xs font-semibold uppercase tracking-widest text-zinc-400">
                  Ranking del turno
                </CardDescription>
              </div>
              <Link
                href="/admin/pedidos"
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'sm' }),
                  'group rounded-xl font-black text-[10px] uppercase tracking-wider text-zinc-500 inline-flex items-center gap-1'
                )}
              >
                Ver pedidos
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-2 p-4 sm:p-6">
              {(topItems.length ? topItems : []).map((item, i) => (
                <div
                  key={item.name}
                  className="group flex items-center justify-between gap-4 rounded-[1.5rem] border border-transparent p-4 transition-colors hover:border-zinc-200 hover:bg-zinc-50 dark:hover:border-zinc-800 dark:hover:bg-zinc-800/40"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-sm font-black text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {i + 1}
                    </span>
                    <div
                      className={cn(
                        'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-inner',
                        rankColors[i % rankColors.length]
                      )}
                    >
                      🌮
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate font-black text-zinc-900 dark:text-white">{item.name}</h4>
                      <p className="truncate text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        Ingresos acumulados (30 días)
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xl font-black tracking-tight text-zinc-900 dark:text-white">
                      {fmtMoney(item.revenue)}
                    </p>
                    <Badge variant="outline" className="mt-1 rounded-full border-zinc-200 text-[9px] font-black uppercase dark:border-zinc-700">
                      {item.units} uds
                    </Badge>
                  </div>
                </div>
              ))}
              {!loading && topItems.length === 0 && (
                <p className="p-6 text-center text-sm font-bold text-zinc-400">
                  Aún no hay líneas en pedidos. Registra ventas en cajero para ver el ranking.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border border-orange-200/60 bg-gradient-to-br from-orange-50/90 to-white shadow-sm dark:border-orange-900/40 dark:from-orange-950/40 dark:to-zinc-950 rounded-[2rem]">
            <div className="pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full bg-orange-400/20 blur-3xl dark:bg-orange-500/10" />
            <CardContent className="relative space-y-8 p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-orange-100 dark:bg-zinc-900 dark:ring-orange-900/30">
                  <Coffee className="h-7 w-7 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight text-orange-950 dark:text-orange-100">
                    Recordatorio del día
                  </h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-widest text-orange-800/70 dark:text-orange-300/80">
                    Cocina y servicio
                  </p>
                </div>
              </div>

              <div className="relative rounded-[1.5rem] border border-orange-100/80 bg-white/90 p-6 shadow-sm dark:border-orange-900/30 dark:bg-zinc-900/80">
                <p className="text-base font-medium leading-relaxed text-zinc-800 dark:text-zinc-200">
                  Hoy es día de{' '}
                  <span className="font-black text-orange-600 dark:text-orange-400">promo en bebidas</span>.
                  Revisa que la horchata esté fría y el ambiente suene bien en sala.
                </p>
                <div className="absolute -right-2 -top-2 flex h-10 w-10 items-center justify-center rounded-full bg-orange-600 text-white shadow-lg">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-[1.25rem] border border-orange-200/60 bg-white/70 p-5 dark:border-orange-900/40 dark:bg-zinc-900/60">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-800/50 dark:text-orange-300/50">
                    Siguiente corte
                  </p>
                  <p className="mt-2 text-xl font-black text-orange-950 dark:text-orange-100">18:00</p>
                </div>
                <div className="rounded-[1.25rem] bg-zinc-900 p-5 text-center shadow-lg shadow-zinc-900/20 dark:bg-white dark:text-zinc-900">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 dark:text-zinc-600">
                    Cierre proyectado
                  </p>
                  <p className="mt-2 text-2xl font-black tracking-tight text-white dark:text-zinc-900">$22k+</p>
                </div>
              </div>

              <Link
                href="/admin/caja"
                className={cn(
                  buttonVariants({ variant: 'default', size: 'lg' }),
                  'h-14 w-full rounded-[1.25rem] bg-zinc-900 text-base font-black text-white shadow-xl hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 gap-2 justify-center'
                )}
              >
                Ver reporte en caja
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
