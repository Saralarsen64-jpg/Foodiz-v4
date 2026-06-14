-- Structured support context for guided diagnostics and efficient admin handling.

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_role text,
  ADD COLUMN IF NOT EXISTS diagnostic jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS attempted_actions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS resolution_summary text,
  ADD COLUMN IF NOT EXISTS auto_resolved boolean NOT NULL DEFAULT false;

ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_category_check;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_category_check
  CHECK (category IN ('order', 'payment', 'delivery', 'advantage', 'account', 'partner', 'courier', 'other'));

ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_source_check;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_source_check
  CHECK (source IN ('guided', 'manual', 'system'));

CREATE INDEX IF NOT EXISTS idx_support_tickets_queue
  ON public.support_tickets(status, priority, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_order
  ON public.support_tickets(order_id)
  WHERE order_id IS NOT NULL;
