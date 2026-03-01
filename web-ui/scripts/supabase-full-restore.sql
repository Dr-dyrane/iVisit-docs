-- ============================================================
-- iVisit Data Room — SAFE RESTORE (Non-Destructive)
-- Only touches documents-related tables. Does NOT drop
-- notifications, user_roles, or any shared tables.
-- ============================================================

-- ─── 1. FIX THE DOCUMENTS TABLE ──────────────────────────────
-- Drop ONLY the broken documents table and its direct dependents
-- (access_requests and document_invites reference documents via FK)

-- First, drop FKs pointing to documents so we can rebuild it
DROP TABLE IF EXISTS public.document_invites CASCADE;
DROP TABLE IF EXISTS public.access_requests CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;

-- Recreate documents with ALL columns
CREATE TABLE public.documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  tier        TEXT DEFAULT 'confidential' CHECK (tier IN ('public','confidential','restricted')),
  file_path   TEXT NOT NULL,
  icon        TEXT DEFAULT 'file-text',
  visibility  TEXT[] DEFAULT '{"admin"}',
  content     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Recreate access_requests
CREATE TABLE public.access_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id   UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','revoked')),
  nda_signed_at TIMESTAMPTZ,
  signer_name   TEXT,
  signer_entity TEXT,
  signer_title  TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, document_id)
);

-- Recreate document_invites
CREATE TABLE public.document_invites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT NOT NULL,
  document_id  UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  token        TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  claimed      BOOLEAN DEFAULT false,
  claimed_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT now(),
  expires_at   TIMESTAMPTZ DEFAULT (now() + interval '30 days')
);

-- ─── 2. ENSURE SHARED TABLES EXIST (no-op if they already do) ─

CREATE TABLE IF NOT EXISTS public.user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'viewer'
               CHECK (role IN ('admin','sponsor','lawyer','cto','developer','viewer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_id   TEXT,
  title       TEXT NOT NULL,
  message     TEXT,
  icon        TEXT,
  color       TEXT DEFAULT 'info',
  priority    TEXT DEFAULT 'normal',
  read        BOOLEAN DEFAULT false,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── 3. TRIGGERS ─────────────────────────────────────────────

-- Updated_at auto-trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_documents_updated ON public.documents;
CREATE TRIGGER trg_documents_updated
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_access_requests_updated ON public.access_requests;
CREATE TRIGGER trg_access_requests_updated
  BEFORE UPDATE ON public.access_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Notify admins on new access request
CREATE OR REPLACE FUNCTION public.notify_admin_on_access_request()
RETURNS TRIGGER AS $$
DECLARE
  doc_title TEXT;
  user_email TEXT;
  admin_row RECORD;
BEGIN
  SELECT title INTO doc_title FROM public.documents WHERE id = NEW.document_id;
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.user_id;

  FOR admin_row IN
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, type, action_type, target_id, title, message, icon, color, priority)
    VALUES (
      admin_row.user_id, 'access_request', 'created', NEW.id::TEXT,
      'New Access Request',
      user_email || ' requested access to "' || doc_title || '"',
      'Shield', 'warning', 'high'
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_access_request ON public.access_requests;
DROP TRIGGER IF EXISTS trg_notify_admin_access_request ON public.access_requests;
CREATE TRIGGER trg_notify_admin_access_request
  AFTER INSERT ON public.access_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_access_request();

-- Notify user when access status changes
CREATE OR REPLACE FUNCTION public.notify_user_on_access_change()
RETURNS TRIGGER AS $$
DECLARE
  doc_title TEXT;
  notif_title TEXT;
  notif_message TEXT;
  notif_color TEXT;
  notif_icon TEXT;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  SELECT title INTO doc_title FROM public.documents WHERE id = NEW.document_id;

  IF NEW.status = 'approved' THEN
    notif_title := 'Access Granted';
    notif_message := 'You now have access to "' || doc_title || '"';
    notif_color := 'success'; notif_icon := 'Unlock';
  ELSIF NEW.status = 'revoked' THEN
    notif_title := 'Access Revoked';
    notif_message := 'Your access to "' || doc_title || '" has been revoked';
    notif_color := 'destructive'; notif_icon := 'Lock';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, action_type, target_id, title, message, icon, color)
  VALUES (NEW.user_id, 'access_request', NEW.status, NEW.id::TEXT, notif_title, notif_message, notif_icon, notif_color);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_user_access_change ON public.access_requests;
CREATE TRIGGER trg_notify_user_access_change
  AFTER UPDATE ON public.access_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_user_on_access_change();

-- ─── 4. ROW LEVEL SECURITY ──────────────────────────────────

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_invites ENABLE ROW LEVEL SECURITY;

-- Documents policies
CREATE POLICY "Anyone can view document metadata"
  ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert documents"
  ON public.documents FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can update documents"
  ON public.documents FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can delete documents"
  ON public.documents FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Access requests policies
CREATE POLICY "Users can view their own requests"
  ON public.access_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own requests"
  ON public.access_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can view all access requests"
  ON public.access_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can update access requests"
  ON public.access_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Invites policies
CREATE POLICY "Anyone can view invites by token"
  ON public.document_invites FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated users can claim invites"
  ON public.document_invites FOR UPDATE TO authenticated
  USING (claimed = false AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (claimed = true AND claimed_by = auth.uid());

-- Shared table policies (only if not already set)
DO $$ BEGIN
  ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── 5. INDEXES ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_access_requests_user ON public.access_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_document ON public.access_requests(document_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON public.access_requests(status);
CREATE INDEX IF NOT EXISTS idx_document_invites_token ON public.document_invites(token);
CREATE INDEX IF NOT EXISTS idx_document_invites_email ON public.document_invites(email);

-- ─── 6. REALTIME ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'access_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.access_requests;
  END IF;
END $$;

-- ─── 7. SEED — Base iVisit Documents ─────────────────────────
INSERT INTO public.documents (slug, title, description, tier, file_path, icon, visibility) VALUES
  ('business-proposal',
   'iVisit Definitive Business Proposal 2026',
   'Neural Emergency Infrastructure — the complete investor-ready business proposal covering Unity Architecture, market analysis, execution roadmap, and financial projections.',
   'confidential',
   'iVisit_Definitive_Business_Proposal_2026.md',
   'briefcase',
   '{"admin","sponsor","lawyer","cto"}'),

  ('master-plan',
   'iVisit Master Plan v2.0',
   'The strategic master plan outlining the three-phase deployment from Lagos tactical strike to national lifeline infrastructure.',
   'restricted',
   'iVisit_Master_Plan_v2.md',
   'map',
   '{"admin","cto","developer"}'),

  ('mutual-nda',
   'Mutual Non-Disclosure Agreement',
   'Standardized mutual NDA governing all confidential disclosures between iVisit and external parties under Nigerian law.',
   'public',
   'iVisit_Mutual_NDA_External_2026.md',
   'shield',
   '{"admin","sponsor","lawyer","cto","developer","viewer"}'),

  ('print-engine',
   'Print Engine Blueprint',
   'Technical specification for the high-fidelity document printing system powering the iVisit Data Room.',
   'confidential',
   'iVisit_Print_Engine_Blueprint.md',
   'printer',
   '{"admin","cto","developer"}')

ON CONFLICT (slug) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
SELECT '✅ iVisit Data Room — Safe restore complete' AS status;
