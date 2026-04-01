'use client';

import React, { useState } from 'react';
import { Lock, Unlock, Banknote, CreditCard, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useCashContext } from '@/components/CashSessionGate';
import { useCashSession } from '@/hooks/use-cash-session';

const fmt = (n: number) =>
  `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function CashSessionBar() {
  const ctx = useCashContext();
  const { closeSession } = useCashSession();

  const [showClose, setShowClose] = useState(false);
  const [closeCash, setCloseCash] = useState('');
  const [closeCard, setCloseCard] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [closing, setClosing] = useState(false);

  if (!ctx) return null;
  const { session, dayTotal, expectedTotal, refresh } = ctx;

  const closeDiff = parseFloat(closeCash || '0') + parseFloat(closeCard || '0') - expectedTotal;

  const handleClose = async () => {
    setClosing(true);
    try {
      await closeSession(
        session.id,
        parseFloat(closeCash || '0'),
        parseFloat(closeCard || '0'),
        expectedTotal,
        closeNotes
      );
      setShowClose(false);
      setCloseCash(''); setCloseCard(''); setCloseNotes('');
      await refresh();
    } catch {
      alert('Error al cerrar caja.');
    }
    setClosing(false);
  };

  return (
    <>
      {/* Banner — lives inside SidebarInset, below the header */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2 bg-emerald-500/10 border-b border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center gap-2 min-w-0">
          <Unlock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest truncate">
            {session.label}
          </span>
          <span className="text-[10px] font-bold text-zinc-400 hidden sm:inline">·</span>
          <span className="text-[10px] font-bold text-zinc-500 hidden sm:inline">
            Fondo: {fmt(Number(session.opening_float))}
          </span>
          <span className="text-[10px] font-bold text-zinc-400 hidden md:inline">·</span>
          <span className="text-[10px] font-bold text-zinc-500 hidden md:inline">
            Ventas: {fmt(dayTotal)}
          </span>
        </div>
        <button
          onClick={() => setShowClose(true)}
          className="shrink-0 h-7 px-3 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-black text-[9px] uppercase tracking-widest hover:bg-red-600 dark:hover:bg-red-600 dark:hover:text-white transition-colors flex items-center gap-1.5"
        >
          <Lock className="w-3 h-3" /> Cerrar caja
        </button>
      </div>

      {/* Close dialog */}
      {showClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowClose(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl p-8 space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center shrink-0">
                <Lock className="w-6 h-6 text-white dark:text-zinc-900" />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter">Cerrar turno</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  Esperado: <span className="text-zinc-900 dark:text-white">{fmt(expectedTotal)}</span>
                </p>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-4 space-y-2">
              {[
                { label: 'Fondo inicial', value: fmt(Number(session.opening_float)) },
                { label: 'Ventas del turno', value: fmt(dayTotal) },
                { label: 'Total esperado', value: fmt(expectedTotal), highlight: true },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className={cn('font-bold', r.highlight ? 'text-zinc-900 dark:text-white' : 'text-zinc-500')}>{r.label}</span>
                  <span className={cn('font-black', r.highlight ? 'text-orange-600 text-base' : 'text-zinc-700 dark:text-zinc-300')}>{r.value}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                  <Banknote className="inline w-3 h-3 mr-1" />Efectivo contado
                </Label>
                <Input type="number" min="0" value={closeCash} onChange={e => setCloseCash(e.target.value)}
                  placeholder="0.00" className="h-12 rounded-xl border-none bg-zinc-50 dark:bg-zinc-800 font-black text-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                  <CreditCard className="inline w-3 h-3 mr-1" />Tarjeta
                </Label>
                <Input type="number" min="0" value={closeCard} onChange={e => setCloseCard(e.target.value)}
                  placeholder="0.00" className="h-12 rounded-xl border-none bg-zinc-50 dark:bg-zinc-800 font-black text-lg" />
              </div>
            </div>

            {(closeCash || closeCard) && (
              <div className={cn('flex items-center justify-between rounded-xl px-4 py-3',
                Math.abs(closeDiff) < 1 ? 'bg-emerald-50 dark:bg-emerald-950/20'
                  : closeDiff > 0 ? 'bg-blue-50 dark:bg-blue-950/20' : 'bg-red-50 dark:bg-red-950/20')}>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Diferencia</span>
                <span className={cn('font-black text-lg flex items-center gap-2',
                  Math.abs(closeDiff) < 1 ? 'text-emerald-600' : closeDiff > 0 ? 'text-blue-600' : 'text-red-600')}>
                  {closeDiff >= 0 ? '+' : ''}{fmt(closeDiff)}
                  {Math.abs(closeDiff) < 1 ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Notas (opcional)</Label>
              <Input value={closeNotes} onChange={e => setCloseNotes(e.target.value)}
                placeholder="Observaciones del turno..."
                className="h-11 rounded-xl border-none bg-zinc-50 dark:bg-zinc-800 font-bold" />
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setShowClose(false)}
                className="flex-1 h-12 rounded-xl font-black text-[10px] uppercase text-zinc-400">
                Cancelar
              </Button>
              <Button onClick={handleClose} disabled={closing}
                className="flex-1 h-12 rounded-xl bg-zinc-900 hover:bg-red-600 text-white font-black text-[10px] uppercase tracking-widest dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-red-600 dark:hover:text-white">
                {closing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Lock className="w-4 h-4 mr-2" />Cerrar y guardar</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
