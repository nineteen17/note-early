-- 1) Safely drop the trigger if it was manually removed or exists
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;

-- 2) Re-create it with the correct function binding
CREATE TRIGGER create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile_creation();