-- Adicionar role padrão para usuários sem role
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'user'::app_role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
WHERE ur.user_id IS NULL;