-- =========================================================
-- CONECTA RAPS
-- PROPOSTA DE MODELAGEM SUPABASE
-- legado Sheets + nova classificacao psiquiatrica
-- =========================================================

create extension if not exists "uuid-ossp";

-- =========================================================
-- 1. USUARIOS
-- =========================================================

create table if not exists public.usuarios (
  id uuid primary key default uuid_generate_v4(),
  id_externo text unique,
  usuario text not null unique,
  senha_hash text null,
  senha_legado text null,
  confirmacao_senha_legado text null,
  nome_completo text not null,
  cpf text null,
  matricula text null,
  funcao text null,
  status text null,
  justificativa text null,
  modulo text null,
  origem_dado text not null default 'sheets',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_usuarios_cpf on public.usuarios(cpf);
create index if not exists idx_usuarios_matricula on public.usuarios(matricula);
create index if not exists idx_usuarios_nome on public.usuarios(nome_completo);

-- =========================================================
-- 2. ZONAS E BAIRROS
-- =========================================================

create table if not exists public.zonas (
  id uuid primary key default uuid_generate_v4(),
  nome text not null unique,
  ordem int not null default 0,
  ativo boolean not null default true,
  origem_dado text not null default 'sheets',
  criado_em timestamptz not null default now()
);

create table if not exists public.bairros (
  id uuid primary key default uuid_generate_v4(),
  zona_id uuid not null references public.zonas(id) on delete restrict,
  nome text not null,
  nome_normalizado text not null,
  ativo boolean not null default true,
  origem_dado text not null default 'sheets',
  criado_em timestamptz not null default now(),
  unique (zona_id, nome)
);

create index if not exists idx_bairros_zona on public.bairros(zona_id);
create index if not exists idx_bairros_normalizado on public.bairros(nome_normalizado);

-- =========================================================
-- 3. ATENDIMENTOS RAPS
-- espelha o legado sem quebrar dashboard/mapa
-- =========================================================

create table if not exists public.atendimentos_raps (
  id uuid primary key default uuid_generate_v4(),
  id_externo text not null unique,
  nome text not null,
  nascimento date null,
  sexo text null,
  idade int null,
  endereco text null,
  numero text null,
  bairro_id uuid null references public.bairros(id) on delete set null,
  bairro_nome_legado text null,
  zona_id uuid null references public.zonas(id) on delete set null,
  zona_nome_legado text null,
  localizacao_raw text null,
  latitude numeric(10,7) null,
  longitude numeric(10,7) null,
  referencia text null,
  diagnosticado text null,
  reincidente text null,
  medicacao text null,
  pq_med text null,
  apoio_fam text null,
  pq_fam text null,
  apoio_raps text null,
  info_extra text null,
  entrada_legado text null,
  responsavel_nome text null,
  raca text null,
  nacionalidade text null,
  usuario_id uuid null references public.usuarios(id) on delete set null,
  origem_dado text not null default 'sheets',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_atendimentos_nome on public.atendimentos_raps(nome);
create index if not exists idx_atendimentos_bairro_nome on public.atendimentos_raps(bairro_nome_legado);
create index if not exists idx_atendimentos_zona_nome on public.atendimentos_raps(zona_nome_legado);
create index if not exists idx_atendimentos_criado_em on public.atendimentos_raps(criado_em desc);
create index if not exists idx_atendimentos_reincidente on public.atendimentos_raps(reincidente);
create index if not exists idx_atendimentos_apoio_raps on public.atendimentos_raps(apoio_raps);
create index if not exists idx_atendimentos_lat_lng on public.atendimentos_raps(latitude, longitude);

-- =========================================================
-- 4. TIPOS / SUBTIPOS / CAMPOS EXTRAS DE OCORRENCIA
-- estrutura nova para classificacao psiquiatrica
-- =========================================================

create table if not exists public.tipos_ocorrencia (
  id uuid primary key default uuid_generate_v4(),
  nome text not null unique,
  ordem int not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.subtipos_ocorrencia (
  id uuid primary key default uuid_generate_v4(),
  tipo_id uuid not null references public.tipos_ocorrencia(id) on delete restrict,
  nome text not null,
  ordem int not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (tipo_id, nome)
);

create index if not exists idx_subtipos_ocorrencia_tipo on public.subtipos_ocorrencia(tipo_id);

create table if not exists public.campos_extras_ocorrencia (
  id uuid primary key default uuid_generate_v4(),
  subtipo_id uuid not null references public.subtipos_ocorrencia(id) on delete cascade,
  chave text not null,
  rotulo text not null,
  tipo_dado text not null check (tipo_dado in ('text','number','boolean','select','multiselect')),
  obrigatorio boolean not null default false,
  opcoes jsonb null,
  ajuda text null,
  ordem int not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (subtipo_id, chave)
);

create index if not exists idx_campos_extras_ocorrencia_subtipo on public.campos_extras_ocorrencia(subtipo_id);

-- =========================================================
-- 5. CLASSIFICACAO DE OCORRENCIA POR ATENDIMENTO
-- nova secao do formulario:
-- motivo inicial + motivo constatado + detalhe livre
-- =========================================================

create table if not exists public.classificacao_ocorrencia_atendimento (
  id uuid primary key default uuid_generate_v4(),
  atendimento_id uuid not null references public.atendimentos_raps(id) on delete cascade,

  motivo_inicial_tipo_id uuid null references public.tipos_ocorrencia(id) on delete restrict,
  motivo_inicial_subtipo_id uuid null references public.subtipos_ocorrencia(id) on delete restrict,
  motivo_inicial_extras jsonb not null default '{}'::jsonb,

  motivo_constatado_tipo_id uuid null references public.tipos_ocorrencia(id) on delete restrict,
  motivo_constatado_subtipo_id uuid null references public.subtipos_ocorrencia(id) on delete restrict,
  motivo_constatado_extras jsonb not null default '{}'::jsonb,

  detalhe_livre text null,
  origem_dado text not null default 'supabase',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  unique (atendimento_id)
);

create index if not exists idx_classificacao_atendimento on public.classificacao_ocorrencia_atendimento(atendimento_id);
create index if not exists idx_classificacao_motivo_inicial_subtipo on public.classificacao_ocorrencia_atendimento(motivo_inicial_subtipo_id);
create index if not exists idx_classificacao_motivo_constatado_subtipo on public.classificacao_ocorrencia_atendimento(motivo_constatado_subtipo_id);

-- =========================================================
-- 6. CARGA INICIAL DE ZONAS
-- =========================================================

insert into public.zonas (nome, ordem) values
  ('CENTRO', 1),
  ('ZONA NORTE', 2),
  ('ZONA SUL', 3),
  ('ZONA LESTE', 4),
  ('ZONA OESTE', 5)
on conflict (nome) do nothing;

-- =========================================================
-- 7. CARGA INICIAL DE BAIRROS
-- baseado nas capturas da aba BAIRROS
-- =========================================================

insert into public.bairros (zona_id, nome, nome_normalizado)
select z.id, v.nome, v.nome_normalizado
from public.zonas z
join (
  values
    ('CENTRO', 'Centro', 'CENTRO'),

    ('ZONA NORTE', '31 de Março', '31 DE MARCO'),
    ('ZONA NORTE', 'Aeroporto', 'AEROPORTO'),
    ('ZONA NORTE', 'Aparecida', 'APARECIDA'),
    ('ZONA NORTE', 'Estados', 'ESTADOS'),
    ('ZONA NORTE', 'Paraviana', 'PARAVIANA'),
    ('ZONA NORTE', 'São Francisco', 'SAO FRANCISCO'),

    ('ZONA SUL', '13 de Setembro', '13 DE SETEMBRO'),
    ('ZONA SUL', 'Calungá', 'CALUNGA'),
    ('ZONA SUL', 'Governador Aquilino Mota Duarte', 'GOVERNADOR AQUILINO MOTA DUARTE'),
    ('ZONA SUL', 'Marechal Rondon', 'MARECHAL RONDON'),
    ('ZONA SUL', 'São Vicente', 'SAO VICENTE'),

    ('ZONA LESTE', 'Caçari', 'CACARI'),
    ('ZONA LESTE', 'Canarinho', 'CANARINHO'),
    ('ZONA LESTE', 'São Pedro', 'SAO PEDRO'),
    ('ZONA LESTE', '05 de Outubro', '05 DE OUTUBRO'),

    ('ZONA OESTE', 'Asa Branca', 'ASA BRANCA'),
    ('ZONA OESTE', 'Alvorada', 'ALVORADA'),
    ('ZONA OESTE', 'Professora Araceli Souto Maior', 'PROFESSORA ARACELI SOUTO MAIOR'),
    ('ZONA OESTE', 'Bela Vista', 'BELA VISTA'),
    ('ZONA OESTE', 'Buritis', 'BURITIS'),
    ('ZONA OESTE', 'Caimbé', 'CAIMBE'),
    ('ZONA OESTE', 'Cambará', 'CAMBARA'),
    ('ZONA OESTE', 'Caranã', 'CARANA'),
    ('ZONA OESTE', 'Cauamé', 'CAUAME'),
    ('ZONA OESTE', 'Centenário', 'CENTENARIO'),
    ('ZONA OESTE', 'Cinturão Verde', 'CINTURAO VERDE'),
    ('ZONA OESTE', 'Jardim Equatorial', 'JARDIM EQUATORIAL'),
    ('ZONA OESTE', 'Senador Hélio Campos', 'SENADOR HELIO CAMPOS'),
    ('ZONA OESTE', 'Jardim Caranã', 'JARDIM CARANA'),
    ('ZONA OESTE', 'Jardim Primavera', 'JARDIM PRIMAVERA'),
    ('ZONA OESTE', 'Jardim Floresta', 'JARDIM FLORESTA'),
    ('ZONA OESTE', 'Jardim Tropical', 'JARDIM TROPICAL'),
    ('ZONA OESTE', 'Jóquei Clube', 'JOQUEI CLUBE'),
    ('ZONA OESTE', 'Liberdade', 'LIBERDADE'),
    ('ZONA OESTE', 'Mecejana', 'MECEJANA'),
    ('ZONA OESTE', 'Nova Canaã', 'NOVA CANAA'),
    ('ZONA OESTE', 'Nova Cidade', 'NOVA CIDADE'),
    ('ZONA OESTE', 'Operário', 'OPERARIO'),
    ('ZONA OESTE', 'Pintolândia', 'PINTOLANDIA'),
    ('ZONA OESTE', 'Piscicultura', 'PISCICULTURA'),
    ('ZONA OESTE', 'Pricumã', 'PRICUMA'),
    ('ZONA OESTE', 'Raiar do Sol', 'RAIAR DO SOL'),
    ('ZONA OESTE', 'Doutor Silvio Botelho', 'DOUTOR SILVIO BOTELHO'),
    ('ZONA OESTE', 'Doutor Silvio Leite', 'DOUTOR SILVIO LEITE'),
    ('ZONA OESTE', 'Santa Luzia', 'SANTA LUZIA')
) as v(zona_nome, nome, nome_normalizado) on z.nome = v.zona_nome
on conflict (zona_id, nome) do nothing;

-- =========================================================
-- 8. CARGA INICIAL DA CLASSIFICACAO PSIQUIATRICA
-- =========================================================

insert into public.tipos_ocorrencia (nome, ordem)
values ('PSIQUIÁTRICO', 1)
on conflict (nome) do nothing;

insert into public.subtipos_ocorrencia (tipo_id, nome, ordem)
select t.id, v.nome, v.ordem
from public.tipos_ocorrencia t
join (
  values
    ('SURTO PSICÓTICO', 1),
    ('AGITAÇÃO PSICOMOTORA', 2),
    ('CRISE DE ANSIEDADE', 3),
    ('TENTATIVA DE SUICÍDIO', 4),
    ('IDEAÇÃO SUICIDA', 5),
    ('ALTERAÇÃO COMPORTAMENTAL / CRISE EMOCIONAL', 6),
    ('DEPENDÊNCIA QUÍMICA / USO DE SUBSTÂNCIAS', 7),
    ('ABSTINÊNCIA', 8),
    ('OUTROS PSIQUIÁTRICOS', 99)
) as v(nome, ordem) on true
where t.nome = 'PSIQUIÁTRICO'
on conflict (tipo_id, nome) do nothing;

insert into public.campos_extras_ocorrencia
  (subtipo_id, chave, rotulo, tipo_dado, obrigatorio, opcoes, ajuda, ordem)
select
  s.id,
  'metodo',
  'Método',
  'select',
  true,
  '["MEDICAMENTOSA","ENFORCAMENTO","ARMA BRANCA","ARMA DE FOGO","PRECIPITAÇÃO (ALTURA)","INTOXICAÇÃO","OUTRO","NÃO INFORMADO"]'::jsonb,
  'Informar o método principal relatado ou identificado na ocorrência.',
  1
from public.subtipos_ocorrencia s
join public.tipos_ocorrencia t on t.id = s.tipo_id
where t.nome = 'PSIQUIÁTRICO'
  and s.nome = 'TENTATIVA DE SUICÍDIO'
on conflict (subtipo_id, chave) do nothing;

-- =========================================================
-- 9. VIEW DE COMPATIBILIDADE LEGADA PARA DASHBOARD
-- opcional, mas recomendada para facilitar migracao gradual
-- =========================================================

create or replace view public.vw_atendimentos_dashboard_legado as
select
  a.id,
  a.id_externo,
  a.nome,
  a.nascimento,
  a.sexo,
  a.idade,
  a.endereco,
  a.numero,
  coalesce(b.nome, a.bairro_nome_legado) as bairro,
  coalesce(z.nome, a.zona_nome_legado) as zona,
  a.localizacao_raw as localizacao,
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
  a.nacionalidade
from public.atendimentos_raps a
left join public.bairros b on b.id = a.bairro_id
left join public.zonas z on z.id = a.zona_id;

-- =========================================================
-- 10. OBSERVACOES DE MIGRACAO
-- =========================================================

-- 1. A tabela atendimentos_raps preserva os campos legados necessarios
--    para nao quebrar dashboard, mapa e relatorio automatico.
--
-- 2. A tabela classificacao_ocorrencia_atendimento recebe a nova secao
--    do formulario: motivo inicial, motivo constatado e detalhe livre.
--
-- 3. A melhor estrategia inicial e:
--    - manter leitura principal em Sheets
--    - gravar em Sheets + Supabase
--    - validar equivalencia
--    - depois migrar leitura para Supabase
