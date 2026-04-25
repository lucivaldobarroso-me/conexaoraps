import { supabase } from './supabase';
import type { IndicadoresEstudoRecord } from '../types';

export const loadIndicadoresEstudo = async (): Promise<IndicadoresEstudoRecord[]> => {
  const { data, error } = await supabase
    .from('vw_indicadores_estudo_base')
    .select('*')
    .order('data_atendimento', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('Erro ao carregar indicadores do estudo:', error);
    return [];
  }

  return (data ?? []) as IndicadoresEstudoRecord[];
};
