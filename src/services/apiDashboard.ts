import { supabase } from './supabase';
import {
  buildLegacyPatientPayload,
  buildStatsFromRows,
  hardcodedBairros,
  normalizeText,
  toCountMap
} from './apiHelpers';
import type {
  DashboardData,
  NeighborhoodLoadResult,
  OccurrenceClassificationCatalog,
  OccurrenceDashboardData,
  OccurrenceDetailsMap,
  OccurrenceExtraDefinition,
  PatientLookupResult
} from '../types';

export const loadBairros = async (): Promise<NeighborhoodLoadResult> => {
  try {
    const [
      { data, error },
      { data: nomesData, error: nomesError }
    ] = await Promise.all([
      supabase
        .from('zonas')
        .select(`
            nome,
            bairros (
              nome,
              ativo
            )
          `)
        .eq('ativo', true)
        .order('ordem', { ascending: true }),
      supabase
        .from('vw_atendimentos_dashboard_legado')
        .select('nome')
        .not('nome', 'is', null)
        .order('nome', { ascending: true })
        .limit(1000)
    ]);

    if (error) throw error;
    if (nomesError) throw nomesError;

    const bairrosPorZona: Record<string, string[]> = {};
    const nomesUnicos = Array.from(
      new Set(
        (nomesData ?? [])
          .map((row: { nome?: string | null }) => String(row.nome || '').trim().toUpperCase())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    for (const zona of data ?? []) {
      const zonaNome = String(zona.nome || '').toUpperCase();
      const bairros = Array.isArray(zona.bairros)
        ? zona.bairros
          .filter((bairro: any) => bairro?.ativo !== false && bairro?.nome)
          .map((bairro: any) => String(bairro.nome).toUpperCase())
          .sort((a: string, b: string) => a.localeCompare(b, 'pt-BR'))
        : [];

      if (zonaNome) bairrosPorZona[zonaNome] = bairros;
    }

    if (Object.keys(bairrosPorZona).length > 0) {
      return { bairros: bairrosPorZona, nomes: nomesUnicos };
    }

    return { bairros: hardcodedBairros, nomes: nomesUnicos };
  } catch (e) {
    console.error('Erro ao carregar bairros do Supabase, usando fallback local:', e);
    return { bairros: hardcodedBairros, nomes: [] };
  }
};

export const checkPaciente = async (nome: string): Promise<PatientLookupResult> => {
  try {
    const nomeBusca = String(nome ?? '').trim();
    if (!nomeBusca) return { result: 'not_found' };

    const [
      { data: legacyData, error: legacyError },
      { data: detailedData, error: detailedError }
    ] = await Promise.all([
      supabase
        .from('vw_atendimentos_dashboard_legado')
        .select('*')
        .ilike('nome', nomeBusca),
      supabase
        .from('vw_ocorrencias_psi_detalhado')
        .select('*')
        .ilike('nome', nomeBusca)
    ]);

    if (legacyError) throw legacyError;
    if (detailedError) throw detailedError;

    const detailedRows = (detailedData ?? []).filter((row: any) => normalizeText(row.nome) === normalizeText(nomeBusca));
    const legacyRows = (legacyData ?? []).filter((row: any) => normalizeText(row.nome) === normalizeText(nomeBusca));
    const rows = detailedRows.length ? detailedRows : legacyRows;
    if (!rows.length) return { result: 'not_found' };

    rows.sort((a: any, b: any) => {
      const aDate = new Date(a.entrada_legado || a.criado_em || 0).getTime();
      const bDate = new Date(b.entrada_legado || b.criado_em || 0).getTime();
      return bDate - aDate;
    });

    return buildLegacyPatientPayload(rows[0], rows.length);
  } catch (e) {
    console.error('Erro ao verificar paciente no Supabase:', e);
    return { result: 'error' };
  }
};

export const loadEstatisticas = async (): Promise<DashboardData | null> => {
  try {
    const { data, error } = await supabase
      .from('vw_atendimentos_dashboard_legado')
      .select('*');

    if (error) throw error;
    return buildStatsFromRows(data ?? []);
  } catch (e) {
    console.error('Erro ao carregar estatísticas do Supabase:', e);
    return null;
  }
};

export const loadClassificacaoPsiquiatrica = async (): Promise<OccurrenceClassificationCatalog> => {
  try {
    const { data: tipos, error: tiposError } = await supabase
      .from('tipos_ocorrencia')
      .select('id, nome, ordem')
      .eq('ativo', true)
      .order('ordem');

    if (tiposError) throw tiposError;

    const tipo = (tipos ?? []).find((item) => normalizeText(item.nome) === 'PSIQUIATRICO') ?? null;
    if (!tipo) return { tipos: [], subtipos: {}, extras: {} };

    const { data: subtipos, error: subtiposError } = await supabase
      .from('subtipos_ocorrencia')
      .select('id, nome, ordem')
      .eq('ativo', true)
      .eq('tipo_id', tipo.id)
      .order('ordem');

    if (subtiposError) throw subtiposError;

    const subtipoIds = (subtipos ?? []).map((item: any) => item.id);
    let extrasRows: any[] = [];

    if (subtipoIds.length > 0) {
      const { data: extrasData, error: extrasError } = await supabase
        .from('campos_extras_ocorrencia')
        .select('id, subtipo_id, chave, rotulo, tipo_dado, obrigatorio, opcoes, ajuda, ordem')
        .eq('ativo', true)
        .in('subtipo_id', subtipoIds)
        .order('ordem');

      if (extrasError) throw extrasError;
      extrasRows = extrasData ?? [];
    }

    const extras = extrasRows.reduce((acc: Record<string, OccurrenceExtraDefinition[]>, row: any) => {
      if (!acc[row.subtipo_id]) acc[row.subtipo_id] = [];
      acc[row.subtipo_id].push(row as OccurrenceExtraDefinition);
      return acc;
    }, {} as Record<string, OccurrenceExtraDefinition[]>);

    return {
      tipos: tipos ?? [],
      subtipos: { [tipo.id]: subtipos ?? [] },
      extras
    };
  } catch (e) {
    console.error('Erro ao carregar classificacao psiquiatrica do Supabase:', e);
    return { tipos: [], subtipos: {}, extras: {} };
  }
};

export const loadIndicadoresOcorrencia = async (): Promise<OccurrenceDashboardData> => {
  try {
    const [
      resumoResult,
      motivosIniciaisResult,
      motivosConstatadosResult,
      metodosResult,
      transicoesResult,
      zonasMotivoResult
    ] = await Promise.all([
      supabase
        .from('vw_ocorrencias_psi_resumo_geral')
        .select('total_classificacoes, total_criticos, com_detalhe_livre')
        .single(),
      supabase
        .from('vw_ocorrencias_psi_motivos_iniciais')
        .select('motivo_inicial, total'),
      supabase
        .from('vw_ocorrencias_psi_motivos_constatados')
        .select('motivo_constatado, total'),
      supabase
        .from('vw_ocorrencias_psi_metodos_tentativa')
        .select('metodo, total'),
      supabase
        .from('vw_ocorrencias_psi_transicoes')
        .select('motivo_inicial, motivo_constatado, total'),
      supabase
        .from('vw_ocorrencias_psi_zona_motivo')
        .select('zona, total')
    ]);

    if (resumoResult.error) throw resumoResult.error;
    if (motivosIniciaisResult.error) throw motivosIniciaisResult.error;
    if (motivosConstatadosResult.error) throw motivosConstatadosResult.error;
    if (metodosResult.error) throw metodosResult.error;
    if (transicoesResult.error) throw transicoesResult.error;
    if (zonasMotivoResult.error) throw zonasMotivoResult.error;

    const transicoes = (transicoesResult.data ?? []).reduce((acc: Record<string, number>, row: any) => {
      const chave = [row.motivo_inicial, row.motivo_constatado].join(' -> ');
      acc[chave] = Number(row?.total ?? 0);
      return acc;
    }, {});

    const zonasMotivoConstatado = (zonasMotivoResult.data ?? []).reduce((acc: Record<string, number>, row: any) => {
      const zona = String(row?.zona ?? 'INDEFINIDO');
      acc[zona] = (acc[zona] || 0) + Number(row?.total ?? 0);
      return acc;
    }, {});

    return {
      totalClassificacoes: Number(resumoResult.data?.total_classificacoes ?? 0),
      totalCriticos: Number(resumoResult.data?.total_criticos ?? 0),
      comDetalheLivre: Number(resumoResult.data?.com_detalhe_livre ?? 0),
      motivosIniciais: toCountMap(motivosIniciaisResult.data ?? [], 'motivo_inicial'),
      motivosConstatados: toCountMap(motivosConstatadosResult.data ?? [], 'motivo_constatado'),
      metodosTentativa: toCountMap(metodosResult.data ?? [], 'metodo'),
      transicoes,
      zonasMotivoConstatado
    };
  } catch (e) {
    console.error('Erro ao carregar indicadores de ocorrencia do Supabase:', e);
    return {
      totalClassificacoes: 0,
      totalCriticos: 0,
      comDetalheLivre: 0,
      motivosIniciais: {},
      motivosConstatados: {},
      metodosTentativa: {},
      transicoes: {},
      zonasMotivoConstatado: {}
    };
  }
};

export const loadClassificacoesDetalhadas = async (): Promise<OccurrenceDetailsMap> => {
  try {
    const { data, error } = await supabase
      .from('vw_ocorrencias_psi_detalhado')
      .select('id_externo, motivo_inicial_subtipo, motivo_constatado_subtipo, metodo, detalhe_livre, classificacao_id')
      .not('classificacao_id', 'is', null);

    if (error) throw error;

    const detalhes = (data ?? []).reduce((acc: OccurrenceDetailsMap, row: any) => {
      const idExterno = String(row.id_externo || '').trim();
      if (!idExterno) return acc;

      acc[idExterno] = {
        motivoInicial: row.motivo_inicial_subtipo || '-',
        motivoConstatado: row.motivo_constatado_subtipo || '-',
        metodo: row.metodo || '-',
        detalheLivre: row.detalhe_livre || '-'
      };

      return acc;
    }, {});

    return detalhes;
  } catch (e) {
    console.error('Erro ao carregar classificacoes detalhadas do Supabase:', e);
    return {};
  }
};

