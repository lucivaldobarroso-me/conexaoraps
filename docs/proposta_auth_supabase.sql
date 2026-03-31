-- =========================================================
-- CONEXAO RAPS
-- AJUSTES DE AUTENTICACAO PARA SUPABASE AUTH
-- executar no SQL Editor do Supabase
-- =========================================================

-- Objetivo:
-- 1. vincular a tabela public.usuarios ao auth.users;
-- 2. permitir que cada usuario autenticado leia e mantenha
--    apenas o proprio perfil;
-- 3. sustentar o novo login/registro 100% Supabase.

alter table public.usuarios
  add column if not exists auth_user_id uuid unique,
  add column if not exists email_auth text unique;

create index if not exists idx_usuarios_auth_user_id on public.usuarios(auth_user_id);
create index if not exists idx_usuarios_email_auth on public.usuarios(email_auth);

alter table public.usuarios enable row level security;

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

-- Como o projeto usa um e-mail tecnico interno derivado do campo
-- "usuario", o fluxo de registro fica mais simples se a confirmacao
-- de e-mail estiver desativada em:
-- Supabase Dashboard -> Authentication -> Providers -> Email
-- -> Disable "Confirm email".

-- =========================================================
-- CHECKS RAPIDOS
-- =========================================================

-- select id, usuario, nome_completo, auth_user_id, email_auth
-- from public.usuarios
-- order by criado_em desc;
