'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/lib/types';
import { 
  Card, 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Search, 
  UserPlus, 
  Trash2, 
  Key,
  Flame,
  Loader2,
  Users
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PersonalPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // States for Creation/Edition
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Partial<Employee> | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    role: 'mesero' as 'admin' | 'cajero' | 'mesero' | 'cocina',
    pin: '',
    is_active: true
  });

  const rolesEspanol: Record<string, string> = {
    admin: 'Administrador 👑',
    cajero: 'Cajero 💰',
    mesero: 'Mesero 🌮',
    cocina: 'Cocina 🍳'
  };

  const fetchEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('full_name', { ascending: true });

    if (!error && data) {
      setEmployees(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    (async () => { await fetchEmployees(); })();
  }, []);

  const handleOpenModal = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        full_name: employee.full_name,
        role: employee.role,
        pin: employee.pin,
        is_active: employee.is_active
      });
      console.log(`[ADMIN] Editando rol para el usuario: ${employee.full_name} (${employee.role})`);
    } else {
      setEditingEmployee(null);
      setFormData({
        full_name: '',
        role: 'mesero',
        pin: '',
        is_active: true
      });
      console.log(`[ADMIN] Iniciando creación de nuevo usuario`);
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.full_name || formData.pin.length !== 4) return;

    setLoading(true);
    const id = editingEmployee?.id || crypto.randomUUID();
    
    // VERIFICACIÓN DE PIN ÚNICO
    console.log(`[ADMIN] Verificando disponibilidad de PIN: ${formData.pin}`);
    const { data: existingPin } = await supabase
      .from('employees')
      .select('id, full_name')
      .eq('pin', formData.pin)
      .neq('id', id) // Ignorar el propio ID si estamos editando
      .single();

    if (existingPin) {
       console.warn(`[ADMIN] Error: El PIN ${formData.pin} ya pertenece a ${existingPin.full_name}`);
       alert(`¡Ups! El PIN ${formData.pin} ya está siendo usado por ${existingPin.full_name}. Por favor elige otro.`);
       setLoading(false);
       return;
    }

    console.log(`[ADMIN] Salvando usuario con ID: ${id}. Nuevo Rol: ${formData.role}`);

    const { error } = await supabase
      .from('employees')
      .upsert({
        id,
        full_name: formData.full_name,
        role: formData.role,
        pin: formData.pin,
        is_active: formData.is_active
      });

    if (!error) {
       console.log(`[ADMIN] Éxito: Usuario ${formData.full_name} ${editingEmployee ? 'actualizado' : 'creado'} correctamente.`);
       fetchEmployees();
       setIsModalOpen(false);
    } else {
       console.error(`[ADMIN] Error al salvar:`, error);
    }
    setLoading(false);
  };

  const handleDeleteEmployee = async (id: string, name: string) => {
     if (confirm(`¿Estás seguro de eliminar a ${name}?`)) {
        await supabase.from('employees').delete().eq('id', id);
        console.log(`[ADMIN] Usuario eliminado con éxito: ${name}`);
        fetchEmployees();
     }
  };

  const filteredEmployees = employees.filter(e => 
    e.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 lg:p-12 space-y-10 animate-fade-in bg-[#fafafa] dark:bg-zinc-950 min-h-full pb-20">
      {/* Search and Add Section */}
      <section className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-1 w-full md:w-auto">
          <h1 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">Equipo de Trabajo</h1>
          <p className="text-zinc-500 font-medium italic">Gestiona el acceso y roles de tu personal</p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
           <div className="relative flex-1 md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                 type="text" 
                 placeholder="Buscar por nombre o cargo..." 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full h-14 pl-12 pr-4 bg-white dark:bg-zinc-900 border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-orange-600 outline-none transition-all font-bold text-sm"
              />
           </div>
           <Button 
               onClick={() => handleOpenModal()}
               className="h-14 px-8 rounded-2xl bg-orange-600 hover:bg-black text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-900/10 transition-all flex items-center gap-3"
            >
              <UserPlus className="w-5 h-5" /> Nuevo Empleado
           </Button>
        </div>
      </section>

      {/* Employees Grid */}
      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center gap-4 opacity-50">
           <Loader2 className="w-10 h-10 animate-spin text-orange-600 shadow-orange-600" />
           <p className="font-black uppercase tracking-widest text-[10px]">Cargando personal...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-10">
          {filteredEmployees.map((employee) => (
            <Card key={employee.id} className="group border-none bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-[0_5px_20px_-10px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] transition-all duration-500 overflow-hidden relative">
               
               {/* Role Badge Top */}
               <div className="absolute top-6 left-6 z-10">
                  <Badge className={cn(
                    "px-4 py-2 rounded-2xl font-black text-[9px] uppercase tracking-widest border-none shadow-sm",
                    employee.role === 'admin' ? "bg-orange-600 text-white" : "bg-emerald-500 text-white"
                  )}>
                     {rolesEspanol[employee.role] || employee.role}
                  </Badge>
               </div>

               <div className="p-6 text-center space-y-4">
                  <div className="relative inline-block mx-auto group">
                     <Avatar className="w-16 h-16 mx-auto border-2 border-zinc-50 dark:border-zinc-800 shadow-xl group-hover:scale-105 transition-transform">
                        <AvatarFallback className="bg-orange-50 text-orange-600 text-xl font-black uppercase italic">
                           {employee.full_name.substring(0, 2)}
                        </AvatarFallback>
                     </Avatar>
                     {!employee.is_active && (
                       <div className="absolute inset-0 bg-white/60 dark:bg-black/60 rounded-full flex items-center justify-center backdrop-blur-[2px]">
                          <Badge variant="destructive" className="font-black text-[8px] uppercase">Inactivo</Badge>
                       </div>
                     )}
                  </div>

                  <div className="space-y-1">
                     <h3 className="text-lg font-black text-zinc-900 dark:text-white tracking-tighter truncate px-2">{employee.full_name}</h3>
                     <p className="text-zinc-400 font-bold uppercase text-[8px] tracking-widest italic">ID: {employee.id.substring(0, 8)}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                     <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex flex-col items-center">
                        <Key className="w-3 h-3 text-orange-600 mb-1 opacity-100" />
                        <span className="text-[8px] font-black uppercase text-zinc-400 leading-none mb-1">PIN</span>
                        <span className="text-sm font-black tracking-[0.2em] font-mono">{employee.pin}</span>
                     </div>
                     <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex flex-col items-center">
                        <Flame className="w-3 h-3 text-emerald-500 mb-1" />
                        <span className="text-[8px] font-black uppercase text-zinc-400 leading-none mb-1">Mesa</span>
                        <span className="text-sm font-black">--</span>
                     </div>
                  </div>

                  <div className="flex gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleOpenModal(employee)}
                        className="flex-1 h-9 rounded-xl border-zinc-100 dark:border-zinc-800 font-black text-[8px] uppercase group-hover:bg-zinc-50 dark:group-hover:bg-zinc-800"
                     >
                        Editar
                     </Button>
                     <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteEmployee(employee.id, employee.full_name)}
                        className="h-9 w-9 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/10"
                     >
                        <Trash2 className="w-4 h-4" />
                     </Button>
                  </div>
               </div>
            </Card>
          ))}
          
          {/* Add Placeholder Card */}
          <div 
             onClick={() => handleOpenModal()}
             className="flex items-center justify-center p-6 border-2 border-dashed border-zinc-100 dark:border-zinc-900 rounded-[2.5rem] opacity-40 hover:opacity-100 transition-all cursor-pointer group hover:bg-white hover:border-orange-200"
          >
             <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 group-hover:bg-orange-50 transition-all">
                  <Plus className="w-6 h-6 text-zinc-400 group-hover:text-orange-600" />
                </div>
                <p className="font-black text-[10px] uppercase tracking-widest text-zinc-400 italic">Sumar</p>
             </div>
          </div>
        </div>
      )}

      {/* Modal de Creación/Edición */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
         <DialogContent className="max-w-[420px] bg-white dark:bg-zinc-900 border-none rounded-[3rem] p-10 shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-600/10 rounded-full blur-3xl -mr-12 -mt-12" />
            
            <DialogHeader className="p-0 space-y-4">
               <div className="w-16 h-16 bg-zinc-900 dark:bg-zinc-100 rounded-[1.5rem] flex items-center justify-center shadow-xl">
                  {editingEmployee ? <Key className="w-8 h-8 text-orange-600" /> : <UserPlus className="w-8 h-8 text-orange-600" />}
               </div>
               <div>
                  <DialogTitle className="text-3xl font-black tracking-tighter uppercase italic">{editingEmployee ? 'Editar Perfil' : 'Sumar al Equipo'}</DialogTitle>
                  <DialogDescription className="text-zinc-500 font-bold text-xs uppercase tracking-widest leading-none pt-2">
                     Taquería POS • Gestión de Acceso
                  </DialogDescription>
               </div>
            </DialogHeader>

            <div className="space-y-8 py-10">
               <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">Nombre Completo</Label>
                  <Input 
                     value={formData.full_name}
                     onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                     placeholder="Ej. Carlos Martínez" 
                     className="h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-none shadow-sm focus:ring-2 focus:ring-orange-600 font-bold"
                  />
               </div>

               <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">Cargo / Rol</Label>
                  <Select value={formData.role} onValueChange={(val) => setFormData({...formData, role: (val ?? 'mesero') as 'admin' | 'cajero' | 'mesero' | 'cocina'})}>
                     <SelectTrigger className="h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-none shadow-sm font-bold">
                        <SelectValue placeholder="Elige un rol" />
                     </SelectTrigger>
                     <SelectContent className="rounded-2xl border-none shadow-2xl bg-white dark:bg-zinc-900">
                        <SelectItem value="admin" className="font-bold cursor-pointer">Administrador 👑</SelectItem>
                        <SelectItem value="cajero" className="font-bold cursor-pointer">Cajero 💰</SelectItem>
                        <SelectItem value="mesero" className="font-bold cursor-pointer">Mesero 🌮</SelectItem>
                        <SelectItem value="cocina" className="font-bold cursor-pointer">Cocina 🍳</SelectItem>
                     </SelectContent>
                  </Select>
               </div>

               <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">PIN de Acceso (4 Dígitos)</Label>
                  <Input 
                     type="text"
                     maxLength={4}
                     value={formData.pin}
                     onChange={(e) => setFormData({...formData, pin: e.target.value.replace(/\D/g, '')})}
                     placeholder="0000" 
                     className="h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-none shadow-sm focus:ring-2 focus:ring-orange-600 font-black text-center text-2xl tracking-[0.5em] font-mono"
                  />
               </div>
            </div>

            <DialogFooter className="flex-col gap-3 sm:flex-col sm:justify-start">
               <Button 
                  onClick={handleSave}
                  disabled={loading || !formData.full_name || formData.pin.length !== 4}
                  className="w-full h-16 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-orange-900/20"
               >
                  {loading ? 'Guardando...' : (editingEmployee ? 'Guardar Cambios' : 'Crear Empleado')}
               </Button>
               <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="w-full h-12 rounded-2xl font-black text-[10px] uppercase text-zinc-400 group">
                  Cancelar Operación
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>

      {filteredEmployees.length === 0 && !loading && (
        <div className="h-96 flex flex-col items-center justify-center border-4 border-dashed border-zinc-100 rounded-[4rem] opacity-20">
           <Users className="w-24 h-24 mb-4" />
           <p className="text-xl font-black uppercase tracking-widest">No se encontraron empleados</p>
        </div>
      )}
    </div>
  );
}
