import React from 'react';
import type { IndicadoresEstudoPayload } from '../../types';

type Props = {
  value: IndicadoresEstudoPayload;
  onChange: (next: IndicadoresEstudoPayload) => void;
};

const yesNoOptions = [
  { value: '', label: 'Selecione' },
  { value: 'SIM', label: 'Sim' },
  { value: 'NAO', label: 'Nao' },
  { value: 'NAO INFORMADO', label: 'Nao informado' }
];

const consciousnessOptions = [
  { value: '', label: 'Selecione' },
  { value: 'ALERTA', label: 'Alerta' },
  { value: 'CONFUSO', label: 'Confuso' },
  { value: 'INCONSCIENTE', label: 'Inconsciente' },
  { value: 'NAO INFORMADO', label: 'Nao informado' }
];

const familySituationOptions = [
  { value: '', label: 'Selecione' },
  { value: 'PRESENTE COLABORATIVO', label: 'Presente e colaborativo' },
  { value: 'PRESENTE NAO COLABORATIVO', label: 'Presente e nao colaborativo' },
  { value: 'NAO PRESENTE', label: 'Nao presente' },
  { value: 'NAO INFORMADO', label: 'Nao informado' }
];

const selectClassName = 'w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium';

const IndicadoresEstudoSection: React.FC<Props> = ({ value, onChange }) => {
  const updateField = (field: keyof IndicadoresEstudoPayload, fieldValue: string) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <section className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
      <div>
        <h3 className="text-base font-bold uppercase text-emerald-900 dark:text-emerald-100">
          Indicadores do Estudo
        </h3>
        <p className="text-sm text-slate-500">
          Campos estruturados para analise estatistica posterior.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label htmlFor="indicador_uso_alcool" className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">
            Uso de alcool
          </label>
          <select
            id="indicador_uso_alcool"
            value={value.uso_alcool}
            onChange={(event) => updateField('uso_alcool', event.target.value)}
            className={selectClassName}
          >
            {yesNoOptions.map((option) => (
              <option key={`alcool-${option.value}`} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="indicador_uso_drogas" className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">
            Uso de drogas
          </label>
          <select
            id="indicador_uso_drogas"
            value={value.uso_drogas}
            onChange={(event) => updateField('uso_drogas', event.target.value)}
            className={selectClassName}
          >
            {yesNoOptions.map((option) => (
              <option key={`drogas-${option.value}`} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="indicador_presenca_familiar" className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">
            Familiar presente na cena
          </label>
          <select
            id="indicador_presenca_familiar"
            value={value.presenca_familiar}
            onChange={(event) => updateField('presenca_familiar', event.target.value)}
            className={selectClassName}
          >
            {yesNoOptions.map((option) => (
              <option key={`familiar-${option.value}`} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="indicador_situacao_familiar" className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">
            Situacao do familiar
          </label>
          <select
            id="indicador_situacao_familiar"
            value={value.situacao_familiar}
            onChange={(event) => updateField('situacao_familiar', event.target.value)}
            className={selectClassName}
          >
            {familySituationOptions.map((option) => (
              <option key={`situacao-familiar-${option.value}`} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="indicador_nivel_consciencia" className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">
            Nivel de consciencia
          </label>
          <select
            id="indicador_nivel_consciencia"
            value={value.nivel_consciencia}
            onChange={(event) => updateField('nivel_consciencia', event.target.value)}
            className={selectClassName}
          >
            {consciousnessOptions.map((option) => (
              <option key={`consciencia-${option.value}`} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="indicador_risco_agressao" className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">
            Risco de agressao
          </label>
          <select
            id="indicador_risco_agressao"
            value={value.risco_agressao}
            onChange={(event) => updateField('risco_agressao', event.target.value)}
            className={selectClassName}
          >
            {yesNoOptions.map((option) => (
              <option key={`agressao-${option.value}`} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
};

export default IndicadoresEstudoSection;
