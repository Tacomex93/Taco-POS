'use client';

import React, { useState } from 'react';
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Settings, Table, CreditCard, Receipt } from "lucide-react";
import { UserNav } from "@/components/UserNav";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

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
  const router = useRouter();
  const [order, setOrder] = useState<{product: Product, quantity: number}[]>([]);
  const [tableNumber, setTableNumber] = useState<number>(1);
  const [diners, setDiners] = useState<number>(1);

  // Check Session
  useEffect(() => {
    const session = localStorage.getItem('pos_employee_session');
    if (!session) {
      router.push('/login');
    }
  }, [router]);

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
    <div className="flex h-screen bg-zinc-50/50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 overflow-hidden">
      {/* Principal Menu Area */}
      <div className="flex-1 flex flex-col min-w-0 p-4 lg:p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-10 translate-y-0 opacity-100 transition-all">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-900/40 rotate-3 hover:rotate-0 transition-transform cursor-pointer">
              <span className="text-3xl">🌮</span>
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                Taquería POS
                <Badge variant="outline" className="text-[10px] font-bold tracking-widest uppercase border-orange-500/50 text-orange-600">Beta 4.0</Badge>
              </h1>
              <p className="text-xs font-bold text-zinc-400 tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Servidor Activo • Mesa Actual: {tableNumber}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 p-2 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
             <a href="/mesero" title="Mesas" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}><Table className="w-5 h-5" /></a>
             <a href="/cajero" title="Caja" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}><CreditCard className="w-5 h-5" /></a>
             <a href="/admin/dashboard" title="Admin" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}><Settings className="w-5 h-5" /></a>
             <Separator orientation="vertical" className="h-8" />
             <UserNav />
          </div>
        </header>

        {/* Categories Tabs */}
        <Tabs defaultValue="Tacos" className="w-full">
          <div className="flex justify-between items-end mb-8">
             <TabsList className="h-14 bg-white dark:bg-zinc-900 p-1.5 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                <TabsTrigger value="Tacos" className="px-10 rounded-xl font-black text-xs uppercase tracking-widest data-[state=active]:bg-orange-600 data-[state=active]:text-white">
                  🌮 Tacos
                </TabsTrigger>
                <TabsTrigger value="Bebidas" className="px-10 rounded-xl font-black text-xs uppercase tracking-widest data-[state=active]:bg-orange-600 data-[state=active]:text-white">
                  🥤 Bebidas
                </TabsTrigger>
             </TabsList>
             
             <div className="flex gap-2">
                <Button variant="outline" className="rounded-xl border-zinc-200 shadow-sm font-bold text-xs uppercase">Favoritos</Button>
                <Button variant="outline" className="rounded-xl border-zinc-200 shadow-sm font-bold text-xs uppercase">Búsqueda</Button>
             </div>
          </div>

          <TabsContent value="Tacos" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 animate-slide-up outline-none">
            {PRODUCTS.filter(p => p.category === 'Tacos').map(product => (
              <Card key={product.id} className="group relative border-none bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:shadow-orange-900/10 transition-all hover:-translate-y-2 overflow-hidden">
                <div className="p-6">
                  <div className="w-full aspect-square bg-orange-50 dark:bg-zinc-800 rounded-3xl flex items-center justify-center text-5xl mb-6 shadow-inner transition-transform group-hover:scale-110">
                    🌮
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">{product.name}</h3>
                    <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-tighter">100% Maíz Nixtamalizado</Badge>
                  </div>
                </div>
                <CardFooter className="px-6 pb-6 flex justify-between items-center">
                   <div className="flex flex-col">
                      <span className="text-2xl font-black text-orange-600">${product.price}</span>
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Precio Unitario</span>
                   </div>
                   <Button onClick={() => addToOrder(product)} size="icon" className="w-12 h-12 rounded-2xl bg-zinc-900 hover:bg-orange-600 shadow-lg transition-all active:scale-90">
                      <ShoppingCart className="w-5 h-5 text-white" />
                   </Button>
                </CardFooter>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="Bebidas" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 animate-slide-up outline-none">
            {PRODUCTS.filter(p => p.category === 'Bebidas').map(product => (
              <Card key={product.id} className="group relative border-none bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:shadow-orange-900/10 transition-all hover:-translate-y-2 overflow-hidden">
                <div className="p-6">
                  <div className="w-full aspect-square bg-zinc-50 dark:bg-zinc-800 rounded-3xl flex items-center justify-center text-5xl mb-6 shadow-inner transition-transform group-hover:scale-110">
                    🥤
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">{product.name}</h3>
                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter text-zinc-400">Hecho en Casa</Badge>
                  </div>
                </div>
                <CardFooter className="px-6 pb-6 flex justify-between items-center">
                   <div className="flex flex-col">
                      <span className="text-2xl font-black text-zinc-800 dark:text-zinc-100">${product.price}</span>
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Unidad</span>
                   </div>
                   <Button variant="secondary" onClick={() => addToOrder(product)} size="icon" className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-orange-600 hover:text-white transition-all active:scale-90 shadow-sm border border-zinc-200 dark:border-zinc-700">
                      <ShoppingCart className="w-5 h-5" />
                   </Button>
                </CardFooter>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Cart / Order Sidebar */}
      <Card className="w-[450px] m-4 border-none bg-white dark:bg-zinc-900 flex flex-col shadow-2xl rounded-[3rem] overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <div className="flex justify-between items-start mb-6">
            <CardTitle className="text-2xl font-black flex items-center gap-3">
               Detalle Mesa
               <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-3 font-black text-[10px] tracking-widest uppercase">Abierta</Badge>
            </CardTitle>
            <Button variant="ghost" size="icon" className="rounded-full"><Receipt className="w-5 h-5 text-zinc-400" /></Button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Número de Mesa</label>
              <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800 p-2 rounded-2xl border border-zinc-100 dark:border-zinc-700">
                <Button variant="ghost" size="icon" onClick={() => setTableNumber(Math.max(1, tableNumber - 1))} className="h-8 w-8 text-zinc-400 font-bold">-</Button>
                <span className="flex-1 text-center font-black text-xl">{tableNumber}</span>
                <Button variant="ghost" size="icon" onClick={() => setTableNumber(tableNumber + 1)} className="h-8 w-8 text-zinc-400 font-bold">+</Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Comensales</label>
              <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800 p-2 rounded-2xl border border-zinc-100 dark:border-zinc-700">
                <Button variant="ghost" size="icon" onClick={() => setDiners(Math.max(1, diners - 1))} className="h-8 w-8 text-zinc-400 font-bold">-</Button>
                <span className="flex-1 text-center font-black text-xl">{diners}</span>
                <Button variant="ghost" size="icon" onClick={() => setDiners(diners + 1)} className="h-8 w-8 text-zinc-400 font-bold">+</Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 px-8 py-4 overflow-hidden flex flex-col">
          <Separator className="mb-6 opacity-30" />
          <ScrollArea className="flex-1 -mr-4 pr-4">
            {order.length === 0 ? (
              <div className="h-full py-20 flex flex-col items-center justify-center text-center opacity-30 space-y-4">
                <div className="text-7xl">🍽️</div>
                <div className="space-y-1">
                   <p className="font-black text-lg uppercase tracking-tight">Mesa vacía</p>
                   <p className="text-sm font-medium">Selecciona productos para comenzar</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {order.map(item => (
                  <div key={item.product.id} className="flex items-center gap-5 p-5 bg-zinc-50/50 dark:bg-zinc-800/40 rounded-3xl border border-zinc-100 dark:border-zinc-800 group transition-all hover:bg-white dark:hover:bg-zinc-800 shadow-sm hover:shadow-lg">
                    <div className="w-12 h-12 bg-white dark:bg-zinc-900 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
                      {item.product.category === 'Tacos' ? '🌮' : '🥤'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-zinc-900 dark:text-zinc-100 leading-tight truncate">{item.product.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black text-orange-600">${item.product.price} p/un.</span>
                        <Separator orientation="vertical" className="h-3" />
                        <span className="text-[10px] font-bold text-zinc-400">ID: {item.product.id.split('-')[1]}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="h-10 px-4 rounded-xl border-zinc-200 dark:border-zinc-700 font-black text-base text-zinc-800 dark:text-white">x {item.quantity}</Badge>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeFromOrder(item.product.id)}
                        className="h-10 w-10 text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>

        <CardFooter className="p-8 pt-0 flex flex-col space-y-8 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800">
          <div className="w-full pt-8 space-y-4">
            <div className="flex justify-between items-center text-zinc-400 font-black uppercase tracking-widest text-[10px]">
              <span>Subtotal Acumulado</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-zinc-400 font-black uppercase tracking-widest text-[10px]">
              <span>Impuesto Directo (0%)</span>
              <span>$0.00</span>
            </div>
            <Separator className="opacity-30" />
            <div className="flex justify-between items-center pt-2">
              <div className="flex flex-col">
                <span className="text-xs font-black text-zinc-400 uppercase tracking-widest leading-none">Total de Mesa</span>
                <span className="text-4xl font-black tracking-tighter mt-1">${total.toFixed(2)}</span>
              </div>
              <div className="flex -space-x-3">
                 {[1,2,3].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 border-4 border-white dark:border-zinc-900 flex items-center justify-center text-xs">👤</div>
                 ))}
                 <div className="w-10 h-10 rounded-full bg-orange-600 text-white border-4 border-white dark:border-zinc-900 flex items-center justify-center text-[10px] font-black">+4</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            <Button variant="outline" className="h-16 rounded-[1.5rem] border-2 border-zinc-100 dark:border-zinc-800 font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-sm">
              Dividir Cuenta
            </Button>
            <Button 
              disabled={order.length === 0}
              className="h-16 rounded-[1.5rem] bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-orange-600 dark:hover:bg-orange-600 hover:text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-zinc-900/10 disabled:opacity-30 disabled:grayscale transition-all"
            >
              Cerrar y Cobrar
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
