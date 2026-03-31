'use client';

import React, { useState } from 'react';
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Bell, 
  ChefHat, 
  MapPin, 
  Users, 
  Plus, 
  Clock, 
  LayoutGrid, 
  ArrowLeft, 
  Flame, 
  CheckCircle2, 
} from "lucide-react";
import { UserNav } from "@/components/UserNav";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

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
  const router = useRouter();
  const [tables] = useState<Table[]>(INITIAL_TABLES);

  useEffect(() => {
    const sessionStr = localStorage.getItem('pos_employee_session');
    if (!sessionStr) {
      router.push('/login');
      return;
    }
    const session = JSON.parse(sessionStr);
    if (session.role !== 'admin' && session.role !== 'mesero') {
      router.push('/');
    }
  }, [router]);

  const getStatusColor = (status: TableStatus) => {
    switch (status) {
      case 'available': return 'bg-emerald-500 text-white border-none';
      case 'occupied': return 'bg-zinc-100 text-zinc-400 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700';
      case 'waiting': return 'bg-orange-500 text-white border-none shadow-lg shadow-orange-900/20';
      case 'ready': return 'bg-blue-500 text-white border-none animate-pulse';
    }
  };

  const getStatusLabel = (status: TableStatus) => {
    switch (status) {
      case 'available': return 'Libre';
      case 'occupied': return 'Ocupada';
      case 'waiting': return 'Cocinando';
      case 'ready': return '¡Listo!';
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col font-sans overflow-hidden">
      {/* Mobile-First Header */}
      <header className="px-6 py-6 border-b border-zinc-100 dark:border-zinc-900 flex justify-between items-center sticky top-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl z-50">
        <div className="flex items-center gap-5">
           <div className="w-12 h-12 rounded-[1.25rem] bg-orange-600 flex items-center justify-center text-white shadow-xl shadow-orange-900/20 rotate-3 transition-transform">
             <Flame className="w-6 h-6" />
           </div>
           <div>
             <h1 className="text-xl font-black tracking-tighter uppercase italic">Mesero Digital</h1>
             <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Servicio Activo
             </p>
           </div>
        </div>
        
        <div className="flex gap-4 items-center">
           <UserNav />
           <Button variant="outline" size="icon" className="w-12 h-12 rounded-2xl border-zinc-100 dark:border-zinc-800 shadow-sm relative">
              <Bell className="w-5 h-5 text-zinc-400" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full border-4 border-white dark:border-zinc-950 text-[8px] flex items-center justify-center text-white font-black">2</span>
           </Button>
           <Link href="/" className={cn(buttonVariants({ size: "icon" }), "w-12 h-12 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xl")}>
              <ArrowLeft className="w-5 h-5" />
           </Link>
        </div>
      </header>

      {/* Main Waiter Control Grid */}
      <main className="flex-1 p-6 md:p-10 lg:p-12 overflow-y-auto space-y-12 pb-24">
        {/* Statistics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-slide-up">
           <Card className="border-none bg-zinc-50 dark:bg-zinc-900 rounded-[2rem] p-6 shadow-sm">
              <p className="text-[9px] font-black tracking-widest text-zinc-400 uppercase mb-2">Mis Mesas</p>
              <h3 className="text-2xl font-black">8 / 12</h3>
           </Card>
           <Card className="border-none bg-zinc-50 dark:bg-zinc-900 rounded-[2rem] p-6 shadow-sm">
              <p className="text-[9px] font-black tracking-widest text-zinc-400 uppercase mb-2">Comensales</p>
              <h3 className="text-2xl font-black">24</h3>
           </Card>
           <Card className="border-none bg-zinc-50 dark:bg-zinc-900 rounded-[2rem] p-6 shadow-sm">
              <p className="text-[9px] font-black tracking-widest text-zinc-400 uppercase mb-2">Tiempo Promedio</p>
              <h3 className="text-2xl font-black">18 min</h3>
           </Card>
           <Card className="border-none bg-orange-600 text-white rounded-[2rem] p-6 shadow-xl shadow-orange-900/20">
              <p className="text-[9px] font-black tracking-widest text-white/50 uppercase mb-2">Listo p/ Entrega</p>
              <h3 className="text-2xl font-black">2 Órdenes</h3>
           </Card>
        </div>

        {/* Tables Section */}
        <section>
          <div className="flex justify-between items-end mb-8">
            <h2 className="text-sm font-black text-zinc-400 uppercase tracking-[0.3em]">Estado de Mesas</h2>
            <div className="flex gap-2 p-1 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
               <Button size="sm" variant="ghost" className="h-8 rounded-lg px-4 text-[10px] font-black uppercase text-zinc-400">Piso 1</Button>
               <Button size="sm" variant="secondary" className="h-8 rounded-lg px-4 text-[10px] font-black uppercase bg-white shadow-sm">Terraza</Button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 animate-slide-up" style={{animationDelay: '0.15s'}}>
            {tables.map(table => (
              <a 
                href={table.status === 'available' ? '/?mesa=' + table.id : '/?mesa=' + table.id}
                key={table.id}
                className={`group relative flex flex-col p-8 rounded-[3rem] border-2 transition-all active:scale-[0.97] shadow-sm hover:shadow-2xl overflow-hidden ${
                  table.status === 'available' 
                    ? 'border-zinc-50 bg-zinc-50/30 hover:bg-emerald-50 hover:border-emerald-200 dark:border-zinc-900 dark:bg-zinc-900/10' 
                    : 'border-transparent bg-white dark:bg-zinc-900'
                }`}
              >
                <div className="flex justify-between items-start mb-10">
                   <span className={`text-4xl font-black tracking-tighter ${table.status === 'available' ? 'text-zinc-200 dark:text-zinc-800' : 'text-zinc-900 dark:text-white'}`}>
                      {table.id < 10 ? '0' + table.id : table.id}
                   </span>
                   <Badge className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${getStatusColor(table.status)}`}>
                      {getStatusLabel(table.status)}
                   </Badge>
                </div>

                <div className="mt-auto space-y-4">
                   {table.status === 'available' ? (
                     <div className="flex items-center gap-2">
                        <Plus className="w-3 h-3 text-emerald-500" />
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">Nueva Mesa</p>
                     </div>
                   ) : (
                     <div className="space-y-3">
                        <div className="flex -space-x-2">
                           {[...Array(Math.min(3, table.diners))].map((_, i) => (
                             <div key={i} className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 border-4 border-white dark:border-zinc-900 flex items-center justify-center text-[10px] shadow-sm">👤</div>
                           ))}
                           {table.diners > 3 && (
                             <div className="w-7 h-7 rounded-full bg-orange-600 text-white border-4 border-white dark:border-zinc-900 flex items-center justify-center text-[8px] font-black">+{table.diners - 3}</div>
                           )}
                        </div>
                        <div className="flex items-center gap-2">
                           <Clock className="w-3 h-3 text-zinc-300" />
                           <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest italic">{table.lastOrderTime}</span>
                        </div>
                     </div>
                   )}
                </div>

                {/* Hot Overlay Effect for ready food */}
                {table.status === 'ready' && (
                  <div className="absolute inset-0 bg-blue-500/5 animate-pulse flex items-center justify-center">
                     <ChefHat className="w-12 h-12 text-blue-500 opacity-20 rotate-12" />
                  </div>
                )}
              </a>
            ))}
          </div>
        </section>

        {/* Notifications / Activity Stream */}
        <section className="max-w-3xl animate-slide-up" style={{animationDelay: '0.3s'}}>
           <h3 className="text-sm font-black text-zinc-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-4">
             Historial de Servicio
             <Separator className="flex-1 opacity-20" />
           </h3>
           <div className="space-y-4">
             <Card className="border-none bg-blue-50/50 dark:bg-blue-900/10 rounded-[2.5rem] p-4 border border-blue-100 dark:border-blue-900/20 relative group overflow-hidden">
               <div className="flex items-center gap-6">
                 <div className="w-14 h-14 bg-blue-500 rounded-[1.25rem] flex items-center justify-center text-white text-2xl shadow-xl shadow-blue-900/20 rotate-3 transition-transform group-hover:rotate-0">
                   🍳
                 </div>
                 <div className="flex-1">
                   <p className="text-[10px] font-black text-blue-800 dark:text-blue-300 uppercase tracking-widest">¡Orden Lista para Entrega!</p>
                   <h4 className="font-black text-lg text-blue-900 dark:text-blue-100 tracking-tight">Mesa 4 • 3 Tacos de Tripa</h4>
                 </div>
                 <div className="text-right">
                    <span className="text-[10px] font-black text-blue-500 uppercase italic">Hace 2 min</span>
                 </div>
               </div>
               <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                  <CheckCircle2 className="w-20 h-20 -rotate-12" />
               </div>
             </Card>

             <Card className="border-none bg-zinc-50 dark:bg-zinc-900 rounded-[2.5rem] p-4 border border-zinc-100 dark:border-zinc-800 opacity-60">
               <div className="flex items-center gap-6">
                 <div className="w-14 h-14 bg-zinc-500 rounded-[1.25rem] flex items-center justify-center text-white text-2xl">
                   🌮
                 </div>
                 <div className="flex-1">
                   <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Entregado con Éxito</p>
                   <h4 className="font-black text-lg text-zinc-700 dark:text-zinc-300 tracking-tight">Mesa 1 • Cuenta Cerrada</h4>
                 </div>
                 <div className="text-right">
                    <span className="text-[10px] font-black text-zinc-400 uppercase italic">Hace 15 min</span>
                 </div>
               </div>
             </Card>
           </div>
        </section>
      </main>

      {/* Modern Bottom Navigation Bar */}
      <nav className="p-4 px-10 border-t border-zinc-100 dark:border-zinc-900 flex justify-around bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl sticky bottom-0 z-50">
         <Button variant="ghost" className="flex flex-col items-center gap-1.5 h-auto py-2 group">
           <LayoutGrid className="w-6 h-6 text-orange-600" />
           <span className="text-[8px] font-black uppercase text-orange-600 tracking-widest">Mesas</span>
         </Button>
         <Button variant="ghost" className="flex flex-col items-center gap-1.5 h-auto py-2 group opacity-40 hover:opacity-100 transition-opacity">
           <MapPin className="w-6 h-6 text-zinc-400" />
           <span className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">Zonas</span>
         </Button>
         <Button variant="ghost" className="flex flex-col items-center gap-1.5 h-auto py-2 group opacity-40 hover:opacity-100 transition-opacity">
           <ChefHat className="w-6 h-6 text-zinc-400" />
           <span className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">Cocina</span>
         </Button>
         <Button variant="ghost" className="flex flex-col items-center gap-1.5 h-auto py-2 group opacity-40 hover:opacity-100 transition-opacity">
           <Users className="w-6 h-6 text-zinc-400" />
           <span className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">Personal</span>
         </Button>
      </nav>
    </div>
  );
}
