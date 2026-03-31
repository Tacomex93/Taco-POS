'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Bell, ChefHat, Plus, Flame, CheckCircle2,
  Loader2, Users, X, Minus, ShoppingBag, RefreshCw,
  UtensilsCrossed, Wifi, WifiOff
} from "lucide-react";
import { UserNav } from "@/components/UserNav";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Order, Product, TableStatus } from "@/lib/types";
import { useOrdersRealtime } from "@/hooks/use-orders-realtime";

// ─── Types ────────────────────────────────────────────────────────────────────
type TableView = {
  id: number;
  status: TableStatus;
  diners: number;
  order?: Order & { kitchen_status: string };
};

type CartItem = { product: Product; qty: number; notes: string };

const TABLE_COUNT = 12;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const statusMeta: Record<TableStatus, { label: string; color: string; dot: string }> = {
  available: { label: 'Libre',     color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',  dot: 'bg-emerald-500' },
  occupied:  { label: 'Ocupada',   color: 'bg-zinc-100 text-zinc-500 border-zinc-200',               dot: 'bg-zinc-400' },
  waiting:   { label: 'Cocinando', color: 'bg-amber-500/10 text-amber-600 border-amber-200',         dot: 'bg-amber-500' },
  ready:     { label: '¡Listo!',   color: 'bg-blue-500/10 text-blue-600 border-blue-200',            dot: 'bg-blue-500 animate-pulse' },
};

function kitchenLabel(s: string) {
  return { pending: 'Pendiente', preparing: 'Cocinando', ready: '¡Listo!', delivered: 'Entregado' }[s] ?? s;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WaiterPage() {
  const router = useRouter();
  const [employee, setEmployee] = useState<{ id: string; full_name: string } | null>(null);

  // Data
  const [tables, setTables] = useState<TableView[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [readyOrders, setReadyOrders] = useState<(Order & { kitchen_status: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);

  // Modal state
  const [selectedTable, setSelectedTable] = useState<TableView | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'new-order'>('view');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [diners, setDiners] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = localStorage.getItem('pos_employee_session');
    if (!s) { router.push('/login'); return; }
    const emp = JSON.parse(s);
    if (emp.role !== 'admin' && emp.role !== 'mesero') { router.push('/'); return; }
    setEmployee(emp);
  }, [router]);

  // ── Fetch tables from open orders ─────────────────────────────────────────
  const fetchTables = useCallback(async () => {
    const { data: openOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'abierta');

    const map = new Map<number, Order & { kitchen_status: string }>();
    (openOrders ?? []).forEach((o) => {
      const tid = parseInt(o.table_id);
      if (!isNaN(tid)) map.set(tid, o);
    });

    const built: TableView[] = Array.from({ length: TABLE_COUNT }, (_, i) => {
      const id = i + 1;
      const order = map.get(id);
      if (!order) return { id, status: 'available', diners: 0 };
      const ks = order.kitchen_status;
      const status: TableStatus = ks === 'ready' ? 'ready' : ks === 'pending' ? 'occupied' : 'waiting';
      return { id, status, diners: order.comensales ?? 1, order };
    });

    setTables(built);
    setReadyOrders((openOrders ?? []).filter(o => o.kitchen_status === 'ready') as (Order & { kitchen_status: string })[]);
    setLoading(false);
  }, []);

  const fetchProducts = useCallback(async () => {
    const { data } = await supabase.from('products').select('*').eq('is_active', true).order('category');
    setProducts((data ?? []) as Product[]);
  }, []);

  useEffect(() => {
    fetchTables();
    fetchProducts();
  }, [fetchTables, fetchProducts]);

  // ── Realtime subscription ─────────────────────────────────────────────────
  const { isConnected } = useOrdersRealtime({
    channelName: 'mesero-orders',
    onchange: () => fetchTables(),
    onRefresh: fetchTables,
    pollInterval: 20_000,
  });

  // Sync online indicator with realtime connection
  useEffect(() => { setOnline(isConnected); }, [isConnected]);

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { product, qty: 1, notes: '' }];
    });
  };

  const removeFromCart = (id: string) => setCart(prev => {
    const item = prev.find(i => i.product.id === id);
    if (!item) return prev;
    if (item.qty === 1) return prev.filter(i => i.product.id !== id);
    return prev.map(i => i.product.id === id ? { ...i, qty: i.qty - 1 } : i);
  });

  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  // ── Submit order ──────────────────────────────────────────────────────────
  const submitOrder = async () => {
    if (!selectedTable || cart.length === 0 || !employee) return;
    setSubmitting(true);
    try {
      const { data: order, error: oErr } = await supabase
        .from('orders')
        .insert({
          table_id: String(selectedTable.id),
          employee_id: employee.id,
          comensales: diners,
          status: 'abierta',
          kitchen_status: 'pending',
          total: cartTotal,
        })
        .select()
        .single();

      if (oErr || !order) throw oErr;

      await supabase.from('order_items').insert(
        cart.map(i => ({
          order_id: order.id,
          product_id: i.product.id,
          product_name: i.product.name,
          quantity: i.qty,
          price: i.product.price,
          notes: i.notes || null,
        }))
      );

      setCart([]);
      setSelectedTable(null);
      await fetchTables();
    } finally {
      setSubmitting(false);
    }
  };

  // ── Mark delivered ────────────────────────────────────────────────────────
  const markDelivered = async (orderId: string) => {
    await supabase.from('orders').update({ kitchen_status: 'delivered' }).eq('id', orderId);
    await fetchTables();
  };

  // ── Open modal ────────────────────────────────────────────────────────────
  const openTable = (table: TableView) => {
    setSelectedTable(table);
    setModalMode(table.status === 'available' ? 'new-order' : 'view');
    setCart([]);
    setDiners(table.diners || 1);
    setActiveCategory('all');
  };

  const closeModal = () => { setSelectedTable(null); setCart([]); };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const occupied = tables.filter(t => t.status !== 'available').length;
  const totalDiners = tables.reduce((s, t) => s + t.diners, 0);
  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];
  const filteredProducts = activeCategory === 'all' ? products : products.filter(p => p.category === activeCategory);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8f8f7] dark:bg-zinc-950 flex flex-col font-sans">

      {/* ── Header ── */}
      <header className="px-6 py-4 border-b border-zinc-200/60 dark:border-zinc-800 flex justify-between items-center sticky top-0 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tighter uppercase italic leading-none">Mesero Digital</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              {online
                ? <><Wifi className="w-3 h-3 text-emerald-500" /><span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">En línea</span></>
                : <><WifiOff className="w-3 h-3 text-red-400" /><span className="text-[9px] font-bold text-red-500 uppercase tracking-widest">Sin conexión</span></>
              }
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {readyOrders.length > 0 && (
            <div className="relative">
              <Bell className="w-5 h-5 text-zinc-400" />
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-500 rounded-full text-[8px] text-white font-black flex items-center justify-center animate-bounce">
                {readyOrders.length}
              </span>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={fetchTables} className="w-9 h-9 rounded-xl">
            <RefreshCw className="w-4 h-4 text-zinc-400" />
          </Button>
          <UserNav />
        </div>
      </header>

      <main className="flex-1 p-5 md:p-8 space-y-8 pb-6 overflow-y-auto">

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Mesas activas', value: `${occupied}/${TABLE_COUNT}`, sub: 'ocupadas' },
            { label: 'Comensales', value: totalDiners, sub: 'en servicio' },
            { label: 'Listas', value: readyOrders.length, sub: 'para entregar', highlight: readyOrders.length > 0 },
          ].map(s => (
            <div key={s.label} className={cn(
              "rounded-2xl p-4 border",
              s.highlight ? "bg-blue-500 border-blue-400 text-white" : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800"
            )}>
              <p className={cn("text-[9px] font-black uppercase tracking-widest mb-1", s.highlight ? "text-blue-100" : "text-zinc-400")}>{s.label}</p>
              <p className={cn("text-2xl font-black leading-none", s.highlight ? "text-white" : "text-zinc-900 dark:text-white")}>{s.value}</p>
              <p className={cn("text-[9px] font-bold mt-0.5", s.highlight ? "text-blue-200" : "text-zinc-400")}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Ready orders alert ── */}
        {readyOrders.length > 0 && (
          <div className="space-y-2">
            {readyOrders.map(o => (
              <div key={o.id} className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl px-5 py-3">
                <div className="flex items-center gap-3">
                  <ChefHat className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-[10px] font-black text-blue-700 dark:text-blue-300 uppercase tracking-widest">¡Orden lista para entregar!</p>
                    <p className="text-sm font-black text-blue-900 dark:text-blue-100">Mesa {o.table_id}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => markDelivered(o.id)}
                  className="h-8 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-black uppercase"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Entregado
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* ── Tables grid ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Mapa de Mesas</h2>
            <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-zinc-400">
              {Object.entries(statusMeta).map(([k, v]) => (
                <span key={k} className="flex items-center gap-1.5">
                  <span className={cn("w-2 h-2 rounded-full", v.dot)} />{v.label}
                </span>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {tables.map(table => (
                <button
                  key={table.id}
                  onClick={() => openTable(table)}
                  className={cn(
                    "group relative flex flex-col p-4 rounded-2xl border-2 transition-all duration-200 text-left active:scale-95 hover:shadow-lg",
                    table.status === 'available'
                      ? "border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-emerald-300 hover:bg-emerald-50/50"
                      : table.status === 'ready'
                      ? "border-blue-300 bg-blue-50 dark:bg-blue-900/20 shadow-md shadow-blue-100"
                      : "border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm"
                  )}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className={cn(
                      "text-2xl font-black tracking-tighter leading-none",
                      table.status === 'available' ? "text-zinc-200 dark:text-zinc-700" : "text-zinc-900 dark:text-white"
                    )}>
                      {String(table.id).padStart(2, '0')}
                    </span>
                    <span className={cn("w-2 h-2 rounded-full mt-1", statusMeta[table.status].dot)} />
                  </div>

                  {table.status === 'available' ? (
                    <div className="flex items-center gap-1 mt-auto">
                      <Plus className="w-3 h-3 text-emerald-500" />
                      <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Nueva</span>
                    </div>
                  ) : (
                    <div className="mt-auto space-y-1.5">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-zinc-400" />
                        <span className="text-[9px] font-bold text-zinc-500">{table.diners} pers.</span>
                      </div>
                      {table.order && (
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md",
                          statusMeta[table.status].color
                        )}>
                          {kitchenLabel(table.order.kitchen_status)}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ── Modal ── */}
      {selectedTable && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full sm:max-w-lg bg-white dark:bg-zinc-900 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="text-lg font-black tracking-tighter uppercase italic">Mesa {String(selectedTable.id).padStart(2, '0')}</h3>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  {selectedTable.status === 'available' ? 'Nueva orden' : `${selectedTable.diners} comensales • ${kitchenLabel(selectedTable.order?.kitchen_status ?? '')}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedTable.status !== 'available' && (
                  <Button size="sm" onClick={() => setModalMode('new-order')}
                    className="h-8 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-black uppercase">
                    <Plus className="w-3 h-3 mr-1" /> Agregar
                  </Button>
                )}
                <button onClick={closeModal} className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <X className="w-4 h-4 text-zinc-500" />
                </button>
              </div>
            </div>

            {/* View mode: table detail */}
            {modalMode === 'view' && selectedTable.order && (
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Estado cocina', value: kitchenLabel(selectedTable.order.kitchen_status) },
                    { label: 'Comensales', value: selectedTable.diners },
                    { label: 'Total', value: `$${selectedTable.order.total.toLocaleString()}` },
                    { label: 'Hora', value: new Date(selectedTable.order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
                  ].map(item => (
                    <div key={item.label} className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3">
                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{item.label}</p>
                      <p className="text-base font-black text-zinc-900 dark:text-white mt-0.5">{item.value}</p>
                    </div>
                  ))}
                </div>
                {selectedTable.order.kitchen_status === 'ready' && (
                  <Button onClick={() => markDelivered(selectedTable.order!.id)} className="w-full h-12 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-black uppercase tracking-widest text-xs">
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Marcar como Entregado
                  </Button>
                )}
              </div>
            )}

            {/* New order mode */}
            {modalMode === 'new-order' && (
              <>
                {/* Diners selector */}
                <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Comensales</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setDiners(d => Math.max(1, d - 1))} className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xl font-black w-6 text-center">{diners}</span>
                    <button onClick={() => setDiners(d => d + 1)} className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Category tabs */}
                <div className="px-6 py-3 flex gap-2 overflow-x-auto border-b border-zinc-100 dark:border-zinc-800 scrollbar-none">
                  {categories.map(cat => (
                    <button key={cat} onClick={() => setActiveCategory(cat)}
                      className={cn(
                        "shrink-0 h-7 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        activeCategory === cat ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                      )}>
                      {cat === 'all' ? 'Todo' : cat}
                    </button>
                  ))}
                </div>

                {/* Products */}
                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-2">
                  {filteredProducts.length === 0 ? (
                    <div className="col-span-2 h-32 flex flex-col items-center justify-center text-zinc-300">
                      <UtensilsCrossed className="w-8 h-8 mb-2" />
                      <p className="text-xs font-bold">Sin productos</p>
                    </div>
                  ) : filteredProducts.map(p => {
                    const inCart = cart.find(i => i.product.id === p.id);
                    return (
                      <button key={p.id} onClick={() => addToCart(p)}
                        className={cn(
                          "relative flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all active:scale-95",
                          inCart ? "border-orange-400 bg-orange-50 dark:bg-orange-900/20" : "border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-800 hover:border-zinc-200"
                        )}>
                        <span className="text-xs font-black text-zinc-900 dark:text-white leading-tight">{p.name}</span>
                        <span className="text-[10px] font-bold text-zinc-400 mt-0.5">{p.category}</span>
                        <span className="text-sm font-black text-orange-600 mt-2">${p.price}</span>
                        {inCart && (
                          <span className="absolute top-2 right-2 w-5 h-5 bg-orange-500 rounded-full text-[9px] text-white font-black flex items-center justify-center">
                            {inCart.qty}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Cart summary + submit */}
                {cart.length > 0 && (
                  <div className="border-t border-zinc-100 dark:border-zinc-800 p-4 space-y-3">
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                      {cart.map(item => (
                        <div key={item.product.id} className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg px-2 py-1">
                          <span className="text-[10px] font-black">{item.qty}× {item.product.name}</span>
                          <button onClick={() => removeFromCart(item.product.id)} className="text-zinc-400 hover:text-red-500">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{cartCount} items</p>
                        <p className="text-xl font-black text-zinc-900 dark:text-white">${cartTotal.toLocaleString()}</p>
                      </div>
                      <Button onClick={submitOrder} disabled={submitting}
                        className="h-12 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-orange-500/30">
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShoppingBag className="w-4 h-4 mr-2" />Enviar a Cocina</>}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
