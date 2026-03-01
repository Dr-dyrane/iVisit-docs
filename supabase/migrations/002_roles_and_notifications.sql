-- ============================================================
-- iVisit Data Room — Migration 002: Roles, Visibility & Notifications
-- Run this in your Supabase SQL Editor AFTER 001
-- ============================================================

-- 1. ADD VISIBILITY TO DOCUMENTS
-- Array of roles that can see each document
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS visibility TEXT[] DEFAULT '{"admin"}';

-- 2. ADD CONTENT COLUMN TO DOCUMENTS
-- Stores markdown directly (avoids filesystem dependency on deploy)
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS content TEXT;

-- 3. USER ROLES TABLE
-- Per-user role assignment (global, not per-document)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'viewer'
               CHECK (role IN ('admin','sponsor','lawyer','cto','developer','viewer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can read their own role
CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin manages roles via service_role (bypasses RLS)

-- 4. NOTIFICATIONS TABLE
-- Mirrors iVisit Console pattern
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,          -- 'access_request', 'invite', 'document'
  action_type TEXT NOT NULL,          -- 'created', 'approved', 'revoked'
  target_id   TEXT,                   -- reference ID (access_request id, document id, etc.)
  title       TEXT NOT NULL,
  message     TEXT,
  icon        TEXT,
  color       TEXT DEFAULT 'info',    -- 'info', 'success', 'warning', 'destructive'
  priority    TEXT DEFAULT 'normal',
  read        BOOLEAN DEFAULT false,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role inserts (triggers, admin actions) bypass RLS

-- 5. ENABLE REALTIME FOR NOTIFICATIONS (skip if already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- 6. TRIGGER: Notify admin on new access request
CREATE OR REPLACE FUNCTION public.notify_admin_on_access_request()
RETURNS TRIGGER AS $$
DECLARE
  doc_title TEXT;
  user_email TEXT;
  admin_row RECORD;
BEGIN
  SELECT title INTO doc_title FROM public.documents WHERE id = NEW.document_id;
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.user_id;

  -- Insert notification for every admin user
  FOR admin_row IN
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, type, action_type, target_id, title, message, icon, color, priority)
    VALUES (
      admin_row.user_id,
      'access_request',
      'created',
      NEW.id,
      'New Access Request',
      user_email || ' requested access to "' || doc_title || '"',
      'Shield',
      'warning',
      'high'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old trigger if exists, create new one
DROP TRIGGER IF EXISTS trg_notify_access_request ON public.access_requests;
CREATE TRIGGER trg_notify_admin_access_request
  AFTER INSERT ON public.access_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_access_request();

-- 7. TRIGGER: Notify user when access status changes
CREATE OR REPLACE FUNCTION public.notify_user_on_access_change()
RETURNS TRIGGER AS $$
DECLARE
  doc_title TEXT;
  notif_title TEXT;
  notif_message TEXT;
  notif_color TEXT;
  notif_icon TEXT;
BEGIN
  -- Only fire on status change
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  SELECT title INTO doc_title FROM public.documents WHERE id = NEW.document_id;

  IF NEW.status = 'approved' THEN
    notif_title := 'Access Granted';
    notif_message := 'You now have access to "' || doc_title || '"';
    notif_color := 'success';
    notif_icon := 'Unlock';
  ELSIF NEW.status = 'revoked' THEN
    notif_title := 'Access Revoked';
    notif_message := 'Your access to "' || doc_title || '" has been revoked';
    notif_color := 'destructive';
    notif_icon := 'Lock';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, action_type, target_id, title, message, icon, color)
  VALUES (
    NEW.user_id,
    'access_request',
    NEW.status,
    NEW.id,
    notif_title,
    notif_message,
    notif_icon,
    notif_color
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_user_access_change
  AFTER UPDATE ON public.access_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_user_on_access_change();

-- 8. RLS: Admin can manage documents
-- (Admin operations use service_role which bypasses RLS,
--  but we add explicit policies for completeness)

CREATE POLICY "Admin can insert documents"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can update documents"
  ON public.documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can delete documents"
  ON public.documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 9. RLS: Admin can view ALL access requests (not just their own)
CREATE POLICY "Admin can view all access requests"
  ON public.access_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Admin can update access requests (approve/revoke)
CREATE POLICY "Admin can update access requests"
  ON public.access_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 10. UPDATE SEED DATA WITH VISIBILITY
UPDATE public.documents SET visibility = '{"admin","sponsor","lawyer","cto","developer","viewer"}' WHERE slug = 'mutual-nda';
UPDATE public.documents SET visibility = '{"admin","sponsor","lawyer","cto"}' WHERE slug = 'business-proposal';
UPDATE public.documents SET visibility = '{"admin","cto","developer"}' WHERE slug = 'master-plan';
UPDATE public.documents SET visibility = '{"admin","cto","developer"}' WHERE slug = 'print-engine';

-- 11. INDEXES
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read);

-- Done
SELECT 'Migration 002 applied — roles, visibility, notifications' AS status;
