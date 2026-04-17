-- =========================================================
-- CONEXAO RAPS
-- AJUSTES DE AUTENTICACAO PARA SUPABASE AUTH
-- executar no SQL Editor do Supabase
-- =========================================================

-- Objetivo:
-- 1. vincular a tabela public.usuarios ao auth.users;
-- 2. permitir que cada usuario autenticado leia e mantenha
--    apenas o proprio perfil;
-- 3. sustentar o novo login/registro 100% Supabase;
-- 4. manter cadastro pendente ate aprovacao do administrador;
-- 5. permitir login por e-mail ou usuario sem expor a tabela usuarios.

alter table public.usuarios
  add column if not exists auth_user_id uuid unique,
  add column if not exists email_auth text unique,
  add column if not exists status_aprovacao text not null default 'pendente';

create index if not exists idx_usuarios_auth_user_id on public.usuarios(auth_user_id);
create index if not exists idx_usuarios_email_auth on public.usuarios(email_auth);
create index if not exists idx_usuarios_status_aprovacao on public.usuarios(status_aprovacao);

update public.usuarios
set status_aprovacao = 'aprovado'
where ativo = true
  and (status_aprovacao is null or status_aprovacao = '');

-- Defina administradores manualmente pelo painel/SQL usando um identificador
-- confirmado no Supabase Auth. Nao deixe CPF/e-mail pessoal fixo no codigo.
-- Exemplo:
-- update public.usuarios
-- set modulo = 'ADMINISTRADOR',
--     ativo = true,
--     status_aprovacao = 'aprovado'
-- where auth_user_id = '<uuid-do-admin>';

alter table public.usuarios enable row level security;

drop policy if exists "usuarios_select_login_lookup" on public.usuarios;

create or replace function public.buscar_email_login_usuario(p_usuario text)
returns table(email_auth text)
language sql
security definer
set search_path = public
as $$
  select coalesce(u.email_auth, au.email)::text as email_auth
  from public.usuarios u
  left join auth.users au on au.id = u.auth_user_id
  where upper(u.usuario) = upper(trim(p_usuario))
    and u.ativo = true
    and coalesce(u.email_auth, au.email) is not null
  limit 1;
$$;

revoke all on function public.buscar_email_login_usuario(text) from public;
grant execute on function public.buscar_email_login_usuario(text) to anon, authenticated;

drop policy if exists "usuarios_select_own" on public.usuarios;
create policy "usuarios_select_own"
on public.usuarios
for select
to authenticated
using (auth.uid() = auth_user_id);

drop policy if exists "usuarios_insert_own" on public.usuarios;
create policy "usuarios_insert_own"
on public.usuarios
for insert
to authenticated
with check (auth.uid() = auth_user_id);

drop policy if exists "usuarios_update_own" on public.usuarios;
create policy "usuarios_update_own"
on public.usuarios
for update
to authenticated
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

grant select, insert, update on public.usuarios to authenticated;

-- =========================================================
-- OBSERVACAO IMPORTANTE
-- =========================================================

-- O registro usa e-mail real no Supabase Auth e deixa o perfil como
-- pendente ate aprovacao do administrador. Para o fluxo atual funcionar
-- sem travar apos criar a conta, deixe a confirmacao de e-mail desativada em:
-- Supabase Dashboard -> Authentication -> Providers -> Email
-- -> Disable "Confirm email".

-- A funcao buscar_email_login_usuario permite localizar somente o
-- email_auth necessario para login por usuario. Ela substitui a leitura
-- anonima direta da tabela usuarios.

-- =========================================================
-- CHECKS RAPIDOS
-- =========================================================

-- select id, usuario, nome_completo, modulo, ativo, status_aprovacao, auth_user_id, email_auth
-- from public.usuarios
-- order by criado_em desc;
