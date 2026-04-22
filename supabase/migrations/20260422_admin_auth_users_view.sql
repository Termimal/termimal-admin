create or replace view public.admin_auth_users as
select
  id,
  email,
  phone,
  last_sign_in_at,
  app_metadata
from auth.users;