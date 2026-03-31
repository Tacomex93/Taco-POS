'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  Wallet, ArrowDownRight, History,
  Lock, Unlock, Receipt, Loader2, Plus, RefreshCw,
  TrendingUp, CreditCard, Banknote, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronUp, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type CashSession = {
  id: string; label: string; status: 'abierta' | 'cerrada';
  opening_float: number; closing_cash: number | null; card_total: number | null;
  expected_total: number | null; difference_amount: number | null;
  opened_at: string; closed_at: string | null; notes: string | null;
};

type Movement = {
  id: string; session_id: string; kind: 'ingreso' | 'retiro' | 'ajuste';
  amount: number; note: string | null; created_at: string;
};

type DayOrder = { total: number; status: string; created_at: string };

const fmt = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

export default function CajaAdminPage() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [openSession, setOpenSession] = useState<CashSession | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [dayOrders, setDayOrders] = useState<DayOrder[]>([]);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // Open caja form
  const [openingFloat, setOpeningFloat] = useState('1500');
  const [openLabel, setOpenLabel] = useState('Turno');
  const [openDialogOpen, setOpenDialogOpen] = useState(false);

  // Close caja form
  const [closeCash, setCloseCash] = useState('');
  const [closeCard, setCloseCard] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  // Movement form
  const [movDialogOpen, setMovDialogOpen] = useState(false);
  const [movKind, setMovKind] = useState<'ingreso' | 'retiro' | 'ajuste'>('retiro');
  const [movAmount, setMovAmount] = useState('');
  const [movNote, setMovNote] = useState('');
  const [savingMov, setSavingMov] = useState(false);

  const loadDayOrders = useCallback(async () => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const { data } = await supabase.from('orders').select('total,status,created_at')
      .gte('created_at', start.toISOString());
    setDayOrders((data ?? []) as DayOrder[]);
  }, []);

  const loadMovements = useCallback(async (sessionId: string) => {
    const { data } = await supabase.from('cash_movements').select('*')
      .eq('session_id', sessionId).order('created_at', { ascending: false });
    setMovements((data ?? []) as Movement[]);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: list }, { data: abierta }] = await Promise.all([
      supabase.from('cash_sessions').select('*').order('opened_at', { ascending: false }).limit(30),
      supabase.from('cash_sessions').select('*').eq('status', 'abierta').maybeSingle(),
    ]);
    setSessions((list ?? []) as CashSession[]);
    const session = (abierta ?? null) as CashSession | null;
    setOpenSession(session);
    if (session) await loadMovements(session.id);
    await loadDayOrders();
    setLoading(false);
  }, [loadMovements, loadDayOrders]);

  useEffect(() => { (async () => { await load(); })(); }, [load]);

  // Derived stats
  const paidOrders = dayOrders.filter(o => o.status === 'pagada');
  const ventasHoy = paidOrders.reduce((a, o) => a + Number(o.total), 0);
  const ordenesHoy = dayOrders.length;
  const pagadasHoy = paidOrders.length;

  const totalIngresos = movements.filter(m => m.kind === 'ingreso').reduce((a, m) => a + Number(m.amount), 0);
  const totalRetiros = movements.filter(m => m.kind === 'retiro').reduce((a, m) => a + Number(m.amount), 0);
  const totalAjustes = movements.filter(m => m.kind === 'ajuste').reduce((a, m) => a + Number(m.amount), 0);
  const efectivoEsperado = openSession
    ? Number(openSession.opening_float) + ventasHoy + totalIngresos - totalRetiros + totalAjustes
    : 0;

  const handleOpenCaja = async () => {
    const n = parseFloat(openingFloat.replace(',', '.'));
    if (Number.isNaN(n) || n < 0) return;
    setLoading(true);
    const { error } = await supabase.from('cash_sessions').insert({
      label: openLabel.trim() || 'Turno', status: 'abierta', opening_float: n,
    });
    setLoading(false);
    if (error) { alert('Error: ' + error.message); return; }
    setOpenDialogOpen(false);
    await load();
  };

  const handleCloseCaja = async () => {
    if (!openSession) return;
    const cash = parseFloat(closeCash.replace(',', '.') || '0');
    const card = parseFloat(closeCard.replace(',', '.') || '0');
    const diff = Math.round((cash + card - efectivoEsperado) * 100) / 100;
    setClosing(true);
    const { error } = await supabase.from('cash_sessions').update({
      status: 'cerrada', closing_cash: cash, card_total: card,
      expected_total: efectivoEsperado,
      difference_amount: diff,
      closed_at: new Date().toISOString(),
      notes: closeNotes.trim() || null,
    }).eq('id', openSession.id);
    setClosing(false);
    if (error) { alert('Error: ' + error.message); return; }
    setCloseDialogOpen(false);
    setCloseCash(''); setCloseCard(''); setCloseNotes('');
    await load();
  };

  const handleAddMovement = async () => {
    if (!openSession) return;
    const amount = parseFloat(movAmount.replace(',', '.'));
    if (Number.isNaN(amount) || amount <= 0) return;
    setSavingMov(true);
    const { error } = await supabase.from('cash_movements').insert({
      session_id: openSession.id, kind: movKind, amount,
      note: movNote.trim() || null,
    });
    setSavingMov(false);
    if (error) { alert('Error: ' + error.message); return; }
    setMovDialogOpen(false);
    setMovAmount(''); setMovNote('');
    await loadMovements(openSession.id);
  };

  const movKindLabel = { ingreso: 'Ingreso', retiro: 'Retiro', ajuste: 'Ajuste' };
  const movKindColor = {
    ingreso: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
    retiro: 'text-red-600 bg-red-50 dark:bg-red-950/30',
    ajuste: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
  };

  return (
    <div className="min-h-full space-y-8 bg-[#fafafa] p-8 pb-20 dark:bg-zinc-950 lg:p-10">
      {/* Header */}
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-white">Caja</h1>
          <p className="font-medium italic text-zinc-500">Control de turnos, movimientos y arqueos</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={load} disabled={loading}
            className="h-11 rounded-2xl font-black text-xs uppercase tracking-widest">
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} /> Actualizar
          </Button>
          {!openSession ? (
            <Button onClick={() => setOpenDialogOpen(true)}
              className="h-11 rounded-2xl bg-orange-600 px-6 font-black text-xs uppercase tracking-widest text-white shadow-xl hover:bg-black">
              <Unlock className="mr-2 h-4 w-4" /> Abrir turno
            </Button>
          ) : (
            <Button onClick={() => setCloseDialogOpen(true)}
              className="h-11 rounded-2xl bg-zinc-900 px-6 font-black text-xs uppercase tracking-widest text-white shadow-xl hover:bg-red-600 dark:bg-zinc-100 dark:text-zinc-900">
              <Lock className="mr-2 h-4 w-4" /> Cerrar turno
            </Button>
          )}
        </div>
      </section>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Ventas del día', value: fmt(ventasHoy), sub: `${pagadasHoy} órdenes pagadas`, icon: TrendingUp, color: 'from-orange-500 to-amber-500' },
          { label: 'Efectivo esperado', value: fmt(efectivoEsperado), sub: openSession ? 'Fondo + ventas + movs' : 'Sin sesión activa', icon: Wallet, color: 'from-emerald-500 to-teal-500' },
          { label: 'Retiros del turno', value: fmt(totalRetiros), sub: `${movements.filter(m=>m.kind==='retiro').length} movimientos`, icon: ArrowDownRight, color: 'from-red-500 to-rose-500' },
          { label: 'Órdenes hoy', value: String(ordenesHoy), sub: `${dayOrders.filter(o=>o.status==='abierta').length} abiertas`, icon: Receipt, color: 'from-sky-500 to-blue-600' },
        ].map((k) => (
          <Card key={k.label} className="relative overflow-hidden rounded-[2rem] border-none bg-white shadow-sm dark:bg-zinc-900">
            <div className={cn('pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br opacity-15 blur-2xl', k.color)} />
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md', k.color)}>
                  <k.icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 space-y-0.5">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">{k.label}</p>
                <p className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">{k.value}</p>
                <p className="text-[10px] font-semibold text-zinc-400">{k.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active session panel */}
      {openSession && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Session info */}
          <Card className="rounded-[2rem] border-none bg-zinc-900 text-white shadow-xl lg:col-span-1">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
                  <Unlock className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Turno activo</p>
                  <p className="font-black text-lg leading-tight">{openSession.label}</p>
                </div>
              </div>
              <Separator className="bg-white/10" />
              <div className="space-y-3">
                {[
                  { label: 'Fondo inicial', value: fmt(Number(openSession.opening_float)) },
                  { label: 'Abierto a las', value: fmtTime(openSession.opened_at) },
                  { label: 'Ventas (efectivo est.)', value: fmt(ventasHoy) },
                  { label: 'Ingresos extra', value: fmt(totalIngresos) },
                  { label: 'Retiros', value: `-${fmt(totalRetiros)}` },
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-sm">
                    <span className="font-bold opacity-50">{r.label}</span>
                    <span className="font-black">{r.value}</span>
                  </div>
                ))}
                <Separator className="bg-white/10" />
                <div className="flex justify-between">
                  <span className="font-black text-sm opacity-70">Efectivo esperado</span>
                  <span className="font-black text-xl text-emerald-400">{fmt(efectivoEsperado)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Movements */}
          <Card className="rounded-[2rem] border-none bg-white shadow-sm dark:bg-zinc-900 lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
              <div>
                <CardTitle className="text-base font-black">Movimientos del turno</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest">
                  {movements.length} registros
                </CardDescription>
              </div>
              <Button onClick={() => setMovDialogOpen(true)}
                className="h-9 rounded-xl bg-orange-600 px-4 font-black text-[10px] uppercase tracking-widest text-white hover:bg-black">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Registrar
              </Button>
            </CardHeader>
            <CardContent className="p-4 max-h-72 overflow-y-auto space-y-2">
              {movements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 opacity-20">
                  <FileText className="h-10 w-10 mb-2" />
                  <p className="text-xs font-black uppercase tracking-widest">Sin movimientos</p>
                </div>
              ) : movements.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800">
                  <div className="flex items-center gap-3">
                    <span className={cn('rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-widest', movKindColor[m.kind])}>
                      {movKindLabel[m.kind]}
                    </span>
                    <span className="text-sm font-bold text-zinc-600 dark:text-zinc-300">{m.note ?? '—'}</span>
                  </div>
                  <div className="text-right">
                    <p className={cn('font-black text-base', m.kind === 'retiro' ? 'text-red-600' : m.kind === 'ingreso' ? 'text-emerald-600' : 'text-blue-600')}>
                      {m.kind === 'retiro' ? '-' : '+'}{fmt(Number(m.amount))}
                    </p>
                    <p className="text-[9px] font-bold text-zinc-400">{fmtTime(m.created_at)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Session history */}
      <Card className="rounded-[2rem] border-none bg-white shadow-sm dark:bg-zinc-900">
        <CardHeader className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <History className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-base font-black">Historial de turnos</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-2">
          {loading && sessions.length === 0 && (
            <div className="flex justify-center py-8 opacity-30">
              <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
          )}
          {!loading && sessions.length === 0 && (
            <p className="py-8 text-center text-sm font-bold text-zinc-400">Aún no hay turnos registrados.</p>
          )}
          {sessions.map((s) => {
            const isExpanded = expandedSession === s.id;
            const diff = s.difference_amount;
            return (
              <div key={s.id} className="rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedSession(isExpanded ? null : s.id)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                      s.status === 'abierta' ? 'bg-emerald-100 dark:bg-emerald-950/30' : 'bg-zinc-100 dark:bg-zinc-800')}>
                      {s.status === 'abierta'
                        ? <Unlock className="h-4 w-4 text-emerald-600" />
                        : <Lock className="h-4 w-4 text-zinc-400" />}
                    </div>
                    <div>
                      <p className="font-black text-sm text-zinc-900 dark:text-white">{s.label} · {fmtDate(s.opened_at)}</p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        {fmtTime(s.opened_at)}{s.closed_at ? ` → ${fmtTime(s.closed_at)}` : ' · En curso'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {s.status === 'cerrada' && diff != null && (
                      <Badge className={cn('rounded-full border-none font-black text-[9px] uppercase',
                        Math.abs(diff) < 1 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                        : diff > 0 ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300'
                        : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300')}>
                        {Math.abs(diff) < 1 ? '✓ Cuadre' : diff > 0 ? `+${fmt(diff)}` : fmt(diff)}
                      </Badge>
                    )}
                    {s.status === 'abierta' && (
                      <Badge className="rounded-full border-none bg-orange-100 text-orange-700 font-black text-[9px] uppercase">En curso</Badge>
                    )}
                    {s.closing_cash != null && (
                      <span className="font-black text-base text-zinc-900 dark:text-white">{fmt(Number(s.closing_cash) + Number(s.card_total ?? 0))}</span>
                    )}
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 px-5 py-4">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        { label: 'Fondo inicial', value: fmt(Number(s.opening_float)) },
                        { label: 'Efectivo contado', value: s.closing_cash != null ? fmt(Number(s.closing_cash)) : '—' },
                        { label: 'Tarjeta', value: s.card_total != null ? fmt(Number(s.card_total)) : '—' },
                        { label: 'Esperado', value: s.expected_total != null ? fmt(Number(s.expected_total)) : '—' },
                      ].map(r => (
                        <div key={r.label} className="rounded-xl bg-white dark:bg-zinc-900 p-3">
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{r.label}</p>
                          <p className="mt-1 font-black text-sm text-zinc-900 dark:text-white">{r.value}</p>
                        </div>
                      ))}
                    </div>
                    {s.notes && (
                      <p className="mt-3 text-xs font-bold text-zinc-500 italic">Nota: {s.notes}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Open caja dialog */}
      <Dialog open={openDialogOpen} onOpenChange={setOpenDialogOpen}>
        <DialogContent className="max-w-sm rounded-[2.5rem] border-none bg-white p-8 shadow-2xl dark:bg-zinc-900">
          <DialogHeader className="space-y-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg">
              <Unlock className="h-6 w-6" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Abrir turno</DialogTitle>
            <DialogDescription className="font-bold text-xs uppercase tracking-widest text-zinc-400">
              Registra el fondo inicial de caja
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Nombre del turno</Label>
              <Input value={openLabel} onChange={e => setOpenLabel(e.target.value)}
                placeholder="Ej. Turno Mañana" className="h-12 rounded-2xl border-none bg-zinc-50 font-bold dark:bg-zinc-800" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Fondo inicial ($)</Label>
              <Input type="number" min="0" value={openingFloat} onChange={e => setOpeningFloat(e.target.value)}
                className="h-12 rounded-2xl border-none bg-zinc-50 font-black text-xl dark:bg-zinc-800" />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2">
            <Button onClick={handleOpenCaja} disabled={loading}
              className="h-12 w-full rounded-2xl bg-orange-600 font-black text-sm uppercase tracking-widest text-white hover:bg-orange-700">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Abrir caja'}
            </Button>
            <Button variant="ghost" onClick={() => setOpenDialogOpen(false)}
              className="h-10 w-full rounded-2xl font-black text-[10px] uppercase text-zinc-400">Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close caja dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] border-none bg-white p-8 shadow-2xl dark:bg-zinc-900">
          <DialogHeader className="space-y-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900">
              <Lock className="h-6 w-6" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Cerrar turno</DialogTitle>
            <DialogDescription className="font-bold text-xs uppercase tracking-widest text-zinc-400">
              Arqueo final · Efectivo esperado: <span className="text-zinc-900 dark:text-white">{fmt(efectivoEsperado)}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  <Banknote className="inline h-3 w-3 mr-1" />Efectivo contado
                </Label>
                <Input type="number" min="0" value={closeCash} onChange={e => setCloseCash(e.target.value)}
                  placeholder="0.00" className="h-12 rounded-2xl border-none bg-zinc-50 font-black dark:bg-zinc-800" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  <CreditCard className="inline h-3 w-3 mr-1" />Tarjeta
                </Label>
                <Input type="number" min="0" value={closeCard} onChange={e => setCloseCard(e.target.value)}
                  placeholder="0.00" className="h-12 rounded-2xl border-none bg-zinc-50 font-black dark:bg-zinc-800" />
              </div>
            </div>
            {/* Live diff preview */}
            {(closeCash || closeCard) && (() => {
              const cash = parseFloat(closeCash || '0');
              const card = parseFloat(closeCard || '0');
              const diff = cash + card - efectivoEsperado;
              return (
                <div className={cn('flex items-center justify-between rounded-2xl px-4 py-3',
                  Math.abs(diff) < 1 ? 'bg-emerald-50 dark:bg-emerald-950/20'
                  : diff > 0 ? 'bg-blue-50 dark:bg-blue-950/20' : 'bg-red-50 dark:bg-red-950/20')}>
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Diferencia</span>
                  <span className={cn('font-black text-lg',
                    Math.abs(diff) < 1 ? 'text-emerald-600' : diff > 0 ? 'text-blue-600' : 'text-red-600')}>
                    {diff >= 0 ? '+' : ''}{fmt(diff)}
                    {Math.abs(diff) < 1 && <CheckCircle2 className="inline ml-2 h-4 w-4" />}
                    {Math.abs(diff) >= 1 && <AlertTriangle className="inline ml-2 h-4 w-4" />}
                  </span>
                </div>
              );
            })()}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Notas (opcional)</Label>
              <Input value={closeNotes} onChange={e => setCloseNotes(e.target.value)}
                placeholder="Observaciones del turno..." className="h-12 rounded-2xl border-none bg-zinc-50 font-bold dark:bg-zinc-800" />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2">
            <Button onClick={handleCloseCaja} disabled={closing}
              className="h-12 w-full rounded-2xl bg-zinc-900 font-black text-sm uppercase tracking-widest text-white hover:bg-red-600 dark:bg-zinc-100 dark:text-zinc-900">
              {closing ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Cerrar y guardar arqueo'}
            </Button>
            <Button variant="ghost" onClick={() => setCloseDialogOpen(false)}
              className="h-10 w-full rounded-2xl font-black text-[10px] uppercase text-zinc-400">Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Movement dialog */}
      <Dialog open={movDialogOpen} onOpenChange={setMovDialogOpen}>
        <DialogContent className="max-w-sm rounded-[2.5rem] border-none bg-white p-8 shadow-2xl dark:bg-zinc-900">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Registrar movimiento</DialogTitle>
            <DialogDescription className="font-bold text-xs uppercase tracking-widest text-zinc-400">
              Turno: {openSession?.label}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-2">
              {(['retiro', 'ingreso', 'ajuste'] as const).map(k => (
                <button key={k} type="button" onClick={() => setMovKind(k)}
                  className={cn('h-10 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all',
                    movKind === k ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800')}>
                  {movKindLabel[k]}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Monto ($)</Label>
              <Input type="number" min="0" step="0.50" value={movAmount} onChange={e => setMovAmount(e.target.value)}
                placeholder="0.00" className="h-12 rounded-2xl border-none bg-zinc-50 font-black text-xl dark:bg-zinc-800" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Concepto</Label>
              <Input value={movNote} onChange={e => setMovNote(e.target.value)}
                placeholder="Ej. Pago a proveedor, cambio de caja..." className="h-12 rounded-2xl border-none bg-zinc-50 font-bold dark:bg-zinc-800" />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2">
            <Button onClick={handleAddMovement} disabled={savingMov || !movAmount}
              className={cn('h-12 w-full rounded-2xl font-black text-sm uppercase tracking-widest text-white',
                movKind === 'retiro' ? 'bg-red-600 hover:bg-red-700'
                : movKind === 'ingreso' ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-blue-600 hover:bg-blue-700')}>
              {savingMov ? <Loader2 className="h-5 w-5 animate-spin" /> : `Registrar ${movKindLabel[movKind]}`}
            </Button>
            <Button variant="ghost" onClick={() => setMovDialogOpen(false)}
              className="h-10 w-full rounded-2xl font-black text-[10px] uppercase text-zinc-400">Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
