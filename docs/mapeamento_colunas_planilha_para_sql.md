# Mapeamento da Planilha para SQL com Estrutura Legada + Nova Classificação Psiquiátrica

Este documento propõe a modelagem SQL do Supabase para o projeto `conecta-raps`, com dois objetivos simultâneos:

1. preservar a lógica e os dados atuais do Google Sheets;
2. introduzir a nova seção de classificação psiquiátrica no formulário:
   - `Motivo Inicial`
   - `Motivo Constatado`
   - `Detalhe Livre`

O princípio adotado aqui é:

- migrar sem quebrar o que já existe;
- manter compatibilidade com dashboard, mapa e formulário atual;
- adicionar a nova parte psiquiátrica de forma extensível e segura.

## Estratégia de modelagem

A melhor forma para este projeto, neste momento, é um modelo híbrido:

- tabelas legadas espelhando o que o Sheets já representa;
- tabelas auxiliares de domínio;
- estrutura nova para classificação de ocorrência;
- capacidade de reconstruir o `shape` que o dashboard espera hoje.

## Tabelas propostas

### 1. `usuarios`

Origem principal:

- aba `USUARIOS`

Objetivo:

- substituir gradualmente a lógica de autenticação baseada em Sheets.

Campos sugeridos:

| Campo SQL | Tipo | Origem | Observação |
|---|---|---|---|
| `id` | `uuid` | novo | chave primária |
| `id_externo` | `text` | coluna A | ex: `USU-01-2026` |
| `usuario` | `text` | coluna B | login |
| `senha_hash` | `text` | derivado | não guardar senha simples no modelo final |
| `senha_legado` | `text` | coluna C | usar só para transição, se necessário |
| `confirmacao_senha_legado` | `text` | coluna D | só transição |
| `nome_completo` | `text` | coluna E | obrigatório |
| `cpf` | `text` | coluna F | indexável |
| `matricula` | `text` | coluna G | indexável |
| `funcao` | `text` | coluna H | cargo/função |
| `status` | `text` | coluna I | ex: `APTO` |
| `justificativa` | `text` | coluna J | observação administrativa |
| `modulo` | `text` | coluna K | escopo de acesso |
| `origem_dado` | `text` | novo | `sheets` / `supabase` |
| `criado_em` | `timestamptz` | novo | auditoria |
| `atualizado_em` | `timestamptz` | novo | auditoria |

Observação crítica:

- no Supabase final, o ideal é usar autenticação segura e nunca depender de senha em texto puro;
- mas para não quebrar a transição, pode ser necessário manter compatibilidade temporária.

### 2. `zonas`

Origem principal:

- aba `BAIRROS`

Objetivo:

- deixar de tratar zona apenas como texto repetido.

Campos sugeridos:

| Campo SQL | Tipo | Observação |
|---|---|---|
| `id` | `uuid` | chave primária |
| `nome` | `text` | único |
| `ordem` | `int` | ordenação |
| `ativo` | `boolean` | default `true` |
| `origem_dado` | `text` | `sheets` / `supabase` |

Valores observados:

- `CENTRO`
- `ZONA NORTE`
- `ZONA SUL`
- `ZONA LESTE`
- `ZONA OESTE`

### 3. `bairros`

Origem principal:

- aba `BAIRROS`
- também reforçado por `DADOS SAMU`

Objetivo:

- formalizar a referência territorial usada no autocomplete, no select do formulário e no dashboard.

Campos sugeridos:

| Campo SQL | Tipo | Observação |
|---|---|---|
| `id` | `uuid` | chave primária |
| `zona_id` | `uuid` | FK para `zonas` |
| `nome` | `text` | nome do bairro |
| `nome_normalizado` | `text` | sem acento, caixa alta |
| `ativo` | `boolean` | default `true` |
| `origem_dado` | `text` | `sheets` / `supabase` |

Índice importante:

- `unique (zona_id, nome)`
- índice por `nome_normalizado`

Isso é importante para preservar a lógica atual de casamento de bairro via Google Maps.

### 4. `atendimentos_raps`

Origem principal:

- aba `DADOS SAMU`

Objetivo:

- ser a tabela principal do sistema, preservando o conteúdo atual do formulário e do dashboard.

Campos sugeridos:

| Campo SQL | Tipo | Origem | Observação |
|---|---|---|---|
| `id` | `uuid` | novo | chave primária |
| `id_externo` | `text` | coluna A | ex: `PAC-001-2025` |
| `nome` | `text` | coluna B | obrigatório |
| `nascimento` | `date` | coluna C | pode vir vazio |
| `sexo` | `text` | coluna D | `Masculino` / `Feminino` |
| `idade` | `int` | coluna E | idade atual/registrada |
| `endereco` | `text` | coluna F | texto livre |
| `numero` | `text` | coluna G | manter texto por compatibilidade |
| `bairro_id` | `uuid` | derivado | FK quando houver bairro cadastrado |
| `bairro_nome_legado` | `text` | coluna H | preserva valor original |
| `zona_id` | `uuid` | derivado | FK quando houver zona cadastrada |
| `zona_nome_legado` | `text` | coluna I | preserva valor original |
| `localizacao_raw` | `text` | coluna J | compatível com formato atual |
| `latitude` | `numeric(10,7)` | derivado | opcional |
| `longitude` | `numeric(10,7)` | derivado | opcional |
| `referencia` | `text` | coluna K | ponto de referência |
| `diagnosticado` | `text` | coluna L | manter `Sim/Não` |
| `reincidente` | `text` | coluna M | manter `Sim/Não` |
| `medicacao` | `text` | coluna N | manter `Sim/Não` |
| `pq_med` | `text` | coluna O | motivo |
| `apoio_fam` | `text` | coluna P | manter `Sim/Não` |
| `pq_fam` | `text` | coluna Q | motivo |
| `apoio_raps` | `text` | coluna R | manter `Sim/Não` |
| `info_extra` | `text` | coluna S | observações |
| `entrada_legado` | `text` | coluna T | preserva string histórica |
| `responsavel_nome` | `text` | derivado | nome do responsável |
| `raca` | `text` | coluna W | manter legado |
| `nacionalidade` | `text` | coluna X | manter legado |
| `usuario_id` | `uuid` | derivado | FK se identificado |
| `origem_dado` | `text` | novo | `sheets` / `supabase` |
| `criado_em` | `timestamptz` | novo | data real no banco |
| `atualizado_em` | `timestamptz` | novo | auditoria |

### Por que manter campos legados e FKs ao mesmo tempo

Porque isso reduz risco.

Exemplo:

- `bairro_nome_legado` preserva exatamente o que veio do Sheets;
- `bairro_id` permite normalização gradual.

Se houver divergência na migração, o sistema ainda consegue operar sem perder dado bruto.

## Nova estrutura de classificação psiquiátrica

Aqui entra a parte nova que você pediu.

A melhor forma de fazer isso, sem quebrar a tabela principal, é criar tabelas de domínio para classificação e ligar isso ao atendimento principal.

### 5. `tipos_ocorrencia`

Objetivo:

- tabela mestre de tipos.

Campos:

| Campo SQL | Tipo | Observação |
|---|---|---|
| `id` | `uuid` | chave primária |
| `nome` | `text` | único |
| `ordem` | `int` | ordenação |
| `ativo` | `boolean` | default `true` |

Carga inicial necessária:

- `PSIQUIÁTRICO`

### 6. `subtipos_ocorrencia`

Objetivo:

- subtipos vinculados ao tipo.

Campos:

| Campo SQL | Tipo | Observação |
|---|---|---|
| `id` | `uuid` | chave primária |
| `tipo_id` | `uuid` | FK para `tipos_ocorrencia` |
| `nome` | `text` | nome do subtipo |
| `ordem` | `int` | ordenação |
| `ativo` | `boolean` | default `true` |

Carga inicial psiquiátrica:

- `SURTO PSICÓTICO`
- `AGITAÇÃO PSICOMOTORA`
- `CRISE DE ANSIEDADE`
- `TENTATIVA DE SUICÍDIO`
- `IDEAÇÃO SUICIDA`
- `ALTERAÇÃO COMPORTAMENTAL / CRISE EMOCIONAL`
- `DEPENDÊNCIA QUÍMICA / USO DE SUBSTÂNCIAS`
- `ABSTINÊNCIA`
- `OUTROS PSIQUIÁTRICOS`

### 7. `campos_extras_ocorrencia`

Objetivo:

- definir dinamicamente campos extras por subtipo.

Campos:

| Campo SQL | Tipo | Observação |
|---|---|---|
| `id` | `uuid` | chave primária |
| `subtipo_id` | `uuid` | FK para `subtipos_ocorrencia` |
| `chave` | `text` | ex: `metodo` |
| `rotulo` | `text` | ex: `Método` |
| `tipo_dado` | `text` | `text`, `number`, `boolean`, `select`, `multiselect` |
| `obrigatorio` | `boolean` | default `false` |
| `opcoes` | `jsonb` | opções para select |
| `ajuda` | `text` | opcional |
| `ordem` | `int` | ordenação |
| `ativo` | `boolean` | default `true` |

Carga inicial necessária:

Para subtipo `TENTATIVA DE SUICÍDIO`:

- `metodo`
- `Método`
- `select`
- obrigatório
- opções:
  - `MEDICAMENTOSA`
  - `ENFORCAMENTO`
  - `ARMA BRANCA`
  - `ARMA DE FOGO`
  - `PRECIPITAÇÃO (ALTURA)`
  - `INTOXICAÇÃO`
  - `OUTRO`
  - `NÃO INFORMADO`

### 8. `classificacao_ocorrencia_atendimento`

Esta é a tabela que liga a nova classificação ao atendimento principal.

Ela é a melhor forma porque:

- não bagunça a tabela legada;
- permite evolução futura;
- mantém a nova lógica organizada.

Campos:

| Campo SQL | Tipo | Observação |
|---|---|---|
| `id` | `uuid` | chave primária |
| `atendimento_id` | `uuid` | FK para `atendimentos_raps` |
| `motivo_inicial_tipo_id` | `uuid` | FK para `tipos_ocorrencia` |
| `motivo_inicial_subtipo_id` | `uuid` | FK para `subtipos_ocorrencia` |
| `motivo_inicial_extras` | `jsonb` | ex: `{ "metodo": "MEDICAMENTOSA" }` |
| `motivo_constatado_tipo_id` | `uuid` | FK para `tipos_ocorrencia` |
| `motivo_constatado_subtipo_id` | `uuid` | FK para `subtipos_ocorrencia` |
| `motivo_constatado_extras` | `jsonb` | extras dinâmicos |
| `detalhe_livre` | `text` | campo livre ligado à seção |
| `origem_dado` | `text` | `supabase` / `migrado` |
| `criado_em` | `timestamptz` | auditoria |
| `atualizado_em` | `timestamptz` | auditoria |

## Por que esta modelagem é a melhor opção aqui

Porque ela separa muito bem:

- o legado operacional do SAMU/RAPS;
- a nova classificação psiquiátrica;
- a futura expansão para outros tipos de ocorrência.

Se colocarmos tudo diretamente dentro de `atendimentos_raps`, o risco de quebrar dashboard e mapa fica maior.

Com uma tabela ligada:

- o sistema legado continua funcionando;
- o formulário ganha o novo bloco;
- o dashboard atual não precisa quebrar agora;
- depois podemos decidir se o dashboard vai ou não usar essa nova classificação.

## Relação entre o formulário atual e o novo bloco

No formulário atual, após `Ponto de Referência`, deve entrar a nova seção:

- `Tipo de Ocorrência Constatada`

Essa seção deve gravar em `classificacao_ocorrencia_atendimento`.

Enquanto isso, o restante do formulário continua gravando em `atendimentos_raps`.

Isso é o mais seguro para a primeira implantação.

## Compatibilidade com o dashboard atual

O dashboard atual depende de:

- shape parecido com a planilha;
- dados brutos em formato tabular;
- campos clássicos do atendimento;
- lógica de localização em `localizacao`.

Por isso, a nova classificação psiquiátrica:

- não deve substituir campos legados existentes;
- deve entrar como extensão da ficha;
- e só depois poderá ser incorporada em relatórios e indicadores novos.

## Compatibilidade com Maps e autocomplete

Para não perder a lógica que já existe:

- `endereco`, `numero`, `bairro`, `zona` e `localizacao_raw` devem continuar existindo;
- `latitude` e `longitude` entram como melhora, não como substituição brusca;
- o mapa atual pode continuar lendo `localizacao_raw` enquanto a migração acontece.

## Regras que o SQL final deve contemplar

### `usuarios`

- `usuario` único
- `cpf` indexado
- `matricula` indexada

### `zonas`

- `nome` único

### `bairros`

- `zona_id + nome` único
- `nome_normalizado` indexado

### `atendimentos_raps`

- `id_externo` único
- índice por `nome`
- índice por `bairro_nome_legado`
- índice por `zona_nome_legado`
- índice por `criado_em`
- índice por `reincidente`
- índice por `apoio_raps`

### `tipos_ocorrencia`

- `nome` único

### `subtipos_ocorrencia`

- `tipo_id + nome` único

### `campos_extras_ocorrencia`

- `subtipo_id + chave` único

### `classificacao_ocorrencia_atendimento`

- `atendimento_id` único se cada atendimento tiver só uma classificação

## Migração inicial dos dados

### Da aba `DADOS SAMU`

Migrar para:

- `atendimentos_raps`

### Da aba `USUARIOS`

Migrar para:

- `usuarios`

### Da aba `BAIRROS`

Migrar para:

- `zonas`
- `bairros`

### Parte nova psiquiátrica

Não vem do Sheets atual.

Será carga nova no Supabase:

- `tipos_ocorrencia`
- `subtipos_ocorrencia`
- `campos_extras_ocorrencia`

## O que entra agora e o que entra depois

### Entra agora na modelagem SQL

- tabelas legadas
- normalização territorial
- usuários
- nova classificação psiquiátrica

### Entra depois no frontend

- seção `Motivo Inicial`
- seção `Motivo Constatado`
- `Detalhe Livre`
- persistência híbrida `Sheets + Supabase`

## Caminho mais seguro de implementação

1. Criar o SQL das tabelas legadas e auxiliares.
2. Criar o SQL das tabelas de classificação psiquiátrica.
3. Migrar primeiro bairros e zonas.
4. Migrar usuários.
5. Migrar atendimentos.
6. Implementar dupla escrita.
7. Só então adicionar o novo bloco no formulário.

## Próximo artefato recomendado

O próximo passo ideal é criar o arquivo:

- `docs/proposta_modelagem_supabase.sql`

Esse arquivo deve trazer:

- `create table`
- `constraints`
- `indexes`
- carga inicial de:
  - zonas
  - bairros
  - tipo psiquiátrico
  - subtipos psiquiátricos
  - campo extra `metodo`
