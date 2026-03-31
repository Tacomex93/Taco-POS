-- Taquería POS — esquema completo (idempotente)
-- Ejecutar con: npm run db:sync (requiere DATABASE_URL en .env.local o entorno)

-- Extensión para UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Empleados (login por PIN en app)
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'cajero', 'mesero')),
    pin TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS employees_pin_key ON public.employees (pin);

-- Catálogo opcional (product_id en order_items)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Órdenes / pedidos
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id TEXT NOT NULL,
    employee_id UUID REFERENCES public.employees (id) ON DELETE SET NULL,
    comensales INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'abierta' CHECK (status IN ('abierta', 'pagada', 'cancelada')),
    -- Campos opcionales para gestión/auditoría
    cancel_reason TEXT,
    paid_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_table ON public.orders (table_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders (created_at DESC);

-- Ítems de orden
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products (id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items (order_id);

-- Sesiones de caja (arqueos)
CREATE TABLE IF NOT EXISTS public.cash_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL DEFAULT 'Turno',
    status TEXT NOT NULL DEFAULT 'abierta' CHECK (status IN ('abierta', 'cerrada')),
    opening_float DECIMAL(10, 2) NOT NULL DEFAULT 0,
    closing_cash DECIMAL(10, 2),
    card_total DECIMAL(10, 2),
    expected_total DECIMAL(10, 2),
    difference_amount DECIMAL(10, 2),
    opened_by UUID REFERENCES public.employees (id) ON DELETE SET NULL,
    closed_by UUID REFERENCES public.employees (id) ON DELETE SET NULL,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at TIMESTAMPTZ,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON public.cash_sessions (status);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_opened ON public.cash_sessions (opened_at DESC);

-- Movimientos de caja (opcional, para detalle)
CREATE TABLE IF NOT EXISTS public.cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.cash_sessions (id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('ingreso', 'retiro', 'ajuste')),
    amount DECIMAL(10, 2) NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_movements_session ON public.cash_movements (session_id);

-- Trigger updated_at en orders y employees
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_orders_updated ON public.orders;
CREATE TRIGGER tr_orders_updated
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS tr_employees_updated ON public.employees;
CREATE TRIGGER tr_employees_updated
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- RLS: políticas permisivas (app POS con clave anónima; restringir en producción con auth)
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pos_allow_all_employees ON public.employees;
CREATE POLICY pos_allow_all_employees ON public.employees FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS pos_allow_all_products ON public.products;
CREATE POLICY pos_allow_all_products ON public.products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS pos_allow_all_orders ON public.orders;
CREATE POLICY pos_allow_all_orders ON public.orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS pos_allow_all_order_items ON public.order_items;
CREATE POLICY pos_allow_all_order_items ON public.order_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS pos_allow_all_cash_sessions ON public.cash_sessions;
CREATE POLICY pos_allow_all_cash_sessions ON public.cash_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS pos_allow_all_cash_movements ON public.cash_movements;
CREATE POLICY pos_allow_all_cash_movements ON public.cash_movements FOR ALL USING (true) WITH CHECK (true);

-- Migración ligera para instalaciones previas (si el seed se corrió antes)
-- (idempotente en lo demás; el IF NOT EXISTS evita errores)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Inventario de insumos
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    unit TEXT NOT NULL DEFAULT 'pz',
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
    min_quantity DECIMAL(10, 2) NOT NULL DEFAULT 5,
    cost_per_unit DECIMAL(10, 2) NOT NULL DEFAULT 0,
    supplier TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory (category);
CREATE INDEX IF NOT EXISTS idx_inventory_active ON public.inventory (is_active);

DROP TRIGGER IF EXISTS tr_inventory_updated ON public.inventory;
CREATE TRIGGER tr_inventory_updated
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pos_allow_all_inventory ON public.inventory;
CREATE POLICY pos_allow_all_inventory ON public.inventory FOR ALL USING (true) WITH CHECK (true);

-- Nuevas columnas para funcionalidades avanzadas
-- Productos: variante de tamaño (para bebidas) y unidad de venta
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'pz';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS size_variant TEXT; -- 'chico|mediano|grande' o NULL

-- Order items: asiento/comensal para cuentas separadas
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS seat_number INTEGER; -- NULL = cuenta general
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS notes TEXT; -- notas por ítem

-- ── Rol cocina ────────────────────────────────────────────────────────────
-- Agregar 'cocina' al CHECK de employees.role
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE public.employees ADD CONSTRAINT employees_role_check
  CHECK (role IN ('admin', 'cajero', 'mesero', 'cocina'));

-- Estado de cocina independiente del estado de pago
-- pending   = recién llegó, nadie lo tomó
-- preparing = cocinero lo tomó, en preparación
-- ready     = listo para servir
-- delivered = entregado a la mesa
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS kitchen_status TEXT
  NOT NULL DEFAULT 'pending'
  CHECK (kitchen_status IN ('pending', 'preparing', 'ready', 'delivered'));

CREATE INDEX IF NOT EXISTS idx_orders_kitchen ON public.orders (kitchen_status);

-- ── Cocina: rol y estado de cocina en órdenes ──────────────────────────────

-- Agregar rol 'cocina' al CHECK de employees
-- (Supabase no permite ALTER CHECK directamente; recrear la restricción)
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE public.employees ADD CONSTRAINT employees_role_check
  CHECK (role IN ('admin', 'cajero', 'mesero', 'cocina'));

-- Estado de cocina en orders (independiente del status de pago)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS kitchen_status TEXT
  NOT NULL DEFAULT 'pending'
  CHECK (kitchen_status IN ('pending', 'preparing', 'ready', 'delivered'));

-- Índice para que cocina consulte rápido
CREATE INDEX IF NOT EXISTS idx_orders_kitchen_status ON public.orders (kitchen_status);
