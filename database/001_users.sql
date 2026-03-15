-- ==========================================
-- POMELO — Supabase Database Schema
-- Users table for MEP QC App
-- ==========================================

-- Step 1: Create enums
CREATE TYPE public.user_type_enum AS ENUM ('internal', 'external');
CREATE TYPE public.user_status AS ENUM ('invited', 'active', 'inactive');
CREATE TYPE public.user_role AS ENUM ('system_admin', 'admin', 'member', 'registrant');

-- Step 2: Create users table
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NULL,
  first_name text NULL, 
  last_name text NULL,
  user_type public.user_type_enum NULL DEFAULT 'internal',
  status public.user_status NULL DEFAULT 'active',
  role public.user_role NULL DEFAULT 'member',
  company_id uuid NULL,
  auth_user_id uuid NULL,
  profile_photo_url text NULL,
  created_at timestamptz NULL DEFAULT now(),
  updated_at timestamptz NULL DEFAULT now(),
  username text NULL,
  first_name_thai text NULL,
  last_name_thai text NULL,
  nationality text NULL,
  department text NULL,
  job_title text NULL,
  azure_user_id text NULL,

  -- Constraints
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_email_key UNIQUE (email),
  CONSTRAINT users_azure_user_id_key UNIQUE (azure_user_id),
  CONSTRAINT users_username_key UNIQUE (username),
  CONSTRAINT users_auth_user_id_key UNIQUE (auth_user_id)
) TABLESPACE pg_default;

-- Step 3: Create indexes
CREATE INDEX idx_users_email ON public.users USING btree (email);
CREATE INDEX idx_users_azure_user_id ON public.users USING btree (azure_user_id);
CREATE INDEX idx_users_role ON public.users USING btree (role);
CREATE INDEX idx_users_status ON public.users USING btree (status);
CREATE INDEX idx_users_department ON public.users USING btree (department);
CREATE INDEX idx_users_job_title ON public.users USING btree (job_title);

-- Step 4: Enable RLS (Row Level Security)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 5: RLS Policies
-- Allow anyone to read users (for the auto-create flow with anon key)
CREATE POLICY "users_read_all" ON public.users
  FOR SELECT
  USING (true);

-- Allow insert for auto-creating users (via anon key during login)
CREATE POLICY "users_insert_self" ON public.users
  FOR INSERT
  WITH CHECK (true);

-- Allow users to update their own record
CREATE POLICY "users_update_self" ON public.users
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Step 6: Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
  RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_users_updated
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
