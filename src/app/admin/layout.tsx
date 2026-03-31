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
  SidebarProvider, 
  SidebarInset,
  SidebarTrigger,
  SidebarRail,
  SidebarFooter
} from "@/components/ui/sidebar";
import { 
  ClipboardList,
  Users, 
  Settings, 
  BarChart3, 
  ArrowLeft, 
  ChefHat, 
  DollarSign,
  AlertTriangle,
  LayoutGrid,
  Package,
  Tag,
} from "lucide-react";
import { UserNav } from "@/components/UserNav";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationBell } from "@/components/NotificationBell";
import { useOfflineQueue } from "@/hooks/use-offline-queue";
import { CloudOff } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { notifications, unreadCount, markAllRead, markRead, clear } = useNotifications({ role: 'admin' });
  const { isOnline } = useOfflineQueue();

  // Flujo: Resumen → Operación en tiempo real → Cierre → Gestión → Config
  const groups = [
    {
      label: "Resumen",
      items: [
        { title: "Dashboard", href: "/admin/dashboard", icon: BarChart3 },
      ],
    },
    {
      label: "Operación",
      items: [
        { title: "Mesas", href: "/admin/mesas", icon: LayoutGrid },
        { title: "Cocina", href: "/admin/cocina", icon: ChefHat },
        { title: "Pedidos", href: "/admin/pedidos", icon: ClipboardList },
        { title: "Alertas", href: "/admin/alertas", icon: AlertTriangle },
        { title: "Caja", href: "/admin/caja", icon: DollarSign },
      ],
    },
    {
      label: "Gestión",
      items: [
        { title: "Personal", href: "/admin/personal", icon: Users },
        { title: "Inventario", href: "/admin/inventario", icon: Package },
      ],
    },
    {
      label: "Configuración",
      items: [
        { title: "Precios", href: "/admin/precios", icon: Tag },
        { title: "Ajustes", href: "/admin/ajustes", icon: Settings },
      ],
    },
  ];

  const allItems = groups.flatMap(g => g.items);

  const getPageTitle = () => {
    const current = allItems.find(item => item.href === pathname);
    return current ? current.title : "Panel de Control";
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-[#f8f9fc] dark:bg-zinc-950">
        <Sidebar className="border-r border-zinc-100 dark:border-zinc-800">
          <SidebarHeader className="p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600 rounded-[1rem] flex items-center justify-center text-white shadow-lg shadow-orange-900/20 rotate-6 hover:rotate-0 transition-transform cursor-pointer shrink-0">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <div className="font-black text-base tracking-tighter italic leading-none text-zinc-900 dark:text-white">TAQUERÍA</div>
                <div className="text-[9px] font-black text-orange-600 tracking-[0.25em] mt-0.5">ADMIN</div>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="px-3 overflow-y-auto">
            {groups.map((group) => (
              <SidebarGroup key={group.label} className="mt-1">
                <SidebarGroupLabel className="px-3 text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                  {group.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-0.5">
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          render={<a href={item.href} />}
                          isActive={pathname === item.href}
                          className="h-10 rounded-xl px-3 data-active:bg-orange-600 data-active:text-white transition-all data-active:shadow-sm data-active:shadow-orange-900/20 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          <item.icon className="w-4 h-4 shrink-0" />
                          <span className="font-semibold text-sm">{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarFooter className="p-4 mt-auto border-t border-zinc-100 dark:border-zinc-800">
            <Link href="/" className="flex items-center gap-2.5 px-3 py-2.5 bg-zinc-100 dark:bg-zinc-900 rounded-xl font-bold text-xs uppercase tracking-widest text-zinc-500 hover:bg-orange-600 hover:text-white transition-all">
              <ArrowLeft className="w-4 h-4 shrink-0" />
              Volver al POS
            </Link>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>
        
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <header className="h-20 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between px-8 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl">
             <div className="flex items-center gap-4">
                <SidebarTrigger className="hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl p-2 h-10 w-10 border border-zinc-100 dark:border-zinc-800 shadow-sm" />
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-400 italic">{getPageTitle()}</h2>
             </div>
             <div className="flex items-center gap-3">
               {!isOnline && (
                 <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                   <CloudOff className="w-3 h-3" /> Sin conexión
                 </div>
               )}
               <NotificationBell
                 notifications={notifications}
                 unreadCount={unreadCount}
                 onMarkAllRead={markAllRead}
                 onMarkRead={markRead}
                 onClear={clear}
               />
               <UserNav />
             </div>
          </header>
          <main className="flex-1 overflow-y-auto bg-[#f8f9fc] dark:bg-zinc-950">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
