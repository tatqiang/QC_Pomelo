-- ==========================================
-- POMELO — Supabase Database Schema
-- Phase 26: Leave Request Attachments
-- Run in: Supabase Dashboard → SQL Editor
-- ==========================================

-- ── Step 1: leave_request_attachments table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leave_request_attachments (
  id                uuid        NOT NULL DEFAULT gen_random_uuid(),
  leave_request_id  uuid        NOT NULL REFERENCES public.leave_requests(id) ON DELETE CASCADE,
  uploaded_by       uuid        NOT NULL REFERENCES public.users(id)          ON DELETE CASCADE,
  file_name         text        NOT NULL,
  file_url          text        NOT NULL,
  file_size         bigint      NULL,      -- bytes
  created_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT leave_attachments_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- ── Step 2: Indexes ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leave_att_leave_id   ON public.leave_request_attachments USING btree (leave_request_id);
CREATE INDEX IF NOT EXISTS idx_leave_att_uploaded_by ON public.leave_request_attachments USING btree (uploaded_by);

-- ── Step 3: RLS ────────────────────────────────────────────────────────────────
ALTER TABLE public.leave_request_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leave_att_select_all" ON public.leave_request_attachments;
DROP POLICY IF EXISTS "leave_att_insert_all" ON public.leave_request_attachments;
DROP POLICY IF EXISTS "leave_att_update_all" ON public.leave_request_attachments;
DROP POLICY IF EXISTS "leave_att_delete_all" ON public.leave_request_attachments;

CREATE POLICY "leave_att_select_all" ON public.leave_request_attachments FOR SELECT USING (true);
CREATE POLICY "leave_att_insert_all" ON public.leave_request_attachments FOR INSERT WITH CHECK (true);
CREATE POLICY "leave_att_update_all" ON public.leave_request_attachments FOR UPDATE USING (true);
CREATE POLICY "leave_att_delete_all" ON public.leave_request_attachments FOR DELETE USING (true);
