import { LegacyDashboardRecord, OccurrenceDetailRecord, OccurrenceDetailsMap } from '../types';
import { classificarRiscoCaso } from './classificacaoRisco';

export const MASKED_PATIENT_NAME = '****************';

export const formatLegacyDate = (dateString: string) => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('pt-BR');
  } catch {
    return dateString;
  }
};

export const buildDashboardTableRow = (
  record: LegacyDashboardRecord,
  rowOccurrence?: OccurrenceDetailRecord
) => [
  record.id,
  MASKED_PATIENT_NAME,
  formatLegacyDate(record.nascimento),
  record.sexo,
  record.idade,
  record.raca || '-',
  record.nacionalidade || '-',
  record.bairro,
  record.zona,
  record.diagnostico,
  record.reincidente,
  record.medicacao,
  record.motivoNaoMedicacao,
  record.apoioFamiliar,
  record.motivoNaoFamiliar,
  record.apoioRaps,
  record.observacoes,
  rowOccurrence?.motivoInicial || '-',
  rowOccurrence?.motivoConstatado || '-',
  rowOccurrence?.metodo || '-',
  rowOccurrence?.detalheLivre || '-',
  record.responsavel || 'Desconhecido',
  record.entrada
];

export const buildPatientReport = (
  latest: LegacyDashboardRecord,
  allRecords: LegacyDashboardRecord[],
  occurrenceDetails: OccurrenceDetailsMap
) => {
  const historico = allRecords.map((record) => {
    const entradaRaw = record.entrada;
    return {
      data: entradaRaw.split('|')[0]?.trim() || '-',
      responsavelFull: entradaRaw,
      endereco: `${record.endereco}, ${record.numero} - ${record.bairro} (${record.zona})`,
      gps: record.gps || 'Não georreferenciado',
      bairro: record.bairro,
      zona: record.zona
    };
  });

  const nasc = formatLegacyDate(latest.nascimento);
  const idade = latest.idade;
  const sexo = latest.sexo;
  const raca = latest.raca || 'NÃO INFORMADO';
  const nacionalidade = latest.nacionalidade || 'BRASILEIRO';
  const bairroAtual = latest.bairro;
  const zonaAtual = latest.zona;
  const diag = latest.diagnostico || 'EM ANÁLISE';
  const occurrence = occurrenceDetails[latest.id];
  const motivoInicial = occurrence?.motivoInicial || 'NÃO INFORMADO';
  const motivoConstatado = occurrence?.motivoConstatado || 'NÃO INFORMADO';
  const metodo = occurrence?.metodo || 'NÃO INFORMADO';
  const detalheLivre = occurrence?.detalheLivre || 'SEM DETALHE LIVRE';

  const medicacao = latest.medicacao;
  const motivoNaoMed = latest.motivoNaoMedicacao || '-';
  const apoioFam = latest.apoioFamiliar;
  const apoioRaps = latest.apoioRaps;

  const classificacaoRisco = classificarRiscoCaso({
    subtipoMotivoConstatado: occurrence?.motivoConstatado,
    reincidenteCampo: latest.reincidente,
    totalAtendimentosPaciente: allRecords.length,
    usaMedicacao: latest.medicacao,
    apoioFamiliar: latest.apoioFamiliar,
    apoioRaps: latest.apoioRaps
  });

  const analiseGestao = `${classificacaoRisco.tituloCadeia}\n${classificacaoRisco.parecerGestao}`;

  const protocoloNum = Math.floor(Math.random() * 900) + 100;
  const protocolo = `REL-${protocoloNum}-${new Date().getFullYear()}`;
  const dataEmissao = new Date().toLocaleString('pt-BR');

  const listaDatas = historico.map((h) => h.data).join(', ');
  const listaEnderecos = historico.map((h, i) => `${i + 1}. ${h.endereco}`).join('\n');
  const listaResponsaveis = historico.map((h) => `(${h.responsavelFull})`).join('\n');

  return `RELATÓRIO DE INTELIGÊNCIA E GESTÃO DE FLUXO - CONEXÃO RAPS
Protocolo: ${protocolo} | Data de Emissão: ${dataEmissao}

1. IDENTIFICAÇÃO DO PACIENTE
Nome: ${latest.nome}
Data de Nascimento: ${nasc} (Idade: ${idade} anos)
Sexo: ${sexo} | Raça/Etnia: ${raca} | Nacionalidade: ${nacionalidade}
Território: ${bairroAtual} (Zona: ${zonaAtual})

2. ANÁLISE DE REINCIDÊNCIA (INDICADOR DE FLUXO)
Frequência: Este paciente possui ${historico.length} atendimentos registrados no sistema.
Datas de Acionamento: ${listaDatas}

Diagnóstico Principal: ${diag}
Motivo Inicial da Ocorrência: ${motivoInicial}
Motivo Constatado da Ocorrência: ${motivoConstatado}
Método Associado: ${metodo}

Localização Georreferenciada (Histórico de Ocorrências):
${listaEnderecos}

3. AVALIAÇÃO DE VULNERABILIDADE E SUPORTE (GARGALOS)
Adesão Terapêutica: ${medicacao} ${medicacao === 'Não' ? `(Motivo: ${motivoNaoMed})` : ''}
Suporte Social/Familiar: ${apoioFam} ${apoioFam === 'Não' ? `(Motivo: ${latest.motivoNaoFamiliar || '-'})` : ''}
Vínculo com a RAPS: ${apoioRaps}

4. OBSERVAÇÕES TÉCNICAS (CAMPO)
"${latest.observacoes || 'Sem observações.'}"

5. CLASSIFICAÇÃO PSIQUIÁTRICA COMPLEMENTAR
Detalhe Livre:
"${detalheLivre}"

Responsável pelo(s) registro(s):
${listaResponsaveis}

6. PARECER DE GESTÃO E CONDUTA RECOMENDADA
${analiseGestao}
`;
};
