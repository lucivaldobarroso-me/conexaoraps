import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import {
  GenderPieChart, AgeBarChart, ZoneChart, NeighborhoodsChart, TrendChart, ClinicalRadarChart,
  MedicationChart, SupportChart, DiagnoseChart, RaceChart, NationalityChart
} from './Charts';
import { api } from '../../services/api';
import MapComponent from './MapComponent';
import { DashboardData, OccurrenceDashboardData } from '../../types';

const panelClass = 'bg-white/95 dark:bg-gray-800 rounded-2xl shadow-[0_18px_45px_-24px_rgba(15,23,42,0.35)] p-5 border border-slate-200/70 dark:border-gray-700 flex flex-col backdrop-blur-sm';
const panelClassTall = `${panelClass} h-96`;
const panelClassMedium = `${panelClass} h-80`;
const filterInputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-[#0f4c81] focus:ring-2 focus:ring-[#0f4c81]/15';

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [occurrenceData, setOccurrenceData] = useState<OccurrenceDashboardData | null>(null);
  const [occurrenceDetails, setOccurrenceDetails] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [occurrenceFilter, setOccurrenceFilter] = useState({
    motivoInicial: '',
    motivoConstatado: '',
    metodo: '',
    zona: ''
  });

  // Report Generator State
  const [reportSearchTerm, setReportSearchTerm] = useState('');
  const [generatedReport, setGeneratedReport] = useState('');

  const generateReport = (selectedRow: any[]) => {
    // 1. Find ALL records for this patient to build history
    const pacienteNome = selectedRow[1];
    const allRecords = data?.dadosBrutos.filter((r: any[]) => r[1] === pacienteNome) || [];

    // Sort by Entry Date (Descending) to get the latest info
    // Col 19 is string date, we might need to parse it if format varies, but usually ISO or standard
    // Assuming the format from updated GAS is "dd/mm/yyyy HH:mm:ss | Por..."
    // For sorting, we can rely on ID if sequential, or just reverse the array if it comes chronological

    const historico = allRecords.map((r: any[]) => {
      // Extract data from "dd/mm/yyyy HH:mm:ss | Por: ..."
      const entradaRaw = r[19] || '';
      return {
        data: entradaRaw.split('|')[0]?.trim() || '-',
        responsavelFull: entradaRaw, // The full string "Data | Por: Nome"
        endereco: `${r[5]}, ${r[6]} - ${r[7]} (${r[8]})`, // End, Num, Bairro, Zona
        gps: r[9] || 'NÃ£o georreferenciado',
        bairro: r[7],
        zona: r[8]
      };
    });

    // Latest record (first in the list if we assume latest is last added, but safer to take the selected one or last one)
    // The `selectedRow` comes from the search, let's assume it's the one we want to base the ID details on.
    const latest = selectedRow;

    // Formatting Helpers
    const formatDate = (isoDate: string) => {
      if (!isoDate) return '-';
      try {
        // Try parsing ISO first
        const d = new Date(isoDate);
        if (!isNaN(d.getTime())) return d.toLocaleDateString('pt-BR');
        return isoDate; // Fallback
      } catch { return isoDate; }
    };

    // Extract Data for Report
    const nasc = formatDate(latest[2]);
    const idade = latest[4];
    const sexo = latest[3];
    const raca = latest[22] || 'NÃƒO INFORMADO';
    const nacionalidade = latest[23] || 'BRASILEIRO';
    const bairroAtual = latest[7];
    const zonaAtual = latest[8];
    const diag = latest[11] || 'EM ANÃLISE';
    const occurrence = occurrenceDetails[latest[0]] || {};
    const motivoInicial = occurrence.motivoInicial || 'NÃO INFORMADO';
    const motivoConstatado = occurrence.motivoConstatado || 'NÃO INFORMADO';
    const metodo = occurrence.metodo || 'NÃO INFORMADO';
    const detalheLivre = occurrence.detalheLivre || 'SEM DETALHE LIVRE';

    const medicacao = latest[13]; // Sim/NÃ£o
    const motivoNaoMed = latest[14] || '-';
    const apoioFam = latest[15]; // Sim/NÃ£o
    const apoioRaps = latest[17]; // Sim/NÃ£o

    // --- LOGIC: DECISION TREE (CENÃRIOS) ---
    let analiseGestao = '';
    let corAlerta = ''; // Using emoji for visual representation in text

    const isReincidente = latest[12] === 'Sim' || historico.length > 3; // Rule provided: Reincidente = Sim OR High frequency

    if (isReincidente && apoioRaps === 'NÃ£o') {
      // CADEIA 1: CenÃ¡rio CrÃ­tico (VERMELHO)
      corAlerta = 'ðŸ”´ ALERTA VERMELHO';
      analiseGestao = `CADEIA 1: CenÃ¡rio CrÃ­tico\n` +
        `AnÃ¡lise de GestÃ£o (${corAlerta}): Identificado fenÃ´meno de "Porta GiratÃ³ria" (ReinternaÃ§Ãµes Sucessivas). O sistema sinaliza falha grave na continuidade do cuidado longitudinal. Recomenda-se o Matriciamento Emergencial entre o SAMU 192 e o CAPS de referÃªncia para a repactuaÃ§Ã£o do Projeto TerapÃªutico Singular (PTS), visando a estabilizaÃ§Ã£o urgente do paciente no territÃ³rio e a mitigaÃ§Ã£o de riscos agudos.`;

    } else if (!isReincidente && (medicacao === 'NÃ£o' || apoioFam === 'NÃ£o')) {
      // CADEIA 2: CenÃ¡rio IntermediÃ¡rio (AMARELO) (Logic: Not reincident BUT failing med or family)
      // *Note: User said "Reincidente = 'NÃ£o' (ou pouco)". I'll stick to logic !isReincidente OR frequency <= 3
      corAlerta = 'ðŸŸ¡ ALERTA AMARELO';
      analiseGestao = `CADEIA 2: CenÃ¡rio IntermediÃ¡rio (Alerta de Risco)\n` +
        `AnÃ¡lise de GestÃ£o (${corAlerta}): Identificada instabilidade no suporte terapÃªutico. Embora nÃ£o apresente ciclo de porta giratÃ³ria, o sistema detecta fragilidade no apoio familiar e irregularidade medicamentosa. Recomenda-se Busca Ativa Preventiva pela equipe de AtenÃ§Ã£o BÃ¡sica do territÃ³rio e vinculaÃ§Ã£o ao CAPS para evitar a cronificaÃ§Ã£o da reincidÃªncia e o agravamento do quadro psicossocial.`;

    } else {
      // CADEIA 3: CenÃ¡rio EstÃ¡vel (VERDE)
      corAlerta = 'ðŸŸ¢ ALERTA VERDE';
      analiseGestao = `CADEIA 3: CenÃ¡rio EstÃ¡vel (Monitoramento de Rotina)\n` +
        `AnÃ¡lise de GestÃ£o (${corAlerta}): Fluxo assistencial considerado dentro da normalidade. O sistema indica que o paciente possui suporte familiar e adesÃ£o ao tratamento, sugerindo que o acionamento do SAMU foi um evento isolado de crise. Recomenda-se apenas o encaminhamento de rotina via ficha de referÃªncia para atualizaÃ§Ã£o do PTS na unidade de origem, mantendo o monitoramento territorial padrÃ£o.`;
    }

    // Protocol Generation (Random Sequential Simulation)
    const protocoloNum = Math.floor(Math.random() * 900) + 100; // 100 to 999
    const protocolo = `REL-${protocoloNum}-${new Date().getFullYear()}`;
    const dataEmissao = new Date().toLocaleString('pt-BR');

    // Aggregate Lists
    const listaDatas = historico.map(h => h.data).join(', ');
    const listaEnderecos = historico.map((h, i) => `${i + 1}. ${h.endereco}`).join('\n');
    const listaResponsaveis = historico.map(h => `(${h.responsavelFull})`).join('\n');

    const texto =
      `ðŸ“‘ RELATÃ“RIO DE INTELIGÃŠNCIA E GESTÃƒO DE FLUXO - CONEXÃƒO RAPS
Protocolo: ${protocolo} | Data de EmissÃ£o: ${dataEmissao}

1. IDENTIFICAÃ‡ÃƒO DO PACIENTE
Nome: ${pacienteNome}
Data de Nascimento: ${nasc} (Idade: ${idade} anos)
Sexo: ${sexo} | RaÃ§a/Etnia: ${raca} | Nacionalidade: ${nacionalidade}
TerritÃ³rio: ${bairroAtual} (Zona: ${zonaAtual})

2. ANÃLISE DE REINCIDÃŠNCIA (INDICADOR DE FLUXO)
FrequÃªncia: Este paciente possui ${historico.length} atendimentos registrados no sistema.
Datas de Acionamento: ${listaDatas}

DiagnÃ³stico Principal: ${diag}
Motivo Inicial da Ocorrência: ${motivoInicial}
Motivo Constatado da Ocorrência: ${motivoConstatado}
Método Associado: ${metodo}

LocalizaÃ§Ã£o Georreferenciada (HistÃ³rico de OcorrÃªncias):
${listaEnderecos}

3. AVALIAÃ‡ÃƒO DE VULNERABILIDADE E SUPORTE (GARGALOS)
AdesÃ£o TerapÃªutica: ${medicacao} ${medicacao === 'NÃ£o' ? `(Motivo: ${motivoNaoMed})` : ''}
Suporte Social/Familiar: ${apoioFam} ${apoioFam === 'NÃ£o' ? `(Motivo: ${latest[16] || '-'})` : ''}
VÃ­nculo com a RAPS: ${apoioRaps}

4. OBSERVAÃ‡Ã•ES TÃ‰CNICAS (CAMPO)
"${latest[18] || 'Sem observaÃ§Ãµes.'}"

5. CLASSIFICAÇÃO PSIQUIÁTRICA COMPLEMENTAR
Detalhe Livre:
"${detalheLivre}"

ResponsÃ¡vel pelo(s) registro(s):
${listaResponsaveis}

6. PARECER DE GESTÃƒO E CONDUTA RECOMENDADA
${analiseGestao}
`;

    setGeneratedReport(texto);
    setReportSearchTerm('');
  };

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [stats, occurrenceStats, occurrenceRows] = await Promise.all([
          api.carregarEstatisticas(),
          api.carregarIndicadoresOcorrencia(),
          api.carregarClassificacoesDetalhadas()
        ]);
        setData(stats);
        setOccurrenceData(occurrenceStats);
        setOccurrenceDetails(occurrenceRows);
      } catch (e) {
        console.error("Erro ao carregar estatÃ­sticas", e);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f3f4f6] dark:bg-background-dark">
        <div className="text-primary font-bold animate-pulse">Carregando dados RAPS...</div>
      </div>
    );
  }

  // Transform Data for Charts
  const sexData = data ? [
    { name: 'Masc', value: data.masculino },
    { name: 'Fem', value: data.feminino }
  ] : [];

  const ageData = data ? Object.entries(data.idades).map(([k, v]) => ({ name: k, value: v })) : [];
  const zoneData = data ? Object.entries(data.zonas).map(([k, v]) => ({ name: k, value: v })) : [];

  const bairroData = data ? Object.entries(data.bairros)
    .sort(([, a], [, b]) => (Number(b) || 0) - (Number(a) || 0))
    .slice(0, 10)
    .map(([k, v]) => ({ name: k, value: v })) : [];

  const weeklyData = data ? Object.entries(data.dias).map(([k, v]) => ({ name: k, value: v })) : [];
  const monthlyData = data ? Object.entries(data.mensal).map(([k, v]) => ({ name: k, value: v })) : [];

  const clinicalData = data ? [
    { subject: 'DiagnÃ³stico', A: (data.clinico.diag / data.total) * 100, fullMark: 100 },
    { subject: 'MedicaÃ§Ã£o', A: (data.clinico.med / data.total) * 100, fullMark: 100 },
    { subject: 'FamÃ­lia', A: (data.clinico.fam / data.total) * 100, fullMark: 100 },
    { subject: 'RAPS', A: (data.clinico.raps / data.total) * 100, fullMark: 100 },
  ] : [];

  // New Data Transformations
  const medData = data ? [
    { name: 'Com MedicaÃ§Ã£o', value: data.clinico.med },
    { name: 'Sem MedicaÃ§Ã£o', value: data.total - data.clinico.med }
  ] : [];

  const supportData = data ? [
    { name: 'Apoio Familiar', value: data.clinico.fam },
    { name: 'VÃ­nculo RAPS', value: data.clinico.raps }
  ] : [];

  const diagData = data ? [
    { name: 'Diagnosticados', value: data.clinico.diag },
    { name: 'Em AnÃ¡lise', value: data.total - data.clinico.diag }
  ] : [];

  // Calculate Race and Nationality Stats
  const raceStats = data ? data.dadosBrutos.reduce((acc: any, curr: any[]) => {
    const race = curr[22] || 'NÃƒO INFORMADO';
    acc[race] = (acc[race] || 0) + 1;
    return acc;
  }, {}) : {};
  const raceData = Object.entries(raceStats).map(([name, value]: any) => ({ name, value }));

  const natStats = data ? data.dadosBrutos.reduce((acc: any, curr: any[]) => {
    const nat = curr[23] || 'NÃƒO INFORMADO';
    acc[nat] = (acc[nat] || 0) + 1;
    return acc;
  }, {}) : {};
  const nationalityData = Object.entries(natStats).map(([name, value]: any) => ({ name, value }));

  const occurrenceRows = data ? data.dadosBrutos
    .map((row: any[]) => ({
      row,
      motivoInicial: occurrenceDetails[row[0]]?.motivoInicial || '-',
      motivoConstatado: occurrenceDetails[row[0]]?.motivoConstatado || '-',
      metodo: occurrenceDetails[row[0]]?.metodo || '-',
      detalheLivre: occurrenceDetails[row[0]]?.detalheLivre || '-',
      zona: row[8] || '-'
    }))
    .filter((item) => item.motivoInicial !== '-' || item.motivoConstatado !== '-' || item.detalheLivre !== '-') : [];

  const filteredOccurrenceRows = occurrenceRows.filter((item) => {
    if (occurrenceFilter.motivoInicial && item.motivoInicial !== occurrenceFilter.motivoInicial) return false;
    if (occurrenceFilter.motivoConstatado && item.motivoConstatado !== occurrenceFilter.motivoConstatado) return false;
    if (occurrenceFilter.metodo && item.metodo !== occurrenceFilter.metodo) return false;
    if (occurrenceFilter.zona && item.zona !== occurrenceFilter.zona) return false;
    return true;
  });

  const summarizeOccurrenceRows = (rows: typeof filteredOccurrenceRows) => {
    const criticos = new Set([
      'TENTATIVA DE SUICÍDIO',
      'IDEAÇÃO SUICIDA',
      'SURTO PSICÓTICO',
      'AGITAÇÃO PSICOMOTORA'
    ]);

    const result = {
      totalClassificacoes: 0,
      totalCriticos: 0,
      comDetalheLivre: 0,
      motivosIniciais: {} as Record<string, number>,
      motivosConstatados: {} as Record<string, number>,
      metodosTentativa: {} as Record<string, number>,
      transicoes: {} as Record<string, number>,
      zonasMotivoConstatado: {} as Record<string, number>
    };

    rows.forEach((item) => {
      result.totalClassificacoes++;
      if (item.detalheLivre && item.detalheLivre !== '-') result.comDetalheLivre++;

      result.motivosIniciais[item.motivoInicial] = (result.motivosIniciais[item.motivoInicial] || 0) + 1;
      result.motivosConstatados[item.motivoConstatado] = (result.motivosConstatados[item.motivoConstatado] || 0) + 1;
      result.transicoes[`${item.motivoInicial} -> ${item.motivoConstatado}`] =
        (result.transicoes[`${item.motivoInicial} -> ${item.motivoConstatado}`] || 0) + 1;
      result.zonasMotivoConstatado[item.zona] = (result.zonasMotivoConstatado[item.zona] || 0) + 1;

      if (criticos.has(item.motivoConstatado)) result.totalCriticos++;
      if (item.motivoConstatado === 'TENTATIVA DE SUICÍDIO') {
        result.metodosTentativa[item.metodo] = (result.metodosTentativa[item.metodo] || 0) + 1;
      }
    });

    return result;
  };

  const occurrenceSummary = summarizeOccurrenceRows(filteredOccurrenceRows);

  const occurrenceMotivoInicialOptions = Array.from(new Set(occurrenceRows.map(item => item.motivoInicial).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const occurrenceMotivoConstatadoOptions = Array.from(new Set(occurrenceRows.map(item => item.motivoConstatado).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const occurrenceMetodoOptions = Array.from(new Set(occurrenceRows.map(item => item.metodo).filter((item) => item && item !== '-'))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const occurrenceZonaOptions = Array.from(new Set(occurrenceRows.map(item => item.zona).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR'));


  const motivosConstatadosData = Object.entries(occurrenceSummary.motivosConstatados)
    .sort(([, a], [, b]) => Number(b) - Number(a))
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  const motivosIniciaisData = Object.entries(occurrenceSummary.motivosIniciais)
    .sort(([, a], [, b]) => Number(b) - Number(a))
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  const metodosData = Object.entries(occurrenceSummary.metodosTentativa)
    .sort(([, a], [, b]) => Number(b) - Number(a))
    .map(([name, value]) => ({ name, value }));

  const transicoesData = Object.entries(occurrenceSummary.transicoes)
    .sort(([, a], [, b]) => Number(b) - Number(a))
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  const zonasOcorrenciaData = Object.entries(occurrenceSummary.zonasMotivoConstatado)
    .sort(([, a], [, b]) => Number(b) - Number(a))
    .map(([name, value]) => ({ name, value }));

  const taxaDetalheLivre = occurrenceSummary.totalClassificacoes
    ? Math.round((occurrenceSummary.comDetalheLivre / occurrenceSummary.totalClassificacoes) * 100)
    : 0;

  const reincidenciaPercent = data?.total ? Math.round((data.reincidentes / data.total) * 100) : 0;
  const vinculoRapsPercent = data?.total ? Math.round((data.clinico.raps / data.total) * 100) : 0;
  const coberturaPsiPercent = data?.total ? Math.round((occurrenceSummary.totalClassificacoes / data.total) * 100) : 0;
  const activeOccurrenceFilterCount = Object.values(occurrenceFilter).filter(Boolean).length;
  const hasOccurrenceFilter = activeOccurrenceFilterCount > 0;
  const filteredOccurrenceIds = new Set(filteredOccurrenceRows.map((item) => item.row[0]));

  // Filter Table
  const tableData = data ? data.dadosBrutos.filter(row =>
    row.some((cell: any) => cell && cell.toString().toLowerCase().includes(filter.toLowerCase())) &&
    (!hasOccurrenceFilter || filteredOccurrenceIds.has(row[0]))
  ) : [];

  return (
    <div className="flex h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(15,76,129,0.12),_transparent_32%),linear-gradient(180deg,_#f7fafc_0%,_#eef2f7_100%)] font-display dark:bg-background-dark">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <header className="h-20 shrink-0 border-b border-slate-200/80 bg-white/90 px-6 shadow-sm backdrop-blur-md dark:bg-gray-800 dark:border-gray-700 z-10">
          <div className="flex h-full items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="md:hidden w-8"></div> {/* Space for sidebar toggle */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#0f4c81]">Conexão RAPS</div>
              <h2 className="text-sm md:text-xl font-bold text-slate-800 dark:text-white truncate max-w-[220px] md:max-w-none">
                Dashboard Estratégico de Monitoramento
              </h2>
              <div className="text-[10px] md:text-xs text-slate-500">Vigilância assistencial, análise territorial e inteligência clínica em uma única camada.</div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">Boa Vista - RR</span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">{occurrenceSummary.totalClassificacoes} ocorrências classificadas</span>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">{activeOccurrenceFilterCount} filtros ativos</span>
          </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 md:p-6">
          <div className="max-w-[1600px] mx-auto flex flex-col gap-6">

            <section className="overflow-hidden rounded-[28px] border border-slate-200/70 bg-[linear-gradient(135deg,_#0f2f57_0%,_#0f4c81_52%,_#1b6aa7_100%)] px-6 py-6 text-white shadow-[0_22px_50px_-28px_rgba(15,76,129,0.65)]">
              <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-end">
                <div>
                  <div className="mb-2 inline-flex items-center rounded-full bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-100">
                    Painel operacional e tático
                  </div>
                  <h1 className="max-w-3xl text-2xl font-bold leading-tight md:text-3xl">
                    Uma visão única do cuidado em saúde mental, do acionamento territorial até a classificação psiquiátrica.
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-relaxed text-blue-100/90">
                    O painel agora combina fluxo assistencial, leitura territorial, risco clínico e qualidade do registro em uma estrutura mais limpa para gestão, CAPS e regulação.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-blue-100">Cobertura psiquiátrica</div>
                    <div className="mt-1 text-3xl font-bold">{coberturaPsiPercent}%</div>
                    <div className="text-xs text-blue-100/80">dos atendimentos já têm camada clínica nova</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-blue-100">Casos críticos</div>
                    <div className="mt-1 text-3xl font-bold">{occurrenceSummary.totalCriticos}</div>
                    <div className="text-xs text-blue-100/80">eventos com maior prioridade territorial</div>
                  </div>
                </div>
              </div>
            </section>

            {/* KPI Cards */}
            <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-[linear-gradient(135deg,_#0f2f57_0%,_#0f4c81_100%)] p-5 text-white shadow-[0_20px_45px_-25px_rgba(15,47,87,0.8)]">
                <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/10 blur-2xl transition-transform duration-300 group-hover:scale-125" />
                <div className="relative">
                  <div className="text-xs opacity-80 mb-1 uppercase tracking-wider">Atendimentos Total</div>
                  <h1 className="text-3xl md:text-4xl font-bold">{data?.total || 0}</h1>
                  <p className="mt-3 max-w-xs text-[11px] leading-relaxed text-blue-100/90">Volume acumulado de intervenções registradas na base assistencial monitorada.</p>
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-2xl border border-rose-200/70 bg-[linear-gradient(135deg,_#7f1d1d_0%,_#b91c1c_100%)] p-5 text-white shadow-[0_20px_45px_-25px_rgba(185,28,28,0.8)]">
                <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/10 blur-2xl transition-transform duration-300 group-hover:scale-125" />
                <div className="relative">
                  <div className="text-xs opacity-80 mb-1 uppercase tracking-wider">Taxa de Reincidência</div>
                  <h1 className="text-3xl md:text-4xl font-bold">{reincidenciaPercent}%</h1>
                  <p className="mt-3 max-w-xs text-[11px] leading-relaxed text-rose-100/90">Ajuda a reconhecer padrões de porta giratória e necessidade de revisão do cuidado longitudinal.</p>
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-2xl border border-cyan-200/70 bg-[linear-gradient(135deg,_#0f766e_0%,_#0891b2_100%)] p-5 text-white shadow-[0_20px_45px_-25px_rgba(8,145,178,0.75)] sm:col-span-2 md:col-span-1">
                <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/10 blur-2xl transition-transform duration-300 group-hover:scale-125" />
                <div className="relative">
                  <div className="text-xs opacity-80 mb-1 uppercase tracking-wider">Vínculo com a RAPS</div>
                  <h1 className="text-3xl md:text-4xl font-bold">{vinculoRapsPercent}%</h1>
                  <p className="mt-3 max-w-xs text-[11px] leading-relaxed text-cyan-100/90">Percentual com acompanhamento na rede, útil para medir cobertura e necessidade de busca ativa.</p>
                </div>
              </div>
            </section>

            {/* Row 1 Charts */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className={panelClassTall}>
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">GÃªnero</h3>
                  <p className="text-[10px] text-gray-400 mb-2 leading-tight">DistribuiÃ§Ã£o epidemiolÃ³gica por sexo, auxiliando no planejamento de polÃ­ticas de saÃºde especÃ­ficas.</p>
                </div>
                <div className="flex-1"><GenderPieChart data={sexData} /></div>
              </div>
              <div className={panelClassTall}>
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">Faixa EtÃ¡ria</h3>
                  <p className="text-[10px] text-gray-400 mb-2 leading-tight">Mapeamento geracional dos surtos; identifica grupos vulnerÃ¡veis para aÃ§Ãµes preventivas focais.</p>
                </div>
                <div className="flex-1"><AgeBarChart data={ageData} /></div>
              </div>
              <div className={panelClassTall}>
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">Casos por Zona</h3>
                  <p className="text-[10px] text-gray-400 mb-2 leading-tight">AnÃ¡lise da pressÃ£o assistencial por territÃ³rio, definindo as Ã¡reas prioritÃ¡rias para matriciamento.</p>
                </div>
                <div className="flex-1"><ZoneChart data={zoneData} /></div>
              </div>
            </section>

            {/* Row 2 Charts - Diversity (New) */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={panelClassMedium}>
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">RaÃ§a / Etnia</h3>
                  <p className="text-[10px] text-gray-400 mb-2 leading-tight">AnÃ¡lise da diversidade Ã©tnica atendida, essencial para a implementaÃ§Ã£o de protocolos interculturais.</p>
                </div>
                <div className="flex-1"><RaceChart data={raceData} /></div>
              </div>
              <div className={panelClassMedium}>
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">Nacionalidade</h3>
                  <p className="text-[10px] text-gray-400 mb-2 leading-tight">Monitoramento do impacto dos fluxos migratÃ³rios na rede de urgÃªncia e planejamento de suporte linguÃ­stico.</p>
                </div>
                <div className="flex-1"><NationalityChart data={nationalityData} /></div>
              </div>
            </section>

            {/* Row 3 Charts - Care Analysis */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className={panelClassTall}>
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">DiagnÃ³sticos</h3>
                  <p className="text-[10px] text-gray-400 mb-2 leading-tight">PrevalÃªncia das principais patologias atendidas, essencial para o dimensionamento de insumos.</p>
                </div>
                <div className="flex-1"><DiagnoseChart data={diagData} /></div>
              </div>
              <div className={panelClassTall}>
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">AdesÃ£o Ã  MedicaÃ§Ã£o</h3>
                  <p className="text-[10px] text-gray-400 mb-2 leading-tight">Indicador crÃ­tico de estabilidade; correlaciona a falta de medicamento com o aumento das crises.</p>
                </div>
                <div className="flex-1"><MedicationChart data={medData} /></div>
              </div>
              <div className={panelClassTall}>
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">Rede de Apoio</h3>
                  <p className="text-[10px] text-gray-400 mb-2 leading-tight">AvaliaÃ§Ã£o do suporte familiar e comunitÃ¡rio; principal preditor para o fenÃ´meno de 'Porta GiratÃ³ria'.</p>
                </div>
                <div className="flex-1"><SupportChart data={supportData} /></div>
              </div>
            </section>

            {/* Row 4 Charts - Advanced Analysis */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className={`lg:col-span-2 ${panelClassTall}`}>
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">Volume por Bairro (Top 10)</h3>
                  <p className="text-[10px] text-gray-400 mb-2 leading-tight">IdentificaÃ§Ã£o das manchas territoriais com maior demanda por socorro psicossocial.</p>
                </div>
                <div className="flex-1"><NeighborhoodsChart data={bairroData} /></div>
              </div>
              <div className={panelClassTall}>
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">Indicadores ClÃ­nicos (Radar)</h3>
                  <p className="text-[10px] text-gray-400 mb-2 leading-tight">VisÃ£o multidimensional da estabilidade do paciente; avalia equilÃ­brio entre suporte clÃ­nico e social.</p>
                </div>
                <div className="flex-1"><ClinicalRadarChart data={clinicalData} /></div>
              </div>
            </section>

            <section className="overflow-hidden rounded-[24px] border border-violet-200/70 bg-[linear-gradient(135deg,_rgba(91,44,111,0.08),_rgba(15,76,129,0.03))] shadow-[0_16px_40px_-28px_rgba(91,44,111,0.5)]">
              <div className="border-b border-violet-100/80 px-5 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="font-bold text-[#5B2C6F] uppercase text-sm">Filtros da Classificação Psiquiátrica</h3>
                    <p className="text-[11px] text-slate-500 mt-1">Esses filtros organizam os novos painéis, o mapa clínico e a tabela detalhada.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">{occurrenceSummary.totalClassificacoes} classificações visíveis</span>
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">{activeOccurrenceFilterCount} filtros ativos</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 px-5 py-5 md:grid-cols-4">
                <select
                  value={occurrenceFilter.motivoInicial}
                  onChange={(e) => setOccurrenceFilter(prev => ({ ...prev, motivoInicial: e.target.value }))}
                  className={filterInputClass}
                >
                  <option value="">Motivo Inicial</option>
                  {occurrenceMotivoInicialOptions.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>

                <select
                  value={occurrenceFilter.motivoConstatado}
                  onChange={(e) => setOccurrenceFilter(prev => ({ ...prev, motivoConstatado: e.target.value }))}
                  className={filterInputClass}
                >
                  <option value="">Motivo Constatado</option>
                  {occurrenceMotivoConstatadoOptions.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>

                <select
                  value={occurrenceFilter.metodo}
                  onChange={(e) => setOccurrenceFilter(prev => ({ ...prev, metodo: e.target.value }))}
                  className={filterInputClass}
                >
                  <option value="">Método</option>
                  {occurrenceMetodoOptions.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>

                <select
                  value={occurrenceFilter.zona}
                  onChange={(e) => setOccurrenceFilter(prev => ({ ...prev, zona: e.target.value }))}
                  className={filterInputClass}
                >
                  <option value="">Zona</option>
                  {occurrenceZonaOptions.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end border-t border-violet-100/80 px-5 py-4">
                <button
                  onClick={() => setOccurrenceFilter({ motivoInicial: '', motivoConstatado: '', metodo: '', zona: '' })}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  LIMPAR FILTROS
                </button>
              </div>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              <div className="group relative overflow-hidden rounded-2xl border border-violet-200/80 bg-[linear-gradient(135deg,_#4c1d95_0%,_#6d28d9_100%)] p-5 text-white shadow-[0_20px_45px_-25px_rgba(109,40,217,0.8)]">
                <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/10 blur-2xl transition-transform duration-300 group-hover:scale-125" />
                <div className="relative">
                  <div className="text-xs opacity-80 mb-1 uppercase tracking-wider">Classificações Psiquiátricas</div>
                  <h1 className="text-3xl md:text-4xl font-bold">{occurrenceSummary.totalClassificacoes}</h1>
                  <p className="mt-3 max-w-xs text-[11px] leading-relaxed text-violet-100/90">Total de atendimentos com motivo inicial, motivo constatado e detalhe livre na camada nova.</p>
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-2xl border border-rose-200/80 bg-[linear-gradient(135deg,_#7f1d1d_0%,_#be123c_100%)] p-5 text-white shadow-[0_20px_45px_-25px_rgba(190,24,93,0.8)]">
                <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/10 blur-2xl transition-transform duration-300 group-hover:scale-125" />
                <div className="relative">
                  <div className="text-xs opacity-80 mb-1 uppercase tracking-wider">Casos Críticos</div>
                  <h1 className="text-3xl md:text-4xl font-bold">{occurrenceSummary.totalCriticos}</h1>
                  <p className="mt-3 max-w-xs text-[11px] leading-relaxed text-rose-100/90">Foco imediato em tentativa de suicídio, ideação suicida, surto psicótico e agitação psicomotora.</p>
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-[linear-gradient(135deg,_#065f46_0%,_#059669_100%)] p-5 text-white shadow-[0_20px_45px_-25px_rgba(5,150,105,0.8)]">
                <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/10 blur-2xl transition-transform duration-300 group-hover:scale-125" />
                <div className="relative">
                  <div className="text-xs opacity-80 mb-1 uppercase tracking-wider">Detalhe Livre Preenchido</div>
                  <h1 className="text-3xl md:text-4xl font-bold">{taxaDetalheLivre}%</h1>
                  <p className="mt-3 max-w-xs text-[11px] leading-relaxed text-emerald-100/90">Indicador de qualidade do registro narrativo para gestão, auditoria e leitura clínica assistencial.</p>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className={panelClassTall}>
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">Motivos Constatados</h3>
                  <p className="text-[10px] text-gray-400 mb-2 leading-tight">Mostra os subtipos psiquiÃ¡tricos efetivamente constatados na cena e ajuda a orientar resposta da rede.</p>
                </div>
                <div className="flex-1"><NeighborhoodsChart data={motivosConstatadosData} /></div>
              </div>
              <div className={panelClassTall}>
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">Motivos Iniciais</h3>
                  <p className="text-[10px] text-gray-400 mb-2 leading-tight">Volume do motivo inicialmente percebido, Ãºtil para anÃ¡lise de triagem e abordagem inicial em campo.</p>
                </div>
                <div className="flex-1"><NeighborhoodsChart data={motivosIniciaisData} /></div>
              </div>
              <div className={panelClassTall}>
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">MÃ©todo em Tentativa de SuicÃ­dio</h3>
                  <p className="text-[10px] text-gray-400 mb-2 leading-tight">DistribuiÃ§Ã£o dos mÃ©todos registrados para vigilÃ¢ncia, prevenÃ§Ã£o e pactuaÃ§Ã£o intersetorial.</p>
                </div>
                <div className="flex-1"><DiagnoseChart data={metodosData} /></div>
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={panelClassTall}>
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">TransiÃ§Ãµes Inicial x Constatado</h3>
                  <p className="text-[10px] text-gray-400 mb-2 leading-tight">Confronta a hipÃ³tese inicial com a classificaÃ§Ã£o final para apoiar treinamento, regulaÃ§Ã£o e melhoria do fluxo.</p>
                </div>
                <div className="flex-1"><NeighborhoodsChart data={transicoesData} /></div>
              </div>
              <div className={panelClassTall}>
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">OcorrÃªncias PsiquiÃ¡tricas por Zona</h3>
                  <p className="text-[10px] text-gray-400 mb-2 leading-tight">Distribui a nova classificaÃ§Ã£o por territÃ³rio para apoiar busca ativa, CAPS de referÃªncia e vigilÃ¢ncia local.</p>
                </div>
                <div className="flex-1"><ZoneChart data={zonasOcorrenciaData} /></div>
              </div>
            </section>

            {/* Table Section */}
            <section className="overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/95 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur-sm dark:bg-gray-800 dark:border-gray-700">
              <div className="border-b border-slate-200/70 px-5 py-4 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-[#003366] dark:text-white uppercase text-sm">Espelho Analítico do Atendimento</h3>
                  <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-slate-500">Visualização estruturada do banco assistencial, agora com a nova camada psiquiátrica integrada para auditoria clínica e leitura gerencial.</p>
                </div>
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 shadow-sm transition-all focus-within:ring-2 focus-within:ring-[#003366]/15 dark:bg-gray-700 dark:border-gray-600 w-full md:w-80">
                  <span className="material-symbols-outlined text-gray-400 text-[20px]">search</span>
                  <input
                    type="text"
                    placeholder="Filtrar por nome, bairro, ID..."
                    className="ml-2 w-full border-none bg-transparent text-sm text-gray-700 focus:ring-0 dark:text-gray-200"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left border-collapse text-[10px] whitespace-nowrap">
                  <thead className="sticky top-0 z-10 bg-[linear-gradient(90deg,_#0f2f57_0%,_#0f4c81_100%)] shadow-sm">
                    <tr>
                      {["ID", "NOME", "NASC", "SEXO", "IDADE", "RAÇA", "NACIONALIDADE", "BAIRRO", "ZONA", "DIAGNOSTICO", "REINCIDENTE", "MEDICACAO", "MOTIVO_NAO_MED", "APOIO_FAM", "MOTIVO_NAO_FAM", "APOIO_RAPS", "OBSERVACOES"].map(h => (
                        <th key={h} className="px-3 py-3 font-bold text-white border-b border-white/10 uppercase tracking-tighter">{h}</th>
                      ))}
                      <th className="px-3 py-3 font-bold text-white border-b border-white/10 uppercase tracking-tighter">MOTIVO_INICIAL</th>
                      <th className="px-3 py-3 font-bold text-white border-b border-white/10 uppercase tracking-tighter">MOTIVO_CONSTATADO</th>
                      <th className="px-3 py-3 font-bold text-white border-b border-white/10 uppercase tracking-tighter">METODO</th>
                      <th className="px-3 py-3 font-bold text-white border-b border-white/10 uppercase tracking-tighter">DETALHE_LIVRE</th>
                      <th className="px-3 py-3 font-bold text-white border-b border-white/10 uppercase tracking-tighter">RESPONSÁVEL</th>
                      <th className="px-3 py-3 font-bold text-white border-b border-white/10 uppercase tracking-tighter">ENTRADA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {tableData.filter((row: any[]) => row[0]) // Filter out rows without ID (Column A)
                      .map((row: any[], i: number) => {

                        // Format Date Helper
                        const formatDate = (dateString: string) => {
                          if (!dateString) return '-';
                          try {
                            const d = new Date(dateString);
                            if (isNaN(d.getTime())) return dateString; // Return original if not a valid date
                            return d.toLocaleDateString('pt-BR');
                          } catch { return dateString; }
                        };

                        // Mapping to original column order from Backend
                        // 0:ID, 1:Nome, 2:Nasc, 3:Sexo, 4:Idade, 5:End, 6:Num, 7:Bairro, 8:Zona, 9:GPS, 10:Ref
                        // 11:Diag, 12:Reinc, 13:Med, 14:PqMed, 15:Fam, 16:PqFam, 17:RAPS, 18:Obs, 19:DataEntrada
                        // 20:Responsavel, 21:Vazio, 22:Raca, 23:Nacionalidade

                        const rowOccurrence = occurrenceDetails[row[0]] || {};

                        const displayRow = [
                          row[0], // ID
                          "****************", // Nome (Masked)
                          formatDate(row[2]), // Nasc (Formatted)
                          row[3], // Sexo
                          row[4], // Idade
                          row[22] || '-', // RaÃ§a (New)
                          row[23] || '-', // Nacionalidade (New)
                          row[7], // Bairro
                          row[8], // Zona
                          // GPS Removed
                          row[11], // Diag
                          row[12], // Reinc
                          row[13], // Med
                          row[14], // Motivo nao med
                          row[15], // Fam
                          row[16], // Motivo nao fam
                          row[17], // RAPS
                          row[18], // Obs/Info Extra
                          rowOccurrence.motivoInicial || '-', // Motivo inicial
                          rowOccurrence.motivoConstatado || '-', // Motivo constatado
                          rowOccurrence.metodo || '-', // Metodo
                          rowOccurrence.detalheLivre || '-', // Detalhe livre
                          row[20] || 'Desconhecido', // Responsável
                          row[19] // Entrada (Timestamp - already formatted string from GAS hopefully, or raw)
                        ];

                        return (
                          <tr key={i} className={`${i % 2 === 0 ? 'bg-white/80 dark:bg-gray-800' : 'bg-slate-50/70 dark:bg-gray-800/70'} hover:bg-blue-50/70 dark:hover:bg-blue-900/10 transition-colors`}>
                            {displayRow.map((cell, j) => (
                              <td key={j} className="border-r border-slate-100 px-3 py-2 text-gray-700 last:border-r-0 dark:text-gray-300 dark:border-gray-700/60">
                                {cell || '-'}
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Map Section */}
            <section className="overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/95 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur-sm">
              <div className="border-b border-slate-200/70 bg-[linear-gradient(90deg,_rgba(15,76,129,0.08),_rgba(15,76,129,0.02))] px-5 py-4">
                <h3 className="flex items-center gap-2 font-bold text-[#003366] uppercase text-sm">
                  <span className="material-symbols-outlined">location_on</span>
                  Monitoramento Geográfico em Tempo Real
                </h3>
                <p className="mt-1 text-[11px] text-slate-500">Mapa operacional com semáforo clínico, calor territorial e leitura rápida dos casos classificados.</p>
              </div>
              <div className="w-full h-[550px] relative z-0">
                <MapComponent data={tableData} occurrenceDetails={occurrenceDetails} />
              </div>
              <div className="border-t border-slate-200/70 bg-slate-50 px-5 py-4 text-xs leading-relaxed text-slate-600">
                <h4 className="mb-2 font-bold uppercase text-[#003366]">Leitura Territorial e Semáforo de Gestão</h4>
                <p className="mb-2">Esta interface cartogrÃ¡fica processa a "Geografia do Cuidado" em Boa Vista, convertendo dados assistenciais em indicadores espaciais de vulnerabilidade. O sistema utiliza uma <strong>CategorizaÃ§Ã£o CromÃ¡tica Tripartite (SemÃ¡foro de GestÃ£o)</strong> para triagem epidemiolÃ³gica imediata:</p>
                <ul className="list-none space-y-1 mb-2 pl-2 border-l-2 border-gray-200">
                  <li><span className="text-red-500 font-bold">â— Pontos Vermelhos (Crise de Fluxo):</span> Sinalizam o fenÃ´meno de "Porta GiratÃ³ria", identificando pacientes com alta reincidÃªncia e fragilidade de vÃ­nculo com a RAPS.</li>
                  <li><span className="text-yellow-500 font-bold">â— Pontos Amarelos (Risco Assistencial):</span> Indicam instabilidade no suporte terapÃªutico, barreiras linguÃ­sticas ou falhas na adesÃ£o medicamentosa.</li>
                  <li><span className="text-green-500 font-bold">â— Pontos Verdes (Estabilidade):</span> Representam atendimentos com suporte familiar preservado e fluxo assistencial dentro da normalidade.</li>
                </ul>
                <p>AlÃ©m da localizaÃ§Ã£o das ocorrÃªncias (Pinos), a camada de <strong>Mapa de Calor</strong> sobrepÃµe a densidade de chamados aos equipamentos pÃºblicos e Ã¡reas de vulnerabilidade, permitindo que os gestores identifiquem onde a rede precisa fortalecer as aÃ§Ãµes de matriciamento e busca ativa territorial.</p>
              </div>
            </section>

            {/* [NEW] Report Generator Widget */}
            <section className="overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/95 p-6 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur-sm dark:bg-gray-800 dark:border-gray-700">
              <h3 className="mb-4 flex items-center gap-2 font-bold text-[#003366] dark:text-white uppercase text-sm">
                <span className="material-symbols-outlined">assignment</span>
                Gerador de Relatório Clínico Automático
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 border-r border-slate-200 dark:border-gray-700 pr-6">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Buscar Paciente</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400">search</span>
                    <input
                      type="text"
                      placeholder="Digite o nome..."
                      value={reportSearchTerm}
                      onChange={(e) => setReportSearchTerm(e.target.value.toUpperCase())}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-sm uppercase shadow-sm focus:ring-2 focus:ring-[#003366]/15"
                    />
                    {reportSearchTerm.length > 2 && (
                      <div className="absolute z-10 max-h-40 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
                        {data?.dadosBrutos
                          .filter((row: any[]) => row[1] && row[1].toString().includes(reportSearchTerm))
                          .slice(0, 5)
                          .map((row: any[], idx: number) => (
                            <div
                              key={idx}
                              className="cursor-pointer border-b border-slate-100 px-4 py-2 text-xs uppercase text-gray-700 hover:bg-slate-50"
                              onClick={() => generateReport(row)}
                            >
                              {row[1]}
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">
                    * Digite para buscar no banco de dados carregado.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">PrÃ©via do RelatÃ³rio</label>
                  <div className="h-96 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-relaxed text-gray-700 shadow-inner whitespace-pre-wrap dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300">
                    {generatedReport || "Aguardando seleÃ§Ã£o de paciente..."}
                  </div>
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      onClick={() => {
                        if (generatedReport) {
                          navigator.clipboard.writeText(generatedReport);
                          alert("Copiado!");
                        }
                      }}
                      className="flex items-center gap-1 rounded-xl bg-[#003366] px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-900"
                    >
                      <span className="material-symbols-outlined text-[16px]">content_copy</span>
                      COPIAR RELATÃ“RIO
                    </button>
                  </div>
                </div>
              </div>
            </section>

          </div>

          {/* Footer */}
          <footer className="mx-auto mt-12 mb-6 max-w-3xl text-center text-[10px] leading-relaxed text-slate-400">
            "O Dashboard ConexÃ£o RAPS utiliza algoritmos de geoprocessamento e inteligÃªncia de dados para transformar registros assistenciais em indicadores de vigilÃ¢ncia em saÃºde mental, promovendo a integraÃ§Ã£o intercultural e a fluidez do fluxo assistencial em Boa Vista â€“ RR."
          </footer>

        </main>
      </div>
    </div>
  );
};


export default Dashboard;


