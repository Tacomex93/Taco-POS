'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Delete, UserCheck, Loader2, AlertCircle, ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
      setError(null);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(null);
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
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
        triggerShake();
        setLoading(false);
        return;
      }

      localStorage.setItem('pos_employee_session', JSON.stringify(data));

      const role = data.role as string;
      if (role === 'admin') router.push('/admin/dashboard');
      else if (role === 'cajero') router.push('/cajero');
      else if (role === 'mesero') router.push('/mesero');
      else if (role === 'cocina') router.push('/cocina');
      else router.push('/');

    } catch {
      setError('Error de conexión con el servidor.');
      triggerShake();
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (pin.length >= 4) verifyPin(pin);
    else {
      setError('El PIN debe tener 4 dígitos.');
      triggerShake();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-orange-600/20 rounded-full blur-[140px]" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-orange-900/10 rounded-full blur-[100px]" />
      </div>

      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />

      <div className={cn("w-full max-w-[400px] relative z-10 transition-all", shake && "animate-[shake_0.4s_ease-in-out]")}>
        {/* Logo / Brand */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-[0_0_60px_rgba(234,88,12,0.4)] border border-orange-400/20">
            <ChefHat className="w-10 h-10 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic leading-none">Taquería POS</h1>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mt-1">Sistema de Punto de Venta</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/[0.07] rounded-[2.5rem] p-8 shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
          {/* PIN dots */}
          <div className="flex justify-center gap-5 mb-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-5 h-5 rounded-full transition-all duration-200",
                  pin.length > i
                    ? "bg-orange-500 shadow-[0_0_16px_rgba(249,115,22,0.7)] scale-110"
                    : "bg-white/10 border border-white/10"
                )}
              />
            ))}
          </div>

          {/* Status message */}
          <div className="h-8 flex items-center justify-center mb-6">
            {error ? (
              <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 py-1.5 px-4 rounded-xl">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
              </div>
            ) : (
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.25em]">
                {pin.length === 0 ? 'Ingresa tu PIN de empleado' : `${pin.length} de 4 dígitos`}
              </p>
            )}
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                onClick={() => handleNumberClick(num.toString())}
                className="h-[72px] rounded-2xl bg-white/[0.06] hover:bg-orange-500/20 active:scale-95 active:bg-orange-500/30 text-white font-black text-2xl transition-all duration-150 border border-white/[0.06] hover:border-orange-500/30 shadow-sm select-none"
              >
                {num}
              </button>
            ))}

            {/* Delete */}
            <button
              onClick={handleDelete}
              className="h-[72px] rounded-2xl bg-red-500/[0.08] hover:bg-red-500/20 active:scale-95 text-red-400 hover:text-red-300 font-black text-2xl transition-all duration-150 border border-red-500/10 hover:border-red-500/30 flex items-center justify-center select-none"
            >
              <Delete className="w-6 h-6" />
            </button>

            {/* 0 */}
            <button
              onClick={() => handleNumberClick('0')}
              className="h-[72px] rounded-2xl bg-white/[0.06] hover:bg-orange-500/20 active:scale-95 active:bg-orange-500/30 text-white font-black text-2xl transition-all duration-150 border border-white/[0.06] hover:border-orange-500/30 shadow-sm select-none"
            >
              0
            </button>

            {/* Enter */}
            <Button
              disabled={loading || pin.length < 4}
              onClick={handleSubmit}
              className={cn(
                "h-[72px] rounded-2xl font-black text-white transition-all duration-150 border-none shadow-lg select-none",
                pin.length === 4 && !loading
                  ? "bg-gradient-to-br from-orange-500 to-orange-700 hover:from-orange-400 hover:to-orange-600 shadow-[0_8px_30px_rgba(234,88,12,0.4)] active:scale-95"
                  : "bg-white/[0.04] text-white/20 cursor-not-allowed"
              )}
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <UserCheck className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[9px] font-bold text-zinc-700 uppercase tracking-[0.35em] mt-8">
          Acceso Seguro • Cifrado • 2026
        </p>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}
