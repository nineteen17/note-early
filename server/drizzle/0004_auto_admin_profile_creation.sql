-- Create a function to automatically create profiles when users are created in auth.users
CREATE OR REPLACE FUNCTION handle_new_user_profile_creation()
RETURNS TRIGGER AS $$
DECLARE
  v_role public.user_role := 'ADMIN'; -- Default role
  v_full_name text;
BEGIN
  -- Determine the role based on the email
  IF NEW.email LIKE '%@noteearly.com' OR NEW.email = 'admin@example.com' THEN
    v_role := 'SUPER_ADMIN';
  END IF;

  -- Determine full_name: Prefer metadata, fallback to extracting from email
  v_full_name := COALESCE(
    NULLIF(TRIM(CONCAT(
      NEW.raw_user_meta_data->>'first_name', 
      ' ', 
      NEW.raw_user_meta_data->>'last_name'
    )), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), -- Added check for full_name in metadata
    -- Improved email parsing: Handle simple emails like "user@domain.com"
    CASE 
      WHEN NEW.email LIKE '%@%' THEN
          split_part(NEW.email, '@', 1)
      ELSE
          NEW.email -- Fallback to full email if no '@'
    END
  );

  -- Insert a new profile with the determined role and name
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
    v_role, -- Use the determined role
    v_full_name, -- Use the determined full name
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or Replace the trigger to use the updated function
-- Note: Renamed trigger and function for clarity
DROP TRIGGER IF EXISTS create_admin_profile_on_signup ON auth.users;

CREATE TRIGGER create_profile_on_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user_profile_creation(); 