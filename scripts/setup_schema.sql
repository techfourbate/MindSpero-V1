-- ⚠️ RUN THIS COMPLETE SETUP IN YOUR SUPABASE SQL EDITOR ⚠️

-- 1. Create Profiles Table (if not exists)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  trial_start_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  trial_end_date TIMESTAMP WITH TIME ZONE,
  bonus_trial_end_date TIMESTAMP WITH TIME ZONE,
  subscription_plan TEXT,
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Create Notes Table (if not exists)
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  original_path TEXT,
  extracted_text TEXT,
  simplified_text TEXT,
  output_pdf_path TEXT,
  audio_path TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Enable Security Policies (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Notes Policies
DROP POLICY IF EXISTS "Users can view own notes" ON public.notes;
CREATE POLICY "Users can view own notes" ON public.notes FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notes" ON public.notes;
CREATE POLICY "Users can insert own notes" ON public.notes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notes" ON public.notes;
CREATE POLICY "Users can update own notes" ON public.notes FOR UPDATE USING (auth.uid() = user_id);

-- 4. Initialise Storage Buckets
-- Note: You might see an error if these already exist, which can be ignored.
insert into storage.buckets (id, name, public) 
values ('notes', 'notes', true)
ON CONFLICT (id) DO NOTHING;

insert into storage.buckets (id, name, public) 
values ('outputs', 'outputs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Security Policies
create policy "Authenticated users can upload notes"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'notes' AND auth.uid()::text = (storage.foldername(name))[1] );

create policy "Authenticated users can read their notes"
on storage.objects for select
to authenticated
using ( bucket_id = 'notes' AND auth.uid()::text = (storage.foldername(name))[1] );

create policy "Download outputs"
on storage.objects for select
to authenticated
using ( bucket_id = 'outputs' );
