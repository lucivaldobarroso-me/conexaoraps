import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Sidebar from '../Dashboard/Sidebar';
import { api } from '../../services/api';
import type { IndicadoresEstudoRecord } from '../../types';

const cardClass = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]';
const tableHeaderClass = 'px-3 py-3 text-left text-[10px] font-black uppercase tracking-wide text-white';
const tableCellClass = 'border-r border-slate-100 px-3 py-2 text-[11px] text-slate-700 last:border-r-0';
const chartColorByLabel: Record<string, string> = {
  BAIXA: '#0f766e',
  MODERADA: '#d97706',
  ALTA: '#b91c1c',
  LEVE: '#0f766e',
  GRAVE: '#b91c1c',
  'FAMILIAR PRESENTE': '#0f766e',
  'SEM FAMILIAR': '#b91c1c',
  'PRESENTE COLABORATIVO': '#0f766e',
  'PRESENTE NAO COLABORATIVO': '#d97706',
  'NAO PRESENTE': '#b91c1c',
  BENZODIAZEPINICO: '#2563eb',
  ANTIPSICOTICO: '#7c3aed',
  ANESTESICO: '#0891b2',
  OPIOIDE: '#be123c',
  ANTICONVULSIVANTE: '#4f46e5',
  'BLOQUEADOR NEUROMUSCULAR': '#9333ea',
  ANTIDOTO: '#16a34a',
  OUTRO: '#64748b',
  'NAO INFORMADO': '#94a3b8',
  'NAO CLASSIFICAVEL': '#94a3b8'
};

const logicalOrder: Record<string, number> = {
  BAIXA: 1,
  MODERADA: 2,
  ALTA: 3,
  LEVE: 1,
  GRAVE: 3,
  'FAMILIAR PRESENTE': 1,
  'SEM FAMILIAR': 2,
  'PRESENTE COLABORATIVO': 1,
  'PRESENTE NAO COLABORATIVO': 2,
  'NAO PRESENTE': 3
};

const countWhere = (rows: IndicadoresEstudoRecord[], predicate: (row: IndicadoresEstudoRecord) => boolean) =>
  rows.filter(predicate).length;

type CrossTabRow = {
  label: string;
  total: number;
  comContencao: number;
  semContencao: number;
  percentualContencao: string;
};

const percent = (value: number, total: number) => {
  if (!total) return '0%';
  return `${Math.round((value / total) * 100)}%`;
};

const hasContencao = (row: IndicadoresEstudoRecord) =>
  Number(row.contencao_fisica_bin) === 1 || Number(row.contencao_quimica_bin) === 1;

const isSim = (value: unknown) => String(value ?? '').trim().toUpperCase() === 'SIM';
const isNao = (value: unknown) => ['NAO', 'NÃO'].includes(normalizeText(value));
const isSimNaoConhecido = (value: unknown) => ['SIM', 'NAO', 'NÃO'].includes(normalizeText(value));

const normalizeText = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

const getVulnerabilidadeComposta = (row: IndicadoresEstudoRecord) => {
  if (row.qualidade_vulnerabilidade === 'INSUFICIENTE') return 'NAO CLASSIFICAVEL';
  if (row.vulnerabilidade_composta) return row.vulnerabilidade_composta;

  const situacaoFamiliar = normalizeText(row.situacao_familiar);
  const familiarConhecido =
    isSimNaoConhecido(row.presenca_familiar) ||
    ['PRESENTE COLABORATIVO', 'PRESENTE NAO COLABORATIVO', 'NAO PRESENTE', 'NÃO PRESENTE'].includes(situacaoFamiliar) ||
    isSimNaoConhecido(row.apoio_fam);
  const informacoes =
    (isSimNaoConhecido(row.uso_alcool) ? 1 : 0) +
    (isSimNaoConhecido(row.uso_drogas) ? 1 : 0) +
    (familiarConhecido ? 1 : 0) +
    (isSimNaoConhecido(row.apoio_raps) ? 1 : 0) +
    (isSimNaoConhecido(row.medicacao) ? 1 : 0);

  if (informacoes < 2) return 'NAO CLASSIFICAVEL';

  const fatores =
    (isSim(row.uso_alcool) ? 1 : 0) +
    (isSim(row.uso_drogas) ? 1 : 0) +
    (
      isNao(row.presenca_familiar) ||
      situacaoFamiliar === 'NAO PRESENTE' ||
      situacaoFamiliar === 'NÃO PRESENTE' ||
      situacaoFamiliar === 'PRESENTE NAO COLABORATIVO'
        ? 1
        : 0
    ) +
    (isNao(row.apoio_raps) ? 1 : 0) +
    (isNao(row.medicacao) ? 1 : 0);

  if (fatores >= 2) return 'ALTA';
  if (fatores === 1) return 'MODERADA';
  return 'BAIXA';
};

const getQualidadeVulnerabilidade = (row: IndicadoresEstudoRecord) => {
  if (row.qualidade_vulnerabilidade) return row.qualidade_vulnerabilidade;

  const situacaoFamiliar = normalizeText(row.situacao_familiar);
  const familiarConhecido =
    isSimNaoConhecido(row.presenca_familiar) ||
    ['PRESENTE COLABORATIVO', 'PRESENTE NAO COLABORATIVO', 'NAO PRESENTE', 'NÃO PRESENTE'].includes(situacaoFamiliar) ||
    isSimNaoConhecido(row.apoio_fam);
  const informacoes =
    (isSimNaoConhecido(row.uso_alcool) ? 1 : 0) +
    (isSimNaoConhecido(row.uso_drogas) ? 1 : 0) +
    (familiarConhecido ? 1 : 0) +
    (isSimNaoConhecido(row.apoio_raps) ? 1 : 0) +
    (isSimNaoConhecido(row.medicacao) ? 1 : 0);

  if (informacoes >= 4) return 'COMPLETA';
  if (informacoes >= 2) return 'PARCIAL';
  return 'INSUFICIENTE';
};

const getGravidadeClinica = (row: IndicadoresEstudoRecord) => {
  if (row.gravidade_clinica) return row.gravidade_clinica;

  const motivo = normalizeText(row.motivo_constatado);
  const graveMotivos = [
    'TENTATIVA DE SUICIDIO',
    'IDEACAO SUICIDA',
    'SURTO PSICOTICO',
    'AGITACAO PSICOMOTORA'
  ];

  if (
    isSim(row.risco_agressao) ||
    normalizeText(row.nivel_consciencia) === 'INCONSCIENTE' ||
    normalizeText(row.sinais_vitais) === 'COM ALTERACAO' ||
    graveMotivos.includes(motivo)
  ) {
    return 'GRAVE';
  }

  if (
    normalizeText(row.nivel_consciencia) === 'CONFUSO' ||
    hasContencao(row) ||
    Number(row.uso_alcool_bin) === 1 ||
    Number(row.uso_drogas_bin) === 1
  ) {
    return 'MODERADA';
  }

  return 'LEVE';
};

const getClasseFarmaco = (row: IndicadoresEstudoRecord) => {
  if (row.classe_farmaco_contencao) return row.classe_farmaco_contencao;

  const medicacao = normalizeText(row.medicacao_contencao_quimica);
  if (!medicacao) return 'NAO INFORMADO';
  if (medicacao.includes('DIAZEP') || medicacao.includes('MIDAZOLAM')) return 'BENZODIAZEPINICO';
  if (medicacao.includes('HALOPERIDOL')) return 'ANTIPSICOTICO';
  if (medicacao.includes('KETAMINA') || medicacao.includes('ETOMIDATO') || medicacao.includes('LIDOCAINA')) return 'ANESTESICO';
  if (medicacao.includes('FENTANIL') || medicacao.includes('MORFINA')) return 'OPIOIDE';
  if (medicacao.includes('FENITOINA') || medicacao.includes('FENOBARBITAL')) return 'ANTICONVULSIVANTE';
  if (medicacao.includes('SUCCINILCOLINA')) return 'BLOQUEADOR NEUROMUSCULAR';
  if (medicacao.includes('FLUMAZENIL') || medicacao.includes('NALOXONE')) return 'ANTIDOTO';
  return 'OUTRO';
};

const temClasseFarmaco = (row: IndicadoresEstudoRecord, classe: string) =>
  getClasseFarmaco(row) === classe;

const buildCrossTab = (
  rows: IndicadoresEstudoRecord[],
  getLabel: (row: IndicadoresEstudoRecord) => string
): CrossTabRow[] => {
  const grouped = rows.reduce((acc: Record<string, IndicadoresEstudoRecord[]>, row) => {
    const label = getLabel(row) || 'NAO INFORMADO';
    if (!acc[label]) acc[label] = [];
    acc[label].push(row);
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([label, groupRows]) => {
      const comContencao = countWhere(groupRows, hasContencao);
      const total = groupRows.length;

      return {
        label,
        total,
        comContencao,
        semContencao: total - comContencao,
        percentualContencao: percent(comContencao, total)
      };
    })
    .sort((a, b) => {
      const orderA = logicalOrder[a.label] ?? 999;
      const orderB = logicalOrder[b.label] ?? 999;
      return orderA - orderB || b.total - a.total || a.label.localeCompare(b.label, 'pt-BR');
    });
};

const getHighestCrossTabRow = (rows: CrossTabRow[]) =>
  rows
    .filter((row) => row.total > 0)
    .sort((a, b) =>
      Number(b.percentualContencao.replace('%', '')) - Number(a.percentualContencao.replace('%', '')) ||
      b.total - a.total
    )[0];

const maskName = '****************';
const filterInputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-[#0f4c81] focus:ring-2 focus:ring-[#0f4c81]/15';

const getYear = (row: IndicadoresEstudoRecord) => {
  const date = String(row.data_atendimento || '').slice(0, 10);
  if (date.match(/^\d{4}-\d{2}-\d{2}$/)) return date.slice(0, 4);

  const idYearMatch = String(row.id_externo || '').match(/-(\d{4})$/);
  return idYearMatch?.[1] || 'NAO INFORMADO';
};

const getMonth = (row: IndicadoresEstudoRecord) => {
  const date = String(row.data_atendimento || '').slice(0, 10);
  return date.match(/^\d{4}-\d{2}-\d{2}$/) ? date.slice(5, 7) : 'NAO INFORMADO';
};

const uniqueOptions = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));

const escapeCsv = (value: unknown) => {
  const text = String(value ?? '').replace(/"/g, '""');
  return `"${text}"`;
};

const downloadCsv = (filename: string, rows: IndicadoresEstudoRecord[]) => {
  const headers = [
    'id_externo',
    'sexo',
    'idade',
    'bairro',
    'zona',
    'data_atendimento',
    'vtr',
    'contencao_fisica',
    'contencao_quimica',
    'tipo_contencao',
    'medicacao_contencao_quimica',
    'classe_farmaco_contencao',
    'uso_alcool',
    'uso_drogas',
    'presenca_familiar',
    'situacao_familiar',
    'vulnerabilidade_composta',
    'qualidade_vulnerabilidade',
    'gravidade_clinica',
    'reincidencia_bin',
    'porta_giratoria_bin',
    'turno',
    'motivo_constatado',
    'nivel_consciencia',
    'risco_agressao'
  ];

  const lines = rows.map((row) => [
    row.id_externo,
    row.sexo,
    row.idade,
    row.bairro,
    row.zona,
    row.data_atendimento,
    row.vtr,
    row.contencao_fisica,
    row.contencao_quimica,
    row.tipo_contencao,
    row.medicacao_contencao_quimica,
    getClasseFarmaco(row),
    row.uso_alcool,
    row.uso_drogas,
    row.presenca_familiar,
    row.situacao_familiar,
    getVulnerabilidadeComposta(row),
    getQualidadeVulnerabilidade(row),
    getGravidadeClinica(row),
    row.reincidencia_bin,
    row.porta_giratoria_bin,
    row.turno,
    row.motivo_constatado,
    row.nivel_consciencia,
    row.risco_agressao
  ].map(escapeCsv).join(','));

  const csv = [headers.map(escapeCsv).join(','), ...lines].join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const CrossTabTable: React.FC<{ title: string; description: string; rows: CrossTabRow[] }> = ({
  title,
  description,
  rows
}) => (
  <div className={cardClass}>
    <div className="mb-4">
      <h3 className="text-sm font-black uppercase text-[#003366]">{title}</h3>
      <p className="mt-1 text-[11px] text-slate-500">{description}</p>
    </div>

    <div className="overflow-x-auto">
      <table className="w-full border-collapse whitespace-nowrap text-left">
        <thead>
          <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-400">
            <th className="px-2 py-2">Grupo</th>
            <th className="px-2 py-2 text-right">Total</th>
            <th className="px-2 py-2 text-right">Com contencao</th>
            <th className="px-2 py-2 text-right">Sem contencao</th>
            <th className="px-2 py-2 text-right">% contencao</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="max-w-[220px] truncate px-2 py-2 text-xs font-bold text-slate-700" title={row.label}>
                {row.label}
              </td>
              <td className="px-2 py-2 text-right text-xs text-slate-600">{row.total}</td>
              <td className="px-2 py-2 text-right text-xs font-bold text-emerald-700">{row.comContencao}</td>
              <td className="px-2 py-2 text-right text-xs text-slate-600">{row.semContencao}</td>
              <td className="px-2 py-2 text-right text-xs font-black text-[#003366]">{row.percentualContencao}</td>
            </tr>
          ))}

          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-2 py-8 text-center text-xs text-slate-500">
                Sem dados para este cruzamento.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const CrossTabChart: React.FC<{ title: string; description: string; rows: CrossTabRow[] }> = ({
  title,
  description,
  rows
}) => {
  const data = rows.map((row) => ({
    name: `${row.label} (n=${row.total})`,
    rawLabel: row.label,
    percentual: Number(row.percentualContencao.replace('%', '')),
    total: row.total,
    comContencao: row.comContencao
  }));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
      <div className="mb-3">
        <h3 className="text-sm font-black uppercase tracking-wide text-[#003366]">{title}</h3>
        <p className="mt-1 text-[11px] text-slate-500">{description}</p>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 24, right: 16, left: -18, bottom: 70 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="name"
              angle={-28}
              textAnchor="end"
              interval={0}
              height={82}
              tick={{ fontSize: 10, fill: '#475569' }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickFormatter={(value) => `${value}%`}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(15, 118, 110, 0.08)' }}
              formatter={(value, name, item) => {
                if (name === 'percentual') {
                  return [`${value}% (${item.payload.comContencao}/${item.payload.total})`, '% com contencao'];
                }
                return [value, name];
              }}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.rawLabel || ''}
            />
            <Bar dataKey="percentual" radius={[8, 8, 0, 0]}>
              {data.map((item) => (
                <Cell key={item.name} fill={chartColorByLabel[item.rawLabel] || '#047857'} />
              ))}
              <LabelList
                dataKey="percentual"
                position="top"
                formatter={(value: number) => `${value}%`}
                style={{ fill: '#0f172a', fontSize: 11, fontWeight: 800 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 border-t border-slate-100 pt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        Percentual calculado sobre o total de cada grupo.
      </div>
    </div>
  );
};

const IndicadoresEstudoPage: React.FC = () => {
  const [rows, setRows] = useState<IndicadoresEstudoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState({
    anoInicio: '',
    anoFim: '',
    mes: '',
    vtr: '',
    zona: '',
    turno: '',
    situacaoFamiliar: '',
    tipoContencao: ''
  });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.carregarIndicadoresEstudo();
        setRows(data);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const filterOptions = useMemo(() => ({
    anos: uniqueOptions(rows.map(getYear)),
    meses: uniqueOptions(rows.map(getMonth)),
    vtrs: uniqueOptions(rows.map((row) => row.vtr || 'NAO INFORMADO')),
    zonas: uniqueOptions(rows.map((row) => row.zona || 'NAO INFORMADO')),
    turnos: uniqueOptions(rows.map((row) => row.turno || 'NAO INFORMADO')),
    situacoesFamiliares: uniqueOptions(rows.map((row) => row.situacao_familiar || 'NAO INFORMADO')),
    tiposContencao: uniqueOptions(rows.map((row) => row.tipo_contencao || 'NAO INFORMADO'))
  }), [rows]);

  const filteredRows = useMemo(() => {
    const term = filter.trim().toUpperCase();
    return rows.filter((row) => {
      const rowYear = getYear(row);
      const rowYearNumber = Number(rowYear);

      if (advancedFilters.anoInicio || advancedFilters.anoFim) {
        if (!Number.isFinite(rowYearNumber)) return false;

        if (advancedFilters.anoInicio && !advancedFilters.anoFim) {
          if (rowYearNumber !== Number(advancedFilters.anoInicio)) return false;
        } else if (!advancedFilters.anoInicio && advancedFilters.anoFim) {
          if (rowYearNumber !== Number(advancedFilters.anoFim)) return false;
        } else {
          const startYear = Math.min(Number(advancedFilters.anoInicio), Number(advancedFilters.anoFim));
          const endYear = Math.max(Number(advancedFilters.anoInicio), Number(advancedFilters.anoFim));
          if (rowYearNumber < startYear || rowYearNumber > endYear) return false;
        }
      }
      if (advancedFilters.mes && getMonth(row) !== advancedFilters.mes) return false;
      if (advancedFilters.vtr && String(row.vtr || 'NAO INFORMADO') !== advancedFilters.vtr) return false;
      if (advancedFilters.zona && String(row.zona || 'NAO INFORMADO') !== advancedFilters.zona) return false;
      if (advancedFilters.turno && String(row.turno || 'NAO INFORMADO') !== advancedFilters.turno) return false;
      if (advancedFilters.situacaoFamiliar && String(row.situacao_familiar || 'NAO INFORMADO') !== advancedFilters.situacaoFamiliar) return false;
      if (advancedFilters.tipoContencao && String(row.tipo_contencao || 'NAO INFORMADO') !== advancedFilters.tipoContencao) return false;

      if (!term) return true;

      return [
        row.id_externo,
        row.bairro,
        row.zona,
        row.vtr,
        row.situacao_familiar,
        row.motivo_constatado,
        row.tipo_contencao,
        row.turno
      ]
        .map((value) => String(value ?? '').toUpperCase())
        .some((value) => value.includes(term));
    });
  }, [advancedFilters, filter, rows]);

  const summary = useMemo(() => {
    const total = filteredRows.length;
    const contencaoFisica = countWhere(filteredRows, (row) => Number(row.contencao_fisica_bin) === 1);
    const contencaoQuimica = countWhere(filteredRows, (row) => Number(row.contencao_quimica_bin) === 1);
    const ambas = countWhere(filteredRows, (row) => Number(row.tipo_contencao_codigo) === 3);
    const alcool = countWhere(filteredRows, (row) => Number(row.uso_alcool_bin) === 1);
    const drogas = countWhere(filteredRows, (row) => Number(row.uso_drogas_bin) === 1);
    const semFamiliar = countWhere(filteredRows, (row) => Number(row.familiar_presente_bin) === 0);
    const vulnerabilidadeAlta = countWhere(filteredRows, (row) => getVulnerabilidadeComposta(row) === 'ALTA');
    const vulnerabilidadeInsuficiente = countWhere(filteredRows, (row) => getQualidadeVulnerabilidade(row) === 'INSUFICIENTE');
    const gravidadeGrave = countWhere(filteredRows, (row) => getGravidadeClinica(row) === 'GRAVE');
    const benzodiazepinico = countWhere(filteredRows, (row) => temClasseFarmaco(row, 'BENZODIAZEPINICO'));
    const antipsicotico = countWhere(filteredRows, (row) => temClasseFarmaco(row, 'ANTIPSICOTICO'));
    const reincidencia = countWhere(filteredRows, (row) => Number(row.reincidencia_bin) === 1);
    const portaGiratoria = countWhere(filteredRows, (row) => Number(row.porta_giratoria_bin) === 1);

    return {
      total,
      contencaoFisica,
      contencaoQuimica,
      ambas,
      alcool,
      drogas,
      semFamiliar,
      vulnerabilidadeAlta,
      vulnerabilidadeInsuficiente,
      gravidadeGrave,
      benzodiazepinico,
      antipsicotico,
      reincidencia,
      portaGiratoria
    };
  }, [filteredRows]);

  const cards = [
    { label: 'Registros no estudo', value: summary.total, detail: 'Atendimentos na view analitica' },
    { label: 'Contencao fisica', value: summary.contencaoFisica, detail: percent(summary.contencaoFisica, summary.total) },
    { label: 'Contencao quimica', value: summary.contencaoQuimica, detail: percent(summary.contencaoQuimica, summary.total) },
    { label: 'Ambas contencoes', value: summary.ambas, detail: percent(summary.ambas, summary.total) },
    { label: 'Uso de alcool', value: summary.alcool, detail: percent(summary.alcool, summary.total) },
    { label: 'Uso de drogas', value: summary.drogas, detail: percent(summary.drogas, summary.total) },
    { label: 'Sem familiar', value: summary.semFamiliar, detail: percent(summary.semFamiliar, summary.total) },
    { label: 'Vulnerabilidade alta', value: summary.vulnerabilidadeAlta, detail: percent(summary.vulnerabilidadeAlta, summary.total) },
    { label: 'Vulnerabilidade insuficiente', value: summary.vulnerabilidadeInsuficiente, detail: percent(summary.vulnerabilidadeInsuficiente, summary.total) },
    { label: 'Gravidade grave', value: summary.gravidadeGrave, detail: percent(summary.gravidadeGrave, summary.total) },
    { label: 'Benzodiazepinico', value: summary.benzodiazepinico, detail: percent(summary.benzodiazepinico, summary.total) },
    { label: 'Antipsicotico', value: summary.antipsicotico, detail: percent(summary.antipsicotico, summary.total) },
    { label: 'Reincidencia', value: summary.reincidencia, detail: percent(summary.reincidencia, summary.total) },
    { label: 'Porta giratoria', value: summary.portaGiratoria, detail: percent(summary.portaGiratoria, summary.total) }
  ];

  const crossTabs = useMemo(() => ({
    gravidade: buildCrossTab(filteredRows, getGravidadeClinica),
    classeFarmaco: buildCrossTab(
      filteredRows.filter((row) => Number(row.contencao_quimica_bin) === 1 || normalizeText(row.medicacao_contencao_quimica)),
      getClasseFarmaco
    ),
    vulnerabilidade: buildCrossTab(filteredRows, getVulnerabilidadeComposta),
    qualidadeVulnerabilidade: buildCrossTab(filteredRows, getQualidadeVulnerabilidade),
    familiar: buildCrossTab(filteredRows, (row) =>
      Number(row.familiar_presente_bin) === 1 ? 'FAMILIAR PRESENTE' : 'SEM FAMILIAR'
    ),
    situacaoFamiliar: buildCrossTab(filteredRows, (row) => row.situacao_familiar || 'NAO INFORMADO'),
    reincidencia: buildCrossTab(filteredRows, (row) =>
      Number(row.reincidencia_bin) === 1 ? 'REINCIDENTE' : 'NAO REINCIDENTE'
    ),
    alcoolDrogas: buildCrossTab(filteredRows, (row) => {
      const alcool = Number(row.uso_alcool_bin) === 1;
      const drogas = Number(row.uso_drogas_bin) === 1;
      if (alcool && drogas) return 'ALCOOL E DROGAS';
      if (alcool) return 'ALCOOL';
      if (drogas) return 'DROGAS';
      return 'SEM ALCOOL/DROGAS';
    }),
    motivo: buildCrossTab(filteredRows, (row) => row.motivo_constatado || 'NAO INFORMADO').slice(0, 10),
    turno: buildCrossTab(filteredRows, (row) => row.turno || 'NAO INFORMADO')
  }), [filteredRows]);

  const findings = useMemo(() => {
    const vulnerabilidade = getHighestCrossTabRow(
      crossTabs.vulnerabilidade.filter((row) => row.label !== 'NAO CLASSIFICAVEL')
    );
    const gravidade = getHighestCrossTabRow(crossTabs.gravidade);
    const familiar = getHighestCrossTabRow(crossTabs.familiar);
    const classeFarmaco = crossTabs.classeFarmaco
      .filter((row) => row.label !== 'NAO INFORMADO')
      .sort((a, b) => b.total - a.total)[0];
    const turno = getHighestCrossTabRow(crossTabs.turno);

    return [
      vulnerabilidade
        ? `Observa-se maior proporcao de contencao no grupo ${vulnerabilidade.label} da vulnerabilidade composta, com ${vulnerabilidade.percentualContencao} (${vulnerabilidade.comContencao}/${vulnerabilidade.total}).`
        : '',
      gravidade
        ? `Na gravidade clinica, o recorte ${gravidade.label} apresenta maior percentual descritivo de contencao: ${gravidade.percentualContencao} (${gravidade.comContencao}/${gravidade.total}).`
        : '',
      familiar
        ? `No recorte familiar, observa-se ${familiar.percentualContencao} de contencao em ${familiar.label} (${familiar.comContencao}/${familiar.total}).`
        : '',
      classeFarmaco
        ? `Entre os registros de contencao quimica com medicacao, a classe mais frequente na amostra filtrada foi ${classeFarmaco.label}, com ${classeFarmaco.total} registro(s).`
        : '',
      turno
        ? `Por turno, observa-se maior percentual de contencao em ${turno.label}, com ${turno.percentualContencao} (${turno.comContencao}/${turno.total}).`
        : ''
    ].filter(Boolean);
  }, [crossTabs]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100 text-slate-600">
        Carregando indicadores do estudo...
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[linear-gradient(180deg,_#f7fafc_0%,_#eef2f7_100%)] font-display">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-3 md:p-6">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
          <section className="rounded-[28px] border border-emerald-200/80 bg-[linear-gradient(135deg,_#064e3b_0%,_#047857_55%,_#0f766e_100%)] px-6 py-6 text-white shadow-[0_22px_50px_-28px_rgba(4,120,87,0.65)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="mb-2 inline-flex rounded-full bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-100">
                  Area analitica restrita
                </div>
                <h1 className="text-2xl font-bold md:text-3xl">Indicadores do Estudo</h1>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-emerald-100">
                  Base estruturada para analisar contencao, vulnerabilidade, reincidencia, contexto assistencial e gravidade clinica.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-100">Amostra filtrada</div>
                <div className="mt-1 text-3xl font-bold">{filteredRows.length}</div>
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">Sintese automatica</div>
                <h2 className="mt-1 text-lg font-black text-slate-800">Principais achados da amostra filtrada</h2>
                <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500">
                  Texto gerado a partir dos cruzamentos atuais. Use como apoio descritivo para discussao dos resultados, evitando inferencia causal sem teste estatistico apropriado.
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-center">
                <div className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Amostra</div>
                <div className="text-2xl font-black text-emerald-900">{filteredRows.length}</div>
              </div>
            </div>

            {filteredRows.length > 0 && filteredRows.length < 30 && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
                <span className="font-black uppercase">Atenção metodológica:</span> a amostra filtrada possui {filteredRows.length} atendimento(s).
                Interprete os percentuais como achados descritivos preliminares; para conclusões mais fortes, amplie o período ou inclua registros retroativos.
              </div>
            )}

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {findings.map((finding, index) => (
                <div key={`${finding}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm leading-relaxed text-slate-700">
                  <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#003f81] text-[11px] font-black text-white">
                    {index + 1}
                  </span>
                  {finding}
                </div>
              ))}

              {findings.length === 0 && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm text-slate-500">
                  Sem dados suficientes para gerar uma sintese automatica com os filtros atuais.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-black uppercase text-[#003366]">Filtros do estudo</h2>
                <p className="mt-1 text-[11px] text-slate-500">Use ano, mes, VTR e filtros assistenciais para recortar a amostra do trabalho.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAdvancedFilters({ anoInicio: '', anoFim: '', mes: '', vtr: '', zona: '', turno: '', situacaoFamiliar: '', tipoContencao: '' })}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-sm transition hover:bg-slate-50"
                >
                  LIMPAR FILTROS
                </button>
                <button
                  type="button"
                  onClick={() => downloadCsv('indicadores-estudo.csv', filteredRows)}
                  className="rounded-xl bg-[#003f81] px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-[#0056ac]"
                >
                  EXPORTAR CSV
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-8">
              <select
                value={advancedFilters.anoInicio}
                onChange={(event) => setAdvancedFilters((prev) => ({ ...prev, anoInicio: event.target.value }))}
                className={filterInputClass}
              >
                <option value="">Ano inicial</option>
                {filterOptions.anos.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>

              <select
                value={advancedFilters.anoFim}
                onChange={(event) => setAdvancedFilters((prev) => ({ ...prev, anoFim: event.target.value }))}
                className={filterInputClass}
              >
                <option value="">Ano final</option>
                {filterOptions.anos.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>

              <select
                value={advancedFilters.mes}
                onChange={(event) => setAdvancedFilters((prev) => ({ ...prev, mes: event.target.value }))}
                className={filterInputClass}
              >
                <option value="">Mes</option>
                {filterOptions.meses.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>

              <select
                value={advancedFilters.vtr}
                onChange={(event) => setAdvancedFilters((prev) => ({ ...prev, vtr: event.target.value }))}
                className={filterInputClass}
              >
                <option value="">VTR</option>
                {filterOptions.vtrs.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>

              <select
                value={advancedFilters.zona}
                onChange={(event) => setAdvancedFilters((prev) => ({ ...prev, zona: event.target.value }))}
                className={filterInputClass}
              >
                <option value="">Zona</option>
                {filterOptions.zonas.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>

              <select
                value={advancedFilters.turno}
                onChange={(event) => setAdvancedFilters((prev) => ({ ...prev, turno: event.target.value }))}
                className={filterInputClass}
              >
                <option value="">Turno</option>
                {filterOptions.turnos.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>

              <select
                value={advancedFilters.tipoContencao}
                onChange={(event) => setAdvancedFilters((prev) => ({ ...prev, tipoContencao: event.target.value }))}
                className={filterInputClass}
              >
                <option value="">Tipo de contencao</option>
                {filterOptions.tiposContencao.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>

              <select
                value={advancedFilters.situacaoFamiliar}
                onChange={(event) => setAdvancedFilters((prev) => ({ ...prev, situacaoFamiliar: event.target.value }))}
                className={filterInputClass}
              >
                <option value="">Situacao familiar</option>
                {filterOptions.situacoesFamiliares.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <div key={card.label} className={cardClass}>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{card.label}</div>
                <div className="mt-2 text-3xl font-black text-slate-800">{card.value}</div>
                <div className="mt-1 text-xs font-semibold text-emerald-700">{card.detail}</div>
              </div>
            ))}
          </section>

          <section className="rounded-[24px] border border-amber-200/80 bg-amber-50/70 p-5 shadow-[0_18px_45px_-28px_rgba(146,64,14,0.35)]">
            <h2 className="text-sm font-black uppercase text-amber-900">Definicao estatistica das variaveis derivadas</h2>
            <div className="mt-3 grid gap-4 text-xs leading-relaxed text-amber-950 md:grid-cols-2">
              <div>
                <div className="font-black uppercase">Gravidade clinica composta</div>
                <p className="mt-1">
                  Grave quando houver risco de agressao, inconsciencia, sinais vitais com alteracao ou motivo critico
                  (tentativa de suicidio, ideacao suicida, surto psicotico ou agitacao psicomotora).
                  Moderada quando houver confusao, uso de alcool/drogas ou qualquer contencao. Leve nos demais casos.
                </p>
              </div>
              <div>
                <div className="font-black uppercase">Vulnerabilidade composta</div>
                <p className="mt-1">
                  Soma apenas fatores confirmados: alcool, drogas, ausencia de familiar, ausencia de apoio RAPS
                  e nao uso de medicacao. Zero fatores = baixa, um fator = moderada, dois ou mais fatores = alta.
                  Registros com menos de duas informacoes conhecidas ficam como nao classificaveis.
                </p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <CrossTabChart
              title="Grafico: Contencao x Vulnerabilidade"
              description="Percentual de atendimentos com contencao em cada nivel de vulnerabilidade."
              rows={crossTabs.vulnerabilidade}
            />
            <CrossTabChart
              title="Grafico: Contencao x Gravidade"
              description="Percentual de contencao conforme gravidade clinica composta."
              rows={crossTabs.gravidade}
            />
            <CrossTabChart
              title="Grafico: Contencao x Familiar"
              description="Compara contencao entre atendimentos com e sem familiar presente."
              rows={crossTabs.familiar}
            />
            <CrossTabChart
              title="Grafico: Contencao x Situacao Familiar"
              description="Compara contencao conforme colaboracao ou ausencia do familiar."
              rows={crossTabs.situacaoFamiliar}
            />
            <CrossTabChart
              title="Grafico: Contencao x Classe do Farmaco"
              description="Distribui a contencao quimica por classe farmacologica registrada."
              rows={crossTabs.classeFarmaco}
            />
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <CrossTabTable
              title="Contencao x Gravidade Clinica"
              description="Avalia se a contencao acompanha marcadores clinicos de maior gravidade."
              rows={crossTabs.gravidade}
            />
            <CrossTabTable
              title="Contencao x Classe do Farmaco"
              description="Agrupa medicamentos usados na contencao quimica por classe farmacologica."
              rows={crossTabs.classeFarmaco}
            />
            <CrossTabTable
              title="Contencao x Vulnerabilidade"
              description="Cruzamento principal do estudo, baseado na vulnerabilidade composta."
              rows={crossTabs.vulnerabilidade}
            />
            <CrossTabTable
              title="Contencao x Qualidade da Vulnerabilidade"
              description="Mostra se a classificacao da vulnerabilidade foi completa, parcial ou insuficiente."
              rows={crossTabs.qualidadeVulnerabilidade}
            />
            <CrossTabTable
              title="Contencao x Familiar"
              description="Compara a frequencia de contencao conforme presenca de familiar na cena."
              rows={crossTabs.familiar}
            />
            <CrossTabTable
              title="Contencao x Situacao Familiar"
              description="Detalha a presenca do familiar como colaborativo, nao colaborativo ou ausente."
              rows={crossTabs.situacaoFamiliar}
            />
            <CrossTabTable
              title="Contencao x Reincidencia"
              description="Avalia se pacientes reincidentes aparecem com maior proporcao de contencao."
              rows={crossTabs.reincidencia}
            />
            <CrossTabTable
              title="Contencao x Alcool/Drogas"
              description="Agrupa alcool e drogas para observar associacao com uso de contencao."
              rows={crossTabs.alcoolDrogas}
            />
            <CrossTabTable
              title="Contencao x Turno"
              description="Compara a proporcao de contencao entre atendimentos diurnos e noturnos."
              rows={crossTabs.turno}
            />
            <div className="xl:col-span-2">
              <CrossTabTable
                title="Contencao x Tipo de Ocorrencia"
                description="Lista os principais motivos constatados e a proporcao de contencao em cada grupo."
                rows={crossTabs.motivo}
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/95 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
            <div className="flex flex-col gap-4 border-b border-slate-200/70 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-black uppercase text-[#003366]">Tabela Analitica</h2>
                <p className="mt-1 text-[11px] text-slate-500">Primeira versao para conferencia dos campos captados e derivados.</p>
              </div>

              <input
                type="text"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Filtrar por ID, bairro, zona, motivo..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-[#0f4c81] focus:ring-2 focus:ring-[#0f4c81]/15 md:w-96"
              />
            </div>

            <div className="max-h-[560px] overflow-x-auto">
              <table className="w-full border-collapse whitespace-nowrap">
                <thead className="sticky top-0 z-10 bg-[linear-gradient(90deg,_#064e3b_0%,_#047857_100%)]">
                  <tr>
                    {[
                      'ID',
                      'Nome',
                      'Bairro',
                      'Zona',
                      'VTR',
                      'Contencao',
                      'Classe farmaco',
                      'Alcool',
                      'Drogas',
                      'Familiar',
                      'Situacao familiar',
                      'Vulnerabilidade',
                      'Qualidade vuln.',
                      'Gravidade',
                      'Reinc.',
                      'Porta',
                      'Turno',
                      'Motivo',
                      'Consciencia',
                      'Agressao'
                    ].map((header) => (
                      <th key={header} className={tableHeaderClass}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => (
                    <tr key={row.atendimento_id} className="odd:bg-white even:bg-slate-50/70 hover:bg-emerald-50/70">
                      <td className={tableCellClass}>{row.id_externo || '-'}</td>
                      <td className={tableCellClass}>{maskName}</td>
                      <td className={tableCellClass}>{row.bairro || '-'}</td>
                      <td className={tableCellClass}>{row.zona || '-'}</td>
                      <td className={tableCellClass}>{row.vtr || '-'}</td>
                      <td className={tableCellClass}>{row.tipo_contencao || '-'}</td>
                      <td className={tableCellClass}>{getClasseFarmaco(row)}</td>
                      <td className={tableCellClass}>{row.uso_alcool || '-'}</td>
                      <td className={tableCellClass}>{row.uso_drogas || '-'}</td>
                      <td className={tableCellClass}>{row.presenca_familiar || '-'}</td>
                      <td className={tableCellClass}>{row.situacao_familiar || '-'}</td>
                      <td className={tableCellClass}>{getVulnerabilidadeComposta(row)}</td>
                      <td className={tableCellClass}>{getQualidadeVulnerabilidade(row)}</td>
                      <td className={tableCellClass}>{getGravidadeClinica(row)}</td>
                      <td className={tableCellClass}>{Number(row.reincidencia_bin) === 1 ? 'SIM' : 'NAO'}</td>
                      <td className={tableCellClass}>{Number(row.porta_giratoria_bin) === 1 ? 'SIM' : 'NAO'}</td>
                      <td className={tableCellClass}>{row.turno || '-'}</td>
                      <td className={tableCellClass}>{row.motivo_constatado || '-'}</td>
                      <td className={tableCellClass}>{row.nivel_consciencia || '-'}</td>
                      <td className={tableCellClass}>{row.risco_agressao || '-'}</td>
                    </tr>
                  ))}

                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={20} className="px-4 py-10 text-center text-sm text-slate-500">
                        Nenhum registro encontrado para os filtros atuais.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default IndicadoresEstudoPage;
