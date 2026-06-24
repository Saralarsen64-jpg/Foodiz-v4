-- Foodiz premium email suite:
-- - central audit trail for transactional emails;
-- - no marketing blast is triggered by this migration;
-- - launch access emails remain admin-triggered only.

CREATE TABLE IF NOT EXISTS public.foodiz_email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_email text NOT NULL,
  email_type text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  provider text NOT NULL DEFAULT 'resend',
  provider_message_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  sent_at timestamp with time zone,
  failed_at timestamp with time zone
);

ALTER TABLE public.foodiz_email_events DROP CONSTRAINT IF EXISTS foodiz_email_events_type_check;
ALTER TABLE public.foodiz_email_events ADD CONSTRAINT foodiz_email_events_type_check
  CHECK (email_type IN (
    'prelaunch_confirmation',
    'launch_access',
    'professional_documents_received',
    'professional_approved',
    'professional_replacement_requested',
    'professional_rejected',
    'support_ticket_received',
    'support_ticket_resolved',
    'financial_document',
    'security'
  ));

ALTER TABLE public.foodiz_email_events DROP CONSTRAINT IF EXISTS foodiz_email_events_status_check;
ALTER TABLE public.foodiz_email_events ADD CONSTRAINT foodiz_email_events_status_check
  CHECK (status IN ('queued', 'sent', 'failed', 'skipped'));

CREATE INDEX IF NOT EXISTS idx_foodiz_email_events_recipient
  ON public.foodiz_email_events(recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_foodiz_email_events_type_status
  ON public.foodiz_email_events(email_type, status, created_at DESC);

ALTER TABLE public.foodiz_email_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "foodiz_email_events_admin_all" ON public.foodiz_email_events;
CREATE POLICY "foodiz_email_events_admin_all"
ON public.foodiz_email_events
FOR ALL
TO authenticated
USING (public.current_user_has_role('admin'))
WITH CHECK (public.current_user_has_role('admin'));
