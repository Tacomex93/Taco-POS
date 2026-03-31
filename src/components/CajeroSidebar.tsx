'use client';

import * as React from 'react';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton, 
  SidebarFooter,
  SidebarRail,
  useSidebar
} from "@/components/ui/sidebar";
import { 
  ShoppingBag, 
  Users, 
  Utensils, 
  ChevronLeft,
  ChevronRight,
  Flame,
  LogOut,
  Settings,
  ClipboardList,
  Store
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { usePathname } from "next/navigation";

interface CajeroSidebarProps {
  onCategorySelect?: (category: string) => void;
  activeCategory?: string;
  orderTotal?: number;
  itemsCount?: number;
}

export function CajeroSidebar({ onCategorySelect, activeCategory, orderTotal = 0, itemsCount = 0 }: CajeroSidebarProps) {
  const { toggleSidebar, state } = useSidebar();
  const pathname = usePathname();
  const isPosView = pathname === "/cajero";
  const [currentEmployee, setCurrentEmployee] = React.useState<{ full_name: string; role: string } | null>(null);

  React.useEffect(() => {
    const sessionStr = localStorage.getItem('pos_employee_session');
    if (sessionStr) {
      setCurrentEmployee(JSON.parse(sessionStr));
    }
  }, []);
  
  const categories = [
    { name: "Todos 🌮", id: "all", icon: Utensils },
    { name: "Tacos 🌯", id: "tacos", icon: Flame },
    { name: "Bebidas 🍺", id: "bebidas", icon: ShoppingBag },
    { name: "Extras 🥣", id: "extras", icon: Settings },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-zinc-100 dark:border-zinc-800 transition-all duration-300">
      <SidebarHeader className="p-4 flex items-center justify-between">
        <div className={cn("flex items-center gap-3", state === "collapsed" && "hidden")}>
          <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg">
             <Flame className="w-6 h-6" />
          </div>
          <div className="font-black text-xs tracking-widest uppercase">
            {isPosView ? "Punto de venta" : "Cajero"}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="rounded-xl h-10 w-10">
           {state === "expanded" ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Button>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupLabel className={cn("px-4 text-[10px] font-black uppercase tracking-widest text-zinc-400", state === "collapsed" && "hidden")}>
            Navegación
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              <SidebarMenuItem>
                <SidebarMenuButton 
                  render={<a href="/cajero" />} 
                  isActive={pathname === "/cajero"}
                  className={cn(
                    "h-12 rounded-2xl px-4",
                    pathname === "/cajero" ? "bg-orange-600 text-white" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  <Store className="w-5 h-5" />
                  <span className={cn("font-bold text-sm", state === "collapsed" && "hidden")}>Punto de Venta</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  render={<a href="/cajero/pedidos" />} 
                  isActive={pathname === "/cajero/pedidos"}
                  className={cn(
                    "h-12 rounded-2xl px-4",
                    pathname === "/cajero/pedidos" ? "bg-orange-600 text-white" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  <ClipboardList className="w-5 h-5" />
                  <span className={cn("font-bold text-sm", state === "collapsed" && "hidden")}>Historial Pedidos</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className={cn("px-4 text-[10px] font-black uppercase tracking-widest text-zinc-400", state === "collapsed" && "hidden")}>
            Personal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              <SidebarMenuItem>
                <SidebarMenuButton className="h-12 rounded-2xl px-4 bg-zinc-50 dark:bg-zinc-800">
                  <Users className="w-5 h-5" />
                  <span className={cn("font-bold text-sm", state === "collapsed" && "hidden")}>
                    {currentEmployee ? currentEmployee.full_name : 'Cajero'}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isPosView && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className={cn("px-4 text-[10px] font-black uppercase tracking-widest text-zinc-400", state === "collapsed" && "hidden")}>
              Categorías
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-2">
                {categories.map((cat) => (
                  <SidebarMenuItem key={cat.id}>
                    <SidebarMenuButton 
                      onClick={() => onCategorySelect?.(cat.id)}
                      isActive={activeCategory === cat.id}
                      className={cn(
                        "h-12 rounded-2xl px-4 transition-all duration-200",
                        activeCategory === cat.id ? "bg-orange-600 text-white shadow-xl" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      )}
                    >
                      <cat.icon className="w-5 h-5" />
                      <span className={cn("font-bold text-sm", state === "collapsed" && "hidden")}>{cat.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className={cn("p-4 border-t border-zinc-50 dark:border-zinc-800", state === "collapsed" && "p-2")}>
         {isPosView && (
         <div className={cn("bg-zinc-900 dark:bg-orange-600 rounded-2xl p-4 text-white shadow-xl", state === "collapsed" && "p-2")}>
            <div className={cn("flex flex-col gap-1", state === "collapsed" && "hidden")}>
               <span className="text-[9px] font-black uppercase opacity-60">Subtotal Bruto</span>
               <span className="text-2xl font-black">${orderTotal.toFixed(2)}</span>
               <span className="text-[10px] font-bold opacity-80 uppercase">{itemsCount} Productos</span>
            </div>
            {state === "collapsed" && (
               <div className="flex flex-col items-center gap-1 text-[10px] font-black">
                  <span>${orderTotal.toFixed(0)}</span>
               </div>
            )}
         </div>
         )}
         <Button variant="ghost" className={cn("w-full h-12 rounded-xl font-bold flex items-center gap-3 text-red-500 hover:text-red-600 hover:bg-red-50", isPosView && "mt-4")} onClick={() => window.location.href = '/'}>
            <LogOut className="w-4 h-4" />
            <span className={cn(state === "collapsed" && "hidden")}>Cerrar Turno</span>
         </Button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
