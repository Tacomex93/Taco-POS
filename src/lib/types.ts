export type Product = {
  id: string;
  name: string;
  category: 'Tacos' | 'Bebidas';
  price: number;
  unit: string;
  image_url?: string;
};

export type TableStatus = 'available' | 'occupied' | 'waiting' | 'ready';

export type RestaurantTable = {
  id: number;
  status: TableStatus;
  diners: number;
  last_order_time?: string;
};

/** Coincide con CHECK en public.orders (Supabase) */
export type OrderStatus = 'abierta' | 'pagada' | 'cancelada';

export type Order = {
  id: string;
  table_id: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  comensales?: number;
  employee_id?: string | null;
  updated_at?: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  price: number;
  created_at?: string;
};
export type EmployeeRole = 'admin' | 'cajero' | 'mesero' | 'cocina';

export type Employee = {
  id: string;
  full_name: string;
  role: EmployeeRole;
  pin: string;
  is_active: boolean;
};

export type KitchenStatus = 'pending' | 'preparing' | 'ready' | 'delivered';
