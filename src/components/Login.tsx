import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { rotaInicialPorModulo } from '../utils/permissoesAcesso';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPendingModal, setShowPendingModal] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [regData, setRegData] = useState({
    nomeCompleto: '',
    email: '',
    cpf: '',
    matricula: '',
    funcao: '',
    usuario: '',
    moduloAcesso: 'INSERCAO',
    senha: '',
    confirmarSenha: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setRegData((prev) => ({ ...prev, [id]: value }));
  };

  const validateCpf = (cpf: string) => cpf.replace(/\D/g, '').length === 11;

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Preencha todos os campos!');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = await api.login(username, password);

      if (data.result === 'success') {
        localStorage.setItem(
          'user_info',
          JSON.stringify({
            id: data.id,
            usuario: data.usuario || username.toUpperCase(),
            nomeCompleto: data.nomeCompleto,
            modulo: data.modulo,
            funcao: data.funcao,
            matricula: data.matricula,
            ativo: data.ativo,
            statusAprovacao: data.statusAprovacao
          })
        );
        setSuccess(data.message || 'Login realizado com sucesso!');
        setTimeout(() => navigate(rotaInicialPorModulo({ modulo: data.modulo })), 800);
      } else {
        setError(data.message || 'Erro ao realizar login');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro de comunicação com o Supabase.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (Object.values(regData).some((val) => !val)) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    if (!validateCpf(regData.cpf)) {
      setError('O CPF deve conter 11 dígitos.');
      return;
    }

    if (!validateEmail(regData.email)) {
      setError('Informe um e-mail válido.');
      return;
    }

    if (regData.senha !== regData.confirmarSenha) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      const result = await api.registrar(regData);
      if (result.result === 'success') {
        setSuccess(result.message);
        setShowPendingModal(true);
        setTimeout(() => {
          setIsLogin(true);
          setSuccess('');
        }, 800);
      } else {
        setError(result.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao processar o cadastro no Supabase.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-x-hidden overflow-y-auto bg-[#f8f9fa] px-4 pb-10 pt-24 text-slate-900 sm:py-10">
      <div className="absolute left-[-10rem] top-[-8rem] h-96 w-96 rounded-full bg-[#9cefde]/60 blur-3xl" />
      <div className="absolute bottom-[-12rem] right-[-8rem] h-[34rem] w-[34rem] rounded-full bg-blue-100 blur-3xl" />

      <button
        type="button"
        onClick={() => navigate('/')}
        className="absolute left-5 top-5 z-20 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-bold text-[#003f81] shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Página inicial
      </button>

      <div className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/15 ring-1 ring-slate-200 sm:rounded-[2.4rem] lg:grid-cols-[1.05fr_0.95fr]">
        <aside className="relative hidden min-h-[680px] overflow-hidden bg-[#003f81] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute right-[-7rem] top-[-7rem] h-80 w-80 rounded-full bg-[#9cefde]/20 blur-2xl" />
          <div className="absolute bottom-[-8rem] left-[-8rem] h-96 w-96 rounded-full bg-white/10 blur-3xl" />

          <div className="relative">
            <div className="mb-10 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#003f81] shadow-xl">
                <span className="material-symbols-outlined text-[34px]">hub</span>
              </div>
              <div>
                <p className="text-2xl font-black leading-none">CONEXÃO RAPS</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.28em] text-blue-100">Saúde & território</p>
              </div>
            </div>

            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#9cefde]/20 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#9cefde]">
              <span className="material-symbols-outlined text-[18px]">shield</span>
              Acesso institucional
            </p>
            <h1 className="mb-6 max-w-xl text-5xl font-black leading-tight tracking-tight">
              Entre no ambiente seguro de monitoramento da RAPS.
            </h1>
            <p className="max-w-lg text-lg leading-relaxed text-blue-100">
              O acesso ao sistema é organizado por módulos para proteger os dados, preservar a rotina de inserção e fortalecer a análise territorial.
            </p>
          </div>

          <div className="relative grid gap-4">
            <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
              <div className="mb-2 flex items-center gap-3">
                <span className="material-symbols-outlined text-[#9cefde]">admin_panel_settings</span>
                <p className="font-black">Cadastro com aprovação</p>
              </div>
              <p className="text-sm leading-relaxed text-blue-100">
                Novas contas ficam em análise até liberação pelo administrador.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center text-xs font-black uppercase tracking-wide">
              <div className="rounded-2xl bg-white/10 p-4">Inserção</div>
              <div className="rounded-2xl bg-white/10 p-4">Analítico</div>
              <div className="rounded-2xl bg-white/10 p-4">Admin</div>
            </div>
          </div>
        </aside>

        <section className="flex min-h-[620px] flex-col justify-center p-5 sm:min-h-[680px] sm:p-10">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#003f81]/10 text-[#003f81]">
                <span className="material-symbols-outlined text-[34px]">health_metrics</span>
              </div>
              <h2 className="text-3xl font-black tracking-tight text-[#003f81]">
                {isLogin ? 'Acessar sistema' : 'Solicitar cadastro'}
              </h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
                {isLogin ? 'Use seu e-mail ou usuário para continuar.' : 'Sua conta será analisada antes da liberação.'}
              </p>
            </div>

            <div className="mb-6 flex rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setError('');
                  setSuccess('');
                }}
                className={`flex-1 rounded-xl py-3 text-sm font-black transition-all ${
                  isLogin ? 'bg-white text-[#003f81] shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setError('');
                  setSuccess('');
                }}
                className={`flex-1 rounded-xl py-3 text-sm font-black transition-all ${
                  !isLogin ? 'bg-white text-[#003f81] shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Registrar
              </button>
            </div>

            {isLogin ? (
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <FieldLabel htmlFor="username" label="E-mail ou Usuário" />
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">mail</span>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="seuemail@dominio.com ou usuário"
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 font-semibold outline-none transition-all focus:border-[#003f81] focus:bg-white focus:ring-4 focus:ring-[#003f81]/10"
                  />
                </div>

                <FieldLabel htmlFor="password" label="Senha" />
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">lock</span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha"
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-12 font-semibold outline-none transition-all focus:border-[#003f81] focus:bg-white focus:ring-4 focus:ring-[#003f81]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-[#003f81]"
                  >
                    <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>

                <StatusMessages error={error} success={success} />

                <button
                  disabled={loading}
                  type="submit"
                  className="mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#003f81] to-[#0056ac] font-black text-white shadow-xl shadow-blue-900/20 transition-all hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <>
                      Acessar Painel <span className="material-symbols-outlined text-[18px]">login</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="flex max-h-[520px] flex-col gap-3 overflow-y-auto pr-1">
                <InputField id="nomeCompleto" label="Nome Completo" value={regData.nomeCompleto} onChange={handleInputChange} />

                <FieldLabel htmlFor="moduloAcesso" label="Módulo de Acesso" />
                <select
                  id="moduloAcesso"
                  value={regData.moduloAcesso}
                  onChange={handleInputChange}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-semibold outline-none transition-all focus:border-[#003f81] focus:bg-white focus:ring-4 focus:ring-[#003f81]/10"
                >
                  <option value="INSERCAO">Inserção</option>
                  <option value="ANALITICO">Analítico</option>
                  <option value="INSERCAO_ANALITICO">Inserção e Analítico</option>
                </select>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <InputField id="cpf" label="CPF (Números)" value={regData.cpf} onChange={handleInputChange} maxLength={11} placeholder="00000000000" />
                  <InputField id="matricula" label="Matrícula" value={regData.matricula} onChange={handleInputChange} />
                </div>
                <InputField id="email" label="E-mail" type="email" value={regData.email} onChange={handleInputChange} placeholder="seuemail@dominio.com" />
                <InputField id="funcao" label="Função / Cargo" value={regData.funcao} onChange={handleInputChange} />
                <InputField id="usuario" label="Nome de Usuário" value={regData.usuario} onChange={handleInputChange} className="uppercase" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <InputField id="senha" label="Nova Senha" type="password" value={regData.senha} onChange={handleInputChange} />
                  <InputField id="confirmarSenha" label="Confirmar" type="password" value={regData.confirmarSenha} onChange={handleInputChange} />
                </div>

                <StatusMessages error={error} success={success} />

                <button
                  disabled={loading}
                  type="submit"
                  className="mt-3 flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-br from-[#003f81] to-[#0056ac] font-black text-white shadow-xl shadow-blue-900/20 transition-all hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {loading ? <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : 'Criar Minha Conta'}
                </button>
              </form>
            )}

            <p className="mt-8 text-center text-[11px] font-bold uppercase tracking-tight text-slate-400">
              Desenvolvido por <span className="text-[#003f81]">Lucivaldo Oliveira Barroso</span>
            </p>
          </div>
        </section>
      </div>

      {showPendingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/60 bg-white p-7 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#003f81]/10 text-[#003f81]">
              <span className="material-symbols-outlined text-[30px]">admin_panel_settings</span>
            </div>
            <h2 className="mb-2 text-xl font-black text-[#003f81]">Cadastro enviado para análise</h2>
            <p className="mb-6 text-sm leading-relaxed text-slate-600">
              Você poderá acessar sua conta após a análise e aprovação do administrador do sistema.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowPendingModal(false);
                setIsLogin(true);
              }}
              className="h-11 w-full rounded-xl bg-[#003f81] font-bold text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-[#0056ac]"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const FieldLabel: React.FC<{ htmlFor: string; label: string }> = ({ htmlFor, label }) => (
  <label className="ml-1 text-[11px] font-black uppercase tracking-wide text-slate-500" htmlFor={htmlFor}>
    {label}
  </label>
);

type InputFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  type?: string;
  placeholder?: string;
  maxLength?: number;
  className?: string;
};

const InputField: React.FC<InputFieldProps> = ({ id, label, value, onChange, type = 'text', placeholder, maxLength, className = '' }) => (
  <div className="space-y-1">
    <FieldLabel htmlFor={id} label={label} />
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      maxLength={maxLength}
      className={`h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-semibold outline-none transition-all focus:border-[#003f81] focus:bg-white focus:ring-4 focus:ring-[#003f81]/10 ${className}`}
    />
  </div>
);

const StatusMessages: React.FC<{ error: string; success: string }> = ({ error, success }) => (
  <>
    {error && <div className="rounded-2xl border border-red-100 bg-red-50 p-3 text-center text-xs font-black text-red-600">{error}</div>}
    {success && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-center text-xs font-black text-emerald-700">{success}</div>}
  </>
);

export default Login;
