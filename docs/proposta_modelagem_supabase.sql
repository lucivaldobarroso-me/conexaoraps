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
  auth_user_id uuid unique null,
  email_auth text unique null,
  matricula text null,
  funcao text null,
  status text null,
  status_aprovacao text not null default 'pendente',
  justificativa text null,
  modulo text null,
  origem_dado text not null default 'sheets',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_usuarios_cpf on public.usuarios(cpf);
create index if not exists idx_usuarios_auth_user_id on public.usuarios(auth_user_id);
create index if not exists idx_usuarios_email_auth on public.usuarios(email_auth);
create index if not exists idx_usuarios_status_aprovacao on public.usuarios(status_aprovacao);
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
  inativado_em timestamptz null,
  inativado_por uuid null,
  motivo_inativacao text null,
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
create index if not exists idx_atendimentos_inativado_em on public.atendimentos_raps(inativado_em);

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
left join public.zonas z on z.id = a.zona_id
where a.inativado_em is null;

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

-- =========================================================
-- 11. COMPLEMENTO DE DADOS PROFISSIONAIS E OPERACIONAIS
-- =========================================================

create table if not exists public.catalogo_dados_profissionais (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('encaminhado', 'medicacao_contencao_quimica', 'vtr', 'medico_regulador', 'enfermeiro', 'medico', 'tecnico_enfermagem')),
  valor text not null,
  valor_normalizado text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (tipo, valor_normalizado)
);

create index if not exists idx_catalogo_dados_profissionais_tipo
  on public.catalogo_dados_profissionais (tipo, ativo, valor);

create table if not exists public.dados_profissionais_atendimento (
  id uuid primary key default gen_random_uuid(),
  atendimento_id uuid not null references public.atendimentos_raps(id) on delete cascade,
  data_atendimento date,
  numero_faph text,
  numero_ocorrencia text,
  encaminhado text,
  medicacao_uso text,
  medicacoes_uso text,
  contencao_quimica text,
  medicacao_contencao_quimica text,
  sinais_vitais text,
  sinais_vitais_descricao text,
  contencao_fisica text,
  descricao_contencao_fisica text,
  medico_regulador text,
  enfermeiro text,
  medico text,
  tecnico_enfermagem text,
  vtr text,
  j9_inicio time,
  j10_inicio time,
  j9_fim time,
  j10_fim time,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (atendimento_id)
);

insert into public.catalogo_dados_profissionais (tipo, valor, valor_normalizado)
values
  ('encaminhado', 'HGR - PRONTO ATENDIMENTO', 'HGR - PRONTO ATENDIMENTO'),
  ('encaminhado', 'HGR - TRAUMA', 'HGR - TRAUMA'),
  ('encaminhado', 'HCSA', 'HCSA'),
  ('encaminhado', 'PACS', 'PACS'),
  ('encaminhado', 'UNIMED', 'UNIMED'),
  ('encaminhado', 'ATENDIMENTO NO LOCAL', 'ATENDIMENTO NO LOCAL'),
  ('encaminhado', 'LIBERADO NO LOCAL', 'LIBERADO NO LOCAL'),
  ('encaminhado', 'OUTROS', 'OUTROS'),
  ('medicacao_contencao_quimica', 'DIAZEPAN 10MG/2ML', 'DIAZEPAN 10MG/2ML'),
  ('medicacao_contencao_quimica', 'MIDAZOLAM 5MG/ML', 'MIDAZOLAM 5MG/ML'),
  ('medicacao_contencao_quimica', 'ETOMIDATO 2MG/ML', 'ETOMIDATO 2MG/ML'),
  ('medicacao_contencao_quimica', 'FENITOINA 50MG/ML', 'FENITOINA 50MG/ML'),
  ('medicacao_contencao_quimica', 'FENOBARBITAL 100MG/ML', 'FENOBARBITAL 100MG/ML'),
  ('medicacao_contencao_quimica', 'FENTANIL 50MCG/ML', 'FENTANIL 50MCG/ML'),
  ('medicacao_contencao_quimica', 'HALOPERIDOL 5MG/ML', 'HALOPERIDOL 5MG/ML'),
  ('medicacao_contencao_quimica', 'KETAMINA 50MG/ML', 'KETAMINA 50MG/ML'),
  ('medicacao_contencao_quimica', 'MORFINA 10MG/ML', 'MORFINA 10MG/ML'),
  ('medicacao_contencao_quimica', 'SUCCINILCOLINA 100MG', 'SUCCINILCOLINA 100MG'),
  ('medicacao_contencao_quimica', 'FLUMAZENIL 0,1MG/ML', 'FLUMAZENIL 0,1MG/ML'),
  ('medicacao_contencao_quimica', 'NALOXONE 0,4MG/ML', 'NALOXONE 0,4MG/ML'),
  ('medicacao_contencao_quimica', 'LIDOCAINA 20%', 'LIDOCAINA 20%'),
  ('medicacao_contencao_quimica', 'OUTROS', 'OUTROS'),
  ('vtr', 'USA 01', 'USA 01'),
  ('vtr', 'USA 02', 'USA 02'),
  ('vtr', 'USB 01', 'USB 01'),
  ('vtr', 'USB 02', 'USB 02'),
  ('vtr', 'USB 03', 'USB 03'),
  ('vtr', 'USB 04', 'USB 04'),
  ('vtr', 'ALFA', 'ALFA'),
  ('vtr', 'OUTROS', 'OUTROS')
on conflict (tipo, valor_normalizado) do nothing;

insert into public.catalogo_dados_profissionais (tipo, valor, valor_normalizado)
values
  ('tecnico_enfermagem', 'AMILTON VIANA LOPES', 'AMILTON VIANA LOPES'),
  ('tecnico_enfermagem', 'ANA PATRICIA DA SILVA SOARES', 'ANA PATRICIA DA SILVA SOARES'),
  ('tecnico_enfermagem', 'ANTONIO OTON DIAS DA SILVA', 'ANTONIO OTON DIAS DA SILVA'),
  ('tecnico_enfermagem', 'ARLETE SILVA OLIVEIRA', 'ARLETE SILVA OLIVEIRA'),
  ('tecnico_enfermagem', 'BETANIA SAVIA MAGALHAES PEREIRA', 'BETANIA SAVIA MAGALHAES PEREIRA'),
  ('tecnico_enfermagem', 'DEYRMYSSON DA SILVA SANTOS', 'DEYRMYSSON DA SILVA SANTOS'),
  ('tecnico_enfermagem', 'DOUGLAS ALBERTO QUARESMA', 'DOUGLAS ALBERTO QUARESMA'),
  ('tecnico_enfermagem', 'DYONES CLEN AUGUSTO DE LIMA MELO', 'DYONES CLEN AUGUSTO DE LIMA MELO'),
  ('tecnico_enfermagem', 'ERONILDES FARIAS DE SOUZA', 'ERONILDES FARIAS DE SOUZA'),
  ('tecnico_enfermagem', 'FABIANA CARVALHO RAMOS', 'FABIANA CARVALHO RAMOS'),
  ('tecnico_enfermagem', 'FRANCISCA DO CANTO REIS', 'FRANCISCA DO CANTO REIS'),
  ('tecnico_enfermagem', 'HICARO YVES DA SILVA SANTOS', 'HICARO YVES DA SILVA SANTOS'),
  ('tecnico_enfermagem', 'JANETE TABOSA', 'JANETE TABOSA'),
  ('tecnico_enfermagem', 'JOSUE SILVA DE ARRUDA', 'JOSUE SILVA DE ARRUDA'),
  ('tecnico_enfermagem', 'JUCIE RIBEIRO COSTA', 'JUCIE RIBEIRO COSTA'),
  ('tecnico_enfermagem', 'KENNEDY PEREIRA DA SILVA', 'KENNEDY PEREIRA DA SILVA'),
  ('tecnico_enfermagem', 'MANOEL LUIZ DE SOUZA SANTOS', 'MANOEL LUIZ DE SOUZA SANTOS'),
  ('tecnico_enfermagem', 'MARIVALDA LOPES DO NASCIMENTO', 'MARIVALDA LOPES DO NASCIMENTO'),
  ('tecnico_enfermagem', 'ROBERDSON PEREIRA DE ALCANTARA', 'ROBERDSON PEREIRA DE ALCANTARA'),
  ('tecnico_enfermagem', 'SHIRLEY LIMA DA SILVA', 'SHIRLEY LIMA DA SILVA'),
  ('tecnico_enfermagem', 'TACIMAR DA SILVA PEREIRA', 'TACIMAR DA SILVA PEREIRA'),
  ('tecnico_enfermagem', 'OUTROS', 'OUTROS'),
  ('enfermeiro', 'DANIEL GUIMARAES DA SILVA', 'DANIEL GUIMARAES DA SILVA'),
  ('enfermeiro', 'EDSON SOARES PINTO', 'EDSON SOARES PINTO'),
  ('enfermeiro', 'GEISA CAMILA MOREIRA TAVARES DE MENEZES', 'GEISA CAMILA MOREIRA TAVARES DE MENEZES'),
  ('enfermeiro', 'GERLIVANE ALVES DE FREITAS SOUSA', 'GERLIVANE ALVES DE FREITAS SOUSA'),
  ('enfermeiro', 'LUCIANO JOSE COUTINHO', 'LUCIANO JOSE COUTINHO'),
  ('enfermeiro', 'LUCIVALDO OLIVEIRA BARROSO', 'LUCIVALDO OLIVEIRA BARROSO'),
  ('enfermeiro', 'MARIA DE LA PAZ PEREZ SAMPAIO', 'MARIA DE LA PAZ PEREZ SAMPAIO'),
  ('enfermeiro', 'MARINETE GOMES BARRETO', 'MARINETE GOMES BARRETO'),
  ('enfermeiro', 'SARA BRENDA DE SOUSA JESUS', 'SARA BRENDA DE SOUSA JESUS'),
  ('enfermeiro', 'SHEYLA BATISTA DOS SANTOS', 'SHEYLA BATISTA DOS SANTOS'),
  ('enfermeiro', 'GALTHAMA BRASIL', 'GALTHAMA BRASIL'),
  ('enfermeiro', 'OUTROS', 'OUTROS'),
  ('medico', 'ALEXANDRE FEITOSA DA SILVA', 'ALEXANDRE FEITOSA DA SILVA'),
  ('medico', 'CLAUDIA KLECYANNE RODRIGUES DE BRITO', 'CLAUDIA KLECYANNE RODRIGUES DE BRITO'),
  ('medico', 'DANNIEL SILVA DA ROCHA', 'DANNIEL SILVA DA ROCHA'),
  ('medico', 'FRANCISCO ELADIO CAVALCANTE', 'FRANCISCO ELADIO CAVALCANTE'),
  ('medico', 'JEFFERSON MARTINS DE LIMA', 'JEFFERSON MARTINS DE LIMA'),
  ('medico', 'LEIDIANA COSTA NOBLES', 'LEIDIANA COSTA NOBLES'),
  ('medico', 'MARCOS VINICIUS VERAS DA ROCHA', 'MARCOS VINICIUS VERAS DA ROCHA'),
  ('medico', 'ROGER MALACARNE CALEFFI', 'ROGER MALACARNE CALEFFI'),
  ('medico', 'VALTECY MENDES ALMEIDA DE ALBUQUERQUE', 'VALTECY MENDES ALMEIDA DE ALBUQUERQUE'),
  ('medico', 'CELSO EDUARDO COSTA NERY', 'CELSO EDUARDO COSTA NERY'),
  ('medico', 'FELIPE LEITE BARROS', 'FELIPE LEITE BARROS'),
  ('medico', 'PAULO VICTOR PAZ MACHADO', 'PAULO VICTOR PAZ MACHADO'),
  ('medico', 'TIAGO DE LIMA RODRIGUEZ', 'TIAGO DE LIMA RODRIGUEZ'),
  ('medico', 'OUTROS', 'OUTROS'),
  ('medico_regulador', 'OUTROS', 'OUTROS')
on conflict (tipo, valor_normalizado) do nothing;
