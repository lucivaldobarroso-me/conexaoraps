export type CorRisco = 'vermelho' | 'amarelo' | 'verde';

export type NivelReincidencia =
  | 'sem_reincidencia'
  | 'reincidencia_simples'
  | 'reincidencia_importante';

export type MotivoClassificacao =
  | 'tentativa_de_suicidio'
  | 'ideacao_suicida'
  | 'surto_psicotico'
  | 'agitacao_psicomotora'
  | 'dependencia_quimica_uso_substancias'
  | 'sem_medicacao'
  | 'sem_apoio_familiar'
  | 'sem_apoio_raps'
  | 'reincidencia_simples'
  | 'reincidencia_importante';

export type ChaveCadeia = 'cadeia_1' | 'cadeia_2' | 'cadeia_3';

export type EntradaClassificacaoRisco = {
  subtipoMotivoConstatado?: string | null;
  reincidenteCampo?: string | null;
  totalAtendimentosPaciente?: number | null;
  usaMedicacao?: string | null;
  apoioFamiliar?: string | null;
  apoioRaps?: string | null;
};

export type ResultadoClassificacaoRisco = {
  cor: CorRisco;
  nivelReincidencia: NivelReincidencia;
  portaGiratoria: boolean;
  motivos: MotivoClassificacao[];
  tituloCadeia: string;
  parecerGestao: string;
  chaveCadeia: ChaveCadeia;
};

const SUBTIPOS_CRITICOS_VERMELHO = [
  'TENTATIVA DE SUICIDIO',
  'IDEACAO SUICIDA',
  'SURTO PSICOTICO',
  'AGITACAO PSICOMOTORA'
] as const;

const SUBTIPOS_ALERTA_AMARELO = [
  'DEPENDENCIA QUIMICA',
  'USO DE SUBSTANCIAS',
  'DEPENDENCIA QUIMICA / USO DE SUBSTANCIAS'
] as const;

type DefinicaoCadeia = {
  chave: ChaveCadeia;
  titulo: string;
  parecer: string;
};

const DEFINICOES_CADEIA: Record<CorRisco, DefinicaoCadeia> = {
  vermelho: {
    chave: 'cadeia_1',
    titulo: 'CADEIA 1: Cenário Crítico',
    parecer:
      'Análise de Gestão (ALERTA VERMELHO): O caso apresenta indicadores de elevada gravidade assistencial, com presença de subtipo psiquiátrico crítico e/ou reincidência importante, já caracterizada como porta giratória. Essa condição sugere risco ampliado, necessidade de resposta prioritária e possível fragilidade na continuidade do cuidado. Recomenda-se articulação imediata entre o SAMU 192, a Atenção Básica e a Rede de Atenção Psicossocial, com matriciamento emergencial, revisão do Projeto Terapêutico Singular (PTS) e monitoramento intensivo no território para estabilização clínica e redução de novos eventos agudos.'
  },
  amarelo: {
    chave: 'cadeia_2',
    titulo: 'CADEIA 2: Cenário Intermediário (Alerta de Risco)',
    parecer:
      'Análise de Gestão (ALERTA AMARELO): O caso apresenta sinais de vulnerabilidade assistencial, sem atingir neste momento os critérios de cenário crítico. O sistema identificou fatores que podem comprometer a estabilidade do cuidado, tais como reincidência simples, dependência química ou uso de substâncias, fragilidade no apoio familiar, baixa adesão medicamentosa e ausência de apoio da Rede de Atenção Psicossocial. Recomenda-se busca ativa preventiva, fortalecimento do acompanhamento territorial e aproximação com a rede de referência, a fim de reduzir o risco de agravamento clínico, intensificação da reincidência e cronificação do quadro psicossocial.'
  },
  verde: {
    chave: 'cadeia_3',
    titulo: 'CADEIA 3: Cenário Estável (Monitoramento de Rotina)',
    parecer:
      'Análise de Gestão (ALERTA VERDE): O caso foi classificado como relativamente estável dentro dos critérios atuais do sistema, sem presença de subtipo psiquiátrico crítico, sem reincidência importante e sem marcadores intermediários relevantes de vulnerabilidade assistencial. Recomenda-se seguimento de rotina no território, manutenção do monitoramento pela rede de referência e atualização do Projeto Terapêutico Singular (PTS) sempre que necessário, preservando a continuidade do cuidado.'
  }
};

export const normalizarTextoClassificacao = (valor: string | null | undefined): string =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

const valorEhSim = (valor: string | null | undefined): boolean =>
  normalizarTextoClassificacao(valor) === 'SIM';

const valorEhNao = (valor: string | null | undefined): boolean =>
  normalizarTextoClassificacao(valor) === 'NAO';

const contemSubtipo = (
  subtipoNormalizado: string,
  subtiposAceitos: readonly string[]
): boolean => subtiposAceitos.some((subtipo) => subtipoNormalizado.includes(subtipo));

export const calcularNivelReincidencia = (
  totalAtendimentosPaciente: number | null | undefined,
  reincidenteCampo: string | null | undefined
): NivelReincidencia => {
  const total = Number(totalAtendimentosPaciente ?? 0);

  if (total >= 3) return 'reincidencia_importante';
  if (total >= 2) return 'reincidencia_simples';
  if (valorEhSim(reincidenteCampo)) return 'reincidencia_simples';

  return 'sem_reincidencia';
};

export const verificarPortaGiratoria = (
  nivelReincidencia: NivelReincidencia
): boolean => nivelReincidencia === 'reincidencia_importante';

export const listarMotivosClassificacao = (
  entrada: EntradaClassificacaoRisco,
  nivelReincidencia: NivelReincidencia
): MotivoClassificacao[] => {
  const subtipoNormalizado = normalizarTextoClassificacao(entrada.subtipoMotivoConstatado);
  const motivos = new Set<MotivoClassificacao>();

  if (contemSubtipo(subtipoNormalizado, ['TENTATIVA DE SUICIDIO'])) {
    motivos.add('tentativa_de_suicidio');
  }

  if (contemSubtipo(subtipoNormalizado, ['IDEACAO SUICIDA'])) {
    motivos.add('ideacao_suicida');
  }

  if (contemSubtipo(subtipoNormalizado, ['SURTO PSICOTICO'])) {
    motivos.add('surto_psicotico');
  }

  if (contemSubtipo(subtipoNormalizado, ['AGITACAO PSICOMOTORA'])) {
    motivos.add('agitacao_psicomotora');
  }

  if (contemSubtipo(subtipoNormalizado, SUBTIPOS_ALERTA_AMARELO)) {
    motivos.add('dependencia_quimica_uso_substancias');
  }

  if (valorEhNao(entrada.usaMedicacao)) {
    motivos.add('sem_medicacao');
  }

  if (valorEhNao(entrada.apoioFamiliar)) {
    motivos.add('sem_apoio_familiar');
  }

  if (valorEhNao(entrada.apoioRaps)) {
    motivos.add('sem_apoio_raps');
  }

  if (nivelReincidencia === 'reincidencia_simples') {
    motivos.add('reincidencia_simples');
  }

  if (nivelReincidencia === 'reincidencia_importante') {
    motivos.add('reincidencia_importante');
  }

  return Array.from(motivos);
};

export const definirCorRisco = (motivos: MotivoClassificacao[]): CorRisco => {
  const possuiMotivoVermelho = motivos.some((motivo) =>
    [
      'tentativa_de_suicidio',
      'ideacao_suicida',
      'surto_psicotico',
      'agitacao_psicomotora',
      'reincidencia_importante'
    ].includes(motivo)
  );

  if (possuiMotivoVermelho) return 'vermelho';

  const possuiMotivoAmarelo = motivos.some((motivo) =>
    [
      'dependencia_quimica_uso_substancias',
      'sem_medicacao',
      'sem_apoio_familiar',
      'sem_apoio_raps',
      'reincidencia_simples'
    ].includes(motivo)
  );

  if (possuiMotivoAmarelo) return 'amarelo';

  return 'verde';
};

export const obterDefinicaoCadeia = (cor: CorRisco): DefinicaoCadeia =>
  DEFINICOES_CADEIA[cor];

export const classificarRiscoCaso = (
  entrada: EntradaClassificacaoRisco
): ResultadoClassificacaoRisco => {
  const nivelReincidencia = calcularNivelReincidencia(
    entrada.totalAtendimentosPaciente,
    entrada.reincidenteCampo
  );

  const portaGiratoria = verificarPortaGiratoria(nivelReincidencia);
  const motivos = listarMotivosClassificacao(entrada, nivelReincidencia);
  const cor = definirCorRisco(motivos);
  const definicaoCadeia = obterDefinicaoCadeia(cor);

  return {
    cor,
    nivelReincidencia,
    portaGiratoria,
    motivos,
    tituloCadeia: definicaoCadeia.titulo,
    parecerGestao: definicaoCadeia.parecer,
    chaveCadeia: definicaoCadeia.chave
  };
};

export const obterSubtiposCriticosVermelho = (): string[] => [...SUBTIPOS_CRITICOS_VERMELHO];

export const obterSubtiposAlertaAmarelo = (): string[] => [...SUBTIPOS_ALERTA_AMARELO];
