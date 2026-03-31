import { AUTH_API_URL } from '../constants';
import { supabase } from './supabase';

const normalizeText = (value: any) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

const hardcodedBairros = {
  "ZONA NORTE": ["AEROPORTO", "B. DOS ESTADOS", "CAUAME", "RIVER PARK", "PARAVIANA"],
  "ZONA OESTE": ["ALVORADA", "ASA BRANCA", "BURITIS", "CAIMBE", "CINTURAO VERDE", "DR. SILVIO BOTELHO", "GENIPAPO", "EQUATORIAL", "JARDIM FLORESTA", "JARDIM TROPICAL", "JOQUEI CLUBE", "LIBERDADE", "MARECHAL RONDON", "MECEJANA", "NOVA CIDADE", "OLIMPICO", "OPERARIO", "PINTOLANDIA", "PRICUMA", "PROFESSORA ARACELI SOUTO MAIOR", "RAIAR DO SOL", "SANTA TEREZA", "SAO BENTO", "SENADOR HELIO CAMPOS", "TANCREDO NEVES", "UNION", "LAURA MOREIRA"],
  "ZONA SUL": ["13 DE SETEMBRO", "CALUNGA", "CAMBATA", "CENTRO", "SAO FRANCISCO", "SAO PEDRO", "SAO VICENTE"],
  "ZONA LESTE": ["APARECIDA", "31 DE MARCO", "CANARINHO", "CIDADE SATELITE", "DOS ESTADOS", "JARDIM CARANA", "JARDIM PRIMAVERA", "MURILO TEIXEIRA", "PARQUE CAÃ‡ARI", "PARQUE DAS PEDRAS"],
  "RURAL": ["AREA RURAL"]
};

const extractCoords = (value: string) => {
  const raw = String(value ?? '').trim();
  if (!raw) return { latitude: null, longitude: null };

  const plainMatch = raw.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (plainMatch) {
    return {
      latitude: Number(plainMatch[1]),
      longitude: Number(plainMatch[2])
    };
  }

  const destinationMatch = raw.match(/destination=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (destinationMatch) {
    return {
      latitude: Number(destinationMatch[1]),
      longitude: Number(destinationMatch[2])
    };
  }

  return { latitude: null, longitude: null };
};

const formatLegacyEntry = (createdAt?: string | null, responsavel?: string | null) => {
  if (!createdAt && !responsavel) return '';

  let datePart = '';
  if (createdAt) {
    const date = new Date(createdAt);
    if (!Number.isNaN(date.getTime())) {
      datePart = date.toLocaleString('pt-BR', {
        timeZone: 'America/Manaus',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
  }

  if (!datePart) datePart = createdAt ?? '';
  return responsavel ? `${datePart} | Por: ${responsavel}` : datePart;
};

const mapRecordToLegacyRow = (row: any) => [
  row.id_externo || '',
  row.nome || '',
  row.nascimento || '',
  row.sexo || '',
  row.idade ?? '',
  row.endereco || '',
  row.numero || '',
  row.bairro || '',
  row.zona || '',
  row.localizacao || '',
  row.referencia || '',
  row.diagnosticado || '',
  row.reincidente || '',
  row.medicacao || '',
  row.pq_med || '',
  row.apoio_fam || '',
  row.pq_fam || '',
  row.apoio_raps || '',
  row.info_extra || '',
  row.entrada_legado || formatLegacyEntry(row.criado_em, row.responsavel_nome),
  row.responsavel_nome || 'USUÃRIO',
  '',
  row.raca || '',
  row.nacionalidade || ''
];

const buildStatsFromRows = (rows: any[]) => {
  const stats = {
    total: rows.length,
    reincidentes: 0,
    clinico: { diag: 0, med: 0, fam: 0, raps: 0 },
    masculino: 0,
    feminino: 0,
    idades: {} as Record<string, number>,
    zonas: {} as Record<string, number>,
    bairros: {} as Record<string, number>,
    dias: {} as Record<string, number>,
    mensal: {} as Record<string, number>,
    dadosBrutos: rows.map(mapRecordToLegacyRow)
  };

  for (const row of rows) {
    const reincidente = normalizeText(row.reincidente);
    const diagnosticado = normalizeText(row.diagnosticado);
    const medicacao = normalizeText(row.medicacao);
    const apoioFam = normalizeText(row.apoio_fam);
    const apoioRaps = normalizeText(row.apoio_raps);
    const sexo = normalizeText(row.sexo);
    const idade = String(row.idade ?? '').trim();
    const bairro = String(row.bairro || 'NÃ£o Informado');
    const zona = String(row.zona || 'Indefinido');
    const createdAt = row.criado_em ? new Date(row.criado_em) : null;

    if (reincidente === 'SIM') stats.reincidentes++;
    if (diagnosticado === 'SIM') stats.clinico.diag++;
    if (medicacao === 'SIM') stats.clinico.med++;
    if (apoioFam === 'SIM') stats.clinico.fam++;
    if (apoioRaps === 'SIM') stats.clinico.raps++;

    if (sexo === 'MASCULINO') stats.masculino++;
    if (sexo === 'FEMININO') stats.feminino++;

    if (idade) stats.idades[idade] = (stats.idades[idade] || 0) + 1;
    stats.bairros[bairro] = (stats.bairros[bairro] || 0) + 1;
    stats.zonas[zona] = (stats.zonas[zona] || 0) + 1;

    if (createdAt && !Number.isNaN(createdAt.getTime())) {
      const weekDay = createdAt.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'America/Manaus' });
      const monthKey = createdAt.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric', timeZone: 'America/Manaus' });
      stats.dias[weekDay] = (stats.dias[weekDay] || 0) + 1;
      stats.mensal[monthKey] = (stats.mensal[monthKey] || 0) + 1;
    }
  }

  return stats;
};

const buildLegacyPatientPayload = (row: any, count: number) => ({
  result: 'exists',
  p: {
    id: row.id_externo || '',
    nascimento: row.nascimento || '',
    sexo: row.sexo || '',
    endereco: row.endereco || '',
    num: row.numero || '',
    bairro: row.bairro || '',
    loc: row.localizacao || '',
    ref: row.referencia || '',
    diag: row.diagnosticado || '',
    reinc: row.reincidente || '',
    med: row.medicacao || '',
    pq_med: row.pq_med || '',
    fam: row.apoio_fam || '',
    pq_fam: row.pq_fam || '',
    raps: row.apoio_raps || '',
    info: row.info_extra || '',
    raca: row.raca || '',
    nacionalidade: row.nacionalidade || ''
  },
  contagem: count
});

const validateOccurrenceExtras = (fields: any[], extras: Record<string, any>) => {
  for (const field of fields ?? []) {
    if (!field?.obrigatorio) continue;
    const value = extras?.[field.chave];

    if (field.tipo_dado === 'multiselect') {
      if (!Array.isArray(value) || value.length === 0) {
        return `Preencha o campo obrigatÃ³rio: ${field.rotulo}`;
      }
      continue;
    }

    if (value === undefined || value === null || String(value).trim() === '') {
      return `Preencha o campo obrigatÃ³rio: ${field.rotulo}`;
    }
  }

  return null;
};

const toCountMap = (rows: any[], keyField: string, valueField = 'total') => {
  return (rows ?? []).reduce((acc: Record<string, number>, row: any) => {
    const key = String(row?.[keyField] ?? '').trim();
    if (!key) return acc;
    acc[key] = Number(row?.[valueField] ?? 0);
    return acc;
  }, {});
};

export const api = {
  // Helper legado mantido apenas para a autenticaÃ§Ã£o que ainda usa Apps Script.
  _safeFetch: async (url: string, cmd: string, params: Record<string, string> = {}) => {
    try {
      const fetchUrl = new URL(url);
      fetchUrl.searchParams.append('acao', cmd);
      Object.entries(params).forEach(([k, v]) => fetchUrl.searchParams.append(k, v));

      const response = await fetch(fetchUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        redirect: 'follow',
        mode: 'cors'
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      return await response.json();
    } catch (e) {
      console.error(`Erro na aÃ§Ã£o ${cmd}:`, e);
      throw e;
    }
  },

  login: async (usuario: string, senha: string) => {
    try {
      const data = await api._safeFetch(AUTH_API_URL, 'login', { usuario, senha });
      if (data.sucesso) {
        return {
          result: 'success',
          nomeCompleto: data.nome,
          modulo: data.modulo,
          message: data.mensagem
        };
      }
      return { result: 'error', message: data.mensagem || 'UsuÃ¡rio ou senha invÃ¡lidos' };
    } catch (e) {
      return { result: 'error', message: 'Erro de conexÃ£o com o servidor' };
    }
  },

  registrar: async (dados: any) => {
    try {
      const data = await api._safeFetch(AUTH_API_URL, 'registrar', dados);
      return data.sucesso ? { result: 'success', message: data.mensagem } : { result: 'error', message: data.mensagem };
    } catch (e) {
      return { result: 'error', message: 'Erro ao realizar cadastro' };
    }
  },

  carregarBairros: async () => {
    try {
      const { data, error } = await supabase
        .from('zonas')
        .select(`
          nome,
          bairros (
            nome,
            ativo
          )
        `)
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) throw error;

      const bairrosPorZona: Record<string, string[]> = {};

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
        return { bairros: bairrosPorZona, nomes: [] };
      }

      return { bairros: hardcodedBairros, nomes: [] };
    } catch (e) {
      console.error("Erro ao carregar bairros do Supabase, usando fallback local:", e);
      return { bairros: hardcodedBairros, nomes: [] };
    }
  },

  verificarPaciente: async (nome: string) => {
    try {
      const nomeBusca = String(nome ?? '').trim();
      if (!nomeBusca) return { result: 'not_found' };

      const { data, error } = await supabase
        .from('vw_atendimentos_dashboard_legado')
        .select('*')
        .ilike('nome', nomeBusca);

      if (error) throw error;

      const rows = (data ?? []).filter((row: any) => normalizeText(row.nome) === normalizeText(nomeBusca));
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
  },

  carregarEstatisticas: async () => {
    try {
      const { data, error } = await supabase
        .from('vw_atendimentos_dashboard_legado')
        .select('*');

      if (error) throw error;
      return buildStatsFromRows(data ?? []);
    } catch (e) {
      console.error('Erro ao carregar estatÃ­sticas do Supabase:', e);
      return null;
    }
  },

  carregarClassificacaoPsiquiatrica: async () => {
    try {
      const { data: tipos, error: tiposError } = await supabase
        .from('tipos_ocorrencia')
        .select('id, nome, ordem')
        .eq('ativo', true)
        .eq('nome', 'PSIQUIÃTRICO')
        .order('ordem');

      if (tiposError) throw tiposError;

      const tipo = tipos?.[0] ?? null;
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

      const extras = extrasRows.reduce((acc: Record<string, any[]>, row: any) => {
        if (!acc[row.subtipo_id]) acc[row.subtipo_id] = [];
        acc[row.subtipo_id].push(row);
        return acc;
      }, {});

      return {
        tipos: tipos ?? [],
        subtipos: { [tipo.id]: subtipos ?? [] },
        extras
      };
    } catch (e) {
      console.error('Erro ao carregar classificacao psiquiatrica do Supabase:', e);
      return { tipos: [], subtipos: {}, extras: {} };
    }
  },

  carregarIndicadoresOcorrencia: async () => {
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
  },

  carregarClassificacoesDetalhadas: async () => {
    try {
      const { data, error } = await supabase
        .from('vw_ocorrencias_psi_detalhado')
        .select('id_externo, motivo_inicial_subtipo, motivo_constatado_subtipo, metodo, detalhe_livre, classificacao_id')
        .not('classificacao_id', 'is', null);

      if (error) throw error;

      const detalhes = (data ?? []).reduce((acc: Record<string, any>, row: any) => {
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
  },
  salvarSamu: async (payload: any) => {
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
        entrada_legado: formatLegacyEntry(new Date().toISOString(), normalizeText(payload.responsavel) || 'USUÃRIO'),
        responsavel_nome: normalizeText(payload.responsavel) || 'USUÃRIO',
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
      return { result: 'error', message: e?.message || 'Erro de conexÃ£o' };
    }
  }
};
