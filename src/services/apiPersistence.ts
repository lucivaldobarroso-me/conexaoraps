import { supabase } from './supabase';
import {
  extractCoords,
  formatLegacyEntry,
  normalizeText,
  validateOccurrenceExtras
} from './apiHelpers';
import type {
  DadosProfissionaisPayload,
  IndicadoresEstudoPayload,
  SamuAttendancePayload,
  SaveSamuAttendanceResult,
  TipoCatalogoDadosProfissionais
} from '../types';

const extrairAnoAtendimento = (valor: string | undefined) => {
  const texto = String(valor ?? '').trim();
  if (!texto) return NaN;

  const isoMatch = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return Number(isoMatch[1]);

  const localMatch = texto.match(/^(\d{2})[./-](\d{2})[./-](\d{4})$/);
  if (localMatch) return Number(localMatch[3]);

  const parsed = new Date(texto);
  const year = parsed.getFullYear();
  return Number.isNaN(year) ? NaN : year;
};

const possuiDadosProfissionais = (dados?: DadosProfissionaisPayload | null) =>
  Boolean(
    dados?.data_atendimento ||
    dados?.numero_faph ||
    dados?.numero_ocorrencia ||
    dados?.encaminhado ||
    dados?.medicacao_uso ||
    dados?.medicacoes_uso ||
    dados?.contencao_quimica ||
    dados?.medicacao_contencao_quimica ||
    dados?.sinais_vitais ||
    dados?.sinais_vitais_descricao ||
    dados?.contencao_fisica ||
    dados?.descricao_contencao_fisica ||
    dados?.medico_regulador ||
    dados?.enfermeiro ||
    dados?.medico ||
    dados?.tecnico_enfermagem ||
    dados?.vtr ||
    dados?.j9_inicio ||
    dados?.j10_inicio ||
    dados?.j9_fim ||
    dados?.j10_fim
  );

const possuiIndicadoresEstudo = (dados?: IndicadoresEstudoPayload | null) =>
  Boolean(
    dados?.uso_alcool ||
    dados?.uso_drogas ||
    dados?.presenca_familiar ||
    dados?.situacao_familiar ||
    dados?.nivel_consciencia ||
    dados?.risco_agressao
  );

const salvarItemCatalogoDadosProfissionais = async (
  tipo: TipoCatalogoDadosProfissionais,
  valor: string
) => {
  const valorNormalizado = normalizeText(valor);
  if (!valorNormalizado || valorNormalizado === 'OUTROS') return;

  const { error } = await supabase
    .from('catalogo_dados_profissionais')
    .upsert({
      tipo,
      valor: valorNormalizado,
      valor_normalizado: valorNormalizado,
      ativo: true
    }, { onConflict: 'tipo,valor_normalizado' });

  if (error) throw error;
};

const salvarMedicacoesContencaoQuimicaCatalogo = async (valor: string) => {
  const itens = String(valor || '')
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean);

  await Promise.all(
    itens.map((item) => salvarItemCatalogoDadosProfissionais('medicacao_contencao_quimica', item))
  );
};

const salvarDadosProfissionaisAtendimento = async (
  atendimentoId: string,
  dados: DadosProfissionaisPayload
) => {
  if (!possuiDadosProfissionais(dados)) return;

  await Promise.all([
    salvarItemCatalogoDadosProfissionais('encaminhado', dados.encaminhado),
    salvarMedicacoesContencaoQuimicaCatalogo(dados.medicacao_contencao_quimica),
    salvarItemCatalogoDadosProfissionais('vtr', dados.vtr),
    salvarItemCatalogoDadosProfissionais('medico_regulador', dados.medico_regulador),
    salvarItemCatalogoDadosProfissionais('enfermeiro', dados.enfermeiro),
    salvarItemCatalogoDadosProfissionais('medico', dados.medico),
    salvarItemCatalogoDadosProfissionais('tecnico_enfermagem', dados.tecnico_enfermagem)
  ]);

  const { error } = await supabase
    .from('dados_profissionais_atendimento')
    .upsert({
      atendimento_id: atendimentoId,
      data_atendimento: dados.data_atendimento || null,
      numero_faph: normalizeText(dados.numero_faph) || null,
      numero_ocorrencia: normalizeText(dados.numero_ocorrencia) || null,
      encaminhado: normalizeText(dados.encaminhado) || null,
      medicacao_uso: normalizeText(dados.medicacao_uso) || null,
      medicacoes_uso: normalizeText(dados.medicacoes_uso) || null,
      contencao_quimica: normalizeText(dados.contencao_quimica) || null,
      medicacao_contencao_quimica: normalizeText(dados.medicacao_contencao_quimica) || null,
      sinais_vitais: normalizeText(dados.sinais_vitais) || null,
      sinais_vitais_descricao: normalizeText(dados.sinais_vitais_descricao) || null,
      contencao_fisica: normalizeText(dados.contencao_fisica) || null,
      descricao_contencao_fisica: normalizeText(dados.descricao_contencao_fisica) || null,
      medico_regulador: normalizeText(dados.medico_regulador) || null,
      enfermeiro: normalizeText(dados.enfermeiro) || null,
      medico: normalizeText(dados.medico) || null,
      tecnico_enfermagem: normalizeText(dados.tecnico_enfermagem) || null,
      vtr: normalizeText(dados.vtr) || null,
      j9_inicio: dados.j9_inicio || null,
      j10_inicio: dados.j10_inicio || null,
      j9_fim: dados.j9_fim || null,
      j10_fim: dados.j10_fim || null
    }, { onConflict: 'atendimento_id' });

  if (error) throw error;
};

const salvarIndicadoresEstudoAtendimento = async (
  atendimentoId: string,
  dados: IndicadoresEstudoPayload
) => {
  if (!possuiIndicadoresEstudo(dados)) return;

  const { error } = await supabase
    .from('indicadores_estudo_atendimento')
    .upsert({
      atendimento_id: atendimentoId,
      uso_alcool: normalizeText(dados.uso_alcool) || null,
      uso_drogas: normalizeText(dados.uso_drogas) || null,
      presenca_familiar: normalizeText(dados.presenca_familiar) || null,
      situacao_familiar: normalizeText(dados.situacao_familiar) || null,
      nivel_consciencia: normalizeText(dados.nivel_consciencia) || null,
      risco_agressao: normalizeText(dados.risco_agressao) || null
    }, { onConflict: 'atendimento_id' });

  if (error) throw error;
};

export const saveSamuAttendance = async (payload: SamuAttendancePayload): Promise<SaveSamuAttendanceResult> => {
  try {
    const { data: existingIds, error: idsError } = await supabase
      .from('atendimentos_raps')
      .select('id_externo');

    if (idsError) throw idsError;

    const yearFromAttendanceDate = extrairAnoAtendimento(payload.dados_profissionais?.data_atendimento);
    const currentYear = Number.isNaN(yearFromAttendanceDate) ? new Date().getFullYear() : yearFromAttendanceDate;
    let maxSeq = 0;

    for (const row of existingIds ?? []) {
      const id = String(row.id_externo ?? '');
      const match = id.match(/^PAC-(\d+)-(\d{4})$/);
      if (!match) continue;

      const seq = parseInt(match[1], 10);
      const year = parseInt(match[2], 10);
      if (year === currentYear && seq > maxSeq) maxSeq = seq;
    }

    const nextSeq = maxSeq + 1;
    const idExterno = `PAC-${String(nextSeq).padStart(3, '0')}-${currentYear}`;

    const bairroNome = String(payload.bairro ?? '').trim();
    const zonaNome = String(payload.zona ?? '').trim();

    let bairroId: string | null = null;
    let zonaId: string | null = null;

    if (bairroNome) {
      const { data: bairroRow } = await supabase
        .from('bairros')
        .select('id, zona_id, nome_normalizado')
        .eq('nome_normalizado', normalizeText(bairroNome))
        .limit(1)
        .maybeSingle();

      if (bairroRow) {
        bairroId = bairroRow.id;
        zonaId = bairroRow.zona_id;
      }
    }

    if (!zonaId && zonaNome) {
      const { data: zonaRow } = await supabase
        .from('zonas')
        .select('id')
        .eq('nome', normalizeText(zonaNome))
        .limit(1)
        .maybeSingle();

      if (zonaRow) zonaId = zonaRow.id;
    }

    const coords = extractCoords(payload.localizacao);
    const insertRow = {
      id_externo: idExterno,
      nome: normalizeText(payload.nome),
      nascimento: payload.nascimento || null,
      sexo: payload.sexo || null,
      idade: payload.idade ? Number(payload.idade) : null,
      endereco: normalizeText(payload.endereco),
      numero: String(payload.numero ?? '').trim() || null,
      bairro_id: bairroId,
      bairro_nome_legado: bairroNome || null,
      zona_id: zonaId,
      zona_nome_legado: zonaNome || null,
      localizacao_raw: String(payload.localizacao ?? '').trim() || null,
      latitude: coords.latitude,
      longitude: coords.longitude,
      referencia: normalizeText(payload.referencia) || null,
      diagnosticado: payload.diagnosticado || null,
      reincidente: payload.reincidente || null,
      medicacao: payload.medicacao || null,
      pq_med: normalizeText(payload.pq_med) || null,
      apoio_fam: payload.apoio_fam || null,
      pq_fam: normalizeText(payload.porque_fam) || null,
      apoio_raps: payload.apoio_raps || null,
      info_extra: normalizeText(payload.info_extra) || null,
      entrada_legado: formatLegacyEntry(new Date().toISOString(), normalizeText(payload.responsavel) || 'USUÁRIO'),
      responsavel_nome: normalizeText(payload.responsavel) || 'USUÁRIO',
      raca: normalizeText(payload.raca) || null,
      nacionalidade: normalizeText(payload.nacionalidade) || null,
      origem_dado: 'supabase'
    };

    const { data, error } = await supabase
      .from('atendimentos_raps')
      .insert(insertRow)
      .select('id, id_externo')
      .single();

    if (error) throw error;
    const classificacao = payload.classificacao_ocorrencia;

    if (classificacao) {
      const motivoInicialFields = classificacao.motivo_inicial?.campos_definicao || [];
      const motivoConstatadoFields = classificacao.motivo_constatado?.campos_definicao || [];
      const motivoInicialExtras = classificacao.motivo_inicial?.extras || {};
      const motivoConstatadoExtras = classificacao.motivo_constatado?.extras || {};

      const motivoInicialErro = validateOccurrenceExtras(motivoInicialFields, motivoInicialExtras);
      if (motivoInicialErro) throw new Error(`Motivo Inicial: ${motivoInicialErro}`);

      const motivoConstatadoErro = validateOccurrenceExtras(motivoConstatadoFields, motivoConstatadoExtras);
      if (motivoConstatadoErro) throw new Error(`Motivo Constatado: ${motivoConstatadoErro}`);

      const shouldPersistClassification =
        classificacao.motivo_inicial?.tipo_id ||
        classificacao.motivo_inicial?.subtipo_id ||
        classificacao.motivo_constatado?.tipo_id ||
        classificacao.motivo_constatado?.subtipo_id ||
        normalizeText(classificacao.detalhe_livre);

      if (shouldPersistClassification) {
        const { error: classificacaoError } = await supabase
          .from('classificacao_ocorrencia_atendimento')
          .upsert({
            atendimento_id: data.id,
            motivo_inicial_tipo_id: classificacao.motivo_inicial?.tipo_id || null,
            motivo_inicial_subtipo_id: classificacao.motivo_inicial?.subtipo_id || null,
            motivo_inicial_extras: motivoInicialExtras,
            motivo_constatado_tipo_id: classificacao.motivo_constatado?.tipo_id || null,
            motivo_constatado_subtipo_id: classificacao.motivo_constatado?.subtipo_id || null,
            motivo_constatado_extras: motivoConstatadoExtras,
            detalhe_livre: normalizeText(classificacao.detalhe_livre) || null,
            origem_dado: 'supabase'
          }, { onConflict: 'atendimento_id' });

        if (classificacaoError) {
          await supabase.from('atendimentos_raps').delete().eq('id', data.id);
          throw classificacaoError;
        }
      }
    }

    if (payload.dados_profissionais && data?.id) {
      try {
        await salvarDadosProfissionaisAtendimento(data.id, payload.dados_profissionais);
      } catch (dadosProfissionaisError: any) {
        console.warn('Não foi possível salvar os dados profissionais do atendimento.', dadosProfissionaisError);
      }
    }

    if (payload.indicadores_estudo && data?.id) {
      try {
        await salvarIndicadoresEstudoAtendimento(data.id, payload.indicadores_estudo);
      } catch (indicadoresEstudoError: any) {
        console.warn('Nao foi possivel salvar os indicadores do estudo do atendimento.', indicadoresEstudoError);
      }
    }

    return { result: 'success', id: data?.id_externo || idExterno };
  } catch (e: any) {
    console.error('Erro ao salvar atendimento no Supabase:', e);
    return { result: 'error', message: e?.message || 'Erro de conexão' };
  }
};
