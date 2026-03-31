-- Taquería POS — datos mock (idempotente)
-- Ejecuta en Supabase SQL Editor o con un script.
-- Requiere que ya corriste `npm run db:sync` o pegaste `supabase/schema.sql`.
--
-- Empleados (PIN) para iniciar sesión:
-- admin  : 0001
-- cajero : 0002
-- mesero : 0003

BEGIN;

-- 1) Empleados
INSERT INTO public.employees (full_name, role, pin, is_active)
VALUES
  ('Admin Mock', 'admin', '0001', true),
  ('Cajero Mock', 'cajero', '0002', true),
  ('Mesero Mock', 'mesero', '0003', true)
ON CONFLICT (pin) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = true;

-- 2) Pedidos
-- Usamos UUIDs fijos para que el seed sea idempotente.
WITH
  e_admin AS (SELECT id FROM public.employees WHERE pin = '0001' LIMIT 1),
  e_cajero AS (SELECT id FROM public.employees WHERE pin = '0002' LIMIT 1),
  e_mesero AS (SELECT id FROM public.employees WHERE pin = '0003' LIMIT 1)
INSERT INTO public.orders (id, table_id, employee_id, comensales, status, total, created_at)
VALUES
  -- Abierta (hoy)
  ('11111111-1111-1111-1111-111111111111', 'Mesa 1', (SELECT id FROM e_admin), 2, 'abierta', 43.50, now() - interval '3 hours'),
  -- Pagada (hoy)
  ('11111111-1111-1111-1111-111111111112', 'Mesa 2', (SELECT id FROM e_cajero), 3, 'pagada', 69.00, now() - interval '1 hour'),
  -- Pagada (ayer)
  ('11111111-1111-1111-1111-111111111113', 'Mesa 3', (SELECT id FROM e_cajero), 4, 'pagada', 100.00, now() - interval '1 day 2 hours'),
  -- Pagada (hace 5 días)
  ('11111111-1111-1111-1111-111111111114', 'Mesa 4', (SELECT id FROM e_mesero), 2, 'pagada', 58.00, now() - interval '5 days 4 hours')
ON CONFLICT (id) DO UPDATE SET
  table_id = EXCLUDED.table_id,
  employee_id = EXCLUDED.employee_id,
  comensales = EXCLUDED.comensales,
  status = EXCLUDED.status,
  total = EXCLUDED.total,
  created_at = EXCLUDED.created_at;

-- 3) Líneas de pedidos
-- Total de cada orden = suma(quantity * price)
INSERT INTO public.order_items (id, order_id, product_id, product_name, quantity, price, created_at)
VALUES
  -- Orden Mesa 1 (43.50) abierta
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', NULL, 'Tacos de Cecina', 1, 25.50, now() - interval '3 hours'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', NULL, 'Agua de Horchata', 1, 18.00, now() - interval '3 hours'),

  -- Orden Mesa 2 (69.00) pagada
  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111112', NULL, 'Tacos de Cecina', 2, 25.50, now() - interval '1 hour'),
  ('22222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111112', NULL, 'Agua de Horchata', 1, 18.00, now() - interval '1 hour'),

  -- Orden Mesa 3 (100.00) pagada
  ('22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111113', NULL, 'Taco de Tripa', 2, 22.00, now() - interval '1 day 2 hours'),
  ('22222222-2222-2222-2222-222222222226', '11111111-1111-1111-1111-111111111113', NULL, 'Agua de Horchata', 2, 18.00, now() - interval '1 day 2 hours'),
  ('22222222-2222-2222-2222-222222222227', '11111111-1111-1111-1111-111111111113', NULL, 'Taco de Longaniza', 1, 20.00, now() - interval '1 day 2 hours'),

  -- Orden Mesa 4 (58.00) pagada
  ('22222222-2222-2222-2222-222222222228', '11111111-1111-1111-1111-111111111114', NULL, 'Taco de Longaniza', 2, 20.00, now() - interval '5 days 4 hours'),
  ('22222222-2222-2222-2222-222222222229', '11111111-1111-1111-1111-111111111114', NULL, 'Agua de Horchata', 1, 18.00, now() - interval '5 days 4 hours')
ON CONFLICT (id) DO UPDATE SET
  order_id = EXCLUDED.order_id,
  product_id = EXCLUDED.product_id,
  product_name = EXCLUDED.product_name,
  quantity = EXCLUDED.quantity,
  price = EXCLUDED.price,
  created_at = EXCLUDED.created_at;

-- 4) Caja (cash_sessions)
-- CajaAdmin muestra el último abierta (status='abierta')
WITH
  e_admin AS (SELECT id FROM public.employees WHERE pin = '0001' LIMIT 1)
INSERT INTO public.cash_sessions (id, label, status, opening_float, closing_cash, card_total, expected_total, difference_amount, opened_by, closed_by, opened_at, closed_at, notes)
VALUES
  ('33333333-3333-3333-3333-333333333331', 'Turno Mock', 'abierta', 1500.00, NULL, NULL, NULL, NULL, (SELECT id FROM e_admin), NULL, now() - interval '2 hours', NULL, 'Seed mock'),
  ('33333333-3333-3333-3333-333333333332', 'Turno Mock Anterior', 'cerrada', 1200.00, 1500.00, 3000.00, 3000.00, 0.00, (SELECT id FROM e_admin), NULL, now() - interval '1 day 5 hours', now() - interval '1 day 4 hours', 'Seed mock')
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  status = EXCLUDED.status,
  opening_float = EXCLUDED.opening_float,
  closing_cash = EXCLUDED.closing_cash,
  card_total = EXCLUDED.card_total,
  expected_total = EXCLUDED.expected_total,
  difference_amount = EXCLUDED.difference_amount,
  opened_by = EXCLUDED.opened_by,
  closed_by = EXCLUDED.closed_by,
  opened_at = EXCLUDED.opened_at,
  closed_at = EXCLUDED.closed_at,
  notes = EXCLUDED.notes;

COMMIT;

