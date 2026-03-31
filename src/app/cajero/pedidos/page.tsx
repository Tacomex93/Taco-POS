'use client';

import React, { useEffect, useState } from 'react';
import { 
  SidebarProvider, 
  SidebarInset, 
  SidebarTrigger 
} from "@/components/ui/sidebar";
import { CajeroSidebar } from "@/components/CajeroSidebar";
import { 
  Card, 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  Calendar, 
  Clock, 
  Filter, 
  Printer,
  ChevronRight,
  Loader2,
  Receipt
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserNav } from "@/components/UserNav";
import { supabase } from "@/lib/supabase";
import { Order } from "@/lib/types";

type OrderWithEmployee = Order & { employees?: { full_name: string } | null };

export default function PedidosCajeroPage() {
  const [orders, setOrders] = useState<OrderWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, employees(full_name)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    (async () => { await fetchOrders(); })();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pagada':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none font-black text-[10px] uppercase">Completado</Badge>;
      case 'abierta':
        return <Badge className="bg-orange-600 hover:bg-orange-700 text-white border-none font-black text-[10px] uppercase">En Curso</Badge>;
      case 'cancelada':
        return <Badge variant="destructive" className="font-black text-[10px] uppercase">Cancelado</Badge>;
      default:
        return <Badge variant="secondary" className="font-black text-[10px] uppercase">{status}</Badge>;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-[#fafafa] dark:bg-zinc-950">
        <CajeroSidebar />
        
        <SidebarInset className="flex flex-col flex-1 overflow-hidden bg-zinc-50 dark:bg-zinc-950">
          {/* Header */}
          <header className="h-20 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between px-8 bg-white/50 backdrop-blur-xl z-20">
             <div className="flex items-center gap-4">
                <SidebarTrigger className="h-10 w-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border-none shadow-sm" />
                <div>
                   <h2 className="text-xs font-black uppercase tracking-[0.3em] text-orange-600 italic">Historial Pedidos</h2>
                   <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">Cajero: Juan P. • Turno B</p>
                </div>
             </div>
             <UserNav />
          </header>

          <main className="flex-1 overflow-y-auto p-8 space-y-10 animate-fade-in">
            {/* Control Bar */}
            <section className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white dark:bg-zinc-900 p-4 rounded-[2rem] shadow-sm border border-zinc-100 dark:border-zinc-800">
               <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="relative flex-1 md:w-80">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                     <input 
                        type="text" 
                        placeholder="Buscar pedido por ID o Mesa..." 
                        className="w-full h-12 pl-12 pr-4 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-orange-600 outline-none transition-all font-bold text-sm"
                     />
                  </div>
                  <Button variant="ghost" className="h-12 w-12 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                     <Filter className="w-5 h-5 text-zinc-400" />
                  </Button>
               </div>

               <div className="flex gap-2">
                  {['all', 'abierta', 'pagada'].map((t) => (
                    <Button 
                      key={t}
                      onClick={() => setFilter(t)}
                      className={cn(
                        "h-10 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                        filter === t ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xl" : "bg-transparent text-zinc-400 hover:bg-zinc-50"
                      )}
                    >
                      {t === 'all' ? 'Ver Todos' : (t === 'abierta' ? 'Pendientes' : 'Pagados')}
                    </Button>
                  ))}
               </div>
            </section>

            {/* Orders Table/List */}
            {loading ? (
              <div className="h-96 flex flex-col items-center justify-center opacity-30">
                 <Loader2 className="w-12 h-12 animate-spin text-orange-600" />
                 <p className="font-black text-xs uppercase tracking-widest mt-4">Consultando base de datos...</p>
              </div>
            ) : (
              <div className="space-y-4">
                 {orders.length === 0 ? (
                   <div className="h-96 flex flex-col items-center justify-center border-4 border-dashed border-zinc-100 dark:border-zinc-900 rounded-[4rem] opacity-20">
                      <Receipt className="w-24 h-24 mb-4" />
                      <p className="text-xl font-black uppercase tracking-widest">No hay pedidos registrados</p>
                   </div>
                 ) : (
                   orders.filter(o => filter === 'all' || o.status === filter).map((order) => (
                     <Card key={order.id} className="group border-none bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden relative border-l-8 border-transparent hover:border-orange-500">
                        <div className="p-8 flex flex-col lg:flex-row items-center justify-between gap-8">
                           <div className="flex items-center gap-6">
                              <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-[1.75rem] flex flex-col items-center justify-center text-zinc-400 shadow-inner group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors">
                                 <span className="text-[9px] font-black uppercase">Mesa</span>
                                 <span className="text-3xl font-black italic leading-none">{order.table_id}</span>
                              </div>
                              <div className="space-y-1">
                                 <div className="flex items-center gap-3">
                                    <h4 className="text-xl font-black tracking-tighter text-zinc-900 dark:text-white uppercase italic">Pedido #{order.id.substring(0, 8)}</h4>
                                    {getStatusBadge(order.status)}
                                 </div>
                                 <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest opacity-80">
                                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(order.created_at).toLocaleDateString()}</span>
                                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span className="flex items-center gap-1.5 underline decoration-orange-500/30">🤵 {order.employees?.full_name || 'Cajero'}</span>
                                 </div>
                              </div>
                           </div>

                           <div className="flex flex-col items-center lg:items-end gap-1">
                              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.3em]">Total de Venta</span>
                              <p className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter italic leading-none">${order.total.toLocaleString()}</p>
                              <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest pt-1">{order.comensales} Comensales</p>
                           </div>

                           <div className="flex gap-2">
                              <Button variant="ghost" className="h-14 w-14 rounded-2xl bg-zinc-50 dark:bg-zinc-800 text-zinc-500 hover:bg-orange-50 hover:text-orange-600 shadow-sm transition-all border border-zinc-100 dark:border-zinc-800">
                                 <Printer className="w-5 h-5" />
                              </Button>
                              <Button className="h-14 px-8 rounded-2xl bg-zinc-900 hover:bg-black text-white font-black text-xs uppercase tracking-widest shadow-xl transition-all flex items-center gap-3 group/btn italic">
                                 Ver Detalle <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                              </Button>
                           </div>
                        </div>
                     </Card>
                   ))
                 )}
              </div>
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
