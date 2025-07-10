-- Fix security issue: Convert admin_user_overview from SECURITY DEFINER to SECURITY INVOKER
-- This ensures the view respects the querying user's permissions and RLS policies
ALTER VIEW public.admin_user_overview SET (security_invoker = on);