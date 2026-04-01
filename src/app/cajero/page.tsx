'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { CajeroSidebar } from "@/components/CajeroSidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Minus, CreditCard, Banknote, Search, Receipt,
  ShoppingCart, Loader2, CheckCircle2, SplitSquareHorizontal,
  ChevronDown, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserNav } from "@/components/UserNav";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationBell } from "@/components/NotificationBell";
import { useOfflineQueue } from "@/hooks/use-offline-queue";
import { CloudOff } from "lucide-react";
import { CashSessionGate } from "@/components/CashSessionGate";
import { CashSessionBar } from "@/components/CashSessionBar";
import { useOrdersRealtime } from "@/hooks/use-orders-realtime";

type Product = {
  id: string; name: string; price: number; category: string | null;
  is_active: boolean; unit: string; size_variant: string | null;
};
type CartItem = { productId: string; name: string; price: number; quantity: number; seat: number; sizeLabel?: string; };
type LiveOrder = {
  id: string; table_id: string; comensales: number; total: number;
  status: string; kitchen_status: string; created_at: string;
  order_items: { id: string; product_name: string; quantity: number; price: number; seat_number: number | null }[];
};
type PayMethod = 'efectivo' | 'tarjeta';

const EMOJI: Record<string, string> = { tacos: '🌮', bebidas: '🥤', extras: '🌵', postres: '🍮', carnes: '🥩', otro: '🍽️' };
const getEmoji = (cat: string | null) => EMOJI[(cat ?? '').toLowerCase()] ?? '🍽️';
const DRINK_SIZES = [{ label: 'Chico', mult: 0.7 }, { label: 'Mediano', mult: 1.0 }, { label: 'Grande', mult: 1.3 }];
const SEAT_COLORS = ['bg-zinc-800 text-white','bg-blue-600 text-white','bg-violet-600 text-white','bg-pink-600 text-white','bg-amber-500 text-white','bg-teal-600 text-white'];
const seatBg = (s: number) => SEAT_COLORS[s % SEAT_COLORS.length];

export default function CashierPage() {
  const router = useRouter();
  const [employee, setEmployee] = useState<{ full_name: string; id: string } | null>(null);

  // Products
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sizePickerProduct, setSizePickerProduct] = useState<Product | null>(null);

  // Live orders from Supabase
  const [liveOrders, setLiveOrders] = useState<LiveOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Active table / new order state
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);  // existing order
  const [newTableId, setNewTableId] = useState<string | null>(null);            // creating new
  const [newDiners, setNewDiners] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeSeat, setActiveSeat] = useState(0);
  const [splitView, setSplitView] = useState(false);
  const [dinersDialog, setDinersDialog] = useState(false);
  const [pendingTableId, setPendingTableId] = useState<string | null>(null);

  // Pay
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payingSeat, setPayingSeat] = useState<number | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>('efectivo');
  const [cashReceived, setCashReceived] = useState('');
  const [paying, setPaying] = useState(false);
  const [paidSuccess, setPaidSuccess] = useState(false);

  // Notifications + offline
  const { notifications, unreadCount, markAllRead, markRead, clear } = useNotifications({ role: 'cajero' });
  const { isOnline } = useOfflineQueue();

  // Auth
  useEffect(() => {
    const s = localStorage.getItem('pos_employee_session');
    if (!s) { router.push('/login'); return; }
    setEmployee(JSON.parse(s));
  }, [router]);

  // ── Fetch live orders ────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('id, table_id, comensales, total, status, kitchen_status, created_at, order_items(id, product_name, quantity, price, seat_number)')
      .eq('status', 'abierta')
      .order('created_at', { ascending: true });
    setLiveOrders((data ?? []) as LiveOrder[]);
    setLoadingOrders(false);
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    const { data } = await supabase.from('products').select('*').eq('is_active', true).order('category').order('name');
    setProducts((data ?? []) as Product[]);
    setLoadingProducts(false);
  }, []);

  useEffect(() => { fetchOrders(); fetchProducts(); }, [fetchOrders, fetchProducts]);

  // Realtime: refresh orders on any change
  useOrdersRealtime({ channelName: 'cajero-live', onchange: () => fetchOrders(), onRefresh: fetchOrders, pollInterval: 20_000 });

  // ── Derived ──────────────────────────────────────────────────────────────
  const selectedOrder = liveOrders.find(o => o.id === selectedOrderId) ?? null;
  const categories = ['all', ...Array.from(new Set(products.map(p => p.category ?? 'otro').filter(Boolean)))];
  const filteredProducts = products.filter(p =>
    (activeCategory === 'all' || (p.category ?? 'otro').toLowerCase() === activeCategory.toLowerCase()) &&
    (!searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Cart helpers (for new orders being built)
  const cartTotal = cart.reduce((a, i) => a + i.price * i.quantity, 0);
  const cartCount = cart.reduce((a, i) => a + i.quantity, 0);
  const seatCartTotal = (s: number) => cart.filter(i => i.seat === s).reduce((a, i) => a + i.price * i.quantity, 0);
  const visibleCart = splitView ? cart.filter(i => i.seat === activeSeat) : cart;
  const activeSeatsInCart = Array.from(new Set(cart.map(i => i.seat))).sort((a, b) => a - b);

  // For existing order items shown in pay panel
  const orderItems = selectedOrder?.order_items ?? [];
  const orderTotal = orderItems.reduce((a, i) => a + Number(i.price) * i.quantity, 0);
  const seatOrderTotal = (s: number) => orderItems.filter(i => (i.seat_number ?? 0) === s).reduce((a, i) => a + Number(i.price) * i.quantity, 0);
  const payTotal = payingSeat !== null ? seatOrderTotal(payingSeat) : orderTotal;
  const change = parseFloat(cashReceived || '0') - payTotal;

  // ── Table grid helpers ───────────────────────────────────────────────────
  const TABLE_COUNT = 20;
  const occupiedTableIds = new Set(liveOrders.map(o => o.table_id));

  const handleTableClick = (tableId: string) => {
    const existing = liveOrders.find(o => o.table_id === tableId);
    if (existing) {
      setSelectedOrderId(existing.id);
      setNewTableId(null);
      setCart([]);
      setSplitView(false);
      setActiveSeat(0);
    } else {
      setPendingTableId(tableId);
      setNewDiners(1);
      setDinersDialog(true);
    }
  };

  const handleConfirmNewTable = () => {
    if (!pendingTableId) return;
    setNewTableId(pendingTableId);
    setSelectedOrderId(null);
    setCart([]);
    setActiveSeat(0);
    setSplitView(false);
    setDinersDialog(false);
    setPendingTableId(null);
  };

  const handleBack = () => {
    setSelectedOrderId(null);
    setNewTableId(null);
    setCart([]);
    setSplitView(false);
  };

  // ── Cart mutations ───────────────────────────────────────────────────────
  const addToCart = (product: Product, sizeLabel?: string, priceOverride?: number) => {
    const price = priceOverride ?? product.price;
    const name = sizeLabel ? `${product.name} (${sizeLabel})` : product.name;
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id && i.seat === activeSeat && i.sizeLabel === sizeLabel);
      if (existing) return prev.map(i => i.productId === product.id && i.seat === activeSeat && i.sizeLabel === sizeLabel ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { productId: product.id, name, price, quantity: 1, seat: activeSeat, sizeLabel }];
    });
  };

  const changeQty = (productId: string, seat: number, sizeLabel: string | undefined, delta: number) => {
    setCart(prev => prev.map(i => i.productId === productId && i.seat === seat && i.sizeLabel === sizeLabel ? { ...i, quantity: i.quantity + delta } : i).filter(i => i.quantity > 0));
  };

  const handleProductClick = (p: Product) => {
    if (p.size_variant && p.category?.toLowerCase() === 'bebidas') setSizePickerProduct(p);
    else addToCart(p);
  };

  // ── Submit new order to Supabase ─────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const handleSubmitOrder = async () => {
    if (!newTableId || cart.length === 0 || !employee) return;
    setSubmitting(true);
    try {
      const total = cartTotal;
      const { data: order, error: oErr } = await supabase.from('orders').insert({
        table_id: newTableId,
        employee_id: employee.id,
        comensales: newDiners,
        status: 'abierta',
        kitchen_status: 'pending',
        total,
      }).select().single();
      if (oErr || !order) throw oErr;

      await supabase.from('order_items').insert(
        cart.map(i => ({
          order_id: order.id,
          product_id: i.productId,
          product_name: i.name,
          quantity: i.quantity,
          price: i.price,
          seat_number: i.seat || null,
        }))
      );

      setCart([]);
      setNewTableId(null);
      setSelectedOrderId(order.id);
      await fetchOrders();
    } catch (e) { alert('Error al crear orden: ' + String(e)); }
    setSubmitting(false);
  };

  // ── Pay ──────────────────────────────────────────────────────────────────
  const openPayDialog = (seat: number | null) => {
    setPayingSeat(seat); setPayMethod('efectivo'); setCashReceived(''); setPayDialogOpen(true);
  };

  const handlePay = async () => {
    if (!selectedOrder || !employee) return;
    setPaying(true);
    try {
      const { error } = await supabase.from('orders').update({
        status: 'pagada',
        paid_at: new Date().toISOString(),
      }).eq('id', selectedOrder.id);
      if (error) throw error;

      setPaidSuccess(true);
      setTimeout(async () => {
        setPaidSuccess(false);
        setPayDialogOpen(false);
        setSelectedOrderId(null);
        setCashReceived('');
        await fetchOrders();
      }, 1600);
    } catch (e) { alert('Error al cobrar: ' + String(e)); }
    setPaying(false);
  };

  const isInPOS = !!selectedOrderId || !!newTableId;

  return (
    <CashSessionGate>
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-zinc-100 dark:bg-zinc-950">
        <CajeroSidebar activeCategory={activeCategory} onCategorySelect={setActiveCategory} orderTotal={isInPOS ? (newTableId ? cartTotal : orderTotal) : 0} itemsCount={isInPOS ? (newTableId ? cartCount : orderItems.reduce((a,i)=>a+i.quantity,0)) : 0} />

        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <header className="h-14 shrink-0 flex items-center justify-between px-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border-none shrink-0" />
              <div className="leading-none">
                <p className="text-[11px] font-black uppercase tracking-widest text-orange-600">Taquería POS</p>
                <p className="text-[10px] font-semibold text-zinc-400">{employee?.full_name ?? '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isInPOS && (
                <Badge className="bg-emerald-500 text-white rounded-lg px-2.5 py-1 font-black text-[10px] uppercase tracking-widest">
                  Mesa {selectedOrder?.table_id ?? newTableId} · {selectedOrder?.comensales ?? newDiners}p
                </Badge>
              )}
              <NotificationBell notifications={notifications} unreadCount={unreadCount} onMarkAllRead={markAllRead} onMarkRead={markRead} onClear={clear} />
              <UserNav />
            </div>
          </header>

          {/* Offline banner */}
          {!isOnline && (
            <div className="shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest">
              <CloudOff className="w-3.5 h-3.5" /> Sin conexión
            </div>
          )}

          {/* Cash session bar — inside SidebarInset so sidebar doesn't overlap */}
          <CashSessionBar />

          {/* ── TABLE GRID ── */}
          {!isInPOS && (
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black tracking-tighter text-zinc-900 dark:text-white">Mesas</h1>
                  <p className="text-xs font-semibold text-zinc-400 mt-0.5">
                    {liveOrders.length} con orden abierta · toca para cobrar o abrir nueva
                  </p>
                </div>
                <button onClick={fetchOrders} className="h-8 w-8 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-orange-600 transition-colors">
                  <ChevronDown className={cn('w-4 h-4', loadingOrders && 'animate-spin')} />
                </button>
              </div>

              {loadingOrders ? (
                <div className="flex items-center justify-center h-48 opacity-30">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
                  {Array.from({ length: TABLE_COUNT }, (_, i) => i + 1).map(num => {
                    const key = String(num);
                    const order = liveOrders.find(o => o.table_id === key);
                    const isOccupied = !!order;
                    return (
                      <button key={num} type="button" onClick={() => handleTableClick(key)}
                        className={cn(
                          'relative flex flex-col items-center justify-center rounded-2xl border-2 transition-all duration-200 active:scale-95 aspect-square select-none',
                          isOccupied
                            ? 'bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-900/20 hover:bg-orange-400'
                            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                        )}>
                        <span className={cn('text-[8px] font-black uppercase tracking-widest leading-none mb-1', isOccupied ? 'text-white/70' : 'text-zinc-400')}>Mesa</span>
                        <span className="text-2xl font-black leading-none">{num}</span>
                        {isOccupied && order && (
                          <span className="text-[8px] font-black mt-1 text-white/80">${Number(order.total).toFixed(0)}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── POS VIEW ── */}
          {isInPOS && (
            <div className="flex flex-1 overflow-hidden">
              {/* Products */}
              <div className="flex flex-col flex-1 overflow-hidden bg-zinc-100 dark:bg-zinc-950">
                <div className="shrink-0 flex items-center gap-2 px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                  <button type="button" onClick={handleBack} className="h-9 w-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 transition-colors shrink-0">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                    <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar producto..." className="h-9 pl-9 rounded-xl border-none bg-zinc-100 dark:bg-zinc-800 font-semibold text-sm" />
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto">
                    {categories.map(c => (
                      <button key={c} type="button" onClick={() => setActiveCategory(c)}
                        className={cn('h-9 px-3 rounded-xl font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-all',
                          activeCategory === c ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-white dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700')}>
                        {c === 'all' ? 'Todos' : c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {loadingProducts ? (
                    <div className="flex items-center justify-center h-full opacity-30"><Loader2 className="h-10 w-10 animate-spin text-orange-600" /></div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-20"><ShoppingCart className="h-12 w-12 mb-3" /><p className="font-black text-xs uppercase tracking-widest">Sin productos</p></div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {filteredProducts.map(p => (
                        <button key={p.id} type="button" onClick={() => handleProductClick(p)}
                          className="group flex flex-col items-center gap-2 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-orange-400 hover:shadow-md transition-all active:scale-95 text-center">
                          <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">{getEmoji(p.category)}</div>
                          <div className="space-y-0.5 w-full">
                            <p className="font-black text-[11px] text-zinc-900 dark:text-white uppercase leading-tight line-clamp-2">{p.name}</p>
                            <p className="font-black text-base text-orange-600">${p.price.toFixed(2)}</p>
                          </div>
                          {p.size_variant && <span className="flex items-center gap-0.5 text-[9px] font-black uppercase tracking-widest text-zinc-400"><ChevronDown className="w-2.5 h-2.5" /> Tamaños</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Order panel */}
              <div className="w-72 xl:w-80 shrink-0 flex flex-col bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800">
                <div className="shrink-0 px-4 pt-4 pb-3 border-b border-zinc-100 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-orange-600" />
                      <span className="font-black text-base tracking-tight">Mesa {selectedOrder?.table_id ?? newTableId}</span>
                      <span className="text-xs font-semibold text-zinc-400">{selectedOrder?.comensales ?? newDiners}p</span>
                    </div>
                    {newTableId && (
                      <button type="button" onClick={() => setSplitView(!splitView)}
                        className={cn('h-7 w-7 rounded-lg flex items-center justify-center transition-all', splitView ? 'bg-orange-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400')}>
                        <SplitSquareHorizontal className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Seat tabs — only for new orders */}
                  {newTableId && (
                    <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                      <button type="button" onClick={() => { setActiveSeat(0); setSplitView(false); }}
                        className={cn('h-7 px-3 rounded-lg font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-all',
                          !splitView ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500')}>
                        Todos
                      </button>
                      {Array.from({ length: newDiners }, (_, i) => i + 1).map(s => (
                        <button key={s} type="button" onClick={() => { setActiveSeat(s); setSplitView(true); }}
                          className={cn('h-7 px-3 rounded-lg font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-all',
                            activeSeat === s && splitView ? `${seatBg(s)} shadow-sm` : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500')}>
                          C{s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
                  {/* New order: show cart */}
                  {newTableId && (
                    visibleCart.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full py-12 opacity-20">
                        <ShoppingCart className="w-10 h-10 mb-2" />
                        <p className="font-black text-[10px] uppercase tracking-widest text-center">Orden vacía</p>
                      </div>
                    ) : (
                      (splitView ? [activeSeat] : activeSeatsInCart).map(seat => {
                        const items = cart.filter(i => i.seat === seat);
                        if (!items.length) return null;
                        return (
                          <div key={seat} className="mb-2">
                            {!splitView && (
                              <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                                <span className={cn('text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md', seatBg(seat))}>{seat === 0 ? 'Mesa' : `C${seat}`}</span>
                                <span className="text-[10px] font-black text-zinc-500">${seatCartTotal(seat).toFixed(2)}</span>
                              </div>
                            )}
                            {items.map(item => (
                              <div key={`${item.productId}-${item.seat}-${item.sizeLabel}`} className="flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors">
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-[11px] text-zinc-900 dark:text-white truncate leading-tight">{item.name}</p>
                                  <p className="text-[10px] text-zinc-400 font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button onClick={() => changeQty(item.productId, item.seat, item.sizeLabel, -1)} className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-zinc-500 hover:bg-red-100 hover:text-red-600 transition-colors"><Minus className="w-2.5 h-2.5" /></button>
                                  <span className="font-black text-sm w-5 text-center tabular-nums">{item.quantity}</span>
                                  <button onClick={() => changeQty(item.productId, item.seat, item.sizeLabel, 1)} className="w-6 h-6 rounded-lg bg-orange-600 text-white flex items-center justify-center hover:bg-orange-700 transition-colors"><Plus className="w-2.5 h-2.5" /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })
                    )
                  )}

                  {/* Existing order: show DB items */}
                  {selectedOrder && (
                    orderItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full py-12 opacity-20">
                        <ShoppingCart className="w-10 h-10 mb-2" />
                        <p className="font-black text-[10px] uppercase tracking-widest">Sin items</p>
                      </div>
                    ) : orderItems.map(item => (
                      <div key={item.id} className="flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[11px] text-zinc-900 dark:text-white truncate leading-tight">{item.product_name}</p>
                          <p className="text-[10px] text-zinc-400 font-semibold">${(Number(item.price) * item.quantity).toFixed(2)}</p>
                        </div>
                        <span className="font-black text-sm tabular-nums text-zinc-600 dark:text-zinc-300">×{item.quantity}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="shrink-0 border-t border-zinc-100 dark:border-zinc-800 p-4 space-y-3 bg-zinc-50/80 dark:bg-zinc-900">
                  {/* New order: send to kitchen */}
                  {newTableId && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total</span>
                        <span className="text-3xl font-black text-zinc-900 dark:text-white">${cartTotal.toFixed(2)}</span>
                      </div>
                      <Button onClick={handleSubmitOrder} disabled={submitting || cart.length === 0}
                        className="w-full h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-widest disabled:opacity-40">
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar a cocina'}
                      </Button>
                    </>
                  )}

                  {/* Existing order: pay */}
                  {selectedOrder && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total</span>
                        <span className="text-3xl font-black text-zinc-900 dark:text-white">${orderTotal.toFixed(2)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button onClick={() => openPayDialog(null)} disabled={orderTotal === 0}
                          className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest disabled:opacity-40 gap-1.5">
                          <Banknote className="w-4 h-4" /> Efectivo
                        </Button>
                        <Button onClick={() => { setPayMethod('tarjeta'); openPayDialog(null); }} disabled={orderTotal === 0}
                          className="h-12 rounded-xl bg-zinc-900 text-white font-black text-[10px] uppercase tracking-widest disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 gap-1.5">
                          <CreditCard className="w-4 h-4" /> Tarjeta
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </SidebarInset>
      </div>

      {/* Diners dialog */}
      <Dialog open={dinersDialog} onOpenChange={setDinersDialog}>
        <DialogContent className="max-w-[300px] rounded-3xl p-7 bg-white dark:bg-zinc-900 border-none shadow-2xl">
          <DialogHeader className="text-center space-y-2">
            <div className="w-14 h-14 bg-orange-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg">
              <Receipt className="w-7 h-7" />
            </div>
            <DialogTitle className="text-xl font-black uppercase italic tracking-tighter">Mesa {pendingTableId}</DialogTitle>
            <DialogDescription className="font-semibold text-[10px] uppercase tracking-widest text-zinc-400">¿Cuántos comensales?</DialogDescription>
          </DialogHeader>
          <div className="py-5 flex flex-col items-center gap-4">
            <div className="flex items-center gap-6">
              <button type="button" onClick={() => setNewDiners(Math.max(1, newDiners - 1))} className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 transition-colors font-black text-xl">-</button>
              <span className="text-4xl font-black w-12 text-center tabular-nums">{newDiners}</span>
              <button type="button" onClick={() => setNewDiners(newDiners + 1)} className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 transition-colors font-black text-xl">+</button>
            </div>
            <Button onClick={handleConfirmNewTable} className="w-full h-12 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-sm uppercase tracking-widest">
              Abrir mesa
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pay dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-7 bg-white dark:bg-zinc-900 border-none shadow-2xl">
          <DialogHeader className="space-y-2">
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg">
              {payMethod === 'efectivo' ? <Banknote className="w-6 h-6" /> : <CreditCard className="w-6 h-6" />}
            </div>
            <DialogTitle className="text-xl font-black uppercase italic tracking-tighter text-center">
              {paidSuccess ? '¡Cobrado!' : `Cobrar · Mesa ${selectedOrder?.table_id}`}
            </DialogTitle>
            <DialogDescription className="text-center font-bold text-[10px] uppercase tracking-widest text-zinc-400">
              Total: ${payTotal.toFixed(2)}
            </DialogDescription>
          </DialogHeader>

          {paidSuccess ? (
            <div className="flex flex-col items-center py-6 gap-3">
              <CheckCircle2 className="w-16 h-16 text-emerald-500" />
              <p className="font-black text-emerald-600 uppercase tracking-widest text-sm">Pago registrado</p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="flex gap-2">
                {(['efectivo', 'tarjeta'] as PayMethod[]).map(m => (
                  <button key={m} type="button" onClick={() => setPayMethod(m)}
                    className={cn('flex-1 h-10 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all',
                      payMethod === m ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500')}>
                    {m}
                  </button>
                ))}
              </div>

              {payMethod === 'efectivo' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Efectivo recibido</label>
                    <Input type="number" min="0" value={cashReceived} onChange={e => setCashReceived(e.target.value)}
                      placeholder="0.00" className="h-14 rounded-2xl border-none bg-zinc-50 dark:bg-zinc-800 font-black text-2xl" />
                  </div>
                  {cashReceived && (
                    <div className={cn('flex justify-between rounded-2xl px-4 py-3', change >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-red-50 dark:bg-red-950/20')}>
                      <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Cambio</span>
                      <span className={cn('font-black text-lg', change >= 0 ? 'text-emerald-600' : 'text-red-600')}>${change.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}

              <Button onClick={handlePay} disabled={paying || (payMethod === 'efectivo' && change < 0)}
                className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-widest disabled:opacity-40">
                {paying ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar cobro'}
              </Button>
              <Button variant="ghost" onClick={() => setPayDialogOpen(false)} disabled={paying}
                className="w-full h-9 rounded-2xl font-black text-[10px] uppercase text-zinc-400">
                Cancelar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Size picker */}
      <Dialog open={!!sizePickerProduct} onOpenChange={() => setSizePickerProduct(null)}>
        <DialogContent className="max-w-xs rounded-3xl p-7 bg-white dark:bg-zinc-900 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase italic tracking-tighter">{sizePickerProduct?.name}</DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Selecciona el tamaño</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-3">
            {DRINK_SIZES.map(sz => (
              <button key={sz.label} type="button"
                onClick={() => { if (sizePickerProduct) { addToCart(sizePickerProduct, sz.label, Math.round(sizePickerProduct.price * sz.mult * 100) / 100); setSizePickerProduct(null); } }}
                className="w-full flex items-center justify-between h-12 px-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-400 border border-zinc-100 dark:border-zinc-700 transition-all">
                <span className="font-black text-sm">{sz.label}</span>
                <span className="font-black text-orange-600">${sizePickerProduct ? (sizePickerProduct.price * sz.mult).toFixed(2) : ''}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

    </SidebarProvider>
    </CashSessionGate>
  );
}
