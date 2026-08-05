-- Grant admin to sonichenry214@gmail.com (run after user signs up)
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'sonichenry214@gmail.com');

insert into public.profiles (id, full_name, is_admin)
select id, coalesce(raw_user_meta_data->>'full_name', 'Admin'), true
from auth.users
where email = 'sonichenry214@gmail.com'
on conflict (id) do update set is_admin = true;
