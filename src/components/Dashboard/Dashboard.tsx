import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import {
  GenderPieChart, AgeBarChart, ZoneChart, NeighborhoodsChart, TrendChart, ClinicalRadarChart,
  MedicationChart, SupportChart, DiagnoseChart, RaceChart, NationalityChart
} from './Charts';
import { api } from '../../services/api';
import MapComponent from './MapComponent';
import DashboardDataTable from './DashboardDataTable';
import ReportGenerator from './ReportGenerator';
import { DashboardData, LegacyDashboardRow, OccurrenceDashboardData, OccurrenceDetailsMap } from '../../types';
import { includesFilterTerm, toLegacyDashboardRecord } from '../../utils/dashboardRecords';
import { buildPatientReport } from '../../utils/dashboardPresentation';

type ChartDatum = {
  name: string;
  value: number;
};

const panelClass = 'bg-white/95 dark:bg-gray-800 rounded-2xl shadow-[0_18px_45px_-24px_rgba(15,23,42,0.35)] p-5 border border-slate-200/70 dark:border-gray-700 flex flex-col backdrop-blur-sm';
const panelClassTall = `${panelClass} h-96`;
const panelClassMedium = `${panelClass} h-80`;
const filterInputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-[#0f4c81] focus:ring-2 focus:ring-[#0f4c81]/15';

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [occurrenceData, setOccurrenceData] = useState<OccurrenceDashboardData | null>(null);
  const [occurrenceDetails, setOccurrenceDetails] = useState<OccurrenceDetailsMap>({});
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

  const generateReport = (selectedRow: LegacyDashboardRow) => {
    const selectedRecord = toLegacyDashboardRecord(selectedRow);
    const allRecords = data.dadosBrutos
      .map(toLegacyDashboardRecord)
      .filter((record) => record.nome === selectedRecord.nome) || [];

    setGeneratedReport(buildPatientReport(selectedRecord, allRecords, occurrenceDetails));
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
        console.error("Erro ao carregar estatísticas", e);
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

  if (!data) {
    return (
      <div className="flex h-screen overflow-hidden bg-[#f8f9fa] font-display">
        <Sidebar />
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-lg rounded-[2rem] border border-red-100 bg-white p-8 text-center shadow-2xl shadow-slate-900/10">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <span className="material-symbols-outlined text-[34px]">error</span>
            </div>
            <h1 className="mb-2 text-2xl font-black text-[#003f81]">Não foi possível carregar o painel</h1>
            <p className="mb-6 text-sm leading-relaxed text-slate-500">
              Os dados estatísticos não foram retornados pelo Supabase. Verifique a conexão, as views do banco ou tente novamente em alguns instantes.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-2xl bg-[#003f81] px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-[#0056ac]"
            >
              Recarregar painel
            </button>
          </div>
        </main>
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
    { subject: 'Diagnóstico', A: (data.clinico.diag / data.total) * 100, fullMark: 100 },
    { subject: 'Medicação', A: (data.clinico.med / data.total) * 100, fullMark: 100 },
    { subject: 'Família', A: (data.clinico.fam / data.total) * 100, fullMark: 100 },
    { subject: 'RAPS', A: (data.clinico.raps / data.total) * 100, fullMark: 100 },
  ] : [];

  // New Data Transformations
  const medData = data ? [
    { name: 'Com Medicação', value: data.clinico.med },
    { name: 'Sem Medicação', value: data.total - data.clinico.med }
  ] : [];

  const supportData = data ? [
    { name: 'Apoio Familiar', value: data.clinico.fam },
    { name: 'Vínculo RAPS', value: data.clinico.raps }
  ] : [];

  const diagData = data ? [
    { name: 'Diagnosticados', value: data.clinico.diag },
    { name: 'Em Análise', value: data.total - data.clinico.diag }
  ] : [];

  // Calculate Race and Nationality Stats
  const raceStats: Record<string, number> = data ? data.dadosBrutos.reduce((acc, curr) => {
    const race = toLegacyDashboardRecord(curr).raca || 'NÃO INFORMADO';
    acc[race] = (acc[race] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) : {};
  const raceData: ChartDatum[] = Object.entries(raceStats).map(([name, value]) => ({ name, value }));

  const natStats: Record<string, number> = data ? data.dadosBrutos.reduce((acc, curr) => {
    const nat = toLegacyDashboardRecord(curr).nacionalidade || 'NÃO INFORMADO';
    acc[nat] = (acc[nat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) : {};
  const nationalityData: ChartDatum[] = Object.entries(natStats).map(([name, value]) => ({ name, value }));

  const occurrenceRows = data ? data.dadosBrutos
    .map((row) => {
      const record = toLegacyDashboardRecord(row);
      return {
        row,
        record,
        motivoInicial: occurrenceDetails[record.id]?.motivoInicial || '-',
        motivoConstatado: occurrenceDetails[record.id]?.motivoConstatado || '-',
        metodo: occurrenceDetails[record.id]?.metodo || '-',
        detalheLivre: occurrenceDetails[record.id]?.detalheLivre || '-',
        zona: record.zona || '-'
      };
    })
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

  const occurrenceMotivoInicialOptions = Array.from(new Set(occurrenceRows.map(item => item.motivoInicial).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));
  const occurrenceMotivoConstatadoOptions = Array.from(new Set(occurrenceRows.map(item => item.motivoConstatado).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));
  const occurrenceMetodoOptions = Array.from(new Set(occurrenceRows.map(item => item.metodo).filter((item) => item && item !== '-'))).sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));
  const occurrenceZonaOptions = Array.from(new Set(occurrenceRows.map(item => item.zona).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));


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
  const filteredOccurrenceIds = new Set(filteredOccurrenceRows.map((item) => item.record.id));

  // Filter Table
  const tableData = data ? data.dadosBrutos.filter((row) =>
    includesFilterTerm(row, filter) &&
    (!hasOccurrenceFilter || filteredOccurrenceIds.has(toLegacyDashboardRecord(row).id))
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
                  <h1 className="text-3xl md:text-4xl font-bold">{data.total || 0}</h1>
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
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">Gênero</h3>
                  <p className="text-[10px] text-gray-400 mb-2 leading-tight">Distribuição epidemiológica por sexo, auxiliando no planejamento de políticas de saúde específicas.</p>
                </div>
                <div className="flex-1"><GenderPieChart data={sexData} /></div>
              </div>
              <div className={panelClassTall}>
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">Faixa Etária</h3>
                  <p className="text-[10px] text-gray-400 mb-2 leading-tight">Mapeamento geracional dos surtos; identifica grupos vulneráveis para ações preventivas focais.</p>
                </div>
                <div className="flex-1"><AgeBarChart data={ageData} /></div>
              </div>
              <div className={panelClassTall}>
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">Casos por Zona</h3>
                  <p className="text-[10px] text-gray-400 mb-2 leading-tight">Análise da pressão assistencial por território, definindo as áreas prioritárias para matriciamento.</p>
                </div>
                <div className="flex-1"><ZoneChart data={zoneData} /></div>
              </div>
            </section>

            {/* Row 2 Charts - Diversity (New) */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={panelClassMedium}>
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">Raça / Etnia</h3>
                  <p className="text-[10px] text-gray-400 mb-2 leading-tight">Análise da diversidade étnica atendida, essencial para a implementação de protocolos interculturais.</p>
                </div>
                <div className="flex-1"><RaceChart data={raceData} /></div>
              </div>
              <div className={panelClassMedium}>
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">Nacionalidade</h3>
                  <p className="text-[10px] text-gray-400 mb-2 leading-tight">Monitoramento do impacto dos fluxos migratórios na rede de urgência e planejamento de suporte linguístico.</p>
                </div>
                <div className="flex-1"><NationalityChart data={nationalityData} /></div>
              </div>
            </section>

            {/* Row 3 Charts - Care Analysis */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className={panelClassTall}>
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">Diagnósticos</h3>
                  <p className="text-[10px] text-gray-400 mb-2 leading-tight">Prevalência das principais patologias atendidas, essencial para o dimensionamento de insumos.</p>
                </div>
                <div className="flex-1"><DiagnoseChart data={diagData} /></div>
              </div>
              <div className={panelClassTall}>
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">Adesão à Medicação</h3>
                  <p className="text-[10px] text-gray-400 mb-2 leading-tight">Indicador crítico de estabilidade; correlaciona a falta de medicamento com o aumento das crises.</p>
                </div>
                <div className="flex-1"><MedicationChart data={medData} /></div>
              </div>
              <div className={panelClassTall}>
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">Rede de Apoio</h3>
                  <p className="text-[10px] text-gray-400 mb-2 leading-tight">Avaliação do suporte familiar e comunitário; principal preditor para o fenômeno de 'Porta Giratória'.</p>
                </div>
                <div className="flex-1"><SupportChart data={supportData} /></div>
              </div>
            </section>

            {/* Row 4 Charts - Advanced Analysis */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className={`lg:col-span-2 ${panelClassTall}`}>
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">Volume por Bairro (Top 10)</h3>
                  <p className="text-[10px] text-gray-400 mb-2 leading-tight">Identificação das manchas territoriais com maior demanda por socorro psicossocial.</p>
                </div>
                <div className="flex-1"><NeighborhoodsChart data={bairroData} /></div>
              </div>
              <div className={panelClassTall}>
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">Indicadores Clínicos (Radar)</h3>
                  <p className="text-[10px] text-gray-400 mb-2 leading-tight">Visão multidimensional da estabilidade do paciente; avalia equilíbrio entre suporte clínico e social.</p>
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
                  <p className="text-[10px] text-gray-400 mb-2 leading-tight">Mostra os subtipos psiquiátricos efetivamente constatados na cena e ajuda a orientar resposta da rede.</p>
                </div>
                <div className="flex-1"><NeighborhoodsChart data={motivosConstatadosData} /></div>
              </div>
              <div className={panelClassTall}>
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">Motivos Iniciais</h3>
                  <p className="text-[10px] text-gray-400 mb-2 leading-tight">Volume do motivo inicialmente percebido, útil para análise de triagem e abordagem inicial em campo.</p>
                </div>
                <div className="flex-1"><NeighborhoodsChart data={motivosIniciaisData} /></div>
              </div>
              <div className={panelClassTall}>
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">Método em Tentativa de Suicídio</h3>
                  <p className="text-[10px] text-gray-400 mb-2 leading-tight">Distribuição dos métodos registrados para vigilância, prevenção e pactuação intersetorial.</p>
                </div>
                <div className="flex-1"><DiagnoseChart data={metodosData} /></div>
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={panelClassTall}>
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">Transições Inicial x Constatado</h3>
                  <p className="text-[10px] text-gray-400 mb-2 leading-tight">Confronta a hipótese inicial com a classificação final para apoiar treinamento, regulação e melhoria do fluxo.</p>
                </div>
                <div className="flex-1"><NeighborhoodsChart data={transicoesData} /></div>
              </div>
              <div className={panelClassTall}>
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">Ocorrências Psiquiátricas por Zona</h3>
                  <p className="text-[10px] text-gray-400 mb-2 leading-tight">Distribui a nova classificação por território para apoiar busca ativa, CAPS de referência e vigilância local.</p>
                </div>
                <div className="flex-1"><ZoneChart data={zonasOcorrenciaData} /></div>
              </div>
            </section>

            <DashboardDataTable
              tableData={tableData}
              filter={filter}
              onFilterChange={setFilter}
              occurrenceDetails={occurrenceDetails}
            />

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
                <p className="mb-2">Esta interface cartográfica processa a "Geografia do Cuidado" em Boa Vista, convertendo dados assistenciais em indicadores espaciais de vulnerabilidade. O sistema utiliza uma <strong>Categorização Cromática Tripartite (Semáforo de Gestão)</strong> para triagem epidemiológica imediata:</p>
                <ul className="list-none space-y-1 mb-2 pl-2 border-l-2 border-gray-200">
                  <li><span className="text-red-500 font-bold">● Pontos Vermelhos (Crise de Fluxo):</span> Sinalizam o fenômeno de "Porta Giratória", identificando pacientes com alta reincidência e fragilidade de vínculo com a RAPS.</li>
                  <li><span className="text-yellow-500 font-bold">● Pontos Amarelos (Risco Assistencial):</span> Indicam instabilidade no suporte terapêutico, barreiras linguísticas ou falhas na adesão medicamentosa.</li>
                  <li><span className="text-green-500 font-bold">● Pontos Verdes (Estabilidade):</span> Representam atendimentos com suporte familiar preservado e fluxo assistencial dentro da normalidade.</li>
                </ul>
                <p>Além da localização das ocorrências (Pinos), a camada de <strong>Mapa de Calor</strong> sobrepõe a densidade de chamados aos equipamentos públicos e áreas de vulnerabilidade, permitindo que os gestores identifiquem onde a rede precisa fortalecer as ações de matriciamento e busca ativa territorial.</p>
              </div>
            </section>

            <ReportGenerator
              rows={data.dadosBrutos || []}
              reportSearchTerm={reportSearchTerm}
              onReportSearchTermChange={setReportSearchTerm}
              onGenerateReport={generateReport}
              generatedReport={generatedReport}
            />

          </div>

          {/* Footer */}
          <footer className="mx-auto mt-12 mb-6 max-w-3xl text-center text-[10px] leading-relaxed text-slate-400">
            "O Dashboard Conexão RAPS utiliza algoritmos de geoprocessamento e inteligência de dados para transformar registros assistenciais em indicadores de vigilância em saúde mental, promovendo a integração intercultural e a fluidez do fluxo assistencial em Boa Vista - RR."
          </footer>

        </main>
      </div>
    </div>
  );
};


export default Dashboard;





