-- ── Migration 041: Support HTML templates in master_form_revisions ────────────
-- template_url becomes nullable (NULL when revision uses html_content)
-- html_content stores the full HTML string for HTML-type revisions

ALTER TABLE public.master_form_revisions
  ALTER COLUMN template_url DROP NOT NULL;

ALTER TABLE public.master_form_revisions
  ADD COLUMN IF NOT EXISTS html_content text NULL;

COMMENT ON COLUMN public.master_form_revisions.template_url IS
  'R2 public URL to PDF AcroForm template. NULL when revision is HTML-type.';

COMMENT ON COLUMN public.master_form_revisions.html_content IS
  'Full HTML template string. NULL when revision is PDF-type. Stored in DB to avoid cross-origin fetch.';
