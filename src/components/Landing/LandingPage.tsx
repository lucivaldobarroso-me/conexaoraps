import React from 'react';
import { useNavigate } from 'react-router-dom';

const recursos = [
  { icon: 'person_search', title: 'Autocomplete', text: 'Busca rápida de pacientes já cadastrados por nome e histórico.' },
  { icon: 'map', title: 'Google Maps', text: 'Endereço, bairro e geolocalização apoiando a leitura territorial.' },
  { icon: 'description', title: 'Relatórios automáticos', text: 'Geração de relatório clínico e parecer de gestão com base nas regras do sistema.' },
  { icon: 'admin_panel_settings', title: 'Acesso multinível', text: 'Permissões para Administrador, Inserção, Analítico ou acesso combinado.' }
];

const modulos = [
  {
    icon: 'post_add',
    title: 'Nova Inserção',
    text: 'Formulário de atendimento com dados do paciente, ocorrência, endereço, dados profissionais e informações clínicas.',
    highlight: false
  },
  {
    icon: 'dashboard',
    title: 'Módulo Analítico',
    text: 'Dashboard com mapa territorial, indicadores, semáforo de risco e leitura estratégica da rede.',
    highlight: true
  },
  {
    icon: 'shield_person',
    title: 'Administração',
    text: 'Base preparada para aprovação de usuários, catálogos, permissões e configurações futuras do sistema.',
    highlight: false
  }
];

const fluxo = [
  'Atendimento registrado',
  'Dados clínicos e operacionais',
  'Classificação de risco',
  'Mapa atualizado',
  'Relatório automático',
  'Gestão territorial'
];

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const acessarSistema = () => navigate('/login');

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f8f9fa] text-slate-900">
      <nav className="fixed top-0 z-50 w-full border-b border-slate-200/70 bg-white/85 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex w-[calc(100vw-2rem)] max-w-7xl items-center justify-between gap-3 px-0 py-4 sm:w-auto sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#003f81] text-white shadow-lg shadow-blue-900/20">
              <span className="material-symbols-outlined">hub</span>
            </div>
            <div className="min-w-0 max-w-[9.5rem] sm:max-w-none">
              <p className="truncate text-base font-black leading-none tracking-tight text-[#003f81] sm:text-lg">CONEXÃO RAPS</p>
              <p className="hidden text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500 sm:block">Saúde & território</p>
            </div>
          </div>

          <div className="hidden items-center gap-8 text-sm font-bold text-slate-600 md:flex">
            <a href="#about" className="hover:text-[#003f81]">O que é</a>
            <a href="#modules" className="hover:text-[#003f81]">Módulos</a>
            <a href="#risk" className="hover:text-[#003f81]">Classificação</a>
            <a href="#resources" className="hover:text-[#003f81]">Recursos</a>
          </div>

          <button
            type="button"
            onClick={acessarSistema}
            className="shrink-0 rounded-xl bg-[#003f81] px-3 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-900/20 transition-all hover:-translate-y-0.5 hover:bg-[#0056ac] sm:px-5 sm:text-sm"
          >Acessar</button>
        </div>
      </nav>

      <main>
        <section className="relative overflow-hidden px-4 pb-20 pt-32 sm:px-6">
          <div className="absolute left-[-12rem] top-12 h-96 w-96 rounded-full bg-[#9cefde]/50 blur-3xl" />
          <div className="absolute right-[-10rem] top-24 h-[30rem] w-[30rem] rounded-full bg-blue-100 blur-3xl" />

          <div className="relative mx-auto grid w-full max-w-7xl min-w-0 items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="w-[calc(100vw-2rem)] min-w-0 max-w-full sm:w-auto">
              <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full bg-[#9cefde] px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#006b5e] sm:text-xs sm:tracking-[0.2em]">
                <span className="material-symbols-outlined text-[18px]">health_metrics</span>
                <span className="truncate">Monitoramento estratégico</span>
              </div>
              <h1 className="mb-6 max-w-full text-4xl font-black leading-[0.95] tracking-tight text-[#003f81] sm:text-5xl md:text-7xl">
                CONEXÃO RAPS
              </h1>
              <p className="mb-4 max-w-2xl break-words text-xl font-bold leading-snug text-slate-700 sm:text-2xl">
                Sistema Estratégico de Monitoramento da Rede de Atenção Psicossocial.
              </p>
              <p className="mb-10 max-w-xl break-words text-base leading-relaxed text-slate-500 sm:text-lg">
                Integra dados de atendimento, território, risco clínico e gestão para fortalecer decisões da RAPS e apoiar o cuidado em saúde mental.
              </p>
              <div className="flex w-full min-w-0 flex-wrap gap-4">
                <button
                  type="button"
                  onClick={acessarSistema}
                  className="w-full max-w-full rounded-2xl bg-gradient-to-br from-[#003f81] to-[#0056ac] px-6 py-4 text-base font-black text-white shadow-xl shadow-blue-900/20 transition-all hover:-translate-y-1 sm:w-auto sm:px-8 sm:text-lg"
                >Acessar</button>
                <a
                  href="#modules"
                  className="w-full max-w-full rounded-2xl border-2 border-[#003f81]/10 bg-white px-6 py-4 text-center text-base font-black text-[#003f81] shadow-sm transition-all hover:-translate-y-1 hover:border-[#003f81]/30 sm:w-auto sm:px-8 sm:text-lg"
                >
                  Conhecer Funcionalidades
                </a>
              </div>
            </div>

            <div className="relative w-[calc(100vw-2rem)] min-w-0 max-w-full sm:w-auto">
              <div className="aspect-square overflow-hidden rounded-[2.5rem] bg-slate-200 shadow-2xl shadow-slate-900/20">
                <img
                  className="h-full w-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBkw0EnMJTPsl7Oh4EKyutwYkzzZ_Kehl0tAH-cIpJqeAkBJI2JgCq2E3bkNAnFlY4FoDiW15HslXAer61eliwmcJpSQm7BumPkCzZZHz-n3sgc9QR7im0iTrEJsQQFcuivpsdyfNojc1gPXSrBohwPHcHXBvvMzV4nhHOdSOQaA0_IHsyEWO4DKEJVGwQ_VeE0PuoSiqIQNOvlhu-1ZgAUxeW57-ZFhhqBxUghy1_I1PxOI4XIdGfAwOM7FMkxFPZGx_iSi9sStnk"
                  alt="Mapa digital abstrato"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-t from-[#003f81]/25 to-transparent" />
              </div>
              <div className="absolute right-4 top-4 w-[min(12rem,calc(100%-2rem))] rounded-3xl border border-white/70 bg-white/75 p-4 shadow-2xl backdrop-blur-md sm:right-6 sm:top-8">
                <p className="mb-1 text-xs font-black uppercase tracking-wider text-slate-500">Rede monitorada</p>
                <p className="text-3xl font-black text-[#003f81]">RAPS</p>
                <div className="mt-3 h-1 rounded-full bg-[#9cefde]" />
              </div>
              <div className="absolute bottom-4 left-4 w-[min(16rem,calc(100%-2rem))] rounded-3xl border border-white/70 bg-white/80 p-4 shadow-2xl backdrop-blur-md sm:bottom-8 sm:left-6 sm:p-5">
                <div className="mb-2 flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-red-600" />
                  <p className="text-xs font-black uppercase text-slate-800">Alerta de gestão</p>
                </div>
                <p className="text-sm font-medium leading-relaxed text-slate-500">
                  Leitura territorial para priorizar busca ativa, acompanhamento e vínculo com a rede.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="bg-[#f3f4f5] px-6 py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-16 md:grid-cols-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <span className="material-symbols-outlined mb-4 text-[42px] text-[#003f81]">emergency_home</span>
                <h3 className="mb-2 font-black text-[#003f81]">Integração SAMU</h3>
                <p className="text-sm leading-relaxed text-slate-500">Organização de ocorrências e dados assistenciais para monitoramento.</p>
              </div>
              <div className="mt-10 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <span className="material-symbols-outlined mb-4 text-[42px] text-[#006b5e]">monitoring</span>
                <h3 className="mb-2 font-black text-[#006b5e]">Rastreabilidade</h3>
                <p className="text-sm leading-relaxed text-slate-500">Histórico do paciente, reincidência e indicadores para gestão.</p>
              </div>
            </div>
            <div>
              <h2 className="mb-6 text-4xl font-black tracking-tight text-[#003f81]">O que é a Conexão RAPS?</h2>
              <p className="mb-6 text-lg leading-relaxed text-slate-700">
                A Conexão RAPS é uma plataforma estratégica para registrar, organizar e monitorar atendimentos relacionados à saúde mental e ocorrências psicossociais.
              </p>
              <p className="text-lg leading-relaxed text-slate-500">
                O sistema transforma dados assistenciais em inteligência territorial, ajudando gestores a visualizar gargalos, priorizar intervenções e fortalecer a rede de cuidado.
              </p>
            </div>
          </div>
        </section>

        <section id="modules" className="mx-auto max-w-7xl px-6 py-24">
          <div className="mb-14">
            <h2 className="mb-4 text-4xl font-black text-[#003f81]">Módulos do Sistema</h2>
            <p className="max-w-2xl text-lg leading-relaxed text-slate-500">
              Estrutura modular pensada para inserção de dados, análise territorial e futura administração do sistema.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {modulos.map((modulo) => (
              <div
                key={modulo.title}
                className={`relative overflow-hidden rounded-[2rem] p-8 shadow-sm transition-all hover:-translate-y-2 hover:shadow-xl ${
                  modulo.highlight ? 'bg-[#003f81] text-white' : 'border border-slate-200 bg-white text-slate-800'
                }`}
              >
                <div className={`mb-8 flex h-14 w-14 items-center justify-center rounded-2xl ${modulo.highlight ? 'bg-white/20' : 'bg-[#003f81]/10'}`}>
                  <span className={`material-symbols-outlined text-[34px] ${modulo.highlight ? 'text-white' : 'text-[#003f81]'}`}>{modulo.icon}</span>
                </div>
                <h3 className={`mb-4 text-2xl font-black ${modulo.highlight ? 'text-white' : 'text-[#003f81]'}`}>{modulo.title}</h3>
                <p className={`leading-relaxed ${modulo.highlight ? 'text-blue-100' : 'text-slate-500'}`}>{modulo.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="risk" className="bg-[#e7e8e9] px-6 py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-4xl font-black text-[#003f81]">Semáforo de Risco Clínico-Territorial</h2>
              <p className="mx-auto max-w-3xl text-lg leading-relaxed text-slate-500">
                A regra única do sistema organiza mapa e relatório em vermelho, amarelo e verde, reduzindo inconsistência entre os módulos.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              <RiskCard color="red" icon="emergency" title="Vermelho" subtitle="Crise de fluxo" text="Porta giratória, reincidência importante e fragilidade assistencial que exigem alta prioridade." />
              <RiskCard color="yellow" icon="warning" title="Amarelo" subtitle="Alerta de risco" text="Vulnerabilidade, dependência química, falta de apoio familiar e/ou falta de apoio da RAPS." />
              <RiskCard color="green" icon="check_circle" title="Verde" subtitle="Estabilidade" text="Situações sem critérios de agravamento, com fluxo assistencial dentro da normalidade." />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-24">
          <h2 className="mb-16 text-center text-4xl font-black text-[#003f81]">Fluxo Operacional Inteligente</h2>
          <div className="grid gap-5 md:grid-cols-6">
            {fluxo.map((step, index) => (
              <div key={step} className="rounded-3xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-200">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#003f81] text-lg font-black text-white shadow-lg shadow-blue-900/20">
                  {index + 1}
                </div>
                <p className="text-sm font-black uppercase leading-snug text-[#003f81]">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="resources" className="bg-white px-6 py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
            <div>
              <h2 className="mb-8 text-4xl font-black text-[#003f81]">Recursos & Inteligência</h2>
              <div className="grid gap-6 sm:grid-cols-2">
                {recursos.map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <span className="material-symbols-outlined shrink-0 text-[30px] text-[#003f81]">{item.icon}</span>
                    <div>
                      <h3 className="mb-1 font-black text-slate-900">{item.title}</h3>
                      <p className="text-sm leading-relaxed text-slate-500">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-12 rounded-3xl border-l-4 border-[#003f81] bg-[#f8f9fa] p-8">
                <h3 className="mb-2 font-black text-[#003f81]">Segurança de Dados</h3>
                <p className="leading-relaxed text-slate-500">
                  O acesso é organizado por módulos, e novos usuários passam por análise e aprovação do administrador.
                </p>
              </div>
            </div>
            <div className="relative min-h-[420px] overflow-hidden rounded-[2rem] bg-[#e7e8e9] p-3 shadow-inner sm:min-h-[500px] sm:rounded-[3rem] sm:p-4">
              <img
                className="h-full min-h-[420px] w-full rounded-[1.6rem] object-cover sm:min-h-[500px] sm:rounded-[2.5rem]"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBHWlFDVDCEsH_WkjZVmpSD4HO61hwKkQWS6XMzp3MTE67JN92IxJftlyBM-QgjBKBRoBtfqcMAtVrvZtdvnezVtfAiQAVfX-MIu_AiFGZypO18JwN4MA3Xc_hyWiOHeaGz1yeAsLxYZD7d3_v5hmdaEfNZMnjbUj99DNZHacvnzWqs4_LeF-GeSA4hfFy8T03IgPM-4gMMs4wHoSxjMdO_pEucQt2Nr3rwYQrnKFWAj9S2v1rQzahHjsum__bqmE8qzNyEKDgExWY"
                alt="Mapa digital territorial"
                referrerPolicy="no-referrer"
              />
              <div className="absolute left-5 right-5 top-5 rounded-3xl border border-white/60 bg-white/75 p-5 shadow-2xl backdrop-blur-md sm:left-10 sm:right-auto sm:top-10">
                <h3 className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-[#003f81]">Territórios em foco</h3>
                <div className="space-y-3 text-sm font-bold text-slate-700">
                  <TerritoryDot name="Centro" color="bg-green-600" />
                  <TerritoryDot name="Zona Sul" color="bg-red-600" />
                  <TerritoryDot name="Zona Oeste" color="bg-amber-500" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="mb-2 text-lg font-black text-[#003f81]">CONEXÃO RAPS</p>
            <p className="max-w-lg text-sm leading-relaxed text-slate-500">
              Tecnologia, cuidado e gestão integrada em saúde mental. Desenvolvido por Lucivaldo Oliveira Barroso.
            </p>
          </div>
          <button
            type="button"
            onClick={acessarSistema}
            className="rounded-xl bg-[#003f81] px-6 py-3 font-black text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-[#0056ac]"
          >Acessar</button>
        </div>
      </footer>
    </div>
  );
};

const RiskCard: React.FC<{ color: 'red' | 'yellow' | 'green'; icon: string; title: string; subtitle: string; text: string }> = ({
  color,
  icon,
  title,
  subtitle,
  text
}) => {
  const styles = {
    red: 'border-red-200 bg-red-50 text-red-700',
    yellow: 'border-amber-200 bg-amber-50 text-amber-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700'
  };

  return (
    <div className={`rounded-[2rem] border p-8 text-center shadow-sm ${styles[color]}`}>
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-current/10">
        <span className="material-symbols-outlined text-[44px]">{icon}</span>
      </div>
      <h3 className="mb-2 text-2xl font-black">{title}</h3>
      <p className="mb-4 text-sm font-black uppercase tracking-[0.2em]">{subtitle}</p>
      <p className="leading-relaxed text-slate-600">{text}</p>
    </div>
  );
};

const TerritoryDot: React.FC<{ name: string; color: string }> = ({ name, color }) => (
  <div className="flex items-center justify-between gap-10">
    <span>{name}</span>
    <span className={`h-3 w-3 rounded-full ${color}`} />
  </div>
);

export default LandingPage;
