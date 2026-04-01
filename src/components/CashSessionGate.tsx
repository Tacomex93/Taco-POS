'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Loader2, Wallet, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useCashSession, CashSession } from '@/hooks/use-cash-session';

// ── Context so children can read session info ────────────────────────────────
type CashCtx = {
  session: CashSession;
  dayTotal: number;
  expectedTotal: number;
  refresh: () => Promise<void>;
};
const CashContext = createContext<CashCtx | null>(null);
export const useCashContext = () => useContext(CashContext);

// ── Gate component ────────────────────────────────────────────────────────────
type Props = { children: React.ReactNode };

export function CashSessionGate({ children }: Props) {
  const { session, loading, refresh, openSession } = useCashSession();
  const [employee, setEmployee] = useState<{ id: string; full_name: string } | null>(null);
  const [dayTotal, setDayTotal] = useState(0);

  // Open form state
  const [label, setLabel] = useState('Turno');
  const [float, setFloat] = useState('');
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState('');

  useEffect(() => {
    const s = localStorage.getItem('pos_employee_session');
    if (s) setEmployee(JSON.parse(s));
  }, []);

  // Fetch day sales once session is known
  useEffect(() => {
    if (!session) return;
    import('@/lib/supabase').then(({ supabase }) => {
      supabase
        .from('orders')
        .select('total')
        .eq('status', 'pagada')
        .gte('created_at', session.opened_at)
        .then(({ data }) => {
          setDayTotal((data ?? []).reduce((a, o) => a + Number(o.total), 0));
        });
    });
  }, [session]);

  const expectedTotal = session ? Number(session.opening_float) + dayTotal : 0;

  const handleOpen = async () => {
    const n = parseFloat(float.replace(',', '.'));
    if (isNaN(n) || n < 0) { setOpenError('Ingresa un monto válido'); return; }
    if (!employee) return;
    setOpening(true);
    setOpenError('');
    try {
      await openSession(label.trim() || 'Turno', n, employee.id);
    } catch {
      setOpenError('Error al abrir caja. Intenta de nuevo.');
    }
    setOpening(false);
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading || session === undefined) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // ── No session → apertura de caja ─────────────────────────────────────────
  if (!session) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-orange-600/15 rounded-full blur-[120px]" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px]" />
        </div>

        <div className="w-full max-w-sm relative z-10">
          <div className="flex flex-col items-center mb-8 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-[0_0_40px_rgba(234,88,12,0.4)]">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-black text-white tracking-tighter uppercase italic">Apertura de Caja</h1>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mt-1">
                {employee?.full_name ?? 'Cajero'} · Inicio de turno
              </p>
            </div>
          </div>

          <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/[0.07] rounded-[2rem] p-6 shadow-2xl space-y-5">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nombre del turno</Label>
              <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Ej. Turno Mañana"
                className="h-12 rounded-xl border-none bg-white/[0.06] text-white font-bold placeholder:text-zinc-600 focus-visible:ring-orange-500" />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Fondo inicial en caja ($)</Label>
              <p className="text-[9px] text-zinc-600 font-bold">Cuenta el efectivo físico antes de empezar</p>
              <Input type="number" min="0" step="0.50" value={float}
                onChange={e => { setFloat(e.target.value); setOpenError(''); }}
                placeholder="0.00"
                className="h-14 rounded-xl border-none bg-white/[0.06] text-white font-black text-2xl placeholder:text-zinc-700 focus-visible:ring-orange-500" />
              <div className="flex gap-2 flex-wrap">
                {[500, 1000, 1500, 2000].map(n => (
                  <button key={n} type="button" onClick={() => setFloat(String(n))}
                    className={cn('h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                      float === String(n) ? 'bg-orange-500 text-white' : 'bg-white/[0.06] text-zinc-400 hover:bg-white/[0.1]')}>
                    ${n}
                  </button>
                ))}
              </div>
            </div>

            {openError && <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">{openError}</p>}

            <Button onClick={handleOpen} disabled={opening || !float}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-black uppercase tracking-widest text-sm shadow-lg shadow-orange-500/30 disabled:opacity-40">
              {opening ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Unlock className="w-4 h-4 mr-2" />Abrir caja y comenzar turno</>}
            </Button>
          </div>

          <p className="text-center text-[9px] font-bold text-zinc-700 uppercase tracking-[0.3em] mt-6">
            No puedes operar sin abrir caja primero
          </p>
        </div>
      </div>
    );
  }

  // ── Session open → render children with context ───────────────────────────
  return (
    <CashContext.Provider value={{ session, dayTotal, expectedTotal, refresh }}>
      {children}
    </CashContext.Provider>
  );
}
