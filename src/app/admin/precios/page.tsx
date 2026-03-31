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
  Tag,
  PackageOpen,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Product = {
  id: string;
  name: string;
  category: string | null;
  price: number;
  is_active: boolean;
  unit: string;
  size_variant: string | null;
  created_at: string;
};

const CATEGORIES = ['Tacos', 'Bebidas', 'Extras', 'Postres', 'Otro'];

const emptyForm: { name: string; category: string; price: string; is_active: boolean; unit: string; size_variant: string; } = {
  name: '', category: 'Tacos', price: '', is_active: true, unit: 'pz', size_variant: '',
};

export default function PreciosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<{ name: string; category: string; price: string; is_active: boolean; unit: string; size_variant: string; }>(emptyForm);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });
    if (!error && data) setProducts(data as Product[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => { await fetchProducts(); })();
  }, [fetchProducts]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, category: (p.category ?? 'Tacos') as string, price: String(p.price), is_active: p.is_active ?? true, unit: p.unit ?? 'pz', size_variant: p.size_variant ?? '' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) return;
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) return;

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category,
      price,
      is_active: form.is_active,
      unit: form.unit.trim() || 'pz',
      size_variant: form.size_variant.trim() || null,
    };

    let error;
    if (editing) {
      ({ error } = await supabase.from('products').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('products').insert({ ...payload, id: crypto.randomUUID() }));
    }

    if (!error) {
      await fetchProducts();
      setModalOpen(false);
    } else {
      alert('Error al guardar: ' + error.message);
    }
    setSaving(false);
  };

  const handleDelete = async (p: Product) => {
    if (!confirm(`¿Eliminar "${p.name}"? Esta acción no se puede deshacer.`)) return;
    await supabase.from('products').delete().eq('id', p.id);
    await fetchProducts();
  };

  const handleToggleActive = async (p: Product) => {
    await supabase.from('products').update({ is_active: !p.is_active }).eq('id', p.id);
    await fetchProducts();
  };

  const categories = ['all', ...CATEGORIES];

  const filtered = products.filter((p) => {
    if (catFilter !== 'all' && p.category !== catFilter) return false;
    const q = search.trim().toLowerCase();
    return !q || p.name.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-full space-y-10 bg-[#fafafa] p-8 pb-20 dark:bg-zinc-950 lg:p-12">
      {/* Header */}
      <section className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-white">
            Precios del Menú
          </h1>
          <p className="font-medium italic text-zinc-500">
            Catálogo de productos · {products.length} registros
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="h-12 rounded-2xl bg-orange-600 px-8 font-black text-xs uppercase tracking-widest text-white shadow-xl shadow-orange-900/10 hover:bg-black"
        >
          <Plus className="mr-2 h-4 w-4" /> Nuevo producto
        </Button>
      </section>

      {/* Filters */}
      <section className="flex flex-col items-center justify-between gap-4 rounded-[2rem] border border-zinc-100 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:flex-row">
        <div className="relative w-full flex-1 md:max-w-sm">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            className="h-12 rounded-xl border-none bg-zinc-50 pl-12 font-bold dark:bg-zinc-800"
          />
        </div>
        <div className="flex flex-wrap gap-2">
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

      {/* Product list */}
      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center opacity-30">
          <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
          <p className="mt-4 font-black text-xs uppercase tracking-widest">Cargando catálogo…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-[3rem] border-4 border-dashed border-zinc-100 opacity-20 dark:border-zinc-900">
          <PackageOpen className="mb-4 h-16 w-16" />
          <p className="text-xl font-black uppercase tracking-widest">Sin productos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <Card
              key={p.id}
              className={cn(
                'group relative overflow-hidden rounded-[2rem] border-none bg-white shadow-sm transition-all hover:shadow-md dark:bg-zinc-900',
                !p.is_active && 'opacity-50'
              )}
            >
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <Badge
                    className="rounded-full border-none bg-orange-50 font-black text-[9px] uppercase tracking-widest text-orange-700 dark:bg-orange-950/40 dark:text-orange-300"
                  >
                    <Tag className="mr-1 h-3 w-3" />
                    {p.category ?? 'Sin categoría'}
                  </Badge>
                  {!p.is_active && (
                    <Badge variant="secondary" className="rounded-full font-black text-[9px] uppercase">
                      Inactivo
                    </Badge>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">
                    {p.name}
                  </h3>
                  <p className="mt-1 text-3xl font-black italic tracking-tighter text-orange-600">
                    ${Number(p.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase">{p.unit ?? 'pz'}</span>
                    {p.size_variant && (
                      <Badge className="rounded-full border-none bg-blue-50 text-blue-700 font-black text-[8px] uppercase dark:bg-blue-950/30 dark:text-blue-300">
                        Tamaños
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(p)}
                    className="flex-1 h-9 rounded-xl border-zinc-100 font-black text-[9px] uppercase dark:border-zinc-800"
                  >
                    <Pencil className="mr-1 h-3 w-3" /> Editar
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleToggleActive(p)}
                    className="h-9 w-9 rounded-xl text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    title={p.is_active ? 'Desactivar' : 'Activar'}
                  >
                    {p.is_active ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(p)}
                    className="h-9 w-9 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={(o) => !o && setModalOpen(false)}>
        <DialogContent className="max-w-md rounded-[2.5rem] border-none bg-white p-10 shadow-2xl dark:bg-zinc-900">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter">
              {editing ? 'Editar producto' : 'Nuevo producto'}
            </DialogTitle>
            <DialogDescription className="font-bold text-xs uppercase tracking-widest text-zinc-400">
              Catálogo de precios · Taquería POS
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Nombre del producto
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. Taco de Bistec"
                className="h-12 rounded-2xl border-none bg-zinc-50 font-bold dark:bg-zinc-800"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Categoría
              </Label>
              <Select value={String(form.category || 'Tacos')} onValueChange={(v) => setForm({ ...form, category: String(v ?? 'Tacos') })}>
                <SelectTrigger className="h-12 rounded-2xl border-none bg-zinc-50 font-bold dark:bg-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-2xl">
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="font-bold cursor-pointer">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Precio (MXN)
              </Label>
              <Input
                type="number"
                min="0"
                step="0.50"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0.00"
                className="h-12 rounded-2xl border-none bg-zinc-50 font-black text-xl dark:bg-zinc-800"
              />
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800">
              <span className="font-black text-xs uppercase tracking-widest text-zinc-500">
                Producto activo
              </span>
              <button
                type="button"
                onClick={() => setForm({ ...form, is_active: !form.is_active })}
                className="focus:outline-none"
              >
                {form.is_active ? (
                  <ToggleRight className="h-8 w-8 text-emerald-500" />
                ) : (
                  <ToggleLeft className="h-8 w-8 text-zinc-400" />
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  Unidad
                </Label>
                <Input
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder="pz / kg / L"
                  className="h-12 rounded-2xl border-none bg-zinc-50 font-bold dark:bg-zinc-800"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  Variantes de tamaño
                </Label>
                <Input
                  value={form.size_variant}
                  onChange={(e) => setForm({ ...form, size_variant: e.target.value })}
                  placeholder="chico|mediano|grande"
                  className="h-12 rounded-2xl border-none bg-zinc-50 font-bold dark:bg-zinc-800"
                />
                <p className="text-[9px] text-zinc-400 font-bold">
                  Separar con | · Solo para bebidas con tamaños
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col gap-3 sm:flex-col">
            <Button
              onClick={handleSave}
              disabled={saving || !form.name.trim() || !form.price}
              className="h-14 w-full rounded-2xl bg-orange-600 font-black text-sm uppercase tracking-widest text-white shadow-xl hover:bg-orange-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : editing ? 'Guardar cambios' : 'Crear producto'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setModalOpen(false)}
              className="h-10 w-full rounded-2xl font-black text-[10px] uppercase text-zinc-400"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
