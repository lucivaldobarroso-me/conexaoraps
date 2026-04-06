# Lógica dos Códigos

## Objetivo

Este documento registra a lógica oficial e vigente do sistema para:

- reincidência
- porta giratória
- semáforo clínico-territorial
- Gerador de Relatório Clínico Automático
- Parecer de Gestão e Conduta Recomendada

O objetivo é evitar divergência entre:

- mapa
- dashboard
- tabela analítica
- formulário
- relatório automático

Este documento deve servir como referência de negócio antes de qualquer alteração futura nessas áreas.

## Regra Oficial de Reincidência

A reincidência do paciente deve ser calculada usando a junção de dois critérios:

- frequência histórica do mesmo paciente no banco
- campo manual `Reincidente`, quando marcado como `Sim`

### Classificação

- `Sem reincidência`: primeiro atendimento
- `Reincidência simples`: dois atendimentos
- `Reincidência simples`: também quando o campo manual `Reincidente` estiver marcado como `Sim`
- `Reincidência importante`: três atendimentos ou mais

### Interpretação operacional

- `1 atendimento`: sem reincidência
- `2 atendimentos`: reincidência simples
- `3 atendimentos ou mais`: reincidência importante

## Regra Oficial de Porta Giratória

Porta giratória passa a ser entendida como:

- paciente com `reincidência importante`
- isto é, paciente com `3 atendimentos ou mais`

### Observação importante

Porta giratória pode existir:

- com apoio da Rede de Atenção Psicossocial
- sem apoio da Rede de Atenção Psicossocial

Portanto, o apoio da Rede de Atenção Psicossocial não define sozinho a existência da porta giratória. Esse campo funciona como dado complementar de gestão e gravidade.

## Regra Única do Semáforo Clínico-Territorial

A regra do semáforo deve ser única e compartilhada por:

- mapa
- relatório automático
- parecer de gestão
- qualquer indicador visual derivado

## Vermelho

O caso será classificado como vermelho quando houver pelo menos uma das seguintes condições:

- tentativa de suicídio
- ideação suicida
- surto psicótico
- agitação psicomotora
- reincidência importante

### Interpretação do vermelho

O vermelho representa:

- cenário crítico
- crise psiquiátrica relevante
- e/ou risco assistencial elevado
- e/ou padrão de porta giratória

## Amarelo

O caso será classificado como amarelo quando não entrar no vermelho, mas houver pelo menos uma das seguintes condições:

- dependência química / uso de substâncias
- não utiliza medicação
- não tem apoio familiar
- não tem apoio da Rede de Atenção Psicossocial
- reincidência simples

### Interpretação do amarelo

O amarelo representa:

- cenário intermediário de risco
- fragilidade de suporte terapêutico, familiar, social ou de rede
- necessidade de atenção preventiva

## Verde

O caso será classificado como verde quando:

- não entrar no vermelho
- não entrar no amarelo

### Interpretação do verde

O verde representa:

- cenário relativamente estável
- ausência de marcador crítico
- ausência de fragilidade intermediária pelos critérios definidos

Todos os demais subtipos que não se encaixarem nas condições de vermelho e amarelo devem ser classificados como verdes.

## Ordem Oficial de Avaliação

A ordem da decisão deve ser fixa:

1. verificar se o caso entra no vermelho
2. se não entrar no vermelho, verificar se entra no amarelo
3. se não entrar em nenhum dos dois, classificar como verde

Essa ordem é obrigatória para impedir conflito entre regras e garantir consistência entre mapa e relatório.

## Lista Oficial dos Subtipos Críticos para Vermelho

Os subtipos abaixo devem disparar vermelho:

- tentativa de suicídio
- ideação suicida
- surto psicótico
- agitação psicomotora

Esses subtipos têm prioridade sobre qualquer critério intermediário.

## Relação Entre Reincidência e Cor

- primeiro atendimento:
  - pode ser verde ou amarelo, dependendo dos demais fatores
- dois atendimentos:
  - já é reincidência simples
  - entra no amarelo, salvo se também houver condição de vermelho
- três atendimentos ou mais:
  - já é reincidência importante
  - entra no vermelho

### Reforço da regra manual

Quando o campo `Reincidente` estiver marcado como `Sim`, o sistema deve tratar o caso como reincidência simples dentro da regra geral, mesmo que a leitura histórica ainda não tenha classificado o caso como reincidência importante.

## Gerador de Relatório Clínico Automático

O Gerador de Relatório Clínico Automático deve usar exatamente a mesma base lógica do semáforo e da reincidência.

Ele deve montar:

- identificação do paciente
- histórico de atendimentos
- leitura de reincidência
- classificação psiquiátrica complementar
- vulnerabilidades de suporte
- parecer de gestão e conduta recomendada

O relatório não pode usar regra paralela diferente da usada no mapa.

## Regra do Parecer de Gestão e Conduta Recomendada

O parecer deve ser derivado da mesma classificação final do semáforo.

## Parecer Para Vermelho

Deve ser usado quando o caso for classificado como vermelho.

### Texto de referência

```text
CADEIA 1: Cenário Crítico

Análise de Gestão (ALERTA VERMELHO): O caso apresenta indicadores de elevada gravidade assistencial, com presença de subtipo psiquiátrico crítico e/ou reincidência importante, já caracterizada como porta giratória. Essa condição sugere risco ampliado, necessidade de resposta prioritária e possível fragilidade na continuidade do cuidado. Recomenda-se articulação imediata entre o SAMU 192, a Atenção Básica e a Rede de Atenção Psicossocial, com matriciamento emergencial, revisão do Projeto Terapêutico Singular (PTS) e monitoramento intensivo no território para estabilização clínica e redução de novos eventos agudos.
```

### Leitura conceitual

- cenário crítico
- crise psiquiátrica relevante e/ou reincidência importante
- necessidade de resposta prioritária
- necessidade de articulação imediata com a Rede de Atenção Psicossocial e cuidado territorial intensivo

## Parecer Para Amarelo

Deve ser usado quando o caso for classificado como amarelo.

### Texto de referência

```text
CADEIA 2: Cenário Intermediário (Alerta de Risco)

Análise de Gestão (ALERTA AMARELO): O caso apresenta sinais de vulnerabilidade assistencial, sem atingir neste momento os critérios de cenário crítico. O sistema identificou fatores que podem comprometer a estabilidade do cuidado, tais como reincidência simples, dependência química ou uso de substâncias, fragilidade no apoio familiar, baixa adesão medicamentosa e ausência de apoio da Rede de Atenção Psicossocial. Recomenda-se busca ativa preventiva, fortalecimento do acompanhamento territorial e aproximação com a rede de referência, a fim de reduzir o risco de agravamento clínico, intensificação da reincidência e cronificação do quadro psicossocial.
```

### Leitura conceitual

- cenário intermediário de alerta
- fragilidade no suporte terapêutico, social e territorial
- possibilidade de agravamento se não houver intervenção preventiva

## Parecer Para Verde

Deve ser usado quando o caso for classificado como verde.

### Texto de referência

```text
CADEIA 3: Cenário Estável (Monitoramento de Rotina)

Análise de Gestão (ALERTA VERDE): O caso foi classificado como relativamente estável dentro dos critérios atuais do sistema, sem presença de subtipo psiquiátrico crítico, sem reincidência importante e sem marcadores intermediários relevantes de vulnerabilidade assistencial. Recomenda-se seguimento de rotina no território, manutenção do monitoramento pela rede de referência e atualização do Projeto Terapêutico Singular (PTS) sempre que necessário, preservando a continuidade do cuidado.
```

### Leitura conceitual

- cenário relativamente estável
- sem marcador crítico
- sem fragilidade intermediária pelos critérios do sistema
- recomendação de seguimento de rotina e manutenção do monitoramento territorial

## Regra de Consistência Obrigatória

A mesma lógica deve ser compartilhada por:

- `src/components/Dashboard/MapComponent.tsx`
- `src/utils/dashboardPresentation.ts`
- `src/components/Dashboard/Dashboard.tsx`, quando houver textos explicativos
- qualquer helper futuro de classificação de risco

### Regra obrigatória

- um mesmo caso não pode ser vermelho no mapa e amarelo no relatório
- um mesmo caso não pode ser amarelo no mapa e verde no relatório
- a classificação deve sair de uma única função centralizada

## Arquitetura da Regra Única

Para transformar esta lógica em fonte única do sistema, a arquitetura recomendada é a seguinte:

### 1. Arquivo central de regras executáveis

Criar um módulo central no código, por exemplo:

- `src/utils/riskClassification.ts`

Esse módulo deve concentrar:

- definição dos critérios de vermelho, amarelo e verde
- regra de reincidência
- regra de porta giratória
- construção do texto final das cadeias do parecer

### 2. Função única de classificação

Esse módulo deve expor uma função única, por exemplo:

- `classifyCaseRisk(...)`

Essa função deve receber os dados necessários do caso e retornar um objeto padronizado, por exemplo:

- cor final
- nível de reincidência
- indicador de porta giratória
- motivos que levaram à classificação
- texto da cadeia correspondente
- texto do parecer correspondente

### 3. Consumo obrigatório pelos componentes

Os componentes não devem mais decidir cor ou cadeia por conta própria.

Eles devem apenas consumir o resultado da função central.

Isso deve valer para:

- mapa
- gerador de relatório
- dashboard
- qualquer outro resumo visual futuro

### 4. Documento como contrato humano

Este arquivo `.md` deve continuar sendo:

- referência oficial de negócio
- documentação de manutenção
- base para revisão de regra

Mas a execução automática do sistema deve acontecer pela camada central de código, não pela leitura direta do markdown.

### 5. Evolução futura para configuração administrativa

Em uma etapa posterior, essa lógica poderá sair de constantes fixas no código e passar a ser alimentada por uma fonte configurável, por exemplo:

- tabela no Supabase para critérios de risco
- tabela no Supabase para textos das cadeias
- aba administrativa no frontend para edição dessas regras

Nesse cenário:

- o administrador altera a regra no frontend
- o sistema salva a configuração em banco
- a função central passa a ler essa configuração
- mapa, relatório e demais componentes continuam obedecendo a mesma fonte única

## Observações de Proteção de Dados

Elementos visuais públicos devem respeitar mascaramento de dados sensíveis.

Exemplo:

- nome do paciente no mapa deve seguir a mesma lógica de mascaramento da tabela, quando a visualização não for de uso restrito

## Situação Atual do Projeto Antes da Consolidação no Código

Hoje o projeto ainda guarda traços da lógica anterior:

- mapa com regra própria
- relatório com regra própria
- documentos históricos registrando a lógica antiga

Por isso, este arquivo deve servir como:

- fonte oficial da regra atual
- referência para manutenção futura
- proteção contra regressão de comportamento
