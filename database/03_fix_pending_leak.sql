-- 03_fix_pending_leak.sql
-- Limpieza one-off del leak histórico de PENDING:
-- antes del fix, create() descontaba stock y marcaba SOLD aunque nunca se pagaba,
-- y no había expiración. Este script:
--  1) devuelve 1 unidad de stock por cada orden PENDING vieja (solo si el producto
--     quedó en SOLD con stock 0, señal del leak),
--  2) republica esos productos,
--  3) cancela las PENDING con más de 60 minutos.
--
-- Ajustá el cutoff si tu deploy fue en otra fecha. Es idempotente y seguro de
-- re-ejecutar: solo toca PENDING viejas.
--
-- Uso: psql $DATABASE_URL -f database/03_fix_pending_leak.sql

BEGIN;

-- 1+2) Devolver stock y republicar productos bloqueados por PENDING viejas.
-- Solo productos con stock 0 y SOLD para no inflar stock del flujo nuevo
-- (el flujo nuevo nunca descuenta en PENDING).
UPDATE products p
SET stock = stock + sub.cnt,
    status = 'published',
    updated_at = NOW()
FROM (
  SELECT o.product_id AS pid, COUNT(*) AS cnt
  FROM orders o
  WHERE o.status = 'pending'
    AND o.created_at < NOW() - INTERVAL '60 minutes'
  GROUP BY o.product_id
) sub
WHERE p.id = sub.pid
  AND p.stock = 0
  AND p.status = 'sold'
  AND sub.pid IS NOT NULL;

-- 3) Cancelar las PENDING expiradas históricas.
UPDATE orders
SET status = 'cancelled',
    cancellation_reason = 'Expirada por falta de pago (limpieza histórica)',
    custody_end_date = NOW(),
    updated_at = NOW()
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '60 minutes';

COMMIT;
