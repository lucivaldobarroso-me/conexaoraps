-- =========================================================
-- CONEXAO RAPS
-- POLICIES PARA FRONTEND COM USUARIO AUTENTICADO
-- =========================================================

-- Observacao:
-- Use a publishable key no frontend, mas mantenha dados assistenciais
-- acessiveis somente para usuarios autenticados e aprovados.

grant usage on schema public to anon, authenticated;

grant select, insert, update on public.usuarios to authenticated;
grant execute on function public.buscar_email_login_usuario(text) to anon, authenticated;
grant select on public.zonas to authenticated;
grant select on public.bairros to authenticated;
grant select on public.tipos_ocorrencia to authenticated;
grant select on public.subtipos_ocorrencia to authenticated;
grant select on public.campos_extras_ocorrencia to authenticated;
grant select, insert on public.atendimentos_raps to authenticated;
grant select, insert, update on public.classificacao_ocorrencia_atendimento to authenticated;
grant select, insert, update on public.catalogo_dados_profissionais to authenticated;
grant select, insert, update on public.dados_profissionais_atendimento to authenticated;
grant select on public.vw_atendimentos_dashboard_legado to authenticated;

alter table public.usuarios enable row level security;
alter table public.zonas enable row level security;
alter table public.bairros enable row level security;
alter table public.tipos_ocorrencia enable row level security;
alter table public.subtipos_ocorrencia enable row level security;
alter table public.campos_extras_ocorrencia enable row level security;
alter table public.atendimentos_raps enable row level security;
alter table public.classificacao_ocorrencia_atendimento enable row level security;
alter table public.catalogo_dados_profissionais enable row level security;
alter table public.dados_profissionais_atendimento enable row level security;

drop policy if exists "usuarios_select_login_lookup" on public.usuarios;

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

drop policy if exists "zonas_select_public" on public.zonas;
create policy "zonas_select_public"
on public.zonas
for select
to authenticated
using (true);

drop policy if exists "bairros_select_public" on public.bairros;
create policy "bairros_select_public"
on public.bairros
for select
to authenticated
using (true);

drop policy if exists "tipos_ocorrencia_select_public" on public.tipos_ocorrencia;
create policy "tipos_ocorrencia_select_public"
on public.tipos_ocorrencia
for select
to authenticated
using (true);

drop policy if exists "subtipos_ocorrencia_select_public" on public.subtipos_ocorrencia;
create policy "subtipos_ocorrencia_select_public"
on public.subtipos_ocorrencia
for select
to authenticated
using (true);

drop policy if exists "campos_extras_ocorrencia_select_public" on public.campos_extras_ocorrencia;
create policy "campos_extras_ocorrencia_select_public"
on public.campos_extras_ocorrencia
for select
to authenticated
using (true);

drop policy if exists "atendimentos_raps_select_public" on public.atendimentos_raps;
create policy "atendimentos_raps_select_public"
on public.atendimentos_raps
for select
to authenticated
using (true);

drop policy if exists "atendimentos_raps_insert_public" on public.atendimentos_raps;
create policy "atendimentos_raps_insert_public"
on public.atendimentos_raps
for insert
to authenticated
with check (true);

drop policy if exists "atendimentos_raps_delete_public" on public.atendimentos_raps;
create policy "atendimentos_raps_delete_public"
on public.atendimentos_raps
for delete
to authenticated
using (true);

drop policy if exists "classificacao_ocorrencia_select_public" on public.classificacao_ocorrencia_atendimento;
create policy "classificacao_ocorrencia_select_public"
on public.classificacao_ocorrencia_atendimento
for select
to authenticated
using (true);

drop policy if exists "classificacao_ocorrencia_insert_public" on public.classificacao_ocorrencia_atendimento;
create policy "classificacao_ocorrencia_insert_public"
on public.classificacao_ocorrencia_atendimento
for insert
to authenticated
with check (true);

drop policy if exists "classificacao_ocorrencia_update_public" on public.classificacao_ocorrencia_atendimento;
create policy "classificacao_ocorrencia_update_public"
on public.classificacao_ocorrencia_atendimento
for update
to authenticated
using (true)
with check (true);

drop policy if exists "catalogo_dados_profissionais_select_public" on public.catalogo_dados_profissionais;
create policy "catalogo_dados_profissionais_select_public"
on public.catalogo_dados_profissionais
for select
to authenticated
using (true);

drop policy if exists "catalogo_dados_profissionais_insert_public" on public.catalogo_dados_profissionais;
create policy "catalogo_dados_profissionais_insert_public"
on public.catalogo_dados_profissionais
for insert
to authenticated
with check (true);

drop policy if exists "catalogo_dados_profissionais_update_public" on public.catalogo_dados_profissionais;
create policy "catalogo_dados_profissionais_update_public"
on public.catalogo_dados_profissionais
for update
to authenticated
using (true)
with check (true);

drop policy if exists "dados_profissionais_atendimento_select_public" on public.dados_profissionais_atendimento;
create policy "dados_profissionais_atendimento_select_public"
on public.dados_profissionais_atendimento
for select
to authenticated
using (true);

drop policy if exists "dados_profissionais_atendimento_insert_public" on public.dados_profissionais_atendimento;
create policy "dados_profissionais_atendimento_insert_public"
on public.dados_profissionais_atendimento
for insert
to authenticated
with check (true);

drop policy if exists "dados_profissionais_atendimento_update_public" on public.dados_profissionais_atendimento;
create policy "dados_profissionais_atendimento_update_public"
on public.dados_profissionais_atendimento
for update
to authenticated
using (true)
with check (true);

-- =========================================================
-- CHECKS RAPIDOS
-- =========================================================

-- select * from public.zonas;
-- select * from public.bairros order by nome;
-- select * from public.tipos_ocorrencia;
-- select * from public.subtipos_ocorrencia order by ordem;
-- select * from public.campos_extras_ocorrencia order by ordem;
