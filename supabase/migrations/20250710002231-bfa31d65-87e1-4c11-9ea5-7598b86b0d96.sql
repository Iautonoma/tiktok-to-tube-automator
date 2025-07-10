-- Add enabled column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;

-- Ensure the admin user exists and has correct role
DO $$
BEGIN
  -- Check if bandanascombr@gmail.com exists in auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'bandanascombr@gmail.com') THEN
    -- Get the user ID
    DECLARE
      admin_user_id UUID;
    BEGIN
      SELECT id INTO admin_user_id FROM auth.users WHERE email = 'bandanascombr@gmail.com';
      
      -- Ensure profile exists
      INSERT INTO public.profiles (user_id, email, full_name, enabled)
      VALUES (admin_user_id, 'bandanascombr@gmail.com', 'LUIZ ANTONIO TIBIRICA', true)
      ON CONFLICT (user_id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        enabled = true;
      
      -- Ensure admin role exists
      INSERT INTO public.user_roles (user_id, role)
      VALUES (admin_user_id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    END;
  END IF;
END $$;

-- Create function to enable/disable users
CREATE OR REPLACE FUNCTION public.set_user_enabled(target_user_id UUID, is_enabled BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only admins can enable/disable users
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Cannot disable the main admin
  IF target_user_id IN (
    SELECT p.user_id 
    FROM public.profiles p 
    WHERE p.email = 'bandanascombr@gmail.com'
  ) AND is_enabled = false THEN
    RAISE EXCEPTION 'Cannot disable the main administrator account';
  END IF;
  
  -- Update user status
  UPDATE public.profiles 
  SET enabled = is_enabled 
  WHERE user_id = target_user_id;
  
  RETURN true;
END;
$$;

-- Create a view for admin dashboard that simplifies data access
CREATE OR REPLACE VIEW public.admin_user_overview AS
SELECT 
  p.id,
  p.user_id,
  p.email,
  p.full_name,
  p.enabled,
  p.created_at,
  ur.role,
  (SELECT COUNT(*) FROM public.connected_accounts ca WHERE ca.user_id = p.user_id) as accounts_count,
  (SELECT COUNT(*) FROM public.automation_sessions ases WHERE ases.user_id = p.user_id) as sessions_count
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id;

-- Grant access to the view for admins
GRANT SELECT ON public.admin_user_overview TO authenticated;