'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Delete, Lock, UserCheck, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
      setError(null);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const verifyPin = async (finalPin: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('employees')
        .select('*')
        .eq('pin', finalPin)
        .eq('is_active', true)
        .single();

      if (fetchError || !data) {
        setError('PIN incorrecto. Inténtalo de nuevo.');
        setPin('');
        setLoading(false);
        return;
      }

      // Save session
      localStorage.setItem('pos_employee_session', JSON.stringify(data));

      // Redirect by role
      const role = data.role as string;
      if (role === 'admin') router.push('/admin/dashboard');
      else if (role === 'cajero') router.push('/cajero');
      else if (role === 'mesero') router.push('/mesero');
      else if (role === 'cocina') router.push('/cocina');
      else router.push('/');

    } catch {
      setError('Error de conexión con el de servidor.');
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (pin.length >= 4) verifyPin(pin);
    else setError('El PIN debe tener al menos 4 dígitos.');
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
         <div className="absolute -top-20 -left-20 w-96 h-96 bg-orange-600 rounded-full blur-[120px]"></div>
         <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-emerald-600 rounded-full blur-[120px]"></div>
      </div>

      <Card className="w-full max-w-[420px] bg-black/60 backdrop-blur-3xl border-white/5 shadow-[0_32px_120px_-15px_rgba(0,0,0,0.8)] rounded-[3rem] animate-slide-up relative z-10">
        <CardHeader className="text-center p-10 pb-6 space-y-4">
          <div className="mx-auto w-16 h-16 bg-zinc-900 rounded-[1.5rem] flex items-center justify-center border border-white/10 shadow-2xl">
             <Lock className="w-8 h-8 text-orange-600" />
          </div>
          <div className="space-y-1">
             <CardTitle className="text-3xl font-black text-white tracking-tighter uppercase italic">Control de Acceso</CardTitle>
             <CardDescription className="text-zinc-500 font-bold text-xs uppercase tracking-widest leading-none pt-2">Taquería POS • Iniciar Sesión</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-10 pt-0 space-y-10">
          <div className="space-y-6">
             <div className="flex justify-center gap-6">
                {[...Array(4)].map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "w-4 h-4 rounded-full border-2 transition-all duration-300",
                      pin.length > i ? "bg-orange-600 border-orange-600 scale-125 shadow-[0_0_15px_rgba(234,88,12,0.6)]" : "border-white/10"
                    )}
                  />
                ))}
             </div>
             
             {error ? (
                <div className="flex items-center gap-2 justify-center text-red-500 bg-red-500/10 py-3 px-4 rounded-2xl animate-pulse">
                   <AlertCircle className="w-4 h-4" />
                   <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
                </div>
             ) : (
                <p className="text-center text-zinc-600 text-[10px] font-black uppercase tracking-widest italic">Introduce tu código de empleado</p>
             )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <Button 
                key={num} 
                variant="ghost" 
                onClick={() => handleNumberClick(num.toString())}
                className="h-20 rounded-[2rem] bg-white/5 hover:bg-orange-600 hover:text-white text-white font-black text-2xl transition-all active:scale-90 border border-white/5 shadow-xl"
              >
                {num}
              </Button>
            ))}
            <Button 
               variant="ghost" 
               onClick={handleDelete}
               className="h-20 rounded-[2rem] bg-red-500/5 hover:bg-red-500 text-red-500 hover:text-white font-black text-2xl transition-all border border-red-500/10 shadow-xl"
            >
              <Delete className="w-8 h-8" />
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => handleNumberClick('0')}
              className="h-20 rounded-[2rem] bg-white/5 hover:bg-orange-600 hover:text-white text-white font-black text-2xl transition-all active:scale-90 border border-white/5 shadow-xl"
            >
              0
            </Button>
            <Button 
              disabled={loading || pin.length < 4}
              onClick={handleSubmit}
              className="h-20 rounded-[2rem] bg-emerald-600 hover:bg-emerald-500 text-white font-black transition-all shadow-xl shadow-emerald-900/40 relative overflow-hidden"
            >
              {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : <UserCheck className="w-8 h-8" />}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <div className="absolute bottom-10 text-[10px] font-black text-zinc-700 uppercase tracking-[0.4em] italic leading-none text-center pointer-events-none">
         Security System • 2026 • Encrypted PIN Access
      </div>
    </div>
  );
}
