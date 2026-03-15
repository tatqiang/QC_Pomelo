-- ── ITR Comments ────────────────────────────────────────────────────────────
-- Chat/discussion thread attached to each ITR.
-- Users can post, read and delete their own comments in real-time.

CREATE TABLE IF NOT EXISTS itr_comments (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  itr_id      uuid        NOT NULL REFERENCES itrs(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL,
  user_name   text        NOT NULL,
  body        text        NOT NULL CHECK (char_length(trim(body)) > 0),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS itr_comments_itr_id_idx ON itr_comments (itr_id, created_at);

-- Row-Level Security
-- App uses Azure AD + anon key (no Supabase native JWT), so policies use (true)
-- to allow anon key access. Ownership is enforced at the application layer.
ALTER TABLE itr_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "itr_comments_select_all" ON itr_comments FOR SELECT USING (true);
CREATE POLICY "itr_comments_insert_all" ON itr_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "itr_comments_update_all" ON itr_comments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "itr_comments_delete_all" ON itr_comments FOR DELETE USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE itr_comments;
