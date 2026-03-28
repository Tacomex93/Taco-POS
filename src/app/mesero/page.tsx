'use client';

import React, { useState } from 'react';

type TableStatus = 'available' | 'occupied' | 'waiting' | 'ready';

type Table = {
  id: number;
  status: TableStatus;
  diners: number;
  lastOrderTime?: string;
};

const INITIAL_TABLES: Table[] = [
  { id: 1, status: 'occupied', diners: 4, lastOrderTime: '15:20' },
  { id: 2, status: 'available', diners: 0 },
  { id: 3, status: 'waiting', diners: 2, lastOrderTime: '15:45' },
  { id: 4, status: 'ready', diners: 3, lastOrderTime: '15:30' },
  { id: 5, status: 'available', diners: 0 },
  { id: 6, status: 'occupied', diners: 6, lastOrderTime: '15:10' },
  { id: 7, status: 'available', diners: 0 },
  { id: 8, status: 'waiting', diners: 2, lastOrderTime: '16:00' },
];

export default function WaiterPage() {
  const [tables, setTables] = useState<Table[]>(INITIAL_TABLES);

  const getStatusColor = (status: TableStatus) => {
    switch (status) {
      case 'available': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50';
      case 'occupied': return 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700';
      case 'waiting': return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50';
      case 'ready': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50';
    }
  };

  const getStatusLabel = (status: TableStatus) => {
    switch (status) {
      case 'available': return 'Libre';
      case 'occupied': return 'Ocupada';
      case 'waiting': return 'Cocinando';
      case 'ready': return 'Listo';
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col font-sans">
      {/* Waiter Header */}
      <header className="p-4 border-b border-zinc-100 dark:border-zinc-900 flex justify-between items-center sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#c2410c] flex items-center justify-center text-white shadow-lg shadow-orange-900/20">
            <span className="text-xl">🏃</span>
          </div>
          <div>
             <h1 className="font-black text-lg tracking-tight uppercase">Mesero Digital</h1>
             <p className="text-[10px] font-bold text-zinc-400">Carlos M. • Piso 1</p>
          </div>
        </div>
        
        <div className="flex gap-2">
           <a href="/" className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all">
             Menú
           </a>
           <button className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center relative">
              🔔
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-zinc-950 text-[8px] flex items-center justify-center text-white font-bold">2</span>
           </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 p-4 overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-4">Estado de Mesas</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 animate-slide-up">
            {tables.map(table => (
              <a 
                href={table.status === 'available' ? '/?mesa=' + table.id : '/?mesa=' + table.id}
                key={table.id}
                className={`relative flex flex-col p-5 rounded-[2.5rem] border-2 transition-all active:scale-95 group shadow-sm ${
                  table.status === 'available' 
                    ? 'border-zinc-100 bg-zinc-50/50 hover:bg-emerald-50 hover:border-emerald-200 dark:border-zinc-900 dark:bg-zinc-900/30' 
                    : 'border-transparent bg-white dark:bg-zinc-900 shadow-xl'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                   <span className="text-3xl font-black">{table.id}</span>
                   <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight border ${getStatusColor(table.status)}`}>
                      {getStatusLabel(table.status)}
                   </div>
                </div>

                <div className="mt-auto">
                   {table.status === 'available' ? (
                     <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Abrir Mesa</p>
                   ) : (
                     <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                           {[...Array(Math.min(3, table.diners))].map((_, i) => (
                             <div key={i} className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 border border-white dark:border-zinc-900 flex items-center justify-center text-[8px]">
                               👤
                             </div>
                           ))}
                           {table.diners > 3 && (
                             <div className="w-5 h-5 rounded-full bg-orange-600 text-white border border-white dark:border-zinc-900 flex items-center justify-center text-[7px] font-bold">
                               +{table.diners - 3}
                             </div>
                           )}
                        </div>
                        <span className="text-[10px] font-bold text-zinc-400">Hace {table.lastOrderTime}</span>
                     </div>
                   )}
                </div>

                {/* Hot Notifications on cards */}
                {table.status === 'ready' && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500 border-2 border-white dark:border-zinc-950"></span>
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>

        {/* Action Feed / Recent Events */}
        <section className="mt-8">
           <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-4">Notificaciones de Cocina</h3>
           <div className="space-y-3">
             <div className="flex items-center gap-4 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-3xl border border-blue-100 dark:border-blue-900/30">
               <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl">
                 🍳
               </div>
               <div className="flex-1">
                 <p className="text-xs font-bold text-blue-800 dark:text-blue-300">¡Orden Lista!</p>
                 <h4 className="font-black text-sm text-blue-900 dark:text-blue-100">Mesa 4 • 3 Tacos de Tripa</h4>
               </div>
               <span className="text-[10px] font-medium text-blue-500">hace 2 min</span>
             </div>

             <div className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-100 dark:border-zinc-800 opacity-60">
               <div className="w-10 h-10 bg-zinc-400 rounded-full flex items-center justify-center text-white text-xl">
                 🌮
               </div>
               <div className="flex-1">
                 <p className="text-xs font-bold text-zinc-500">Entregado</p>
                 <h4 className="font-black text-sm text-zinc-700 dark:text-zinc-300">Mesa 1 • Cuenta Cerrada</h4>
               </div>
               <span className="text-[10px] font-medium text-zinc-400">hace 15 min</span>
             </div>
           </div>
        </section>
      </main>

      {/* Mobile Bar Navigation */}
      <nav className="p-4 border-t border-zinc-100 dark:border-zinc-900 flex justify-around bg-white dark:bg-zinc-950 sticky bottom-0">
         <button className="flex flex-col items-center gap-1 group">
           <span className="text-xl group-hover:scale-110 transition-transform">📋</span>
           <span className="text-[8px] font-black uppercase text-[#c2410c] tracking-widest">Mesas</span>
         </button>
         <button className="flex flex-col items-center gap-1 group opacity-40 hover:opacity-100 transition-opacity">
           <span className="text-xl group-hover:scale-110 transition-transform">🔥</span>
           <span className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Pedidos</span>
         </button>
         <button className="flex flex-col items-center gap-1 group opacity-40 hover:opacity-100 transition-opacity">
           <span className="text-xl group-hover:scale-110 transition-transform">👤</span>
           <span className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Cuenta</span>
         </button>
      </nav>
    </div>
  );
}
