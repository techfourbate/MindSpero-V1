-- ⚠️ RUN THIS SCRIPT IN YOUR SUPABASE SQL EDITOR TO FIX THE SIGNUP ERROR ⚠️

-- The error "Database error saving new user" typically happens when there is a broken
-- automatic trigger trying to create a profile when a new user signs up.

-- Since this application strictly handles profile creation manually via the API,
-- we can safely remove this trigger to resolve the error.

-- 1. Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Drop the function associated with the trigger
DROP FUNCTION IF EXISTS public.handle_new_user();

-- After running this, try signing up again.
