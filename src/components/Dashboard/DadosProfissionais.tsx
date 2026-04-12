import React from 'react';
import type { DadosProfissionaisCatalogo, DadosProfissionaisPayload } from '../../types';

export type DadosProfissionaisFormState = DadosProfissionaisPayload & {
  encaminhadoOutro: string;
  medicacoesUsoLista: string[];
  medicacoesContencaoQuimica: string[];
  medicacoesContencaoQuimicaOutros: string[];
  vtrOutro: string;
  medicoReguladorOutro: string;
  enfermeiroOutro: string;
  medicoOutro: string;
  tecnicoEnfermagemOutro: string;
};

type Props = {
  value: DadosProfissionaisFormState;
  onChange: (next: DadosProfissionaisFormState) => void;
  catalogo: DadosProfissionaisCatalogo;
};

const VALOR_OUTROS = '__OUTROS__';

const resolveSelectValue = (valorAtual: string, opcoes: string[]) => {
  const valor = String(valorAtual || '').trim().toUpperCase();
  if (!valor) return '';
  if (valor === 'OUTROS') return VALOR_OUTROS;
  return opcoes.includes(valor) ? valor : VALOR_OUTROS;
};

const normalizarListaComLinhaVazia = (valores: string[]) => {
  const lista = valores.length > 0 ? valores : [''];
  const precisaLinhaVazia = String(lista[lista.length - 1] || '').trim() !== '';
  return precisaLinhaVazia ? [...lista, ''] : lista;
};

const DadosProfissionais: React.FC<Props> = ({ value, onChange, catalogo }) => {
  const updateField = (campo: keyof DadosProfissionaisFormState, valor: string) => {
    onChange({ ...value, [campo]: valor.toUpperCase() });
  };

  const atualizarMedicacoesUso = (index: number, valor: string) => {
    const nextLista = normalizarListaComLinhaVazia(value.medicacoesUsoLista);
    nextLista[index] = valor.toUpperCase();
    const medicamentosValidos = nextLista.map((item) => item.trim()).filter(Boolean);

    onChange({
      ...value,
      medicacoesUsoLista: normalizarListaComLinhaVazia(nextLista),
      medicacoes_uso: medicamentosValidos.join('; ')
    });
  };

  const renderSelectComOutros = ({
    id,
    label,
    valueKey,
    outroKey,
    opcoes
  }: {
    id: string;
    label: string;
    valueKey: keyof DadosProfissionaisFormState;
    outroKey: keyof DadosProfissionaisFormState;
    opcoes: string[];
  }) => {
    const valorAtual = String(value[valueKey] || '');
    const selectValue = resolveSelectValue(valorAtual, opcoes);
    const usandoOutro = selectValue === VALOR_OUTROS || Boolean(String(value[outroKey] || '').trim());

    return (
      <div className="space-y-2">
        <label htmlFor={id} className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">
          {label}
        </label>
        <select
          id={id}
          value={selectValue}
          onChange={(e) => {
            const nextValue = e.target.value;
            if (nextValue === VALOR_OUTROS) {
              onChange({
                ...value,
                [valueKey]: 'OUTROS',
                [outroKey]: String(value[outroKey] || (valorAtual && valorAtual !== 'OUTROS' ? valorAtual : '')).toUpperCase()
              });
              return;
            }

            onChange({
              ...value,
              [valueKey]: nextValue,
              [outroKey]: ''
            });
          }}
          className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium"
        >
          <option value="">Selecione</option>
          {opcoes.map((opcao) => (
            <option key={`${id}-${opcao}`} value={opcao === 'OUTROS' ? VALOR_OUTROS : opcao}>
              {opcao}
            </option>
          ))}
          {!opcoes.includes('OUTROS') && <option value={VALOR_OUTROS}>OUTROS</option>}
        </select>

        {usandoOutro && (
          <input
            type="text"
            value={String(value[outroKey] || (valorAtual !== 'OUTROS' ? valorAtual : '') || '')}
            onChange={(e) => {
              const texto = e.target.value.toUpperCase();
              onChange({
                ...value,
                [outroKey]: texto,
                [valueKey]: texto
              });
            }}
            placeholder="Informe outro valor"
            className="w-full p-2.5 border border-brand-light bg-blue-50 rounded-lg focus:ring-2 focus:ring-brand-medium uppercase text-sm"
          />
        )}
      </div>
    );
  };

  return (
    <section className="space-y-4 rounded-2xl border border-brand-light/40 bg-brand-light/5 p-5">
      <div>
        <h3 className="text-base font-bold text-brand-dark uppercase">Dados Profissionais e Operacionais</h3>
        <p className="text-sm text-slate-500">Informações da equipe, viatura e tempos operacionais do atendimento.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="data_atendimento" className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">
            Data
          </label>
          <input
            type="date"
            id="data_atendimento"
            value={value.data_atendimento}
            onChange={(e) => onChange({ ...value, data_atendimento: e.target.value })}
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium"
          />
        </div>
        <div>
          <label htmlFor="numero_faph" className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">
            Nº FAPH
          </label>
          <input
            type="text"
            id="numero_faph"
            value={value.numero_faph}
            onChange={(e) => updateField('numero_faph', e.target.value)}
            placeholder="Informe o número"
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium uppercase"
          />
        </div>
        <div>
          <label htmlFor="numero_ocorrencia" className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">
            Nº Ocorrência
          </label>
          <input
            type="text"
            id="numero_ocorrencia"
            value={value.numero_ocorrencia}
            onChange={(e) => updateField('numero_ocorrencia', e.target.value)}
            placeholder="Informe o número"
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium uppercase"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderSelectComOutros({
          id: 'encaminhado',
          label: 'Encaminhado',
          valueKey: 'encaminhado',
          outroKey: 'encaminhadoOutro',
          opcoes: catalogo.encaminhado
        })}
        <div>
          <label htmlFor="sinais_vitais" className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">
            Sinais Vitais
          </label>
          <select
            id="sinais_vitais"
            value={value.sinais_vitais}
            onChange={(e) => {
              const nextValue = e.target.value;
              onChange({
                ...value,
                sinais_vitais: nextValue,
                sinais_vitais_descricao: nextValue === 'COM ALTERACAO' ? value.sinais_vitais_descricao : ''
              });
            }}
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium"
          >
            <option value="">Selecione</option>
            <option value="SEM ALTERACAO">Sem alteração</option>
            <option value="COM ALTERACAO">Com alteração</option>
          </select>
        </div>

        {value.sinais_vitais === 'COM ALTERACAO' && (
          <div>
            <label htmlFor="sinais_vitais_descricao" className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">
              Descrição da Alteração
            </label>
            <input
              type="text"
              id="sinais_vitais_descricao"
              value={value.sinais_vitais_descricao}
              onChange={(e) => updateField('sinais_vitais_descricao', e.target.value)}
              placeholder="Descreva a alteração"
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium uppercase"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="medicacao_uso" className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">
            Medicação de Uso
          </label>
          <select
            id="medicacao_uso"
            value={value.medicacao_uso}
            onChange={(e) => {
              const nextValue = e.target.value;
              onChange({
                ...value,
                medicacao_uso: nextValue,
                medicacoes_uso: nextValue === 'SIM' ? value.medicacoes_uso : '',
                medicacoesUsoLista: nextValue === 'SIM' ? normalizarListaComLinhaVazia(value.medicacoesUsoLista) : ['']
              });
            }}
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium"
          >
            <option value="">Selecione</option>
            <option value="SIM">Sim</option>
            <option value="NAO">Não</option>
            <option value="NAO INFORMADO">Não Informado</option>
          </select>
        </div>

        {value.medicacao_uso === 'SIM' && (
          <div className="space-y-3">
            <label className="block text-brand-dark dark:text-white font-semibold text-sm">
              Medicações de Uso
            </label>
            {normalizarListaComLinhaVazia(value.medicacoesUsoLista).map((medicacao, index) => (
              <div key={`medicacao-uso-${index}`} className="flex items-center gap-2">
                <input
                  type="text"
                  value={medicacao}
                  onChange={(e) => atualizarMedicacoesUso(index, e.target.value)}
                  placeholder="Informe a medicação de uso"
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium uppercase"
                />
                {index > 0 && medicacao.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      const nextLista = normalizarListaComLinhaVazia(value.medicacoesUsoLista).filter((_, itemIndex) => itemIndex !== index);
                      const medicamentosValidos = nextLista.map((item) => item.trim()).filter(Boolean);
                      onChange({
                        ...value,
                        medicacoesUsoLista: normalizarListaComLinhaVazia(nextLista),
                        medicacoes_uso: medicamentosValidos.join('; ')
                      });
                    }}
                    className="shrink-0 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold uppercase text-red-600 hover:bg-red-50"
                  >
                    Remover
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contencao_quimica" className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">
            Realizado Contenção Química
          </label>
          <select
            id="contencao_quimica"
            value={value.contencao_quimica}
            onChange={(e) => {
              const nextValue = e.target.value;
              onChange({
                ...value,
                contencao_quimica: nextValue,
                medicacao_contencao_quimica: nextValue === 'SIM' ? value.medicacao_contencao_quimica : '',
                medicacoesContencaoQuimica: nextValue === 'SIM' ? normalizarListaComLinhaVazia(value.medicacoesContencaoQuimica) : [''],
                medicacoesContencaoQuimicaOutros: nextValue === 'SIM' ? value.medicacoesContencaoQuimicaOutros : ['']
              });
            }}
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium"
          >
            <option value="">Selecione</option>
            <option value="SIM">Sim</option>
            <option value="NAO">Não</option>
            <option value="NAO INFORMADO">Não Informado</option>
          </select>
        </div>

        {false && value.contencao_quimica === 'SIM' && renderSelectComOutros({
          id: 'medicacao_contencao_quimica',
          label: 'Medicação da Contenção Química',
          valueKey: 'medicacao_contencao_quimica',
          outroKey: 'medicacoesContencaoQuimicaOutros',
          opcoes: catalogo.medicacao_contencao_quimica
        })}

        {value.contencao_quimica === 'SIM' && (
          <div className="space-y-3">
            <label className="block text-brand-dark dark:text-white font-semibold text-sm">
              Medicação da Contenção Química
            </label>
            {normalizarListaComLinhaVazia(value.medicacoesContencaoQuimica).map((medicacao, index) => {
              const selectValue = resolveSelectValue(medicacao, catalogo.medicacao_contencao_quimica);
              const outroAtual = value.medicacoesContencaoQuimicaOutros[index] || '';
              const usandoOutro = selectValue === VALOR_OUTROS || Boolean(outroAtual.trim());

              const atualizarLista = (nextMedicacao: string, nextOutro = outroAtual) => {
                const nextLista = normalizarListaComLinhaVazia(value.medicacoesContencaoQuimica);
                const nextOutros = [...value.medicacoesContencaoQuimicaOutros];
                nextLista[index] = nextMedicacao.toUpperCase();
                nextOutros[index] = nextOutro.toUpperCase();
                const medicamentosValidos = nextLista.map((item) => item.trim()).filter(Boolean);

                onChange({
                  ...value,
                  medicacoesContencaoQuimica: normalizarListaComLinhaVazia(nextLista),
                  medicacoesContencaoQuimicaOutros: nextOutros,
                  medicacao_contencao_quimica: medicamentosValidos.join('; ')
                });
              };

              return (
                <div key={`medicacao-contencao-${index}`} className="space-y-2 rounded-xl border border-slate-200 bg-white/70 p-3">
                  <select
                    value={selectValue}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      if (nextValue === VALOR_OUTROS) {
                        atualizarLista(outroAtual || 'OUTROS', outroAtual);
                        return;
                      }
                      atualizarLista(nextValue, '');
                    }}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium"
                  >
                    <option value="">Selecione</option>
                    {catalogo.medicacao_contencao_quimica.map((opcao) => (
                      <option key={`medicacao-contencao-${index}-${opcao}`} value={opcao === 'OUTROS' ? VALOR_OUTROS : opcao}>
                        {opcao}
                      </option>
                    ))}
                    {!catalogo.medicacao_contencao_quimica.includes('OUTROS') && <option value={VALOR_OUTROS}>OUTROS</option>}
                  </select>

                  {usandoOutro && (
                    <input
                      type="text"
                      value={outroAtual || (medicacao !== 'OUTROS' ? medicacao : '')}
                      onChange={(e) => {
                        const texto = e.target.value.toUpperCase();
                        atualizarLista(texto, texto);
                      }}
                      placeholder="Informe outra medicação"
                      className="w-full p-2.5 border border-brand-light bg-blue-50 rounded-lg focus:ring-2 focus:ring-brand-medium uppercase text-sm"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contencao_fisica" className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">
            Realizado Contenção Física
          </label>
          <select
            id="contencao_fisica"
            value={value.contencao_fisica}
            onChange={(e) => {
              const nextValue = e.target.value;
              onChange({
                ...value,
                contencao_fisica: nextValue,
                descricao_contencao_fisica: nextValue === 'SIM' ? value.descricao_contencao_fisica : ''
              });
            }}
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium"
          >
            <option value="">Selecione</option>
            <option value="SIM">Sim</option>
            <option value="NAO">Não</option>
            <option value="NAO INFORMADO">Não Informado</option>
          </select>
        </div>

        {value.contencao_fisica === 'SIM' && (
          <div>
            <label htmlFor="descricao_contencao_fisica" className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">
              Como foi realizada a contenção
            </label>
            <input
              type="text"
              id="descricao_contencao_fisica"
              value={value.descricao_contencao_fisica}
              onChange={(e) => updateField('descricao_contencao_fisica', e.target.value)}
              placeholder="Descreva a contenção física"
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium uppercase"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderSelectComOutros({
          id: 'medico_regulador',
          label: 'Médico Regulador',
          valueKey: 'medico_regulador',
          outroKey: 'medicoReguladorOutro',
          opcoes: catalogo.medico_regulador
        })}
        {renderSelectComOutros({
          id: 'vtr',
          label: 'VTR',
          valueKey: 'vtr',
          outroKey: 'vtrOutro',
          opcoes: catalogo.vtr
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {renderSelectComOutros({
          id: 'enfermeiro',
          label: 'Enfermeiro',
          valueKey: 'enfermeiro',
          outroKey: 'enfermeiroOutro',
          opcoes: catalogo.enfermeiro
        })}
        {renderSelectComOutros({
          id: 'medico',
          label: 'Médico',
          valueKey: 'medico',
          outroKey: 'medicoOutro',
          opcoes: catalogo.medico
        })}
        {renderSelectComOutros({
          id: 'tecnico_enfermagem',
          label: 'Tec. de Enfermagem',
          valueKey: 'tecnico_enfermagem',
          outroKey: 'tecnicoEnfermagemOutro',
          opcoes: catalogo.tecnico_enfermagem
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label htmlFor="j9_inicio" className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">
            J/9 I
          </label>
          <input
            type="time"
            id="j9_inicio"
            value={value.j9_inicio}
            onChange={(e) => onChange({ ...value, j9_inicio: e.target.value })}
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium"
          />
        </div>
        <div>
          <label htmlFor="j10_inicio" className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">
            J/10 I
          </label>
          <input
            type="time"
            id="j10_inicio"
            value={value.j10_inicio}
            onChange={(e) => onChange({ ...value, j10_inicio: e.target.value })}
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium"
          />
        </div>
        <div>
          <label htmlFor="j9_fim" className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">
            J/9 F
          </label>
          <input
            type="time"
            id="j9_fim"
            value={value.j9_fim}
            onChange={(e) => onChange({ ...value, j9_fim: e.target.value })}
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium"
          />
        </div>
        <div>
          <label htmlFor="j10_fim" className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">
            J/10 F
          </label>
          <input
            type="time"
            id="j10_fim"
            value={value.j10_fim}
            onChange={(e) => onChange({ ...value, j10_fim: e.target.value })}
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium"
          />
        </div>
      </div>
    </section>
  );
};

export default DadosProfissionais;
