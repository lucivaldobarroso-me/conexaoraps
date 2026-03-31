# Preservação da Lógica Atual e Plano Seguro de Migração Sheets -> Supabase

Este documento registra, com o máximo de fidelidade possível, a lógica atual do projeto `conecta-raps` para evitar perda de comportamento durante a futura migração de Google Sheets para Supabase.

Objetivo principal:

- preservar 100% da lógica crítica atual;
- permitir operação paralela com `Sheets` e `Supabase`;
- manter um caminho de rollback simples;
- só depois evoluir o formulário com novos campos, incluindo a seção psiquiátrica.

## Premissas de segurança

1. Não desligar o Google Sheets antes de validar a equivalência no Supabase.
2. Não alterar a lógica do dashboard sem documentar a dependência dos dados atuais.
3. Preservar a experiência do formulário, principalmente:
   - autocomplete de endereço com Google Maps;
   - geocodificação automática;
   - vínculo automático de bairro/zona;
   - busca de paciente já registrado;
   - alerta de reincidência;
   - persistência atual.
4. Manter fallback operacional:
   - frontend preparado para `Sheets` ou `Supabase`;
   - possibilidade de voltar para o modo `Sheets` se necessário.

## Arquivos atuais mais críticos

- [src/constants.ts](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/constants.ts)
- [src/services/api.ts](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/services/api.ts)
- [src/components/Dashboard/InsertionForm.tsx](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/InsertionForm.tsx)
- [src/components/Dashboard/Dashboard.tsx](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/Dashboard.tsx)
- [src/components/Dashboard/MapComponent.tsx](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/MapComponent.tsx)
- [src/types.ts](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/types.ts)

## Fontes de dados atuais

Hoje o sistema depende de dois Apps Scripts expostos por URL:

- `AUTH_API_URL` para autenticação
- `DATA_API_URL` para dados assistenciais

Origem:

- [src/constants.ts:11](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/constants.ts#L11)
- [src/constants.ts:12](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/constants.ts#L12)

## Abas conhecidas no Google Sheets atual

Com base nas capturas compartilhadas pelo usuário, o ambiente atual do Google Sheets possui pelo menos estas três abas:

- `DADOS SAMU`
- `USUARIOS`
- `BAIRROS`

Papel de cada uma, pelo que já foi possível identificar:

- `DADOS SAMU`
  - base principal dos atendimentos e do dashboard
- `USUARIOS`
  - base de credenciais/cadastro de acesso
- `BAIRROS`
  - referência territorial de bairros organizados por zona

Conclusão importante:

- a migração para Supabase não deve considerar apenas os atendimentos;
- ela deve prever também a migração do cadastro de usuários e da referência territorial.

## Ações atuais do backend de dados via Apps Script

Conforme o frontend atual, o backend de dados fornece pelo menos estas ações:

- `verificar_paciente`
- `carregar_lista_bairros`
- `carregar_estatisticas`
- `salvar_samu`

Uso atual:

- [src/services/api.ts:75](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/services/api.ts#L75)
- [src/services/api.ts:111](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/services/api.ts#L111)
- [src/services/api.ts:130](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/services/api.ts#L130)
- [src/services/api.ts:181](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/services/api.ts#L181)

## Camada atual de integração do frontend

O frontend usa um helper unificado `_safeFetch` que escolhe o nome do parâmetro de ação:

- `acao` para autenticação
- `action` para dados legados

Origem:

- [src/services/api.ts:3](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/services/api.ts#L3)

Esta lógica deve ser preservada conceitualmente na migração, substituindo a origem dos dados sem quebrar o contrato usado pelos componentes.

## Mapeamento atual de dados da planilha

O sistema depende fortemente de índices fixos inspirados na planilha atual. Isso é crítico.

Mapeamento principal usado no frontend:

- `0`: id
- `1`: nome
- `2`: nascimento
- `3`: sexo
- `4`: idade
- `7`: bairro
- `8`: zona
- `9`: localizacao / gps
- `11`: diagnostico
- `12`: reincidente
- `13`: medicacao
- `15`: apoio_fam
- `17`: apoio_raps
- `22`: raca
- `23`: nacionalidade

Origem:

- [src/services/api.ts:38](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/services/api.ts#L38)

## Estrutura prática usada pelo dashboard

O dashboard consome `dadosBrutos` num formato tabular semelhante à planilha:

- `0`: ID
- `1`: Nome
- `2`: Nascimento
- `3`: Sexo
- `4`: Idade
- `5`: Endereço
- `6`: Número
- `7`: Bairro
- `8`: Zona
- `9`: GPS / Localização
- `10`: Referência
- `11`: Diagnóstico
- `12`: Reincidente
- `13`: Medicação
- `14`: Motivo não medicação
- `15`: Apoio familiar
- `16`: Motivo não apoio familiar
- `17`: Apoio RAPS
- `18`: Observações / informações extras
- `19`: Entrada
- `20`: Responsável
- `21`: Reservado / vazio
- `22`: Raça
- `23`: Nacionalidade

Referência:

- [src/components/Dashboard/Dashboard.tsx:400](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/Dashboard.tsx#L400)

## Fluxos críticos que não podem quebrar

### 1. Carga de estatísticas do dashboard

Hoje o dashboard depende de:

- `total`
- `reincidentes`
- `clinico.diag`
- `clinico.med`
- `clinico.fam`
- `clinico.raps`
- `masculino`
- `feminino`
- `idades`
- `zonas`
- `bairros`
- `dias`
- `mensal`
- `dadosBrutos`

Uso:

- [src/services/api.ts:130](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/services/api.ts#L130)
- [src/types.ts:31](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/types.ts#L31)
- [src/components/Dashboard/Dashboard.tsx:147](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/Dashboard.tsx#L147)

Risco:

- qualquer alteração no shape de `dadosBrutos` quebra tabelas, relatório gerado e mapa;
- qualquer mudança nas contagens altera gráficos e KPIs.

### 2. Busca de paciente e reaproveitamento de histórico

Fluxo atual:

1. usuário preenche nome;
2. usuário informa nascimento;
3. o formulário dispara verificação de paciente;
4. se existir histórico, oferece carregamento dos últimos dados;
5. o sistema também traz `contagem` para alerta de reincidência.

Uso:

- [src/components/Dashboard/InsertionForm.tsx:180](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/InsertionForm.tsx#L180)
- [src/components/Dashboard/InsertionForm.tsx:210](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/InsertionForm.tsx#L210)
- [src/components/Dashboard/InsertionForm.tsx:232](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/InsertionForm.tsx#L232)

Observação importante:

- a lógica atual verifica por `nome`;
- o Apps Script informado pelo usuário também usa busca por nome exato;
- isso pode causar colisões entre homônimos.

Na migração, esta lógica deve ser preservada inicialmente, mesmo que depois possamos melhorar com identificadores mais robustos.

### 3. Lista dinâmica de bairros por zona

Hoje a aplicação tenta carregar bairros do backend. Se falhar, usa lista hardcoded.

Uso:

- [src/services/api.ts:111](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/services/api.ts#L111)
- [src/components/Dashboard/InsertionForm.tsx:45](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/InsertionForm.tsx#L45)

Lógica atual a preservar:

- bairros agrupados por zona;
- dropdown do formulário com `optgroup` por zona;
- quando o bairro muda, a zona é inferida automaticamente.

Uso da inferência:

- [src/components/Dashboard/InsertionForm.tsx:193](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/InsertionForm.tsx#L193)

### 4. Autocomplete de endereço com Google Maps

Esta é uma das lógicas mais sensíveis e mais valiosas do sistema atual.

O formulário usa:

- `@react-google-maps/api`
- biblioteca `places`
- `Autocomplete` do Google Maps

Uso:

- [src/components/Dashboard/InsertionForm.tsx:61](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/InsertionForm.tsx#L61)
- [src/components/Dashboard/InsertionForm.tsx:69](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/InsertionForm.tsx#L69)

Comportamento atual:

1. restringe o contexto geográfico a Boa Vista;
2. ao selecionar um endereço, tenta extrair:
   - rua
   - número
   - bairro
   - cidade
   - latitude/longitude
3. preenche automaticamente:
   - `endereco`
   - `numero`
   - `loc`
4. tenta compatibilizar o bairro retornado pelo Google com a lista interna de bairros;
5. se encontrar match, preenche também:
   - `bairro`
   - `zona`

Trechos centrais:

- bounds de Boa Vista:
  - [src/components/Dashboard/InsertionForm.tsx:74](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/InsertionForm.tsx#L74)
- extração dos componentes do endereço:
  - [src/components/Dashboard/InsertionForm.tsx:101](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/InsertionForm.tsx#L101)
- captura de coordenadas:
  - [src/components/Dashboard/InsertionForm.tsx:119](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/InsertionForm.tsx#L119)
- normalização e casamento de bairro:
  - [src/components/Dashboard/InsertionForm.tsx:135](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/InsertionForm.tsx#L135)

Esta lógica deve ser considerada "intangível" na primeira fase da migração.

### 5. Coordenadas automáticas por GPS do dispositivo

Além do Google Places, o formulário permite preencher `loc` com a posição atual do navegador.

Uso:

- [src/components/Dashboard/InsertionForm.tsx:271](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/InsertionForm.tsx#L271)

Comportamento:

- se o navegador suportar geolocalização, grava `latitude, longitude` em `loc`;
- este comportamento deve ser mantido no fluxo novo.

### 6. Alertas de reincidência

No formulário:

- se `contagem > 3`, exibe alerta visual forte de paciente reincidente.

Uso:

- [src/components/Dashboard/InsertionForm.tsx:350](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/InsertionForm.tsx#L350)

No dashboard:

- a lógica de reincidência também considera:
  - `latest[12] === 'Sim'`
  - ou mais de 3 registros no histórico

Uso:

- [src/components/Dashboard/Dashboard.tsx:77](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/Dashboard.tsx#L77)
- [src/components/Dashboard/MapComponent.tsx:117](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/MapComponent.tsx#L117)

Esta regra precisa continuar igual na migração inicial.

### 7. Lógica de semáforo clínico e territorial

O dashboard e o mapa compartilham uma lógica de classificação em três níveis:

- vermelho:
  - reincidente
  - sem apoio RAPS
- amarelo:
  - não reincidente
  - mas sem medicação ou sem apoio familiar
- verde:
  - cenários restantes

Uso:

- [src/components/Dashboard/Dashboard.tsx:73](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/Dashboard.tsx#L73)
- [src/components/Dashboard/MapComponent.tsx:117](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/MapComponent.tsx#L117)

Isto é lógica de negócio, não apenas visual. Não pode mudar silenciosamente.

### 8. Mapa e interpretação de coordenadas

O mapa atual:

- carrega dados dos pacientes;
- tenta extrair coordenadas de `loc`;
- aceita:
  - string `lat, lng`
  - URLs com `destination=lat,lng`
  - padrões gerais com latitude/longitude

Uso:

- [src/components/Dashboard/MapComponent.tsx:67](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/MapComponent.tsx#L67)

Além disso:

- há marcadores fixos de SAMU, UBS e CAPS;
- o mapa calcula `fitBounds` com ocorrências e unidades fixas;
- existe alternância entre pinos e heatmap.

Uso:

- [src/components/Dashboard/MapComponent.tsx:21](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/MapComponent.tsx#L21)
- [src/components/Dashboard/MapComponent.tsx:162](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/MapComponent.tsx#L162)

## Persistência atual do formulário

O payload enviado hoje contém:

- `id_paciente`
- `nome`
- `nascimento`
- `sexo`
- `idade`
- `endereco`
- `numero`
- `bairro`
- `zona`
- `localizacao`
- `referencia`
- `diagnosticado`
- `reincidente`
- `medicacao`
- `pq_med`
- `apoio_fam`
- `porque_fam`
- `apoio_raps`
- `info_extra`
- `responsavel`
- `raca`
- `nacionalidade`

Origem:

- [src/components/Dashboard/InsertionForm.tsx:303](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/InsertionForm.tsx#L303)
- [src/services/api.ts:181](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/services/api.ts#L181)

## Campos condicionais atuais do formulário

Existem regras condicionais que também precisam ser preservadas:

- `idade` é calculada a partir de `nascimento`;
- se `raca === INDIGENA`, aparece `etnia`;
- se `raca === OUTROS`, aparece `outraRaca`;
- se `nacionalidade === OUTROS`, aparece `outraNacionalidade`;
- se `med === Não`, aparece `pq_med`;
- se `fam === Não`, aparece `pq_fam`.

Uso:

- [src/components/Dashboard/InsertionForm.tsx:180](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/InsertionForm.tsx#L180)
- [src/components/Dashboard/InsertionForm.tsx:290](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/InsertionForm.tsx#L290)
- [src/components/Dashboard/InsertionForm.tsx:593](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/InsertionForm.tsx#L593)
- [src/components/Dashboard/InsertionForm.tsx:610](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/InsertionForm.tsx#L610)

## Dependências externas e sensíveis

### Google Maps

Dependência:

- `@react-google-maps/api`

Origem:

- [package.json](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/package.json)

Uso prático:

- autocomplete de endereço;
- geocodificação para coordenadas;
- exibição de mapa;
- heatmap;
- pinos de atendimento e unidades de saúde.

### Apps Script / Google Sheets

Dependência crítica:

- autenticação
- estatísticas
- lista de bairros
- busca de paciente
- gravação do formulário

## Riscos conhecidos da migração

1. Quebrar o dashboard por mudar a forma de `dadosBrutos`.
2. Perder a lógica de autocomplete e geocodificação.
3. Perder a correspondência automática de bairro -> zona.
4. Alterar sem querer a regra de reincidência.
5. Alterar o semáforo de risco usado no dashboard e no mapa.
6. Mudar os nomes/valores de `Sim` e `Não`, afetando filtros e contadores.
7. Perder compatibilidade com históricos antigos da planilha.
8. Substituir leitura/escrita de forma abrupta e ficar sem rollback rápido.

## Estratégia recomendada de migração sem perda

### Fase 1. Congelamento da lógica atual

Entregas:

- este documento de preservação;
- coleta do Apps Script atual em documento próprio;
- mapeamento `Sheets -> SQL`.

### Fase 2. Abstração da fonte de dados no frontend

Criar uma camada comum, por exemplo:

- `DataProvider`
  - `verificarPaciente`
  - `carregarBairros`
  - `carregarEstatisticas`
  - `salvarAtendimento`

Implementações:

- `SheetsDataProvider`
- `SupabaseDataProvider`

Objetivo:

- o formulário e o dashboard deixam de saber de onde os dados vêm.

### Fase 3. Modelagem no Supabase

Primeiro passo recomendado:

- criar uma tabela inicial muito próxima da estrutura atual;
- evitar normalização excessiva na primeira migração.

Sugestão inicial de tabela principal:

- `atendimentos_raps`
  - `id`
  - `id_externo`
  - `nome`
  - `nascimento`
  - `sexo`
  - `idade`
  - `endereco`
  - `numero`
  - `bairro`
  - `zona`
  - `localizacao`
  - `referencia`
  - `diagnosticado`
  - `reincidente`
  - `medicacao`
  - `pq_med`
  - `apoio_fam`
  - `pq_fam`
  - `apoio_raps`
  - `info_extra`
  - `responsavel`
  - `raca`
  - `nacionalidade`
  - `criado_em`
  - `origem_dado`

### Fase 4. Operação dupla

Modo inicial sugerido:

- leitura principal: `Sheets`
- escrita: `Sheets` e `Supabase`

Depois:

- leitura comparativa do dashboard com dados do Supabase;
- validação manual de equivalência.

### Fase 5. Virada controlada

Quando o Supabase reproduzir os resultados:

- leitura passa para Supabase;
- `Sheets` fica como fallback;
- só depois a gente expande o formulário com novos blocos como a seção psiquiátrica.

## Plano de rollback

O rollback precisa ser simples e rápido.

Estratégia:

1. manter a implementação atual de `Sheets` intacta;
2. introduzir uma flag de fonte de dados;
3. permitir alternância entre:
   - `sheets`
   - `supabase`
4. em caso de divergência:
   - voltar a leitura para `Sheets`;
   - manter o Supabase apenas em observação ou dupla escrita.

Sugestão de configuração futura:

- `VITE_DATA_SOURCE=sheets`
- `VITE_DATA_SOURCE=supabase`
- `VITE_DATA_SOURCE=dual`

## O que não deve ser alterado na primeira fase

- semântica dos campos `Sim` e `Não`;
- lógica do autocomplete com Google Maps;
- preenchimento automático de `loc`;
- preenchimento automático de `zona` por bairro;
- regra de alerta de reincidência;
- semáforo do mapa;
- geração do relatório automático;
- visualização do mapa de calor e dos pinos.

## Próximos documentos recomendados

1. `docs/mapeamento_apps_script_sheets.md`
2. `docs/mapeamento_colunas_planilha_para_sql.md`
3. `docs/proposta_modelagem_supabase.sql`
4. `docs/plano_rollback_modo_duplo.md`

## Próximo passo recomendado

Antes de qualquer mudança de código:

1. registrar formalmente o Apps Script atual;
2. transformar a planilha atual em um mapeamento de colunas para SQL;
3. desenhar a interface `DataProvider` para suportar `Sheets` e `Supabase`.

Somente depois disso devemos começar a migração real.
