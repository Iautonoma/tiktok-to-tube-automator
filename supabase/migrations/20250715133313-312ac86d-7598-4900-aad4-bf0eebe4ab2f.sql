-- Security Enhancement Migration: Fix Privilege Escalation and Add Audit Trail

-- Create audit log table for tracking role changes
CREATE TABLE public.role_change_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id UUID NOT NULL,
  old_role app_role,
  new_role app_role NOT NULL,
  changed_by UUID NOT NULL,
  reason TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS on audit table
ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON public.role_change_audit
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Create secure function to update user roles with audit trail
CREATE OR REPLACE FUNCTION public.update_user_role_secure(
  target_user_id UUID,
  new_role app_role,
  reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_role app_role;
  current_user_id UUID;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Only admins can change roles
  IF NOT public.has_role(current_user_id, 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Prevent self-role modification
  IF current_user_id = target_user_id THEN
    RAISE EXCEPTION 'Security violation: Cannot modify your own role';
  END IF;
  
  -- Cannot modify the main admin's role
  IF target_user_id IN (
    SELECT p.user_id 
    FROM public.profiles p 
    WHERE p.email = 'bandanascombr@gmail.com'
  ) THEN
    RAISE EXCEPTION 'Cannot modify the main administrator role';
  END IF;
  
  -- Get current role
  SELECT role INTO current_role
  FROM public.user_roles
  WHERE user_id = target_user_id;
  
  -- Log the change attempt
  INSERT INTO public.role_change_audit (
    target_user_id,
    old_role,
    new_role,
    changed_by,
    reason
  ) VALUES (
    target_user_id,
    current_role,
    new_role,
    current_user_id,
    reason
  );
  
  -- Update the role
  UPDATE public.user_roles 
  SET role = new_role 
  WHERE user_id = target_user_id;
  
  RETURN true;
END;
$$;

-- Create function to prevent users from updating their own roles
CREATE OR REPLACE FUNCTION public.prevent_self_role_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Prevent users from updating their own roles
  IF auth.uid() = NEW.user_id AND OLD.role != NEW.role THEN
    RAISE EXCEPTION 'Security violation: Cannot modify your own role';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add trigger to prevent self role updates
CREATE TRIGGER prevent_self_role_update_trigger
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_role_update();

-- Create enhanced input validation function
CREATE OR REPLACE FUNCTION public.validate_and_sanitize_input(
  input_text TEXT,
  input_type TEXT DEFAULT 'text',
  max_length INTEGER DEFAULT 255
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Null check
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Length validation
  IF LENGTH(input_text) > max_length THEN
    RAISE EXCEPTION 'Input too long: maximum % characters allowed', max_length;
  END IF;
  
  -- Type-specific validation
  CASE input_type
    WHEN 'email' THEN
      IF NOT input_text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format';
      END IF;
    WHEN 'name' THEN
      IF input_text ~* '[<>"\''&]' THEN
        RAISE EXCEPTION 'Invalid characters in name';
      END IF;
    WHEN 'text' THEN
      -- Remove potential XSS characters
      input_text := REGEXP_REPLACE(input_text, '[<>"\''&]', '', 'g');
  END CASE;
  
  -- Trim and return
  RETURN TRIM(input_text);
END;
$$;

-- Create function to get admin activity summary
CREATE OR REPLACE FUNCTION public.get_admin_activity_summary()
RETURNS TABLE (
  admin_email TEXT,
  role_changes_count BIGINT,
  last_activity TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    p.email,
    COUNT(rca.id) as role_changes_count,
    MAX(rca.timestamp) as last_activity
  FROM public.profiles p
  JOIN public.user_roles ur ON p.user_id = ur.user_id
  LEFT JOIN public.role_change_audit rca ON p.user_id = rca.changed_by
  WHERE ur.role = 'admin'
  GROUP BY p.email, p.user_id
  ORDER BY last_activity DESC NULLS LAST;
$$;