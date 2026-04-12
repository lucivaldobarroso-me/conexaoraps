import { supabase } from './supabase';
import type { DadosProfissionaisCatalogo, TipoCatalogoDadosProfissionais } from '../types';

const PROFISSIONAIS_INICIAIS: DadosProfissionaisCatalogo = {
  encaminhado: ['HGR - PRONTO ATENDIMENTO', 'HGR - TRAUMA', 'HCSA', 'PACS', 'UNIMED', 'ATENDIMENTO NO LOCAL', 'LIBERADO NO LOCAL', 'OUTROS'],
  medicacao_contencao_quimica: [
    'DIAZEPAN 10MG/2ML',
    'MIDAZOLAM 5MG/ML',
    'ETOMIDATO 2MG/ML',
    'FENITOINA 50MG/ML',
    'FENOBARBITAL 100MG/ML',
    'FENTANIL 50MCG/ML',
    'HALOPERIDOL 5MG/ML',
    'KETAMINA 50MG/ML',
    'MORFINA 10MG/ML',
    'SUCCINILCOLINA 100MG',
    'FLUMAZENIL 0,1MG/ML',
    'NALOXONE 0,4MG/ML',
    'LIDOCAINA 20%',
    'OUTROS'
  ],
  vtr: ['USA 01', 'USA 02', 'USB 01', 'USB 02', 'USB 03', 'USB 04', 'ALFA', 'OUTROS'],
  medico_regulador: ['OUTROS'],
  enfermeiro: [
    'DANIEL GUIMARAES DA SILVA',
    'EDSON SOARES PINTO',
    'GEISA CAMILA MOREIRA TAVARES DE MENEZES',
    'GERLIVANE ALVES DE FREITAS SOUSA',
    'LUCIANO JOSE COUTINHO',
    'LUCIVALDO OLIVEIRA BARROSO',
    'MARIA DE LA PAZ PEREZ SAMPAIO',
    'MARINETE GOMES BARRETO',
    'SARA BRENDA DE SOUSA JESUS',
    'SHEYLA BATISTA DOS SANTOS',
    'GALTHAMA BRASIL',
    'OUTROS'
  ],
  medico: [
    'ALEXANDRE FEITOSA DA SILVA',
    'CLAUDIA KLECYANNE RODRIGUES DE BRITO',
    'DANNIEL SILVA DA ROCHA',
    'FRANCISCO ELADIO CAVALCANTE',
    'JEFFERSON MARTINS DE LIMA',
    'LEIDIANA COSTA NOBLES',
    'MARCOS VINICIUS VERAS DA ROCHA',
    'ROGER MALACARNE CALEFFI',
    'VALTECY MENDES ALMEIDA DE ALBUQUERQUE',
    'CELSO EDUARDO COSTA NERY',
    'FELIPE LEITE BARROS',
    'PAULO VICTOR PAZ MACHADO',
    'TIAGO DE LIMA RODRIGUEZ',
    'OUTROS'
  ],
  tecnico_enfermagem: [
    'AMILTON VIANA LOPES',
    'ANA PATRICIA DA SILVA SOARES',
    'ANTONIO OTON DIAS DA SILVA',
    'ARLETE SILVA OLIVEIRA',
    'BETANIA SAVIA MAGALHAES PEREIRA',
    'DEYRMYSSON DA SILVA SANTOS',
    'DOUGLAS ALBERTO QUARESMA',
    'DYONES CLEN AUGUSTO DE LIMA MELO',
    'ERONILDES FARIAS DE SOUZA',
    'FABIANA CARVALHO RAMOS',
    'FRANCISCA DO CANTO REIS',
    'HICARO YVES DA SILVA SANTOS',
    'JANETE TABOSA',
    'JOSUE SILVA DE ARRUDA',
    'JUCIE RIBEIRO COSTA',
    'KENNEDY PEREIRA DA SILVA',
    'MANOEL LUIZ DE SOUZA SANTOS',
    'MARIVALDA LOPES DO NASCIMENTO',
    'ROBERDSON PEREIRA DE ALCANTARA',
    'SHIRLEY LIMA DA SILVA',
    'TACIMAR DA SILVA PEREIRA',
    'OUTROS'
  ]
};

const TIPOS_CATALOGO: TipoCatalogoDadosProfissionais[] = [
  'encaminhado',
  'medicacao_contencao_quimica',
  'vtr',
  'medico_regulador',
  'enfermeiro',
  'medico',
  'tecnico_enfermagem'
];

const ordenarCatalogo = (itens: string[]) =>
  Array.from(new Set(itens.map((item) => String(item || '').trim().toUpperCase()).filter(Boolean)))
    .sort((a, b) => {
      if (a === 'OUTROS') return 1;
      if (b === 'OUTROS') return -1;
      return a.localeCompare(b, 'pt-BR');
    });

const montarCatalogoComFallback = (
  linhas: Array<{ tipo?: string | null; valor?: string | null }> | null | undefined
): DadosProfissionaisCatalogo => {
  const catalogo: DadosProfissionaisCatalogo = {
    encaminhado: [...PROFISSIONAIS_INICIAIS.encaminhado],
    medicacao_contencao_quimica: [...PROFISSIONAIS_INICIAIS.medicacao_contencao_quimica],
    vtr: [...PROFISSIONAIS_INICIAIS.vtr],
    medico_regulador: [...PROFISSIONAIS_INICIAIS.medico_regulador],
    enfermeiro: [...PROFISSIONAIS_INICIAIS.enfermeiro],
    medico: [...PROFISSIONAIS_INICIAIS.medico],
    tecnico_enfermagem: [...PROFISSIONAIS_INICIAIS.tecnico_enfermagem]
  };

  for (const linha of linhas ?? []) {
    const tipo = String(linha?.tipo || '').trim().toLowerCase() as TipoCatalogoDadosProfissionais;
    const valor = String(linha?.valor || '').trim().toUpperCase();
    if (!TIPOS_CATALOGO.includes(tipo) || !valor) continue;
    catalogo[tipo].push(valor);
  }

  return {
    encaminhado: ordenarCatalogo(catalogo.encaminhado),
    medicacao_contencao_quimica: ordenarCatalogo(catalogo.medicacao_contencao_quimica),
    vtr: ordenarCatalogo(catalogo.vtr),
    medico_regulador: ordenarCatalogo(catalogo.medico_regulador),
    enfermeiro: ordenarCatalogo(catalogo.enfermeiro),
    medico: ordenarCatalogo(catalogo.medico),
    tecnico_enfermagem: ordenarCatalogo(catalogo.tecnico_enfermagem)
  };
};

export const loadDadosProfissionaisCatalogo = async (): Promise<DadosProfissionaisCatalogo> => {
  try {
    const { data, error } = await supabase
      .from('catalogo_dados_profissionais')
      .select('tipo, valor')
      .eq('ativo', true)
      .order('valor');

    if (error) throw error;
    return montarCatalogoComFallback(data);
  } catch (error) {
    console.warn('Erro ao carregar catálogo de dados profissionais, usando fallback local:', error);
    return montarCatalogoComFallback([]);
  }
};
