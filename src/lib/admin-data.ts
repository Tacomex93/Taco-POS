import { supabase } from '@/lib/supabase';

export type OrderRow = {
  id: string;
  table_id: string;
  employee_id: string | null;
  comensales: number;
  status: 'abierta' | 'pagada' | 'cancelada';
  total: number;
  created_at: string;
  updated_at?: string;
};

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfPreviousDay(d: Date): Date {
  const x = startOfLocalDay(d);
  x.setDate(x.getDate() - 1);
  return x;
}

/** Ventas del día (órdenes pagadas) y totales para KPIs */
export async function fetchTodayOrderStats() {
  const now = new Date();
  const todayStart = startOfLocalDay(now);
  const yesterdayStart = startOfPreviousDay(now);

  const { data: todayRows, error: e1 } = await supabase
    .from('orders')
    .select('total, status, created_at')
    .gte('created_at', todayStart.toISOString());

  const { data: yesterdayRows, error: e2 } = await supabase
    .from('orders')
    .select('total, status')
    .gte('created_at', yesterdayStart.toISOString())
    .lt('created_at', todayStart.toISOString());

  if (e1 || e2) {
    return {
      error: e1 ?? e2,
      salesToday: 0,
      ordersToday: 0,
      paidToday: 0,
      openToday: 0,
      pctVsYesterday: null as number | null,
    };
  }

  const paid = (rows: { total: number; status: string }[]) =>
    rows.filter((r) => r.status === 'pagada').reduce((a, r) => a + Number(r.total), 0);

  const countPaid = (rows: { status: string }[]) => rows.filter((r) => r.status === 'pagada').length;

  const today = todayRows ?? [];
  const yesterday = yesterdayRows ?? [];

  const salesToday = paid(today);
  const salesYesterday = paid(yesterday);

  let pctVsYesterday: number | null = null;
  if (salesYesterday > 0) {
    pctVsYesterday = Math.round(((salesToday - salesYesterday) / salesYesterday) * 1000) / 10;
  }

  return {
    error: null,
    salesToday,
    ordersToday: today.length,
    paidToday: countPaid(today),
    openToday: today.filter((r) => r.status === 'abierta').length,
    pctVsYesterday,
  };
}

const dayLabels = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

function dayKey(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
}

/** Últimos 7 días calendario: ventas pagadas y número de órdenes por día */
export async function fetchLast7DaysSeries() {
  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('orders')
    .select('total, status, created_at')
    .gte('created_at', since.toISOString());

  if (error || !data) {
    return { error, series: [] as { day: string; sales: number; orders: number }[] };
  }

  const buckets = new Map<string, { sales: number; orders: number }>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    buckets.set(dayKey(d), { sales: 0, orders: 0 });
  }

  for (const row of data) {
    const key = dayKey(new Date(row.created_at));
    if (!buckets.has(key)) continue;
    const b = buckets.get(key)!;
    b.orders += 1;
    if (row.status === 'pagada') b.sales += Number(row.total);
  }

  const series: { day: string; sales: number; orders: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = dayKey(d);
    const b = buckets.get(key) ?? { sales: 0, orders: 0 };
    series.push({
      day: dayLabels[d.getDay()],
      sales: Math.round(b.sales * 100) / 100,
      orders: b.orders,
    });
  }

  return { error: null, series };
}

/** Agrega productos más vendidos por cantidad (ventana reciente) */
export async function fetchTopProductsByQuantity(limit = 8) {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data, error } = await supabase
    .from('order_items')
    .select('product_name, quantity, price')
    .gte('created_at', since.toISOString());

  if (error || !data?.length) {
    return { error, items: [] as { name: string; units: number; revenue: number }[] };
  }

  const map = new Map<string, { units: number; revenue: number }>();
  for (const row of data) {
    const name = row.product_name;
    const q = Number(row.quantity);
    const line = q * Number(row.price);
    const cur = map.get(name) ?? { units: 0, revenue: 0 };
    cur.units += q;
    cur.revenue += line;
    map.set(name, cur);
  }

  const items = [...map.entries()]
    .map(([name, v]) => ({ name, units: v.units, revenue: Math.round(v.revenue * 100) / 100 }))
    .sort((a, b) => b.units - a.units)
    .slice(0, limit);

  return { error: null, items };
}
