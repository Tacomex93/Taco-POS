import React from 'react';

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Panel de Administración</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Control de inventario y ventas - Taquería POS</p>
          </div>
          <div className="flex gap-4">
             <a href="/mesero" className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-bold text-sm">
              🏃 Mesero
            </a>
             <a href="/cajero" className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-bold text-sm">
              💵 Caja
            </a>
             <a href="/" className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-bold text-sm">
              🌮 Menú
            </a>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Ventas de hoy</h3>
            <p className="text-3xl font-bold mt-2 text-zinc-900 dark:text-white">$1,250.00</p>
            <div className="mt-4 flex items-center text-emerald-600 text-sm">
              <span>↑ 12% vs ayer</span>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Órdenes abiertas</h3>
            <p className="text-3xl font-bold mt-2 text-zinc-900 dark:text-white">8</p>
            <div className="mt-4 flex items-center text-zinc-500 text-sm">
              <span>Mesas activas actualmente</span>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Producto estrella</h3>
            <p className="text-3xl font-bold mt-2 text-zinc-900 dark:text-white">Tacos de Cecina</p>
            <div className="mt-4 flex items-center text-amber-600 text-sm">
              <span>★ 45 vendidios hoy</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden text-black dark:text-white">
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-semibold">Configuración de Menú</h2>
          </div>
          <div className="p-6">
            <p className="text-zinc-600 dark:text-zinc-400 italic">Módulo de edición de precios próximamente...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
