-- ============================================================
-- iVisit Secure Data Room — Schema & RLS
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. DOCUMENTS TABLE
-- Metadata catalog of available files in the Data Room
CREATE TABLE IF NOT EXISTS public.documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  tier        TEXT DEFAULT 'confidential' CHECK (tier IN ('public','confidential','restricted')),
  file_path   TEXT NOT NULL,
  icon        TEXT DEFAULT 'file-text',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. ACCESS REQUESTS TABLE
-- Per-user, per-document access records
CREATE TABLE IF NOT EXISTS public.access_requests (
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

-- 3. DOCUMENT INVITES TABLE
-- Admin sends invite link to a sponsor's email for a specific document
CREATE TABLE IF NOT EXISTS public.document_invites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT NOT NULL,
  document_id  UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  token        TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  claimed      BOOLEAN DEFAULT false,
  claimed_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT now(),
  expires_at   TIMESTAMPTZ DEFAULT (now() + interval '30 days')
);

-- 4. AUTO-UPDATE TRIGGERS
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_documents_updated
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_access_requests_updated
  BEFORE UPDATE ON public.access_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 5. ROW LEVEL SECURITY

-- Documents: everyone authenticated can see the catalog
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view document metadata"
  ON public.documents FOR SELECT
  TO authenticated
  USING (true);

-- Access Requests: users manage their own rows
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own requests"
  ON public.access_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own requests"
  ON public.access_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admin updates happen via service_role (bypasses RLS)

-- Document Invites: public read by token, authenticated read own
ALTER TABLE public.document_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view invites by token"
  ON public.document_invites FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can claim invites"
  ON public.document_invites FOR UPDATE
  TO authenticated
  USING (claimed = false AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (claimed = true AND claimed_by = auth.uid());

-- 6. EMAIL NOTIFICATION TRIGGER
-- Uses pg_net to send an HTTP request when a new access request is created
-- This calls a simple webhook that forwards to support@ivisit.ng
CREATE OR REPLACE FUNCTION public.notify_access_request()
RETURNS TRIGGER AS $$
DECLARE
  doc_title TEXT;
  user_email TEXT;
BEGIN
  SELECT title INTO doc_title FROM public.documents WHERE id = NEW.document_id;
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.user_id;

  -- Log for debugging (visible in Supabase Logs)
  RAISE LOG 'New access request: user=%, document=%, status=%',
    user_email, doc_title, NEW.status;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_access_request
  AFTER INSERT ON public.access_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_access_request();

-- 7. INDEXES
CREATE INDEX IF NOT EXISTS idx_access_requests_user ON public.access_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_document ON public.access_requests(document_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON public.access_requests(status);
CREATE INDEX IF NOT EXISTS idx_document_invites_token ON public.document_invites(token);
CREATE INDEX IF NOT EXISTS idx_document_invites_email ON public.document_invites(email);

-- 8. ENABLE REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.access_requests;

-- 9. SEED DATA
INSERT INTO public.documents (slug, title, description, tier, file_path, icon) VALUES
  ('business-proposal', 'iVisit Definitive Business Proposal 2026', 'Neural Emergency Infrastructure — the complete investor-ready business proposal covering Unity Architecture, market analysis, execution roadmap, and financial projections.', 'confidential', 'iVisit_Definitive_Business_Proposal_2026.md', 'briefcase'),
  ('master-plan', 'iVisit Master Plan v2.0', 'The strategic master plan outlining the three-phase deployment from Lagos tactical strike to national lifeline infrastructure.', 'restricted', 'iVisit_Master_Plan_v2.md', 'map'),
  ('mutual-nda', 'Mutual Non-Disclosure Agreement', 'Standardized mutual NDA governing all confidential disclosures between iVisit and external parties under Nigerian law.', 'public', 'iVisit_Mutual_NDA_External_2026.md', 'shield'),
  ('print-engine', 'Print Engine Blueprint', 'Technical specification for the high-fidelity document printing system powering the iVisit Data Room.', 'confidential', 'iVisit_Print_Engine_Blueprint.md', 'printer')
ON CONFLICT (slug) DO NOTHING;

-- Done
SELECT 'Data Room schema created successfully' AS status;
