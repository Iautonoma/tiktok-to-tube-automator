-- Add missing RLS policies for profiles table security

-- Allow users to insert their own profile during registration
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Allow admins to delete profiles (for user management)
CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE 
  USING (public.has_role(auth.uid(), 'admin'));

-- Add additional security function for input validation
CREATE OR REPLACE FUNCTION public.validate_email_format(email_input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Basic email format validation
  RETURN email_input ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$;

-- Add function to sanitize user input
CREATE OR REPLACE FUNCTION public.sanitize_text_input(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Remove potential XSS characters and limit length
  RETURN LEFT(TRIM(REGEXP_REPLACE(input_text, '[<>"\''&]', '', 'g')), 255);
END;
$$;