export type ValorBinarioIndicador = 0 | 1;

export type TipoContencaoCodigo = 0 | 1 | 2 | 3;

export type TipoContencaoRotulo = 'Nenhuma' | 'Fisica' | 'Quimica' | 'Ambas';

export type ClasseFarmaco =
  | 'Antipsicotico'
  | 'Benzodiazepinico'
  | 'Anestesico'
  | 'Opioide'
  | 'Anticonvulsivante'
  | 'Bloqueador neuromuscular'
  | 'Antidoto'
  | 'Outro'
  | 'Nao informado';

export type VulnerabilidadeCompostaCodigo = 0 | 1 | 2;

export type VulnerabilidadeCompostaRotulo = 'Baixa' | 'Moderada' | 'Alta';

export type TurnoAtendimento = 'Dia' | 'Noite' | 'Nao informado';

export type EntradaIndicadoresEstudo = {
  contencaoFisica?: string | boolean | number | null;
  contencaoQuimica?: string | boolean | number | null;
  medicacaoContencaoQuimica?: string | string[] | null;
  usoAlcool?: string | boolean | number | null;
  usoDrogas?: string | boolean | number | null;
  presencaFamiliar?: string | boolean | number | null;
  apoioRaps?: string | boolean | number | null;
  usaMedicacao?: string | boolean | number | null;
  totalAtendimentosPaciente?: number | string | null;
  horarioAtendimento?: string | null;
};

export type IndicadoresEstudo = {
  contencaoFisicaBin: ValorBinarioIndicador;
  contencaoQuimicaBin: ValorBinarioIndicador;
  tipoContencaoCodigo: TipoContencaoCodigo;
  tipoContencaoRotulo: TipoContencaoRotulo;
  medicamentosContencaoQuimica: string[];
  classesFarmacos: ClasseFarmaco[];
  usoAlcoolBin: ValorBinarioIndicador;
  usoDrogasBin: ValorBinarioIndicador;
  familiarPresenteBin: ValorBinarioIndicador;
  fatoresVulnerabilidade: number;
  vulnerabilidadeCompostaCodigo: VulnerabilidadeCompostaCodigo;
  vulnerabilidadeCompostaRotulo: VulnerabilidadeCompostaRotulo;
  numeroAtendimentos: number;
  reincidenciaBin: ValorBinarioIndicador;
  portaGiratoriaBin: ValorBinarioIndicador;
  turno: TurnoAtendimento;
};

const normalizarTexto = (valor: unknown): string =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

export const converterParaBinario = (valor: unknown): ValorBinarioIndicador => {
  if (valor === true || valor === 1) return 1;
  if (valor === false || valor === 0) return 0;

  const texto = normalizarTexto(valor);
  return ['SIM', 'S', 'YES', 'TRUE', '1'].includes(texto) ? 1 : 0;
};

export const calcularTipoContencao = (
  contencaoFisica: unknown,
  contencaoQuimica: unknown
): { codigo: TipoContencaoCodigo; rotulo: TipoContencaoRotulo } => {
  const fisica = converterParaBinario(contencaoFisica);
  const quimica = converterParaBinario(contencaoQuimica);

  if (fisica && quimica) return { codigo: 3, rotulo: 'Ambas' };
  if (fisica) return { codigo: 1, rotulo: 'Fisica' };
  if (quimica) return { codigo: 2, rotulo: 'Quimica' };
  return { codigo: 0, rotulo: 'Nenhuma' };
};

export const separarMedicamentos = (valor: string | string[] | null | undefined): string[] => {
  const lista = Array.isArray(valor) ? valor : String(valor ?? '').split(';');

  return lista
    .map((item) => normalizarTexto(item))
    .filter(Boolean);
};

export const classificarFarmaco = (medicamento: string | null | undefined): ClasseFarmaco => {
  const texto = normalizarTexto(medicamento);
  if (!texto) return 'Nao informado';

  if (texto.includes('HALOPERIDOL')) return 'Antipsicotico';
  if (texto.includes('DIAZEPAM') || texto.includes('DIAZEPAN') || texto.includes('MIDAZOLAM')) {
    return 'Benzodiazepinico';
  }
  if (texto.includes('KETAMINA') || texto.includes('ETOMIDATO') || texto.includes('LIDOCAINA')) {
    return 'Anestesico';
  }
  if (texto.includes('FENTANIL') || texto.includes('MORFINA')) return 'Opioide';
  if (texto.includes('FENITOINA') || texto.includes('FENOBARBITAL')) return 'Anticonvulsivante';
  if (texto.includes('SUCCINILCOLINA')) return 'Bloqueador neuromuscular';
  if (texto.includes('FLUMAZENIL') || texto.includes('NALOXONE')) return 'Antidoto';

  return 'Outro';
};

export const calcularVulnerabilidadeComposta = (fatores: {
  usoAlcool?: unknown;
  usoDrogas?: unknown;
  presencaFamiliar?: unknown;
  apoioRaps?: unknown;
  usaMedicacao?: unknown;
}): {
  totalFatores: number;
  codigo: VulnerabilidadeCompostaCodigo;
  rotulo: VulnerabilidadeCompostaRotulo;
} => {
  const totalFatores =
    converterParaBinario(fatores.usoAlcool) +
    converterParaBinario(fatores.usoDrogas) +
    (converterParaBinario(fatores.presencaFamiliar) ? 0 : 1) +
    (converterParaBinario(fatores.apoioRaps) ? 0 : 1) +
    (converterParaBinario(fatores.usaMedicacao) ? 0 : 1);

  if (totalFatores >= 2) return { totalFatores, codigo: 2, rotulo: 'Alta' };
  if (totalFatores === 1) return { totalFatores, codigo: 1, rotulo: 'Moderada' };
  return { totalFatores, codigo: 0, rotulo: 'Baixa' };
};

export const calcularReincidenciaEstudo = (
  totalAtendimentosPaciente: number | string | null | undefined
): {
  numeroAtendimentos: number;
  reincidenciaBin: ValorBinarioIndicador;
  portaGiratoriaBin: ValorBinarioIndicador;
} => {
  const numeroAtendimentos = Number(totalAtendimentosPaciente ?? 0);
  const totalValido = Number.isFinite(numeroAtendimentos) ? Math.max(0, numeroAtendimentos) : 0;

  return {
    numeroAtendimentos: totalValido,
    reincidenciaBin: totalValido >= 2 ? 1 : 0,
    portaGiratoriaBin: totalValido >= 3 ? 1 : 0
  };
};

export const calcularTurno = (horarioAtendimento: string | null | undefined): TurnoAtendimento => {
  const texto = String(horarioAtendimento ?? '').trim();
  const match = texto.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 'Nao informado';

  const hora = Number(match[1]);
  const minuto = Number(match[2]);
  if (!Number.isInteger(hora) || !Number.isInteger(minuto) || hora > 23 || minuto > 59) {
    return 'Nao informado';
  }

  return hora >= 6 && hora < 18 ? 'Dia' : 'Noite';
};

export const calcularIndicadoresEstudo = (
  entrada: EntradaIndicadoresEstudo
): IndicadoresEstudo => {
  const tipoContencao = calcularTipoContencao(
    entrada.contencaoFisica,
    entrada.contencaoQuimica
  );
  const medicamentos = separarMedicamentos(entrada.medicacaoContencaoQuimica);
  const classesFarmacos = Array.from(new Set(medicamentos.map(classificarFarmaco)));
  const vulnerabilidade = calcularVulnerabilidadeComposta({
    usoAlcool: entrada.usoAlcool,
    usoDrogas: entrada.usoDrogas,
    presencaFamiliar: entrada.presencaFamiliar,
    apoioRaps: entrada.apoioRaps,
    usaMedicacao: entrada.usaMedicacao
  });
  const reincidencia = calcularReincidenciaEstudo(entrada.totalAtendimentosPaciente);

  return {
    contencaoFisicaBin: converterParaBinario(entrada.contencaoFisica),
    contencaoQuimicaBin: converterParaBinario(entrada.contencaoQuimica),
    tipoContencaoCodigo: tipoContencao.codigo,
    tipoContencaoRotulo: tipoContencao.rotulo,
    medicamentosContencaoQuimica: medicamentos,
    classesFarmacos,
    usoAlcoolBin: converterParaBinario(entrada.usoAlcool),
    usoDrogasBin: converterParaBinario(entrada.usoDrogas),
    familiarPresenteBin: converterParaBinario(entrada.presencaFamiliar),
    fatoresVulnerabilidade: vulnerabilidade.totalFatores,
    vulnerabilidadeCompostaCodigo: vulnerabilidade.codigo,
    vulnerabilidadeCompostaRotulo: vulnerabilidade.rotulo,
    numeroAtendimentos: reincidencia.numeroAtendimentos,
    reincidenciaBin: reincidencia.reincidenciaBin,
    portaGiratoriaBin: reincidencia.portaGiratoriaBin,
    turno: calcularTurno(entrada.horarioAtendimento)
  };
};
