import { supabase } from './supabase';
import {
  extractCoords,
  formatLegacyEntry,
  normalizeText,
  validateOccurrenceExtras
} from './apiHelpers';
import type { SamuAttendancePayload, SaveSamuAttendanceResult } from '../types';

export const saveSamuAttendance = async (payload: SamuAttendancePayload): Promise<SaveSamuAttendanceResult> => {
  try {
    const { data: existingIds, error: idsError } = await supabase
      .from('atendimentos_raps')
      .select('id_externo');

    if (idsError) throw idsError;

    const currentYear = new Date().getFullYear();
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

    return { result: 'success', id: data?.id_externo || idExterno };
  } catch (e: any) {
    console.error('Erro ao salvar atendimento no Supabase:', e);
    return { result: 'error', message: e?.message || 'Erro de conexão' };
  }
};