# Mapeamento do Apps Script Atual e da Planilha Google Sheets

Este documento registra o comportamento do Apps Script atualmente usado pelo projeto, com foco em:

- ações disponíveis;
- colunas da planilha;
- regras embutidas no script;
- dependências do frontend;
- pontos que precisam ser reproduzidos no Supabase sem perda.

Base de referência:

- script do Google Sheets fornecido pelo usuário nesta conversa;
- integração atual do frontend em [api.ts](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/services/api.ts);
- formulário em [InsertionForm.tsx](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/InsertionForm.tsx);
- dashboard em [Dashboard.tsx](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/Dashboard.tsx).

## Visão geral do Apps Script

O Apps Script expõe um endpoint `doPost(e)` com múltiplas ações, definidas por `e.parameter.action`.

Planilhas/abas conhecidas no Google Sheets atual:

- `DADOS SAMU`
- `USUARIOS`
- `BAIRROS`

Observação importante:

- o Apps Script de dados que foi compartilhado nesta conversa atua diretamente sobre a aba `DADOS SAMU`;
- pelas capturas enviadas pelo usuário, existem pelo menos mais duas abas operacionais relevantes, `USUARIOS` e `BAIRROS`;
- isso significa que a futura migração para Supabase não deve modelar apenas os atendimentos, mas também os cadastros auxiliares e de acesso.

O script implementa 4 ações principais:

1. `carregar_estatisticas`
2. `verificar_paciente`
3. `carregar_lista_bairros`
4. `salvar_samu`

## Estrutura da planilha `DADOS SAMU`

Pelo script e pelo frontend, a planilha atual usa a seguinte estrutura principal:

| Coluna | Índice JS | Campo lógico |
|---|---:|---|
| A | 0 | ID |
| B | 1 | Nome |
| C | 2 | Nascimento |
| D | 3 | Sexo |
| E | 4 | Idade |
| F | 5 | Endereço |
| G | 6 | Número |
| H | 7 | Bairro |
| I | 8 | Zona |
| J | 9 | Localização / GPS |
| K | 10 | Ponto de referência |
| L | 11 | Diagnosticado |
| M | 12 | Reincidente |
| N | 13 | Medicação |
| O | 14 | Motivo de não medicação |
| P | 15 | Apoio familiar |
| Q | 16 | Motivo de não apoio familiar |
| R | 17 | Apoio RAPS |
| S | 18 | Informações extras / observações |
| T | 19 | Entrada formatada |
| U | 20 | Reservado |
| V | 21 | Reservado |
| W | 22 | Raça |
| X | 23 | Nacionalidade |

## Regra estrutural crítica da planilha

O script assume que:

- linhas válidas têm ID preenchido na coluna `A`;
- colunas `U` e `V` não devem ser sobrescritas no save;
- os dados em `W` e `X` precisam continuar disponíveis para dashboard e formulário.

Essa regra precisa ser preservada na migração, mesmo que o Supabase não use mais colunas físicas.

## Estrutura observada da aba `USUARIOS`

Pelas capturas enviadas, a aba `USUARIOS` contém pelo menos os campos:

| Coluna | Campo lógico |
|---|---|
| A | ID |
| B | USUARIO |
| C | SENHA |
| D | CONFIRMACAO DE SENHA |
| E | Nome Completo |
| F | CPF |
| G | Matricula |
| H | Funcao |
| I | Status |
| J | Justificativa |
| K | Modulo |

Implicações:

- esta aba provavelmente alimenta a autenticação e/ou autorização do sistema;
- a migração para Supabase vai precisar contemplar também usuários e perfis;
- o script de `AUTH_API_URL` deve ser documentado separadamente depois, pois ele provavelmente depende dessa aba.

## Estrutura observada da aba `BAIRROS`

Pelas capturas enviadas, a aba `BAIRROS` está organizada por colunas de zona, contendo listas de bairros por território.

Exemplo observado:

- `CENTRO`
- `ZONA NORTE`
- `ZONA SUL`
- `ZONA LESTE`
- `ZONA OESTE`

Implicações:

- a migração ideal não deve continuar tratando bairro/zona apenas como texto solto;
- o Supabase deve ter pelo menos uma estrutura de referência territorial para bairros e zonas;
- essa aba é uma fonte mais confiável para cadastro territorial do que inferir bairros somente da aba `DADOS SAMU`.

## Ação 1: `carregar_estatisticas`

### O que faz

Lê toda a planilha, remove o cabeçalho, filtra somente linhas com ID válido na coluna `A` e calcula estatísticas agregadas.

### Saída esperada

Retorna um objeto com:

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

### Regras embutidas

- `reincidentes`: conta linhas onde coluna `M` = `SIM`
- `clinico.diag`: coluna `L` = `SIM`
- `clinico.med`: coluna `N` = `SIM`
- `clinico.fam`: coluna `P` = `SIM`
- `clinico.raps`: coluna `R` = `SIM`
- `sexo`: coluna `D`
- `idade`: coluna `E`
- `bairro`: coluna `H`
- `zona`: coluna `I`

### Dependência no frontend

Essa ação alimenta:

- KPIs
- gráficos
- tabela espelho da planilha
- relatório automático
- mapa e heatmap

Uso atual:

- [api.ts](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/services/api.ts)
- [Dashboard.tsx](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/Dashboard.tsx)
- [MapComponent.tsx](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/MapComponent.tsx)

### Implicação para o Supabase

No Supabase, essa ação precisará ser reproduzida por:

- consulta agregada;
- ou view materializada;
- ou função RPC;
- e também uma consulta crua para `dadosBrutos`.

## Ação 2: `verificar_paciente`

### O que faz

Procura um paciente pelo nome informado.

### Regra de busca atual

- converte o nome buscado para minúsculo;
- compara com o nome da planilha também em minúsculo;
- a comparação é exata;
- varre toda a planilha;
- conta quantas ocorrências encontrou;
- guarda os dados do último encontro para preencher o formulário.

### Saída esperada

Se encontrar:

```json
{
  "result": "exists",
  "p": { "...dados do paciente..." },
  "contagem": 4
}
```

Se não encontrar:

```json
{
  "result": "not_found"
}
```

### Campos retornados

- `id`
- `nome`
- `nascimento`
- `sexo`
- `idade`
- `endereco`
- `numero`
- `bairro`
- `zona`
- `loc`
- `ref`
- `diag`
- `reinc`
- `med`
- `pq_med`
- `fam`
- `pq_fam`
- `raps`
- `info`
- `raca`
- `nacionalidade`

### Dependência no frontend

O formulário usa essa ação para:

- detectar histórico do paciente;
- oferecer preenchimento automático;
- calcular alerta visual de reincidência por `contagem`.

Uso:

- [InsertionForm.tsx](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/InsertionForm.tsx)

### Risco importante

A busca atual é por nome exato. Isso é frágil para:

- homônimos;
- diferenças de digitação;
- nomes incompletos.

Na primeira migração, o ideal é reproduzir exatamente essa lógica, e só depois melhorar.

## Ação 3: `carregar_lista_bairros`

### O que faz

Varre a planilha e monta:

- um mapa de bairros por zona;
- uma lista simples de nomes de pacientes.

### Estrutura retornada

```json
{
  "bairros": {
    "ZONA NORTE": ["BAIRRO A", "BAIRRO B"]
  },
  "nomes": ["PACIENTE 1", "PACIENTE 2"]
}
```

### Regras embutidas

- só considera linhas com ID válido;
- só inclui bairros quando `zona` e `bairro` existem;
- evita duplicatas dentro da zona;
- adiciona nomes se a coluna `B` estiver preenchida.

### Dependência no frontend

O formulário usa essa ação para:

- popular o select de bairro com agrupamento por zona;
- inferir a zona automaticamente;
- ter uma base de nomes disponível para possíveis evoluções de autocomplete.

### Comportamento de fallback no frontend

Se a API falhar, o projeto usa uma lista hardcoded de bairros em [api.ts](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/services/api.ts).

Isso significa que a migração para Supabase deve manter:

- uma origem confiável de bairros/zonas;
- fallback local enquanto a transição estiver acontecendo.

## Ação 4: `salvar_samu`

### O que faz

Recebe os dados do formulário e grava uma nova linha na planilha.

### Etapas da lógica atual

#### 1. Padronização de entrada

Converte para caixa alta:

- `nome`
- `responsavel`
- `raca`
- `nacionalidade`

Também grava diversos campos de texto em maiúsculas durante o save.

#### 2. Busca da linha de inserção

Lê a coluna `A` inteira e:

- encontra a última linha real com valor;
- identifica o maior número sequencial existente entre IDs do tipo `PAC-045-2026`;
- define a próxima linha livre.

#### 3. Geração de ID automático

Formato atual:

`PAC-001-2026`

Regras:

- prefixo `PAC`
- sequência numérica de 3 dígitos
- ano atual

#### 4. Geração da coluna de entrada

Formato:

`dd/MM/yyyy HH:mm:ss | Por: NOME`

Essa string vai para a coluna `T`.

#### 5. Escrita em blocos

O script grava:

- bloco 1: colunas `A:T`
- bloco 2: colunas `W:X`

E evita gravar nas colunas:

- `U`
- `V`

### Campos gravados hoje

#### Bloco `A:T`

- ID
- Nome
- Nascimento
- Sexo
- Idade
- Endereço
- Número
- Bairro
- Zona
- Localização
- Referência
- Diagnosticado
- Reincidente
- Medicação
- Motivo não medicação
- Apoio familiar
- Motivo não apoio familiar
- Apoio RAPS
- Informações extras
- Entrada

#### Bloco `W:X`

- Raça
- Nacionalidade

### Dependência no frontend

O payload enviado pelo formulário atual está em:

- [InsertionForm.tsx](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/components/Dashboard/InsertionForm.tsx)
- [api.ts](/c:/Users/LENOVO%20PREMIUM/Documents/DESENVOLVIMENTO/MESTRADO/conecta-raps/src/services/api.ts)

### Implicação para o Supabase

A lógica que precisa ser preservada no Supabase inclui:

- geração controlada de ID externo;
- data/hora de registro;
- responsável do registro;
- separação clara dos campos equivalentes a `raça` e `nacionalidade`;
- possibilidade de reconstruir a visualização espelho do dashboard.

## Regras de negócio acopladas ao frontend que dependem do Apps Script

### Idade automática

Quando o campo `nascimento` muda:

- o frontend calcula a idade;
- dispara a verificação de paciente.

### Alerta de reincidência

O frontend mostra alerta forte quando:

- `contagem > 3`

### Carregamento do último histórico

Se o paciente existir:

- o frontend pergunta se deseja carregar os últimos dados;
- se confirmado, reaproveita sexo, raça, nacionalidade, endereço, número, bairro, referência e diagnóstico.

### Bairros e zona

O frontend:

- preenche bairro e zona a partir do retorno do Google Maps, quando houver match;
- ou infere zona quando o usuário seleciona um bairro.

## Dependência do georreferenciamento

Mesmo que a planilha armazene apenas `localizacao` em uma coluna textual, o ecossistema atual depende disso fortemente.

Hoje `localizacao` serve para:

- coordenada direta `lat, lng`;
- possível URL compatível com Google Maps;
- extração de coordenadas no mapa do dashboard.

Portanto, ao migrar para Supabase, o ideal é armazenar:

- `localizacao_raw`
- `latitude`
- `longitude`

Mas, na fase inicial, ainda convém manter um campo textual compatível com o formato atual para não quebrar o mapa.

## Mapeamento inicial sugerido para SQL

Tabela inicial sugerida: `atendimentos_raps`

| Campo SQL | Origem atual |
|---|---|
| `id` | chave interna do Supabase |
| `id_externo` | coluna A |
| `nome` | coluna B |
| `nascimento` | coluna C |
| `sexo` | coluna D |
| `idade` | coluna E |
| `endereco` | coluna F |
| `numero` | coluna G |
| `bairro` | coluna H |
| `zona` | coluna I |
| `localizacao_raw` | coluna J |
| `referencia` | coluna K |
| `diagnosticado` | coluna L |
| `reincidente` | coluna M |
| `medicacao` | coluna N |
| `pq_med` | coluna O |
| `apoio_fam` | coluna P |
| `pq_fam` | coluna Q |
| `apoio_raps` | coluna R |
| `info_extra` | coluna S |
| `entrada_legado` | coluna T |
| `responsavel` | extraído de T ou capturado no frontend |
| `raca` | coluna W |
| `nacionalidade` | coluna X |
| `criado_em` | timestamp real no Supabase |
| `origem_dado` | `sheets` ou `supabase` |

## O que precisa ser preservado exatamente na primeira fase

1. Estrutura lógica do retorno de `carregar_estatisticas`.
2. Busca de paciente com retorno do último histórico e `contagem`.
3. Lista de bairros por zona.
4. Geração de ID `PAC-000-ANO`.
5. Campo de entrada com referência de data/hora e responsável.
6. Não sobrescrever a lógica equivalente às antigas colunas `U:V`.
7. Campo `localizacao` compatível com o mapa atual.
8. Semântica textual de `Sim` e `Não`.

## Estratégia recomendada para a migração do Apps Script

### Fase 1

Reproduzir o contrato atual no Supabase, sem mudar o frontend.

### Fase 2

Criar um `DataProvider` com dois modos:

- `SheetsDataProvider`
- `SupabaseDataProvider`

### Fase 3

Habilitar escrita dupla:

- grava no Sheets
- grava no Supabase

### Fase 4

Comparar:

- contagem total
- estatísticas
- reincidência
- bairros
- mapa
- relatório clínico

### Fase 5

Virar leitura para Supabase, mantendo fallback para Sheets.

## Próximo documento recomendado

O próximo passo natural é criar:

- `docs/mapeamento_colunas_planilha_para_sql.md`

Esse documento deve detalhar campo por campo:

- tipo SQL sugerido;
- nulidade;
- regras de normalização;
- índices necessários;
- compatibilidade com dashboard e mapa.
