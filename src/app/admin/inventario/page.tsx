'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  PackageOpen,
  AlertTriangle,
  Mail,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type InventoryItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  min_quantity: number;
  cost_per_unit: number;
  supplier: string | null;
  is_active: boolean;
};

const CATEGORIES = ['Carnes', 'Verduras', 'Salsas', 'Bebidas', 'Tortillas', 'Lácteos', 'Limpieza', 'General'];

type FormState = {
  name: string;
  category: string;
  unit: string;
  quantity: string;
  min_quantity: string;
  cost_per_unit: string;
  supplier: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  name: '', category: 'General', unit: 'pz',
  quantity: '', min_quantity: '5', cost_per_unit: '0',
  supplier: '', is_active: true,
};

export default function InventarioPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [showLow, setShowLow] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('category')
      .order('name');
    if (!error && data) setItems(data as InventoryItem[]);
    setLoading(false);
  }, []);

  useEffect(() => { (async () => { await fetchItems(); })(); }, [fetchItems]);

  const lowStockItems = items.filter((i) => i.is_active && i.quantity <= i.min_quantity);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      quantity: String(item.quantity),
      min_quantity: String(item.min_quantity),
      cost_per_unit: String(item.cost_per_unit),
      supplier: item.supplier ?? '',
      is_active: item.is_active,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category,
      unit: form.unit.trim() || 'pz',
      quantity: parseFloat(form.quantity) || 0,
      min_quantity: parseFloat(form.min_quantity) || 0,
      cost_per_unit: parseFloat(form.cost_per_unit) || 0,
      supplier: form.supplier.trim() || null,
      is_active: form.is_active,
    };

    let error;
    if (editing) {
      ({ error } = await supabase.from('inventory').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('inventory').insert({ ...payload, id: crypto.randomUUID() }));
    }

    if (!error) {
      await fetchItems();
      setModalOpen(false);
    } else {
      alert('Error: ' + error.message);
    }
    setSaving(false);
  };

  const handleDelete = async (item: InventoryItem) => {
    if (!confirm(`¿Eliminar "${item.name}"?`)) return;
    await supabase.from('inventory').delete().eq('id', item.id);
    await fetchItems();
  };

  const handleSendLowStockEmail = async () => {
    if (!lowStockItems.length) return;
    setSending(true);
    try {
      const res = await fetch('/api/send-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'low_stock',
          items: lowStockItems.map((i) => ({
            name: i.name,
            detail: `${i.quantity} ${i.unit} (mín: ${i.min_quantity} ${i.unit})`,
          })),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setEmailSent(true);
        setTimeout(() => setEmailSent(false), 3000);
      } else {
        alert('Error al enviar: ' + data.error);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert('Error: ' + msg);
    }
    setSending(false);
  };

  const categories = ['all', ...CATEGORIES];

  const filtered = items.filter((i) => {
    if (showLow && i.quantity > i.min_quantity) return false;
    if (catFilter !== 'all' && i.category !== catFilter) return false;
    const q = search.trim().toLowerCase();
    return !q || i.name.toLowerCase().includes(q) || (i.supplier ?? '').toLowerCase().includes(q);
  });

  const stockLevel = (i: InventoryItem) => {
    if (i.quantity <= 0) return 'empty';
    if (i.quantity <= i.min_quantity) return 'low';
    if (i.quantity <= i.min_quantity * 1.5) return 'warning';
    return 'ok';
  };

  const levelStyles = {
    empty: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300',
    low: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300',
    ok: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300',
  };

  return (
    <div className="min-h-full space-y-10 bg-[#fafafa] p-8 pb-20 dark:bg-zinc-950 lg:p-12">
      {/* Header */}
      <section className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-white">
            Inventario
          </h1>
          <p className="font-medium italic text-zinc-500">
            {items.length} insumos · {lowStockItems.length} con stock bajo
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {lowStockItems.length > 0 && (
            <Button
              onClick={handleSendLowStockEmail}
              disabled={sending || emailSent}
              className={cn(
                'h-12 rounded-2xl px-6 font-black text-xs uppercase tracking-widest shadow-xl transition-all',
                emailSent
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-orange-600 text-white hover:bg-black'
              )}
            >
              {sending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : emailSent ? (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              {emailSent ? 'Correo enviado' : `Notificar stock bajo (${lowStockItems.length})`}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={fetchItems}
            disabled={loading}
            className="h-12 rounded-2xl font-black text-xs uppercase tracking-widest"
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
            Actualizar
          </Button>
          <Button
            onClick={openCreate}
            className="h-12 rounded-2xl bg-zinc-900 px-8 font-black text-xs uppercase tracking-widest text-white shadow-xl hover:bg-black dark:bg-zinc-100 dark:text-zinc-900"
          >
            <Plus className="mr-2 h-4 w-4" /> Nuevo insumo
          </Button>
        </div>
      </section>

      {/* Low stock banner */}
      {lowStockItems.length > 0 && (
        <div className="flex items-center gap-4 rounded-[1.5rem] border border-orange-200 bg-orange-50 px-6 py-4 dark:border-orange-900/40 dark:bg-orange-950/20">
          <AlertTriangle className="h-5 w-5 shrink-0 text-orange-600" />
          <p className="text-sm font-bold text-orange-800 dark:text-orange-200">
            {lowStockItems.length} producto{lowStockItems.length > 1 ? 's' : ''} por debajo del stock mínimo:{' '}
            <span className="font-black">{lowStockItems.map((i) => i.name).join(', ')}</span>
          </p>
        </div>
      )}

      {/* Filters */}
      <section className="flex flex-col items-center justify-between gap-4 rounded-[2rem] border border-zinc-100 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:flex-row">
        <div className="relative w-full flex-1 md:max-w-sm">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar insumo o proveedor..."
            className="h-12 rounded-xl border-none bg-zinc-50 pl-12 font-bold dark:bg-zinc-800"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => setShowLow(!showLow)}
            className={cn(
              'h-10 rounded-xl px-4 font-black text-[10px] uppercase tracking-widest transition-all',
              showLow
                ? 'bg-orange-600 text-white'
                : 'bg-transparent text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            )}
          >
            <AlertTriangle className="mr-1.5 h-3.5 w-3.5" /> Stock bajo
          </Button>
          {categories.map((c) => (
            <Button
              key={c}
              type="button"
              onClick={() => setCatFilter(c)}
              className={cn(
                'h-10 rounded-xl px-4 font-black text-[10px] uppercase tracking-widest transition-all',
                catFilter === c
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-transparent text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              )}
            >
              {c === 'all' ? 'Todos' : c}
            </Button>
          ))}
        </div>
      </section>

      {/* Items grid */}
      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center opacity-30">
          <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
          <p className="mt-4 font-black text-xs uppercase tracking-widest">Cargando inventario…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-[3rem] border-4 border-dashed border-zinc-100 opacity-20 dark:border-zinc-900">
          <PackageOpen className="mb-4 h-16 w-16" />
          <p className="text-xl font-black uppercase tracking-widest">Sin insumos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => {
            const level = stockLevel(item);
            const pct = item.min_quantity > 0
              ? Math.min(100, Math.round((item.quantity / (item.min_quantity * 2)) * 100))
              : 100;
            return (
              <Card
                key={item.id}
                className={cn(
                  'group relative overflow-hidden rounded-[2rem] border bg-white shadow-sm transition-all hover:shadow-md dark:bg-zinc-900',
                  level === 'empty' || level === 'low'
                    ? 'border-orange-200 dark:border-orange-900/40'
                    : 'border-zinc-100 dark:border-zinc-800'
                )}
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <Badge className={cn('rounded-full border font-black text-[9px] uppercase tracking-widest', levelStyles[level])}>
                      {level === 'empty' ? 'Sin stock' : level === 'low' ? 'Stock bajo' : level === 'warning' ? 'Poco stock' : 'OK'}
                    </Badge>
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                      {item.category}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">
                      {item.name}
                    </h3>
                    {item.supplier && (
                      <p className="text-[10px] font-bold text-zinc-400 mt-0.5">{item.supplier}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-end justify-between">
                      <span className="text-3xl font-black italic tracking-tighter text-zinc-900 dark:text-white">
                        {item.quantity}
                        <span className="ml-1 text-sm font-bold text-zinc-400">{item.unit}</span>
                      </span>
                      <span className="text-[10px] font-bold text-zinc-400">
                        mín {item.min_quantity} {item.unit}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          level === 'empty' ? 'bg-red-500' :
                          level === 'low' ? 'bg-orange-500' :
                          level === 'warning' ? 'bg-amber-400' : 'bg-emerald-500'
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {item.cost_per_unit > 0 && (
                    <p className="text-[10px] font-bold text-zinc-400">
                      Costo: ${item.cost_per_unit.toFixed(2)} / {item.unit}
                    </p>
                  )}

                  <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(item)}
                      className="flex-1 h-9 rounded-xl border-zinc-100 font-black text-[9px] uppercase dark:border-zinc-800"
                    >
                      <Pencil className="mr-1 h-3 w-3" /> Editar
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(item)}
                      className="h-9 w-9 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={(o) => !o && setModalOpen(false)}>
        <DialogContent className="max-w-md rounded-[2.5rem] border-none bg-white p-10 shadow-2xl dark:bg-zinc-900">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter">
              {editing ? 'Editar insumo' : 'Nuevo insumo'}
            </DialogTitle>
            <DialogDescription className="font-bold text-xs uppercase tracking-widest text-zinc-400">
              Inventario · Taquería POS
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. Carne de res" className="h-12 rounded-2xl border-none bg-zinc-50 font-bold dark:bg-zinc-800" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Categoría</Label>
                <Select value={String(form.category || 'General')} onValueChange={(v) => setForm({ ...form, category: String(v ?? 'General') })}>
                  <SelectTrigger className="h-12 rounded-2xl border-none bg-zinc-50 font-bold dark:bg-zinc-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="font-bold cursor-pointer">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Unidad</Label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder="kg / L / pz" className="h-12 rounded-2xl border-none bg-zinc-50 font-bold dark:bg-zinc-800" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Cantidad actual</Label>
                <Input type="number" min="0" step="0.5" value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="h-12 rounded-2xl border-none bg-zinc-50 font-black dark:bg-zinc-800" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Stock mínimo</Label>
                <Input type="number" min="0" step="0.5" value={form.min_quantity}
                  onChange={(e) => setForm({ ...form, min_quantity: e.target.value })}
                  className="h-12 rounded-2xl border-none bg-zinc-50 font-black dark:bg-zinc-800" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Costo / unidad</Label>
                <Input type="number" min="0" step="0.5" value={form.cost_per_unit}
                  onChange={(e) => setForm({ ...form, cost_per_unit: e.target.value })}
                  className="h-12 rounded-2xl border-none bg-zinc-50 font-black dark:bg-zinc-800" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Proveedor</Label>
                <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                  placeholder="Opcional" className="h-12 rounded-2xl border-none bg-zinc-50 font-bold dark:bg-zinc-800" />
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col gap-3 sm:flex-col">
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}
              className="h-14 w-full rounded-2xl bg-orange-600 font-black text-sm uppercase tracking-widest text-white shadow-xl hover:bg-orange-700 disabled:opacity-50">
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : editing ? 'Guardar cambios' : 'Crear insumo'}
            </Button>
            <Button variant="ghost" onClick={() => setModalOpen(false)}
              className="h-10 w-full rounded-2xl font-black text-[10px] uppercase text-zinc-400">
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
