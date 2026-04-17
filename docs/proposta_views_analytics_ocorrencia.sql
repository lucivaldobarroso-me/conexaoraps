-- =========================================================
-- CONEXAO RAPS
-- VIEWS DE ANALYTICS PARA DASHBOARD PSIQUIATRICO
-- uso recomendado: executar no SQL Editor do Supabase
-- =========================================================

-- Objetivo:
-- 1. Centralizar joins e normalizacao da classificacao psiquiatrica.
-- 2. Deixar o frontend mais leve.
-- 3. Facilitar filtros, relatorios e novas consultas gerenciais.

-- =========================================================
-- 1. VIEW DETALHADA BASE
-- uma linha por atendimento com classificacao vinculada
-- =========================================================

create or replace view public.vw_ocorrencias_psi_detalhado as
select
  a.id as atendimento_id,
  a.id_externo,
  a.nome,
  a.nascimento,
  a.sexo,
  a.idade,
  a.endereco,
  a.numero,
  coalesce(b.nome, a.bairro_nome_legado) as bairro,
  coalesce(z.nome, a.zona_nome_legado) as zona,
  a.localizacao_raw,
  a.latitude,
  a.longitude,
  a.referencia,
  a.diagnosticado,
  a.reincidente,
  a.medicacao,
  a.pq_med,
  a.apoio_fam,
  a.pq_fam,
  a.apoio_raps,
  a.info_extra,
  a.entrada_legado,
  a.responsavel_nome,
  a.raca,
  a.nacionalidade,
  c.id as classificacao_id,
  ti.nome as motivo_inicial_tipo,
  si.nome as motivo_inicial_subtipo,
  c.motivo_inicial_extras,
  tc.nome as motivo_constatado_tipo,
  sc.nome as motivo_constatado_subtipo,
  c.motivo_constatado_extras,
  c.motivo_constatado_extras ->> 'metodo' as metodo,
  c.detalhe_livre,
  case
    when sc.nome in (
      'TENTATIVA DE SUICÍDIO',
      'IDEAÇÃO SUICIDA',
      'SURTO PSICÓTICO',
      'AGITAÇÃO PSICOMOTORA'
    ) then true
    else false
  end as caso_critico,
  a.criado_em,
  a.atualizado_em
from public.atendimentos_raps a
left join public.bairros b on b.id = a.bairro_id
left join public.zonas z on z.id = a.zona_id
left join public.classificacao_ocorrencia_atendimento c on c.atendimento_id = a.id
left join public.tipos_ocorrencia ti on ti.id = c.motivo_inicial_tipo_id
left join public.subtipos_ocorrencia si on si.id = c.motivo_inicial_subtipo_id
left join public.tipos_ocorrencia tc on tc.id = c.motivo_constatado_tipo_id
left join public.subtipos_ocorrencia sc on sc.id = c.motivo_constatado_subtipo_id;

comment on view public.vw_ocorrencias_psi_detalhado is
'Base detalhada para dashboard psiquiatrico, mapa clinico e relatorios.';

-- =========================================================
-- 2. RESUMO GERAL
-- =========================================================

create or replace view public.vw_ocorrencias_psi_resumo_geral as
select
  count(*) filter (where classificacao_id is not null) as total_classificacoes,
  count(*) filter (where caso_critico) as total_criticos,
  count(*) filter (
    where classificacao_id is not null
      and nullif(trim(coalesce(detalhe_livre, '')), '') is not null
  ) as com_detalhe_livre
from public.vw_ocorrencias_psi_detalhado;

comment on view public.vw_ocorrencias_psi_resumo_geral is
'KPI geral do dashboard psiquiatrico.';

-- =========================================================
-- 3. MOTIVOS INICIAIS
-- =========================================================

create or replace view public.vw_ocorrencias_psi_motivos_iniciais as
select
  coalesce(motivo_inicial_subtipo, 'NÃO INFORMADO') as motivo_inicial,
  count(*) as total
from public.vw_ocorrencias_psi_detalhado
where classificacao_id is not null
group by 1
order by total desc, motivo_inicial asc;

comment on view public.vw_ocorrencias_psi_motivos_iniciais is
'Distribuicao dos motivos iniciais.';

-- =========================================================
-- 4. MOTIVOS CONSTATADOS
-- =========================================================

create or replace view public.vw_ocorrencias_psi_motivos_constatados as
select
  coalesce(motivo_constatado_subtipo, 'NÃO INFORMADO') as motivo_constatado,
  count(*) as total
from public.vw_ocorrencias_psi_detalhado
where classificacao_id is not null
group by 1
order by total desc, motivo_constatado asc;

comment on view public.vw_ocorrencias_psi_motivos_constatados is
'Distribuicao dos motivos constatados.';

-- =========================================================
-- 5. TRANSICOES INICIAL X CONSTATADO
-- =========================================================

create or replace view public.vw_ocorrencias_psi_transicoes as
select
  coalesce(motivo_inicial_subtipo, 'NÃO INFORMADO') as motivo_inicial,
  coalesce(motivo_constatado_subtipo, 'NÃO INFORMADO') as motivo_constatado,
  count(*) as total
from public.vw_ocorrencias_psi_detalhado
where classificacao_id is not null
group by 1, 2
order by total desc, motivo_inicial asc, motivo_constatado asc;

comment on view public.vw_ocorrencias_psi_transicoes is
'Matriz de transicao entre classificacao inicial e constatada.';

-- =========================================================
-- 6. METODOS DE TENTATIVA DE SUICIDIO
-- =========================================================

create or replace view public.vw_ocorrencias_psi_metodos_tentativa as
select
  coalesce(nullif(trim(coalesce(metodo, '')), ''), 'NÃO INFORMADO') as metodo,
  count(*) as total
from public.vw_ocorrencias_psi_detalhado
where classificacao_id is not null
  and motivo_constatado_subtipo = 'TENTATIVA DE SUICÍDIO'
group by 1
order by total desc, metodo asc;

comment on view public.vw_ocorrencias_psi_metodos_tentativa is
'Distribuicao de metodo nos casos de tentativa de suicidio.';

-- =========================================================
-- 7. ZONA X MOTIVO CONSTATADO
-- =========================================================

create or replace view public.vw_ocorrencias_psi_zona_motivo as
select
  coalesce(zona, 'INDEFINIDO') as zona,
  coalesce(motivo_constatado_subtipo, 'NÃO INFORMADO') as motivo_constatado,
  count(*) as total
from public.vw_ocorrencias_psi_detalhado
where classificacao_id is not null
group by 1, 2
order by zona asc, total desc, motivo_constatado asc;

comment on view public.vw_ocorrencias_psi_zona_motivo is
'Distribuicao territorial por zona e motivo constatado.';

-- =========================================================
-- 8. PERMISSOES PARA FRONTEND
-- ajustar se for mudar o modelo de seguranca depois
-- =========================================================

grant select on public.vw_ocorrencias_psi_detalhado to authenticated;
grant select on public.vw_ocorrencias_psi_resumo_geral to authenticated;
grant select on public.vw_ocorrencias_psi_motivos_iniciais to authenticated;
grant select on public.vw_ocorrencias_psi_motivos_constatados to authenticated;
grant select on public.vw_ocorrencias_psi_transicoes to authenticated;
grant select on public.vw_ocorrencias_psi_metodos_tentativa to authenticated;
grant select on public.vw_ocorrencias_psi_zona_motivo to authenticated;

-- =========================================================
-- 9. CHECKS RAPIDOS
-- =========================================================

-- select * from public.vw_ocorrencias_psi_detalhado limit 20;
-- select * from public.vw_ocorrencias_psi_resumo_geral;
-- select * from public.vw_ocorrencias_psi_motivos_iniciais;
-- select * from public.vw_ocorrencias_psi_motivos_constatados;
-- select * from public.vw_ocorrencias_psi_transicoes;
-- select * from public.vw_ocorrencias_psi_metodos_tentativa;
-- select * from public.vw_ocorrencias_psi_zona_motivo;
