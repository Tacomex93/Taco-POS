'use client';

import React, { useState } from 'react';

// Product type definition
type Product = {
  id: string;
  name: string;
  category: 'Tacos' | 'Bebidas';
  price: number;
  unit: string;
};

const PRODUCTS: Product[] = [
  // Tacos
  { id: 't-tripa', name: 'Taco de Tripa', category: 'Tacos', price: 25, unit: 'un.' },
  { id: 't-cecina', name: 'Taco de Cecina', category: 'Tacos', price: 25, unit: 'un.' },
  { id: 't-carne', name: 'Taco de Carne', category: 'Tacos', price: 25, unit: 'un.' },
  { id: 't-enchilada', name: 'Taco de Enchilada', category: 'Tacos', price: 22, unit: 'un.' },
  { id: 't-campechana', name: 'Taco de Campechana', category: 'Tacos', price: 28, unit: 'un.' },
  { id: 't-barbacoa', name: 'Taco de Barbacoa', category: 'Tacos', price: 30, unit: 'un.' },
  
  // Bebidas
  { id: 'b-agua-f-1', name: 'Agua Fresca (1L)', category: 'Bebidas', price: 45, unit: 'lt.' },
  { id: 'b-agua-f-05', name: 'Agua Fresca (500ml)', category: 'Bebidas', price: 25, unit: 'pz.' },
  { id: 'b-refresco', name: 'Refresco', category: 'Bebidas', price: 28, unit: 'pz.' },
  { id: 'b-agua-n-1', name: 'Agua Natural (1L)', category: 'Bebidas', price: 35, unit: 'lt.' },
  { id: 'b-agua-n-05', name: 'Agua Natural (500ml)', category: 'Bebidas', price: 18, unit: 'pz.' },
  { id: 'b-cerveza', name: 'Cerveza', category: 'Bebidas', price: 45, unit: 'pz.' },
];

export default function POSPage() {
  const [activeCategory, setActiveCategory] = useState<'Tacos' | 'Bebidas'>('Tacos');
  const [order, setOrder] = useState<{product: Product, quantity: number}[]>([]);
  const [tableNumber, setTableNumber] = useState<number>(1);
  const [diners, setDiners] = useState<number>(1);

  const addToOrder = (product: Product) => {
    setOrder(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromOrder = (productId: string) => {
    setOrder(prev => prev.filter(item => item.product.id !== productId));
  };

  const total = order.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  return (
    <div className="flex h-screen bg-[#f8f9fa] dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 overflow-hidden">
      {/* Principal Menu Area */}
      <div className="flex-1 flex flex-col min-w-0 p-4 lg:p-6 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#c2410c] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-900/20">
              <span className="text-2xl font-bold">T</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Taquería POS</h1>
              <p className="text-sm text-zinc-500 font-medium">Nueva Orden • Mesa {tableNumber}</p>
            </div>
          </div>
          
          <div className="flex gap-2 bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <button 
              onClick={() => setActiveCategory('Tacos')}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                activeCategory === 'Tacos' 
                  ? 'bg-white dark:bg-zinc-800 text-[#c2410c] shadow-md ring-1 ring-black/5 dark:ring-white/10' 
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              🌮 Tacos
            </button>
            <button 
              onClick={() => setActiveCategory('Bebidas')}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                activeCategory === 'Bebidas' 
                  ? 'bg-white dark:bg-zinc-800 text-[#c2410c] shadow-md ring-1 ring-black/5 dark:ring-white/10' 
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              🥤 Bebidas
            </button>
          </div>

          <div className="flex gap-3">
            <a href="/mesero" className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-bold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-sm">
               🏃 Mesero
            </a>
            <a href="/cajero" className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-bold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-sm">
               💵 Caja
            </a>
            <a href="/admin/dashboard" className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-bold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-sm">
               ⚙️ Admin
            </a>
          </div>
        </header>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 animate-slide-up">
          {PRODUCTS.filter(p => p.category === activeCategory).map(product => (
            <button 
              key={product.id}
              onClick={() => addToOrder(product)}
              className="group relative flex flex-col items-start p-5 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:shadow-orange-900/5 hover:-translate-y-1 transition-all active:scale-[0.98]"
            >
              <div className="mb-4 w-full aspect-square bg-[#fff7ed] dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
                {product.category === 'Tacos' ? '🌮' : '🥤'}
              </div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-50 mb-1 leading-tight text-left">
                {product.name}
              </h3>
              <p className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">
                Precio Unitario
              </p>
              <div className="mt-auto w-full flex justify-between items-end">
                <span className="text-[#c2410c] text-xl font-extrabold">${product.price}</span>
                <span className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-[#c2410c] group-hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Cart / Order Sidebar */}
      <div className="w-[420px] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col shadow-2xl">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="text-xl font-bold mb-4">Detalle de Mesa</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Número de Mesa</label>
              <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                <button onClick={() => setTableNumber(Math.max(1, tableNumber - 1))} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors font-bold">－</button>
                <span className="flex-1 text-center font-bold text-lg">{tableNumber}</span>
                <button onClick={() => setTableNumber(tableNumber + 1)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors font-bold">＋</button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Comensales</label>
              <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                <button onClick={() => setDiners(Math.max(1, diners - 1))} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors font-bold">－</button>
                <span className="flex-1 text-center font-bold text-lg">{diners}</span>
                <button onClick={() => setDiners(diners + 1)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors font-bold">＋</button>
              </div>
            </div>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {order.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
              <div className="text-6xl mb-4">🍽️</div>
              <p className="font-bold text-lg">Mesa vacía</p>
              <p className="text-sm">Agrega productos para comenzar</p>
            </div>
          ) : (
            order.map(item => (
              <div key={item.product.id} className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 transition-all hover:border-orange-200 dark:hover:border-orange-900/50 group">
                <div className="w-10 h-10 bg-white dark:bg-zinc-800 rounded-xl flex items-center justify-center text-xl shadow-sm">
                  {item.product.category === 'Tacos' ? '🌮' : '🥤'}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100 leading-tight">{item.product.name}</h4>
                  <p className="text-xs font-bold text-zinc-400">${item.product.price} p/unidad</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-[#c2410c]">x {item.quantity}</span>
                  <button 
                    onClick={() => removeFromOrder(item.product.id)}
                    className="p-2 text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Order Controls */}
        <div className="p-8 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center text-zinc-400 font-bold uppercase tracking-widest text-[10px]">
              <span>Subtotal</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-zinc-400 font-bold uppercase tracking-widest text-[10px]">
              <span>Impuestos (0%)</span>
              <span>$0.00</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-xl font-bold tracking-tight">Total</span>
              <span className="text-3xl font-black text-[#c2410c]">${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button className="h-14 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-[0.98]">
              Dividir Cuenta
            </button>
            <button 
              disabled={order.length === 0}
              className="h-14 rounded-2xl bg-[#c2410c] font-black text-white shadow-lg shadow-orange-900/30 hover:bg-orange-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
            >
              Cerrar Orden
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
