'use client';

import React, { useEffect, useState } from 'react';import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, ShieldCheck } from "lucide-react";
import { Employee } from "@/lib/types";

export function UserNav() {
  const router = useRouter();
  const [user] = useState<Employee | null>(() => {
    if (typeof window === 'undefined') return null;
    const s = localStorage.getItem('pos_employee_session');
    return s ? (JSON.parse(s) as Employee) : null;
  });

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  const handleLogout = () => {
    localStorage.removeItem('pos_employee_session');
    router.push('/login');
  };

  const rolesEspanol: Record<string, string> = {
    admin: 'Administrador',
    cajero: 'Cajero',
    mesero: 'Mesero',
    cocina: 'Cocina',
  };

  if (!user) return null;

  return (
    <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 p-2 pr-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
      <div className="flex items-center gap-3 px-2">
        <Avatar className="h-10 w-10 border-2 border-orange-600/20 shadow-lg">
          <AvatarFallback className="bg-orange-600 text-white font-black text-xs uppercase">
            {user.full_name.substring(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="hidden lg:block text-left">
          <div className="flex items-center gap-1.5">
             <p className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">{rolesEspanol[user.role] || user.role}</p>
             {user.role === 'admin' && <ShieldCheck className="w-3 h-3 text-orange-600" />}
          </div>
          <p className="text-sm font-black text-zinc-900 dark:text-zinc-50 leading-tight truncate max-w-[120px]">
            {user.full_name}
          </p>
        </div>
      </div>
      
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={handleLogout}
        className="h-10 w-10 rounded-xl hover:bg-red-500 hover:text-white transition-all group"
        title="Cerrar Sesión"
      >
        <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
      </Button>
    </div>
  );
}
