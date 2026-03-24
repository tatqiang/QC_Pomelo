-- ==========================================
-- POMELO QC System — Migration
-- 050: ITR Activity Log
-- Run in: Supabase Dashboard → SQL Editor
-- ==========================================

CREATE TABLE IF NOT EXISTS public.itr_activity_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  itr_id      uuid        NOT NULL REFERENCES public.itrs(id) ON DELETE CASCADE,
  project_id  uuid        NOT NULL,
  user_id     uuid        NOT NULL,
  user_name   text        NOT NULL,
  action      text        NOT NULL,   -- 'created' | 'updated' | 'status_changed' | 'file_added' | 'file_deleted' | 'comment_added'
  detail      text        NULL,        -- human-readable detail, e.g. "Status → Approved", "Uploaded: photo.jpg"
  meta        jsonb       NULL,        -- optional structured data (old_value, new_value, file_name, etc.)
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS itr_activity_log_itr_id_idx    ON public.itr_activity_log (itr_id, created_at DESC);
CREATE INDEX IF NOT EXISTS itr_activity_log_project_id_idx ON public.itr_activity_log (project_id, created_at DESC);

ALTER TABLE public.itr_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "itr_activity_log_select" ON public.itr_activity_log FOR SELECT USING (true);
CREATE POLICY "itr_activity_log_insert" ON public.itr_activity_log FOR INSERT WITH CHECK (true);
