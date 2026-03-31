'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { CajeroSidebar } from "@/components/CajeroSidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, CreditCard, Banknote, Search, Users, Receipt, ShoppingCart, Loader2, CheckCircle2, SplitSquareHorizontal, ChevronDown, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserNav } from "@/components/UserNav";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Product = { id: string; name: string; price: number; category: string | null; is_active: boolean; unit: string; size_variant: string | null; };
type OrderItem = { productId: string; name: string; price: number; quantity: number; seat: number; sizeLabel?: string; };
type TableState = { diners: number; items: OrderItem[]; activeSeat: number; };
type PayMethod = 'efectivo' | 'tarjeta';

const EMOJI: Record<string, string> = { tacos: '🌮', bebidas: '🥤', extras: '🌵', postres: '🍮', carnes: '🥩', otro: '🍽️' };
const getEmoji = (cat: string | null) => EMOJI[(cat ?? '').toLowerCase()] ?? '🍽️';
const DRINK_SIZES = [{ label: 'Chico', mult: 0.7 }, { label: 'Mediano', mult: 1.0 }, { label: 'Grande', mult: 1.3 }];
const SEAT_COLORS = ['bg-zinc-800 text-white', 'bg-blue-600 text-white', 'bg-violet-600 text-white', 'bg-pink-600 text-white', 'bg-amber-500 text-white', 'bg-teal-600 text-white', 'bg-rose-600 text-white', 'bg-indigo-600 text-white'];
const seatBg = (s: number) => SEAT_COLORS[s % SEAT_COLORS.length];

export default function CashierPage() {
  const router = useRouter();
  const [employee, setEmployee] = useState<{ full_name: string; id: string } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [openTables, setOpenTables] = useState<Record<string, TableState>>(() => {
    // Restore from localStorage on mount
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('pos_open_tables');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [dinersDialogOpen, setDinersDialogOpen] = useState(false);
  const [pendingTable, setPendingTable] = useState<string | null>(null);
  const [dinersCount, setDinersCount] = useState(1);
  const [sizePickerProduct, setSizePickerProduct] = useState<Product | null>(null);
  const [splitView, setSplitView] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payingSeat, setPayingSeat] = useState<number | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>('efectivo');
  const [cashReceived, setCashReceived] = useState('');
  const [paying, setPaying] = useState(false);
  const [paidSuccess, setPaidSuccess] = useState(false);

  useEffect(() => {
    const s = localStorage.getItem('pos_employee_session');
    if (!s) { router.push('/login'); return; }
    setEmployee(JSON.parse(s));
  }, [router]);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    const { data } = await supabase.from('products').select('*').eq('is_active', true).order('category').order('name');
    setProducts((data ?? []) as Product[]);
    setLoadingProducts(false);
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Persist table state to localStorage whenever it changes
  useEffect(() => {
    try { localStorage.setItem('pos_open_tables', JSON.stringify(openTables)); } catch {}
  }, [openTables]);

  const table = selectedTable ? openTables[selectedTable] : null;
  const allItems = table?.items ?? [];
  const activeSeat = table?.activeSeat ?? 0;
  const categories = ['all', ...Array.from(new Set(products.map(p => p.category ?? 'otro').filter(Boolean)))];
  const filteredProducts = products.filter(p =>
    (activeCategory === 'all' || (p.category ?? 'otro').toLowerCase() === activeCategory.toLowerCase()) &&
    (!searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  const visibleItems = splitView ? allItems.filter(i => i.seat === activeSeat) : allItems;
  const seatTotal = (s: number) => allItems.filter(i => i.seat === s).reduce((a, i) => a + i.price * i.quantity, 0);
  const tableTotal = allItems.reduce((a, i) => a + i.price * i.quantity, 0);
  const payTotal = payingSeat !== null ? seatTotal(payingSeat) : tableTotal;
  const change = parseFloat(cashReceived || '0') - payTotal;
  const itemsCount = allItems.reduce((a, i) => a + i.quantity, 0);
  const activeSeats = Array.from(new Set(allItems.map(i => i.seat))).sort((a, b) => a - b);

  const handleTableClick = (id: string) => {
    if (openTables[id]) { setSelectedTable(id); setSplitView(false); }
    else { setPendingTable(id); setDinersCount(1); setDinersDialogOpen(true); }
  };

  const cancelTable = (tableId: string) => {
    if (!confirm(`¿Cancelar mesa ${tableId}? Se perderán todos los items sin cobrar.`)) return;
    setOpenTables(prev => { const n = { ...prev }; delete n[tableId]; return n; });
    if (selectedTable === tableId) setSelectedTable(null);
  };

  const handleOpenTable = () => {
    if (!pendingTable) return;
    setOpenTables(p => ({ ...p, [pendingTable]: { diners: dinersCount, items: [], activeSeat: 0 } }));
    setSelectedTable(pendingTable);
    setDinersDialogOpen(false);
    setPendingTable(null);
  };

  const setActiveSeat = (s: number) => {
    if (!selectedTable) return;
    setOpenTables(p => ({ ...p, [selectedTable]: { ...p[selectedTable], activeSeat: s } }));
  };

  const addItem = (product: Product, sizeLabel?: string, priceOverride?: number) => {
    if (!selectedTable) return;
    const price = priceOverride ?? product.price;
    const name = sizeLabel ? `${product.name} (${sizeLabel})` : product.name;
    setOpenTables(prev => {
      const t = prev[selectedTable];
      const seat = t.activeSeat;
      const existing = t.items.find(i => i.productId === product.id && i.seat === seat && i.sizeLabel === sizeLabel);
      const items = existing
        ? t.items.map(i => i.productId === product.id && i.seat === seat && i.sizeLabel === sizeLabel ? { ...i, quantity: i.quantity + 1 } : i)
        : [...t.items, { productId: product.id, name, price, quantity: 1, seat, sizeLabel }];
      return { ...prev, [selectedTable]: { ...t, items } };
    });
  };

  const changeQty = (productId: string, seat: number, sizeLabel: string | undefined, delta: number) => {
    if (!selectedTable) return;
    setOpenTables(prev => {
      const t = prev[selectedTable];
      const items = t.items.map(i => i.productId === productId && i.seat === seat && i.sizeLabel === sizeLabel ? { ...i, quantity: i.quantity + delta } : i).filter(i => i.quantity > 0);
      return { ...prev, [selectedTable]: { ...t, items } };
    });
  };

  const handleProductClick = (p: Product) => {
    if (p.size_variant && p.category?.toLowerCase() === 'bebidas') setSizePickerProduct(p);
    else addItem(p);
  };

  const openPayDialog = (seat: number | null) => {
    setPayingSeat(seat); setPayMethod('efectivo'); setCashReceived(''); setPayDialogOpen(true);
  };

  const handlePay = async () => {
    if (!selectedTable || !employee) return;
    const t = openTables[selectedTable];
    const itemsToPay = payingSeat !== null ? t.items.filter(i => i.seat === payingSeat) : t.items;
    if (!itemsToPay.length) return;
    setPaying(true);
    try {
      const orderId = crypto.randomUUID();
      const total = itemsToPay.reduce((a, i) => a + i.price * i.quantity, 0);
      const { error: oErr } = await supabase.from('orders').insert({ id: orderId, table_id: selectedTable, employee_id: employee.id, comensales: payingSeat !== null ? 1 : t.diners, status: 'pagada', total, kitchen_status: 'pending' });
      if (oErr) throw oErr;
      const { error: iErr } = await supabase.from('order_items').insert(
        itemsToPay.map(i => ({ id: crypto.randomUUID(), order_id: orderId, product_id: i.productId, product_name: i.name, quantity: i.quantity, price: i.price, seat_number: i.seat || null }))
      );
      if (iErr) throw iErr;
      const remaining = t.items.filter(i => payingSeat !== null ? i.seat !== payingSeat : false);
      if (remaining.length === 0) {
        setOpenTables(prev => { const n = { ...prev }; delete n[selectedTable]; return n; });
        setPaidSuccess(true);
        setTimeout(() => { setPaidSuccess(false); setPayDialogOpen(false); setSelectedTable(null); setCashReceived(''); }, 1800);
      } else {
        setOpenTables(prev => ({ ...prev, [selectedTable]: { ...t, items: remaining, activeSeat: 0 } }));
        setPaidSuccess(true);
        setTimeout(() => { setPaidSuccess(false); setPayDialogOpen(false); setCashReceived(''); }, 1800);
      }
    } catch (e: unknown) { alert('Error al cobrar: ' + (e instanceof Error ? e.message : String(e))); }
    setPaying(false);
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-zinc-100 dark:bg-zinc-950">
        <CajeroSidebar activeCategory={activeCategory} onCategorySelect={setActiveCategory} orderTotal={tableTotal} itemsCount={itemsCount} />

        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          {/* ── Header ── */}
          <header className="h-14 shrink-0 flex items-center justify-between px-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border-none shrink-0" />
              <div className="leading-none">
                <p className="text-[11px] font-black uppercase tracking-widest text-orange-600">Taquería POS</p>
                <p className="text-[10px] font-semibold text-zinc-400">{employee?.full_name ?? '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedTable && (
                <Badge className="bg-emerald-500 text-white rounded-lg px-2.5 py-1 font-black text-[10px] uppercase tracking-widest">
                  Mesa {selectedTable} · {table?.diners}p
                </Badge>
              )}
              <UserNav />
            </div>
          </header>

          {!selectedTable ? (
            /* ══════════════════════════════════════════
               TABLE GRID VIEW
            ══════════════════════════════════════════ */
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black tracking-tighter text-zinc-900 dark:text-white">Mesas</h1>
                  <p className="text-xs font-semibold text-zinc-400 mt-0.5">
                    {Object.keys(openTables).length} abiertas · toca para abrir o continuar
                  </p>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-zinc-200 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600" />Libre</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-500" />Abierta</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500" />Ocupada</span>
                </div>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
                {Array.from({ length: 20 }, (_, i) => i + 1).map(num => {
                  const key = String(num);
                  const t = openTables[key];
                  const isOpen = !!t;
                  const hasItems = isOpen && t.items.length > 0;
                  const subtotal = t?.items.reduce((a, i) => a + i.price * i.quantity, 0) ?? 0;
                  return (
                    <button key={num} type="button" onClick={() => handleTableClick(key)}
                      className={cn(
                        'relative flex flex-col items-center justify-center rounded-2xl border-2 transition-all duration-200 active:scale-95 aspect-square select-none',
                        hasItems
                          ? 'bg-red-500 border-red-400 text-white shadow-lg shadow-red-900/25 hover:bg-red-400'
                          : isOpen
                          ? 'bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-900/20 hover:bg-orange-400'
                          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      )}>
                      <span className={cn('text-[8px] font-black uppercase tracking-widest leading-none mb-1',
                        isOpen ? 'text-white/70' : 'text-zinc-400')}>Mesa</span>
                      <span className="text-2xl font-black leading-none">{num}</span>
                      {isOpen && (
                        <span className="text-[8px] font-black mt-1 text-white/80">
                          {hasItems ? `$${subtotal.toFixed(0)}` : `${t.diners}p`}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ══════════════════════════════════════════
               POS VIEW — products + order panel
            ══════════════════════════════════════════ */
            <div className="flex flex-1 overflow-hidden">

              {/* ── Left: Products ── */}
              <div className="flex flex-col flex-1 overflow-hidden bg-zinc-100 dark:bg-zinc-950">
                {/* Toolbar */}
                <div className="shrink-0 flex items-center gap-2 px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                  <button type="button" onClick={() => { setSelectedTable(null); setSplitView(false); }}
                    className="h-9 w-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors shrink-0">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => selectedTable && cancelTable(selectedTable)}
                    className="h-9 px-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-black text-[10px] uppercase tracking-widest hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors shrink-0 flex items-center gap-1.5">
                    <Minus className="w-3.5 h-3.5" /> Cancelar mesa
                  </button>                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                    <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Buscar producto..." className="h-9 pl-9 rounded-xl border-none bg-zinc-100 dark:bg-zinc-800 font-semibold text-sm" />
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto">
                    {categories.map(c => (
                      <button key={c} type="button" onClick={() => setActiveCategory(c)}
                        className={cn('h-9 px-3 rounded-xl font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-all',
                          activeCategory === c
                            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                            : 'bg-white dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700')}>
                        {c === 'all' ? 'Todos' : c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Product grid */}
                <div className="flex-1 overflow-y-auto p-4">
                  {loadingProducts ? (
                    <div className="flex items-center justify-center h-full opacity-30">
                      <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-20">
                      <ShoppingCart className="h-12 w-12 mb-3" />
                      <p className="font-black text-xs uppercase tracking-widest">Sin productos</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {filteredProducts.map(p => (
                        <button key={p.id} type="button" onClick={() => handleProductClick(p)}
                          className="group flex flex-col items-center gap-2 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-orange-400 hover:shadow-md transition-all active:scale-95 text-center">
                          <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                            {getEmoji(p.category)}
                          </div>
                          <div className="space-y-0.5 w-full">
                            <p className="font-black text-[11px] text-zinc-900 dark:text-white uppercase leading-tight line-clamp-2">{p.name}</p>
                            <p className="font-black text-base text-orange-600">${p.price.toFixed(2)}</p>
                          </div>
                          {p.size_variant && (
                            <span className="flex items-center gap-0.5 text-[9px] font-black uppercase tracking-widest text-zinc-400">
                              <ChevronDown className="w-2.5 h-2.5" /> Tamaños
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Right: Order Panel ── */}
              <div className="w-80 xl:w-96 shrink-0 flex flex-col bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800">
                {/* Panel header */}
                <div className="shrink-0 px-4 pt-4 pb-3 border-b border-zinc-100 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-orange-600" />
                      <span className="font-black text-base tracking-tight">Mesa {selectedTable}</span>
                      <span className="text-xs font-semibold text-zinc-400">{table?.diners}p</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-zinc-400 uppercase">{itemsCount} items</span>
                      <button type="button" onClick={() => setSplitView(!splitView)}
                        title="Cuentas separadas"
                        className={cn('h-7 w-7 rounded-lg flex items-center justify-center transition-all',
                          splitView ? 'bg-orange-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700')}>
                        <SplitSquareHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Seat tabs */}
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                    <button type="button" onClick={() => { setActiveSeat(0); setSplitView(false); }}
                      className={cn('h-7 px-3 rounded-lg font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-all',
                        !splitView ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200')}>
                      Todos
                    </button>
                    {Array.from({ length: table?.diners ?? 0 }, (_, i) => i + 1).map(s => (
                      <button key={s} type="button" onClick={() => { setActiveSeat(s); setSplitView(true); }}
                        className={cn('h-7 px-3 rounded-lg font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-all',
                          activeSeat === s && splitView ? `${seatBg(s)} shadow-sm` : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200')}>
                        C{s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Items list */}
                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
                  {visibleItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-12 opacity-20">
                      <ShoppingCart className="w-10 h-10 mb-2" />
                      <p className="font-black text-[10px] uppercase tracking-widest text-center">
                        {splitView ? `C${activeSeat} sin items` : 'Orden vacía'}
                      </p>
                    </div>
                  ) : (
                    (!splitView ? activeSeats : [activeSeat]).map(seat => {
                      const seatItems = allItems.filter(i => i.seat === seat);
                      if (!seatItems.length) return null;
                      return (
                        <div key={seat} className="mb-2">
                          {!splitView && (
                            <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                              <span className={cn('text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md', seatBg(seat))}>
                                {seat === 0 ? 'Mesa' : `C${seat}`}
                              </span>
                              <span className="text-[10px] font-black text-zinc-500">${seatTotal(seat).toFixed(2)}</span>
                            </div>
                          )}
                          {seatItems.map(item => (
                            <div key={`${item.productId}-${item.seat}-${item.sizeLabel}`}
                              className="flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors group">
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-[11px] text-zinc-900 dark:text-white truncate leading-tight">{item.name}</p>
                                <p className="text-[10px] text-zinc-400 font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => changeQty(item.productId, item.seat, item.sizeLabel, -1)}
                                  className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-zinc-500 hover:bg-red-100 hover:text-red-600 transition-colors">
                                  <Minus className="w-2.5 h-2.5" />
                                </button>
                                <span className="font-black text-sm w-5 text-center tabular-nums">{item.quantity}</span>
                                <button onClick={() => changeQty(item.productId, item.seat, item.sizeLabel, 1)}
                                  className="w-6 h-6 rounded-lg bg-orange-600 text-white flex items-center justify-center hover:bg-orange-700 transition-colors">
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer / Pay */}
                <div className="shrink-0 border-t border-zinc-100 dark:border-zinc-800 p-4 space-y-3 bg-zinc-50/80 dark:bg-zinc-900">
                  {splitView && activeSeat > 0 ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className={cn('text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg', seatBg(activeSeat))}>
                          Comensal {activeSeat}
                        </span>
                        <span className="text-2xl font-black text-zinc-900 dark:text-white">${seatTotal(activeSeat).toFixed(2)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button onClick={() => openPayDialog(activeSeat)} disabled={seatTotal(activeSeat) === 0}
                          className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest disabled:opacity-40 gap-1.5">
                          <Banknote className="w-4 h-4" /> Efectivo
                        </Button>
                        <Button onClick={() => { setPayMethod('tarjeta'); openPayDialog(activeSeat); }} disabled={seatTotal(activeSeat) === 0}
                          className="h-11 rounded-xl bg-zinc-900 text-white font-black text-[10px] uppercase tracking-widest disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 gap-1.5">
                          <CreditCard className="w-4 h-4" /> Tarjeta
                        </Button>
                      </div>
                      <button type="button" onClick={() => openPayDialog(null)} disabled={tableTotal === 0}
                        className="w-full text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-colors disabled:opacity-30">
                        Cobrar mesa completa · ${tableTotal.toFixed(2)}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total</span>
                        <span className="text-3xl font-black text-zinc-900 dark:text-white">${tableTotal.toFixed(2)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button onClick={() => openPayDialog(null)} disabled={tableTotal === 0}
                          className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest disabled:opacity-40 gap-1.5">
                          <Banknote className="w-4 h-4" /> Efectivo
                        </Button>
                        <Button onClick={() => { setPayMethod('tarjeta'); openPayDialog(null); }} disabled={tableTotal === 0}
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

      {/* ── Diners dialog ── */}
      <Dialog open={dinersDialogOpen} onOpenChange={setDinersDialogOpen}>
        <DialogContent className="max-w-[300px] rounded-3xl p-7 bg-white dark:bg-zinc-900 border-none shadow-2xl">
          <DialogHeader className="text-center space-y-2">
            <div className="w-14 h-14 bg-orange-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg">
              <Users className="w-7 h-7" />
            </div>
            <DialogTitle className="text-xl font-black uppercase italic tracking-tighter">Mesa {pendingTable}</DialogTitle>
            <DialogDescription className="font-semibold text-[10px] uppercase tracking-widest text-zinc-400">¿Cuántos comensales?</DialogDescription>
          </DialogHeader>
          <div className="py-5 flex flex-col items-center gap-4">
            <div className="flex items-center gap-6">
              <button type="button" onClick={() => setDinersCount(Math.max(1, dinersCount - 1))}
                className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 transition-colors">
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-5xl font-black text-orange-600 tabular-nums w-12 text-center">{dinersCount}</span>
              <button type="button" onClick={() => setDinersCount(dinersCount + 1)}
                className="w-11 h-11 rounded-xl bg-orange-600 text-white flex items-center justify-center hover:bg-orange-700 transition-colors shadow-md">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 w-full">
              {[1, 2, 4, 6].map(v => (
                <button key={v} type="button" onClick={() => setDinersCount(v)}
                  className={cn('h-9 rounded-xl font-black text-sm transition-all',
                    dinersCount === v ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200')}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleOpenTable} className="w-full h-12 rounded-2xl bg-zinc-900 text-white font-black text-xs uppercase tracking-widest hover:bg-black dark:bg-zinc-100 dark:text-zinc-900">
            Abrir mesa 🚀
          </Button>
        </DialogContent>
      </Dialog>

      {/* ── Drink size picker ── */}
      <Dialog open={!!sizePickerProduct} onOpenChange={o => !o && setSizePickerProduct(null)}>
        <DialogContent className="max-w-[280px] rounded-3xl p-6 bg-white dark:bg-zinc-900 border-none shadow-2xl">
          <DialogHeader className="text-center space-y-1 mb-4">
            <div className="text-4xl mb-1">🥤</div>
            <DialogTitle className="text-lg font-black uppercase italic tracking-tighter">{sizePickerProduct?.name}</DialogTitle>
            <DialogDescription className="font-semibold text-[10px] uppercase tracking-widest text-zinc-400">Elige el tamaño</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {DRINK_SIZES.map(sz => {
              const price = Math.round((sizePickerProduct?.price ?? 0) * sz.mult * 100) / 100;
              return (
                <button key={sz.label} type="button"
                  onClick={() => { if (sizePickerProduct) { addItem(sizePickerProduct, sz.label, price); setSizePickerProduct(null); } }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 hover:bg-orange-50 dark:hover:bg-zinc-700 border border-zinc-100 dark:border-zinc-700 hover:border-orange-300 transition-all active:scale-95">
                  <span className="font-black text-sm uppercase tracking-widest text-zinc-700 dark:text-zinc-200">{sz.label}</span>
                  <span className="font-black text-base text-orange-600">${price.toFixed(2)}</span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Pay dialog ── */}
      <Dialog open={payDialogOpen} onOpenChange={o => !paying && setPayDialogOpen(o)}>
        <DialogContent className="max-w-[360px] w-full rounded-3xl border-none bg-white dark:bg-zinc-900 shadow-2xl p-0 overflow-hidden">
          {paidSuccess ? (
            <div className="flex flex-col items-center justify-center py-14 gap-4 px-8">
              <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-xl">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <p className="text-2xl font-black uppercase italic tracking-tighter text-emerald-600">¡Cobrado!</p>
              <p className="text-sm font-semibold text-zinc-400">
                {payingSeat !== null ? `Comensal ${payingSeat}` : `Mesa ${selectedTable}`} cerrada
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Top section */}
              <div className="px-6 pt-6 pb-5 space-y-4">
                {/* Title row */}
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0',
                    payMethod === 'efectivo' ? 'bg-emerald-600' : 'bg-zinc-900 dark:bg-zinc-100')}>
                    {payMethod === 'efectivo'
                      ? <Banknote className="w-5 h-5" />
                      : <CreditCard className="w-5 h-5 dark:text-zinc-900" />}
                  </div>
                  <div>
                    <p className="font-black text-base uppercase tracking-tight leading-none">
                      {payMethod === 'efectivo' ? 'Cobro efectivo' : 'Cobro tarjeta'}
                    </p>
                    <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mt-0.5">
                      {payingSeat !== null ? `Comensal ${payingSeat}` : `Mesa ${selectedTable} completa`}
                    </p>
                  </div>
                </div>

                {/* Method toggle */}
                <div className="grid grid-cols-2 gap-2">
                  {(['efectivo', 'tarjeta'] as PayMethod[]).map(m => (
                    <button key={m} type="button" onClick={() => setPayMethod(m)}
                      className={cn('h-10 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all',
                        payMethod === m
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700')}>
                      {m === 'efectivo' ? '💵 Efectivo' : '💳 Tarjeta'}
                    </button>
                  ))}
                </div>

                {/* Total */}
                <div className="flex justify-between items-center rounded-2xl bg-zinc-50 dark:bg-zinc-800 px-4 py-3">
                  <span className="font-black text-[10px] uppercase tracking-widest text-zinc-400">Total a cobrar</span>
                  <span className="font-black text-3xl text-zinc-900 dark:text-white">${payTotal.toFixed(2)}</span>
                </div>

                {/* Cash input */}
                {payMethod === 'efectivo' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Efectivo recibido</label>
                    <Input
                      type="number"
                      min={payTotal}
                      value={cashReceived}
                      onChange={e => setCashReceived(e.target.value)}
                      placeholder={payTotal.toFixed(2)}
                      autoFocus
                      className="h-12 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-black text-xl shadow-none focus-visible:ring-2 focus-visible:ring-orange-500"
                    />
                    {parseFloat(cashReceived || '0') >= payTotal && (
                      <div className="flex justify-between items-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3">
                        <span className="font-black text-[10px] uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Cambio</span>
                        <span className="font-black text-2xl text-emerald-600">${change.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom actions — always visible */}
              <div className="px-6 pb-6 pt-2 space-y-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900">
                <Button
                  onClick={handlePay}
                  disabled={paying || (payMethod === 'efectivo' && parseFloat(cashReceived || '0') < payTotal)}
                  className="h-12 w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-widest shadow-md disabled:opacity-40"
                >
                  {paying ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirmar cobro'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setPayDialogOpen(false)}
                  disabled={paying}
                  className="h-9 w-full rounded-2xl font-black text-[10px] uppercase text-zinc-400 hover:text-zinc-600"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
