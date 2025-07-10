-- Temporarily disable the trigger to test signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create a simpler trigger function without the role assignment for now
CREATE OR REPLACE FUNCTION public.handle_new_user_simple()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only insert profile, no role assignment
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the signup
    RAISE WARNING 'Error in handle_new_user_simple: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create the simplified trigger
CREATE TRIGGER on_auth_user_created_simple
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_simple();