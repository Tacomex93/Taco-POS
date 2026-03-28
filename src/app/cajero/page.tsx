'use client';

import React, { useState } from 'react';

type Order = {
  id: string;
  table: number;
  itemsCount: number;
  total: number;
  status: 'pending' | 'paid' | 'ready';
  time: string;
};

const INITIAL_ORDERS: Order[] = [
  { id: 'ORD-001', table: 5, itemsCount: 12, total: 345, status: 'pending', time: '14:30' },
  { id: 'ORD-002', table: 2, itemsCount: 4, total: 112, status: 'ready', time: '14:45' },
  { id: 'ORD-003', table: 8, itemsCount: 18, total: 560, status: 'pending', time: '15:10' },
  { id: 'ORD-004', table: 1, itemsCount: 6, total: 180, status: 'paid', time: '15:20' },
];

export default function CashierPage() {
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');

  const filteredOrders = orders.filter(o => 
    filter === 'all' ? true : o.status === filter
  );

  const totalCollected = orders.filter(o => o.status === 'paid').reduce((acc, o) => acc + o.total, 0);

  const settleOrder = (id: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'paid' } : o));
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-[#65a30d] rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-lime-900/20">
               $
             </div>
             <div>
               <h1 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight uppercase">Módulo de Caja</h1>
               <p className="text-xs font-bold text-zinc-400">Juan Pérez • Turno de Tarde</p>
             </div>
          </div>
          
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-2xl gap-2 font-bold text-sm">
            <div className="px-4 py-2 border-r border-zinc-200 dark:border-zinc-700">
              <span className="text-zinc-400 mr-2">Ventas:</span>
              <span className="text-emerald-600">${totalCollected}</span>
            </div>
            <div className="px-4 py-2">
              <span className="text-zinc-400 mr-2">Efectivo en Caja:</span>
              <span className="text-zinc-800 dark:text-zinc-100">$2,500.00</span>
            </div>
          </div>

          <div className="flex gap-3">
            <a href="/" className="px-4 py-2 rounded-xl bg-orange-600 text-white font-bold text-sm hover:bg-orange-700 transition-all shadow-md">
              + Nuevo Pedido
            </a>
            <button className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-bold text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">
               Corte de Turno
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 space-y-8">
        <div className="flex justify-between items-end border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
               Cuentas Activas
               <span className="px-3 py-1 bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 text-xs rounded-full">
                 {orders.filter(o => o.status !== 'paid').length} Pendientes
               </span>
            </h2>
          </div>
          <div className="flex gap-2 p-1 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            {(['all', 'pending', 'paid'] as const).map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filter === f 
                    ? 'bg-[#c2410c] text-white shadow-md shadow-orange-900/10' 
                    : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                }`}
              >
                {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : 'Cobradas'}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
           {filteredOrders.map(order => (
             <div 
               key={order.id}
               className={`relative bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all hover:shadow-xl group overflow-hidden ${
                 order.status === 'paid' ? 'opacity-70 grayscale-[0.5]' : ''
               }`}
             >
                {/* Status Bar */}
                <div className={`h-2 w-full ${
                  order.status === 'paid' ? 'bg-emerald-500' : 
                  order.status === 'ready' ? 'bg-blue-500' : 'bg-orange-400'
                }`} />

                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">{order.id}</p>
                      <h3 className="text-2xl font-black">Mesa {order.table}</h3>
                      <p className="text-xs font-bold text-zinc-400 mt-1">🕒 {order.time} • {order.itemsCount} productos</p>
                    </div>
                    <div className="text-right">
                       <p className="text-2xl font-black text-[#c2410c]">${order.total}</p>
                       <p className="text-[10px] font-bold text-zinc-400 uppercase">Total a Cobrar</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    {order.status !== 'paid' ? (
                      <>
                        <button 
                          onClick={() => settleOrder(order.id)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-900/10"
                        >
                          Cobrar
                        </button>
                        <button className="w-14 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-200 rounded-2xl flex items-center justify-center transition-all active:scale-95">
                          🖨️
                        </button>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center py-3 bg-zinc-100 dark:bg-zinc-800 text-emerald-600 font-bold rounded-2xl text-xs uppercase gap-2">
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                         </svg>
                         Cobrado Correctamente
                      </div>
                    )}
                  </div>
                </div>

                {/* Hover overlay hint */}
                {order.status !== 'paid' && (
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="flex h-2 w-2 rounded-full bg-orange-400 animate-ping"></span>
                  </div>
                )}
             </div>
           ))}
        </div>

        {/* Helper Footer for Shortcuts */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-zinc-900 border border-white/10 px-6 py-4 rounded-3xl shadow-2xl flex gap-12 text-white">
           <div className="flex items-center gap-2">
             <kbd className="bg-zinc-700 text-[10px] px-1.5 py-1 rounded-md border-b-2 border-zinc-800 font-bold">ESC</kbd>
             <span className="text-xs font-bold text-zinc-400">Menú</span>
           </div>
           <div className="flex items-center gap-2">
             <kbd className="bg-zinc-700 text-[10px] px-1.5 py-1 rounded-md border-b-2 border-zinc-800 font-bold">F2</kbd>
             <span className="text-xs font-bold text-zinc-400">Corte Turno</span>
           </div>
           <div className="flex items-center gap-2">
             <kbd className="bg-zinc-700 text-[10px] px-1.5 py-1 rounded-md border-b-2 border-zinc-800 font-bold">F5</kbd>
             <span className="text-xs font-bold text-zinc-400">Refrescar</span>
           </div>
        </div>
      </main>
    </div>
  );
}
