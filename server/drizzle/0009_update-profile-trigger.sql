-- 1️⃣ Replace the function, including all your role & full_name logic
CREATE OR REPLACE FUNCTION public.handle_new_user_profile_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role public.user_role := 'ADMIN';  -- default
  v_full_name text;
BEGIN
  -- Use SUPER_ADMIN for your own domain or explicit admin
  IF NEW.email LIKE '%@noteearly.com'
     OR NEW.email = 'admin@example.com'
  THEN
    v_role := 'SUPER_ADMIN';
  END IF;

  -- Build a full_name from metadata or fallback to email username
  v_full_name := COALESCE(
    NULLIF(TRIM(
      CONCAT(
        NEW.raw_user_meta_data->>'first_name', 
        ' ', 
        NEW.raw_user_meta_data->>'last_name'
      )
    ), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (
    id,
    email,
    role,
    full_name,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    v_role,
    v_full_name,
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$;

-- 2️⃣ Drop the old trigger (safe even if it doesn’t exist)
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;

-- 3️⃣ Re‑create it, binding to the fully fleshed‑out function
CREATE TRIGGER create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile_creation();