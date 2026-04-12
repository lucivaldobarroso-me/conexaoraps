import { loginWithSupabase, logoutFromSupabase, registerWithSupabase, restoreSessionUser } from './apiAuth';
import {
  checkPaciente,
  loadBairros,
  loadClassificacaoPsiquiatrica,
  loadClassificacoesDetalhadas,
  loadEstatisticas,
  loadIndicadoresOcorrencia
} from './apiDashboard';
import { loadDadosProfissionaisCatalogo } from './apiProfessionalData';
import { saveSamuAttendance } from './apiPersistence';

export const api = {
  login: loginWithSupabase,

  registrar: registerWithSupabase,

  restaurarSessaoUsuario: restoreSessionUser,

  logout: logoutFromSupabase,

  carregarBairros: loadBairros,

  verificarPaciente: checkPaciente,

  carregarEstatisticas: loadEstatisticas,

  carregarClassificacaoPsiquiatrica: loadClassificacaoPsiquiatrica,

  carregarIndicadoresOcorrencia: loadIndicadoresOcorrencia,

  carregarClassificacoesDetalhadas: loadClassificacoesDetalhadas,

  carregarCatalogoDadosProfissionais: loadDadosProfissionaisCatalogo,

  salvarSamu: saveSamuAttendance
};
