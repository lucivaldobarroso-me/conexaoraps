-- =========================================================
-- CONEXAO RAPS
-- INDICADORES DO ESTUDO
-- uso recomendado: executar no SQL Editor do Supabase
-- =========================================================

create table if not exists public.indicadores_estudo_atendimento (
  id uuid primary key default gen_random_uuid(),
  atendimento_id uuid not null references public.atendimentos_raps(id) on delete cascade,
  uso_alcool text,
  uso_drogas text,
  presenca_familiar text,
  situacao_familiar text,
  nivel_consciencia text,
  risco_agressao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (atendimento_id)
);

create index if not exists idx_indicadores_estudo_atendimento
  on public.indicadores_estudo_atendimento (atendimento_id);

alter table public.indicadores_estudo_atendimento
  add column if not exists situacao_familiar text;

grant select, insert, update on public.indicadores_estudo_atendimento to authenticated;

alter table public.indicadores_estudo_atendimento enable row level security;

drop policy if exists "indicadores_estudo_select_public" on public.indicadores_estudo_atendimento;
create policy "indicadores_estudo_select_public"
on public.indicadores_estudo_atendimento
for select
to authenticated
using (true);

drop policy if exists "indicadores_estudo_insert_public" on public.indicadores_estudo_atendimento;
create policy "indicadores_estudo_insert_public"
on public.indicadores_estudo_atendimento
for insert
to authenticated
with check (true);

drop policy if exists "indicadores_estudo_update_public" on public.indicadores_estudo_atendimento;
create policy "indicadores_estudo_update_public"
on public.indicadores_estudo_atendimento
for update
to authenticated
using (true)
with check (true);

drop view if exists public.vw_indicadores_estudo_base;

create or replace view public.vw_indicadores_estudo_base as
select
  a.id as atendimento_id,
  a.id_externo,
  a.nome,
  a.nascimento,
  a.sexo,
  a.idade,
  coalesce(b.nome, a.bairro_nome_legado) as bairro,
  coalesce(z.nome, a.zona_nome_legado) as zona,
  a.reincidente,
  a.medicacao,
  a.apoio_fam,
  a.apoio_raps,
  dp.data_atendimento,
  dp.encaminhado,
  dp.contencao_fisica,
  dp.contencao_quimica,
  dp.medicacao_contencao_quimica,
  case
    when dp.medicacao_contencao_quimica is null or trim(dp.medicacao_contencao_quimica) = '' then 'NAO INFORMADO'
    when upper(dp.medicacao_contencao_quimica) like '%DIAZEP%'
      or upper(dp.medicacao_contencao_quimica) like '%MIDAZOLAM%' then 'BENZODIAZEPINICO'
    when upper(dp.medicacao_contencao_quimica) like '%HALOPERIDOL%' then 'ANTIPSICOTICO'
    when upper(dp.medicacao_contencao_quimica) like '%KETAMINA%'
      or upper(dp.medicacao_contencao_quimica) like '%ETOMIDATO%'
      or upper(dp.medicacao_contencao_quimica) like '%LIDOCAINA%' then 'ANESTESICO'
    when upper(dp.medicacao_contencao_quimica) like '%FENTANIL%'
      or upper(dp.medicacao_contencao_quimica) like '%MORFINA%' then 'OPIOIDE'
    when upper(dp.medicacao_contencao_quimica) like '%FENITOINA%'
      or upper(dp.medicacao_contencao_quimica) like '%FENOBARBITAL%' then 'ANTICONVULSIVANTE'
    when upper(dp.medicacao_contencao_quimica) like '%SUCCINILCOLINA%' then 'BLOQUEADOR NEUROMUSCULAR'
    when upper(dp.medicacao_contencao_quimica) like '%FLUMAZENIL%'
      or upper(dp.medicacao_contencao_quimica) like '%NALOXONE%' then 'ANTIDOTO'
    else 'OUTRO'
  end as classe_farmaco_contencao,
  case
    when upper(coalesce(dp.medicacao_contencao_quimica, '')) like '%DIAZEP%'
      or upper(coalesce(dp.medicacao_contencao_quimica, '')) like '%MIDAZOLAM%' then 1
    else 0
  end as tem_benzodiazepinico,
  case
    when upper(coalesce(dp.medicacao_contencao_quimica, '')) like '%HALOPERIDOL%' then 1
    else 0
  end as tem_antipsicotico,
  dp.sinais_vitais,
  dp.vtr,
  dp.j9_inicio,
  dp.j10_inicio,
  sc.nome as motivo_constatado,
  ie.uso_alcool,
  ie.uso_drogas,
  ie.presenca_familiar,
  ie.situacao_familiar,
  ie.nivel_consciencia,
  ie.risco_agressao,
  case when dp.contencao_fisica = 'SIM' then 1 else 0 end as contencao_fisica_bin,
  case when dp.contencao_quimica = 'SIM' then 1 else 0 end as contencao_quimica_bin,
  case
    when dp.contencao_fisica = 'SIM' and dp.contencao_quimica = 'SIM' then 3
    when dp.contencao_fisica = 'SIM' then 1
    when dp.contencao_quimica = 'SIM' then 2
    else 0
  end as tipo_contencao_codigo,
  case
    when dp.contencao_fisica = 'SIM' and dp.contencao_quimica = 'SIM' then 'AMBAS'
    when dp.contencao_fisica = 'SIM' then 'FISICA'
    when dp.contencao_quimica = 'SIM' then 'QUIMICA'
    else 'NENHUMA'
  end as tipo_contencao,
  case when ie.uso_alcool = 'SIM' then 1 else 0 end as uso_alcool_bin,
  case when ie.uso_drogas = 'SIM' then 1 else 0 end as uso_drogas_bin,
  case when ie.presenca_familiar = 'SIM' then 1 else 0 end as familiar_presente_bin,
  case when ie.risco_agressao = 'SIM' then 1 else 0 end as risco_agressao_bin,
  case
    when ie.risco_agressao = 'SIM'
      or ie.nivel_consciencia = 'INCONSCIENTE'
      or dp.sinais_vitais = 'COM ALTERACAO'
      or sc.nome in (
        'TENTATIVA DE SUICÍDIO',
        'TENTATIVA DE SUICIDIO',
        'IDEAÇÃO SUICIDA',
        'IDEACAO SUICIDA',
        'SURTO PSICÓTICO',
        'SURTO PSICOTICO',
        'AGITAÇÃO PSICOMOTORA',
        'AGITACAO PSICOMOTORA'
      )
    then 3
    when ie.nivel_consciencia = 'CONFUSO'
      or dp.contencao_fisica = 'SIM'
      or dp.contencao_quimica = 'SIM'
      or ie.uso_alcool = 'SIM'
      or ie.uso_drogas = 'SIM'
    then 2
    else 1
  end as gravidade_clinica_codigo,
  case
    when ie.risco_agressao = 'SIM'
      or ie.nivel_consciencia = 'INCONSCIENTE'
      or dp.sinais_vitais = 'COM ALTERACAO'
      or sc.nome in (
        'TENTATIVA DE SUICÍDIO',
        'TENTATIVA DE SUICIDIO',
        'IDEAÇÃO SUICIDA',
        'IDEACAO SUICIDA',
        'SURTO PSICÓTICO',
        'SURTO PSICOTICO',
        'AGITAÇÃO PSICOMOTORA',
        'AGITACAO PSICOMOTORA'
      )
    then 'GRAVE'
    when ie.nivel_consciencia = 'CONFUSO'
      or dp.contencao_fisica = 'SIM'
      or dp.contencao_quimica = 'SIM'
      or ie.uso_alcool = 'SIM'
      or ie.uso_drogas = 'SIM'
    then 'MODERADA'
    else 'LEVE'
  end as gravidade_clinica,
  (
    case when ie.uso_alcool = 'SIM' then 1 else 0 end +
    case when ie.uso_drogas = 'SIM' then 1 else 0 end +
    case
      when upper(coalesce(ie.presenca_familiar, '')) in ('NAO', 'NÃO')
        or upper(coalesce(ie.situacao_familiar, '')) in ('NAO PRESENTE', 'PRESENTE NAO COLABORATIVO') then 1
      else 0
    end +
    case when upper(coalesce(a.apoio_raps, '')) in ('NAO', 'NÃO') then 1 else 0 end +
    case when upper(coalesce(a.medicacao, '')) in ('NAO', 'NÃO') then 1 else 0 end
  ) as fatores_vulnerabilidade,
  (
    case when upper(coalesce(ie.uso_alcool, '')) in ('SIM', 'NAO', 'NÃO') then 1 else 0 end +
    case when upper(coalesce(ie.uso_drogas, '')) in ('SIM', 'NAO', 'NÃO') then 1 else 0 end +
    case
      when upper(coalesce(ie.presenca_familiar, '')) in ('SIM', 'NAO', 'NÃO')
        or upper(coalesce(ie.situacao_familiar, '')) in ('PRESENTE COLABORATIVO', 'PRESENTE NAO COLABORATIVO', 'NÃO PRESENTE', 'NAO PRESENTE')
        or upper(coalesce(a.apoio_fam, '')) in ('SIM', 'NAO', 'NÃO') then 1
      else 0
    end +
    case when upper(coalesce(a.apoio_raps, '')) in ('SIM', 'NAO', 'NÃO') then 1 else 0 end +
    case when upper(coalesce(a.medicacao, '')) in ('SIM', 'NAO', 'NÃO') then 1 else 0 end
  ) as informacoes_vulnerabilidade,
  case
    when (
      case when upper(coalesce(ie.uso_alcool, '')) in ('SIM', 'NAO', 'NÃO') then 1 else 0 end +
      case when upper(coalesce(ie.uso_drogas, '')) in ('SIM', 'NAO', 'NÃO') then 1 else 0 end +
      case
        when upper(coalesce(ie.presenca_familiar, '')) in ('SIM', 'NAO', 'NÃO')
          or upper(coalesce(ie.situacao_familiar, '')) in ('PRESENTE COLABORATIVO', 'PRESENTE NAO COLABORATIVO', 'NÃO PRESENTE', 'NAO PRESENTE')
          or upper(coalesce(a.apoio_fam, '')) in ('SIM', 'NAO', 'NÃO') then 1
        else 0
      end +
      case when upper(coalesce(a.apoio_raps, '')) in ('SIM', 'NAO', 'NÃO') then 1 else 0 end +
      case when upper(coalesce(a.medicacao, '')) in ('SIM', 'NAO', 'NÃO') then 1 else 0 end
    ) >= 4 then 'COMPLETA'
    when (
      case when upper(coalesce(ie.uso_alcool, '')) in ('SIM', 'NAO', 'NÃO') then 1 else 0 end +
      case when upper(coalesce(ie.uso_drogas, '')) in ('SIM', 'NAO', 'NÃO') then 1 else 0 end +
      case
        when upper(coalesce(ie.presenca_familiar, '')) in ('SIM', 'NAO', 'NÃO')
          or upper(coalesce(ie.situacao_familiar, '')) in ('PRESENTE COLABORATIVO', 'PRESENTE NAO COLABORATIVO', 'NÃO PRESENTE', 'NAO PRESENTE')
          or upper(coalesce(a.apoio_fam, '')) in ('SIM', 'NAO', 'NÃO') then 1
        else 0
      end +
      case when upper(coalesce(a.apoio_raps, '')) in ('SIM', 'NAO', 'NÃO') then 1 else 0 end +
      case when upper(coalesce(a.medicacao, '')) in ('SIM', 'NAO', 'NÃO') then 1 else 0 end
    ) >= 2 then 'PARCIAL'
    else 'INSUFICIENTE'
  end as qualidade_vulnerabilidade,
  case
    when (
      case when ie.uso_alcool = 'SIM' then 1 else 0 end +
      case when ie.uso_drogas = 'SIM' then 1 else 0 end +
      case
        when upper(coalesce(ie.presenca_familiar, '')) in ('NAO', 'NÃO')
          or upper(coalesce(ie.situacao_familiar, '')) in ('NAO PRESENTE', 'PRESENTE NAO COLABORATIVO') then 1
        else 0
      end +
      case when upper(coalesce(a.apoio_raps, '')) in ('NAO', 'NÃO') then 1 else 0 end +
      case when upper(coalesce(a.medicacao, '')) in ('NAO', 'NÃO') then 1 else 0 end
    ) >= 2 then 2
    when (
      case when ie.uso_alcool = 'SIM' then 1 else 0 end +
      case when ie.uso_drogas = 'SIM' then 1 else 0 end +
      case
        when upper(coalesce(ie.presenca_familiar, '')) in ('NAO', 'NÃO')
          or upper(coalesce(ie.situacao_familiar, '')) in ('NAO PRESENTE', 'PRESENTE NAO COLABORATIVO') then 1
        else 0
      end +
      case when upper(coalesce(a.apoio_raps, '')) in ('NAO', 'NÃO') then 1 else 0 end +
      case when upper(coalesce(a.medicacao, '')) in ('NAO', 'NÃO') then 1 else 0 end
    ) = 1 then 1
    when (
      case when upper(coalesce(ie.uso_alcool, '')) in ('SIM', 'NAO', 'NÃO') then 1 else 0 end +
      case when upper(coalesce(ie.uso_drogas, '')) in ('SIM', 'NAO', 'NÃO') then 1 else 0 end +
      case
        when upper(coalesce(ie.presenca_familiar, '')) in ('SIM', 'NAO', 'NÃO')
          or upper(coalesce(ie.situacao_familiar, '')) in ('PRESENTE COLABORATIVO', 'PRESENTE NAO COLABORATIVO', 'NÃO PRESENTE', 'NAO PRESENTE')
          or upper(coalesce(a.apoio_fam, '')) in ('SIM', 'NAO', 'NÃO') then 1
        else 0
      end +
      case when upper(coalesce(a.apoio_raps, '')) in ('SIM', 'NAO', 'NÃO') then 1 else 0 end +
      case when upper(coalesce(a.medicacao, '')) in ('SIM', 'NAO', 'NÃO') then 1 else 0 end
    ) < 2 then null
    else 0
  end as vulnerabilidade_composta_codigo,
  case
    when (
      case when ie.uso_alcool = 'SIM' then 1 else 0 end +
      case when ie.uso_drogas = 'SIM' then 1 else 0 end +
      case
        when upper(coalesce(ie.presenca_familiar, '')) in ('NAO', 'NÃO')
          or upper(coalesce(ie.situacao_familiar, '')) in ('NAO PRESENTE', 'PRESENTE NAO COLABORATIVO') then 1
        else 0
      end +
      case when upper(coalesce(a.apoio_raps, '')) in ('NAO', 'NÃO') then 1 else 0 end +
      case when upper(coalesce(a.medicacao, '')) in ('NAO', 'NÃO') then 1 else 0 end
    ) >= 2 then 'ALTA'
    when (
      case when ie.uso_alcool = 'SIM' then 1 else 0 end +
      case when ie.uso_drogas = 'SIM' then 1 else 0 end +
      case
        when upper(coalesce(ie.presenca_familiar, '')) in ('NAO', 'NÃO')
          or upper(coalesce(ie.situacao_familiar, '')) in ('NAO PRESENTE', 'PRESENTE NAO COLABORATIVO') then 1
        else 0
      end +
      case when upper(coalesce(a.apoio_raps, '')) in ('NAO', 'NÃO') then 1 else 0 end +
      case when upper(coalesce(a.medicacao, '')) in ('NAO', 'NÃO') then 1 else 0 end
    ) = 1 then 'MODERADA'
    when (
      case when upper(coalesce(ie.uso_alcool, '')) in ('SIM', 'NAO', 'NÃO') then 1 else 0 end +
      case when upper(coalesce(ie.uso_drogas, '')) in ('SIM', 'NAO', 'NÃO') then 1 else 0 end +
      case
        when upper(coalesce(ie.presenca_familiar, '')) in ('SIM', 'NAO', 'NÃO')
          or upper(coalesce(ie.situacao_familiar, '')) in ('PRESENTE COLABORATIVO', 'PRESENTE NAO COLABORATIVO', 'NÃO PRESENTE', 'NAO PRESENTE')
          or upper(coalesce(a.apoio_fam, '')) in ('SIM', 'NAO', 'NÃO') then 1
        else 0
      end +
      case when upper(coalesce(a.apoio_raps, '')) in ('SIM', 'NAO', 'NÃO') then 1 else 0 end +
      case when upper(coalesce(a.medicacao, '')) in ('SIM', 'NAO', 'NÃO') then 1 else 0 end
    ) < 2 then 'NAO CLASSIFICAVEL'
    else 'BAIXA'
  end as vulnerabilidade_composta,
  case
    when coalesce(dp.j9_inicio, dp.j10_inicio) is null then 'NAO INFORMADO'
    when extract(hour from coalesce(dp.j9_inicio, dp.j10_inicio)) between 6 and 17 then 'DIA'
    else 'NOITE'
  end as turno,
  count(*) over (partition by upper(trim(a.nome))) as numero_atendimentos_paciente,
  case when count(*) over (partition by upper(trim(a.nome))) >= 2 then 1 else 0 end as reincidencia_bin,
  case when count(*) over (partition by upper(trim(a.nome))) >= 3 then 1 else 0 end as porta_giratoria_bin
from public.atendimentos_raps a
left join public.bairros b on b.id = a.bairro_id
left join public.zonas z on z.id = a.zona_id
left join public.dados_profissionais_atendimento dp on dp.atendimento_id = a.id
left join public.classificacao_ocorrencia_atendimento c on c.atendimento_id = a.id
left join public.subtipos_ocorrencia sc on sc.id = c.motivo_constatado_subtipo_id
left join public.indicadores_estudo_atendimento ie on ie.atendimento_id = a.id
where a.inativado_em is null;

grant select on public.vw_indicadores_estudo_base to authenticated;
