-- Solo contra una instancia local desechable. Todos los fixtures se revierten.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

-- Identidades de prueba: no se crean usuarios desde la aplicación ni las migraciones.
insert into auth.users (id) values
  ('00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000002');
insert into private.administrator (user_id) values ('00000000-0000-4000-8000-000000000001');
insert into public.projects (id, slug, name, is_published) values
  ('10000000-0000-4000-8000-000000000001', 'published-test', 'Published test', true),
  ('10000000-0000-4000-8000-000000000002', 'draft-test', 'Draft test', false);
insert into public.columns (id, project_id, name) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Published column'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Draft column');
insert into public.tasks (id, project_id, column_id, title) values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Published task'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Draft task');

select ok((select bool_and(relrowsecurity) from pg_class where oid in ('public.projects'::regclass, 'public.columns'::regclass, 'public.tasks'::regclass, 'private.administrator'::regclass)), 'RLS enabled on every table');

set local role anon;
select results_eq('select slug from public.projects', array['published-test']::text[], 'Anonymous sees only published projects');
select results_eq('select name from public.columns', array['Published column']::text[], 'Anonymous sees only published columns');
select results_eq('select title from public.tasks', array['Published task']::text[], 'Anonymous sees only published tasks');
select throws_ok($$insert into public.projects (slug, name) values ('denied', 'Denied')$$, '42501', null, 'Anonymous cannot insert projects');
select throws_ok($$update public.columns set name = 'Denied'$$, '42501', null, 'Anonymous cannot update columns');
select throws_ok($$delete from public.tasks$$, '42501', null, 'Anonymous cannot delete tasks');
select throws_ok($$select * from private.administrator$$, '42501', null, 'Anonymous cannot read administrator registry');
select throws_ok($$select public.is_admin()$$, '42501', null, 'Anonymous cannot call administrator RPC');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated","user_metadata":{"is_admin":true}}';
select is(public.is_admin(), false, 'User metadata cannot grant administrator rights');
select results_eq('select slug from public.projects', array['published-test']::text[], 'Other user cannot read draft projects');
select results_eq('select name from public.columns', array['Published column']::text[], 'Other user cannot read draft columns');
select results_eq('select title from public.tasks', array['Published task']::text[], 'Other user cannot read draft tasks');
select throws_ok($$insert into private.administrator (user_id) values ('00000000-0000-4000-8000-000000000002')$$, '42501', null, 'User cannot authorize themselves');
select throws_ok($$insert into public.projects (slug, name) values ('denied', 'Denied')$$, '42501', null, 'Other user cannot insert projects');
select throws_ok($$insert into public.columns (project_id, name) values ('10000000-0000-4000-8000-000000000001', 'Denied')$$, '42501', null, 'Other user cannot insert columns');
select throws_ok($$insert into public.tasks (project_id, column_id, title) values ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Denied')$$, '42501', null, 'Other user cannot insert tasks');
with changed as (update public.projects set name = 'Denied' returning id) select is((select count(*) from changed), 0::bigint, 'Other user cannot update projects');
with changed as (update public.columns set name = 'Denied' returning id) select is((select count(*) from changed), 0::bigint, 'Other user cannot update columns');
with changed as (update public.tasks set title = 'Denied' returning id) select is((select count(*) from changed), 0::bigint, 'Other user cannot update tasks');
with changed as (delete from public.projects returning id) select is((select count(*) from changed), 0::bigint, 'Other user cannot delete projects');
with changed as (delete from public.columns returning id) select is((select count(*) from changed), 0::bigint, 'Other user cannot delete columns');
with changed as (delete from public.tasks returning id) select is((select count(*) from changed), 0::bigint, 'Other user cannot delete tasks');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}';
select is(public.is_admin(), true, 'Authorized UUID is administrator');
select is((select count(*) from public.projects), 2::bigint, 'Administrator sees draft projects');
select is((select count(*) from public.columns), 2::bigint, 'Administrator sees draft columns');
select is((select count(*) from public.tasks), 2::bigint, 'Administrator sees draft tasks');
select throws_ok($$select * from private.administrator$$, '42501', null, 'Even administrator cannot directly access private registry');
select lives_ok($$insert into public.projects (id, slug, name) values ('10000000-0000-4000-8000-000000000003', 'admin-test', 'Admin test')$$, 'Administrator can insert project');
select lives_ok($$insert into public.columns (id, project_id, name) values ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'Admin column')$$, 'Administrator can insert column');
select lives_ok($$insert into public.tasks (id, project_id, column_id, title) values ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', 'Admin task')$$, 'Administrator can insert task');
with changed as (update public.projects set name = 'Updated' where slug = 'admin-test' returning id) select is((select count(*) from changed), 1::bigint, 'Administrator can update project');
with changed as (update public.columns set name = 'Updated' where id = '20000000-0000-4000-8000-000000000003' returning id) select is((select count(*) from changed), 1::bigint, 'Administrator can update column');
with changed as (update public.tasks set title = 'Updated', created_at = '2000-01-01' where id = '30000000-0000-4000-8000-000000000003' returning id) select is((select count(*) from changed), 1::bigint, 'Administrator can update task');
select ok((select updated_at >= created_at and created_at > '2000-01-01'::timestamptz from public.tasks where id = '30000000-0000-4000-8000-000000000003'), 'Trigger sets updated_at and preserves created_at');
select throws_ok($$update public.tasks set column_id = '20000000-0000-4000-8000-000000000002' where id = '30000000-0000-4000-8000-000000000003'$$, '23503', null, 'Tasks cannot reference a column in another project');
select throws_ok($$update public.projects set position = -1 where slug = 'admin-test'$$, '23514', null, 'Project position cannot be negative');
select throws_ok($$update public.columns set position = -1 where id = '20000000-0000-4000-8000-000000000003'$$, '23514', null, 'Column position cannot be negative');
select throws_ok($$update public.tasks set position = -1 where id = '30000000-0000-4000-8000-000000000003'$$, '23514', null, 'Task position cannot be negative');
select throws_ok($$update public.tasks set priority = 'invalid' where id = '30000000-0000-4000-8000-000000000003'$$, '23514', null, 'Priority is constrained');
select throws_ok($$update public.projects set slug = 'Invalid Slug' where slug = 'admin-test'$$, '23514', null, 'Slug format is constrained');
select throws_ok($$update public.projects set slug = 'published-test' where slug = 'admin-test'$$, '23505', null, 'Slugs are unique');
select throws_ok($$update public.tasks set title = ' ' where id = '30000000-0000-4000-8000-000000000003'$$, '23514', null, 'Blank task titles are rejected');
with changed as (delete from public.tasks where id = '30000000-0000-4000-8000-000000000003' returning id) select is((select count(*) from changed), 1::bigint, 'Administrator can delete task');
with changed as (delete from public.columns where id = '20000000-0000-4000-8000-000000000003' returning id) select is((select count(*) from changed), 1::bigint, 'Administrator can delete column');
with changed as (delete from public.projects where slug = 'admin-test' returning id) select is((select count(*) from changed), 1::bigint, 'Administrator can delete project');
update public.projects set is_published = false where slug = 'published-test';
reset role;

set local role anon;
select is((select count(*) from public.projects), 0::bigint, 'Unpublishing hides projects immediately');
select is((select count(*) from public.columns), 0::bigint, 'Unpublishing hides columns immediately');
select is((select count(*) from public.tasks), 0::bigint, 'Unpublishing hides tasks immediately');
reset role;

select throws_ok($$insert into private.administrator (singleton, user_id) values (false, '00000000-0000-4000-8000-000000000002')$$, '23514', null, 'Administrator registry is a singleton');
delete from private.administrator;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}';
select is(public.is_admin(), false, 'Removing authorization revokes existing sessions immediately');
select is((select count(*) from public.projects), 0::bigint, 'Revoked administrator cannot read drafts');
select throws_ok($$insert into public.projects (slug, name) values ('revoked', 'Revoked')$$, '42501', null, 'Revoked administrator cannot write');
reset role;

select * from finish();
rollback;
