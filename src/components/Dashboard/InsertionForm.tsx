import React, { useState, useEffect, useRef } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import Sidebar from './Sidebar';
import { api } from '../../services/api';
import { GOOGLE_MAPS_API_KEY } from '../../constants';
import type {
    LegacyPatientLookupData,
    OccurrenceClassificationCatalog,
    OccurrenceExtraValue,
    OccurrenceExtraDefinition,
    PatientLookupResult,
    SamuAttendancePayload
} from '../../types';

const libraries: ("places" | "visualization")[] = ['places', 'visualization'];

const normalizeUpper = (value: string) =>
    value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

const extractStreetNumber = (...values: Array<string | undefined>) => {
    for (const rawValue of values) {
        const value = String(rawValue ?? '').trim();
        if (!value) continue;

        const match = value.match(/(?:^|,\s*|\s+)(\d{1,6}[A-Z]?)\b/);
        if (match?.[1]) return match[1].toUpperCase();
    }

    return '';
};

const extrairBairroGoogle = (componentes: google.maps.GeocoderAddressComponent[] = []) => {
    for (const componente of componentes) {
        const tipos = componente.types;
        if (tipos.includes('sublocality') || tipos.includes('sublocality_level_1') || tipos.includes('neighborhood')) {
            return componente.long_name.toUpperCase();
        }
    }

    return '';
};

const normalizarBairroParaComparacao = (bairro: string) =>
    normalizeUpper(bairro)
        .replace(/^BAIRRO\s+/, '')
        .replace(/^CONJUNTO\s+/, '')
        .replace(/^CJ\s+/, '')
        .replace(/^JARDIM\s+/, 'JARDIM ')
        .replace(/^TREZE DE SETEMBRO$/, '13 DE SETEMBRO');

const extrairBairroDosResultadosGoogle = (resultados: google.maps.GeocoderResult[] = []) => {
    for (const resultado of resultados) {
        const bairro = extrairBairroGoogle(resultado.address_components || []);
        if (bairro) return bairro;
    }

    return '';
};

const inferirBairroPorEnderecoENumero = (endereco: string, numero: string) => {
    const enderecoNormalizado = normalizeUpper(endereco);
    const numeroLimpo = Number(String(numero || '').replace(/\D/g, ''));

    if (enderecoNormalizado === 'AVENIDA VILLE ROY' && !Number.isNaN(numeroLimpo)) {
        if (numeroLimpo >= 5373 && numeroLimpo <= 7098) {
            return 'CENTRO';
        }
    }

    return '';
};

const selecionarMelhorResultadoGeocode = (resultados: google.maps.GeocoderResult[] = []) => {
    const prioridade = ['ROOFTOP', 'RANGE_INTERPOLATED', 'GEOMETRIC_CENTER', 'APPROXIMATE'];

    return [...resultados].sort((a, b) => {
        const prioridadeA = prioridade.indexOf(String(a.geometry?.location_type || ''));
        const prioridadeB = prioridade.indexOf(String(b.geometry?.location_type || ''));
        return (prioridadeA === -1 ? 999 : prioridadeA) - (prioridadeB === -1 ? 999 : prioridadeB);
    })[0];
};

const normalizarExtrasOcorrencia = (
    extras: Record<string, OccurrenceExtraValue> | undefined,
    campos: OccurrenceExtraDefinition[]
) => {
    const origem = extras ?? {};
    const normalizado: Record<string, OccurrenceExtraValue> = {};

    campos.forEach((campo) => {
        const valor = origem[campo.chave];
        if (campo.tipo_dado === 'multiselect') {
            normalizado[campo.chave] = Array.isArray(valor) ? valor : [];
            return;
        }

        normalizado[campo.chave] = valor ?? '';
    });

    return normalizado;
};

const calcularIdade = (nascimento: string) => {
    if (!nascimento) return '';

    const hoje = new Date();
    const nasc = new Date(nascimento);
    if (Number.isNaN(nasc.getTime())) return '';

    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;

    return idade.toString();
};

const extrairDadosRaca = (valorRaca: string | undefined) => {
    const valor = String(valorRaca ?? '').trim();
    const valorNormalizado = normalizeUpper(valor);

    if (!valor) {
        return { raca: '', etnia: '', outraRaca: '' };
    }

    if (valorNormalizado.startsWith('INDIGENA')) {
        const etnia = valor.split('-')[1]?.trim() || '';
        return { raca: 'INDIGENA', etnia: etnia.toUpperCase(), outraRaca: '' };
    }

    if (['BRANCA', 'PRETA', 'PARDA', 'AMARELA'].includes(valorNormalizado)) {
        return { raca: valorNormalizado, etnia: '', outraRaca: '' };
    }

    return { raca: 'OUTROS', etnia: '', outraRaca: valor.toUpperCase() };
};

const extrairDadosNacionalidade = (valorNacionalidade: string | undefined) => {
    const valor = String(valorNacionalidade ?? '').trim();
    const valorNormalizado = normalizeUpper(valor);

    if (!valor) {
        return { nacionalidade: '', outraNacionalidade: '' };
    }

    if (['BRASILEIRO', 'VENEZUELANO', 'GUIANENSE', 'HAITIANO'].includes(valorNormalizado)) {
        return { nacionalidade: valorNormalizado, outraNacionalidade: '' };
    }

    return { nacionalidade: 'OUTROS', outraNacionalidade: valor.toUpperCase() };
};

type MotivoState = {
    tipoId: string;
    subtipoId: string;
    extras: Record<string, string | number | boolean | string[] | null | undefined>;
};

const InsertionForm: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [bairrosZonas, setBairrosZonas] = useState<Record<string, string[]>>({});
    const [patientNames, setPatientNames] = useState<string[]>([]);
    const [mostrarSugestoesNome, setMostrarSugestoesNome] = useState(false);
    const [msg, setMsg] = useState<{ type: 'success' | 'info' | 'error', text: string } | null>(null);
    const [occurrenceCatalog, setOccurrenceCatalog] = useState<OccurrenceClassificationCatalog>({
        tipos: [],
        subtipos: {},
        extras: {}
    });
    const [occurrence, setOccurrence] = useState<{
        motivoInicial: MotivoState;
        motivoConstatado: MotivoState;
        detalheLivre: string;
    }>({
        motivoInicial: { tipoId: '', subtipoId: '', extras: {} },
        motivoConstatado: { tipoId: '', subtipoId: '', extras: {} },
        detalheLivre: ''
    });

    // Alert State
    const [visitCount, setVisitCount] = useState<number>(0);

    // Form State
    const [formData, setFormData] = useState({
        id: '',
        nome: '',
        nascimento: '',
        idade: '',
        sexo: '',
        raca: '', // New
        etnia: '', // New (Conditional)
        outraRaca: '', // New (Conditional)
        nacionalidade: 'BRASILEIRO', // New
        outraNacionalidade: '', // New (Conditional)
        endereco: '',
        numero: '',
        bairro: '',
        zona: '',
        loc: '', // lat, lng
        ref: '',
        diag: '',
        reinc: '',
        med: 'Sim',
        pq_med: '',
        fam: 'Sim',
        pq_fam: '',
        raps: 'Não',
        info: ''
    });

    // Load initial data (bairros)
    useEffect(() => {
        const loadData = async () => {
            try {
                const [data, occurrenceData] = await Promise.all([
                    api.carregarBairros(),
                    api.carregarClassificacaoPsiquiatrica()
                ]);
                setBairrosZonas(data.bairros);
                setPatientNames(data.nomes);
                setOccurrenceCatalog(occurrenceData);

            } catch (e) {
                console.error("Erro ao carregar dados iniciais", e);
            }
        };
        loadData();
    }, []);

    const addressInputRef = useRef<HTMLInputElement>(null);
    const nomeInputRef = useRef<HTMLInputElement>(null);

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        libraries,
        language: 'pt-BR',
        region: 'br'
    });

    const encontrarBairroEZona = (bairroGoogle: string) => {
        if (!bairroGoogle) return { bairro: '', zona: '' };

        const normalizedNewBairro = normalizarBairroParaComparacao(bairroGoogle);

        for (const [zona, bairrosList] of Object.entries(bairrosZonas)) {
            const bairros = bairrosList as string[];
            const match = bairros.find((bairro) =>
                bairro === bairroGoogle ||
                normalizarBairroParaComparacao(bairro) === normalizedNewBairro ||
                normalizedNewBairro.includes(normalizarBairroParaComparacao(bairro)) ||
                normalizarBairroParaComparacao(bairro).includes(normalizedNewBairro)
            );

            if (match) {
                return { bairro: match, zona };
            }
        }

        return { bairro: '', zona: '' };
    };

    const listaBairros = Object.values(bairrosZonas)
        .flat()
        .filter(Boolean)
        .map((bairro) => String(bairro))
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));

    // Initialize Google Maps Autocomplete
    useEffect(() => {
        const googleMaps = window.google;

        if (isLoaded && addressInputRef.current && googleMaps) {
            const google = googleMaps;

            // Bounds for Boa Vista, Roraima
            const boaVistaBounds = {
                north: 2.95,
                south: 2.70,
                east: -60.60,
                west: -60.80
            };

            const options = {
                bounds: boaVistaBounds,
                componentRestrictions: { country: "br" },
                fields: ["address_components", "geometry", "name", "formatted_address"],
                strictBounds: false
            };

            try {
                const geocoder = new google.maps.Geocoder();
                const autocomplete = new google.maps.places.Autocomplete(addressInputRef.current, options);

                autocomplete.addListener('place_changed', async () => {
                    const place = autocomplete.getPlace();
                    let newAddr = '';
                    let newNum = '';
                    let newBairro = '';
                    const rawInput = addressInputRef.current?.value || '';

                    (place.address_components || []).forEach((c: google.maps.GeocoderAddressComponent) => {
                        const type = c.types;
                        if (type.includes("route")) newAddr = c.long_name.toUpperCase();
                        if (type.includes("street_number")) newNum = c.long_name.toUpperCase();
                    });
                    newBairro = extrairBairroGoogle(place.address_components || []);

                    // Fallback to name if route is missing but name exists (e.g. business name as address)
                    if (!newAddr && place.name) {
                        newAddr = place.name.toUpperCase();
                    }

                    if (!newNum) {
                        newNum = extractStreetNumber(rawInput, place.formatted_address, place.name);
                    }

                    let latitude = place.geometry?.location?.lat();
                    let longitude = place.geometry?.location?.lng();

                    if (newAddr && newNum) {
                        try {
                            const resultadoGeocode = await geocoder.geocode({
                                address: `${newAddr}, ${newNum}, BOA VISTA, RR, BRASIL`,
                                componentRestrictions: { country: 'BR' }
                            });

                            const primeiroResultado = selecionarMelhorResultadoGeocode(resultadoGeocode.results || []);
                            if (primeiroResultado?.geometry?.location) {
                                latitude = primeiroResultado.geometry.location.lat();
                                longitude = primeiroResultado.geometry.location.lng();
                            }

                            if (!newBairro) {
                                newBairro = extrairBairroDosResultadosGoogle(resultadoGeocode.results || []);
                            }
                        } catch (erroGeocode) {
                            console.warn('Geocode do endereço não retornou resultado mais preciso.', erroGeocode);
                        }
                    }

                    if ((!newBairro || latitude === undefined || longitude === undefined) && place.formatted_address) {
                        try {
                            const resultadoGeocodeFormatado = await geocoder.geocode({
                                address: place.formatted_address,
                                componentRestrictions: { country: 'BR' }
                            });

                            const primeiroResultado = selecionarMelhorResultadoGeocode(resultadoGeocodeFormatado.results || []);
                            if ((latitude === undefined || longitude === undefined) && primeiroResultado?.geometry?.location) {
                                latitude = primeiroResultado.geometry.location.lat();
                                longitude = primeiroResultado.geometry.location.lng();
                            }

                            if (!newBairro) {
                                newBairro = extrairBairroDosResultadosGoogle(resultadoGeocodeFormatado.results || []);
                            }
                        } catch (erroGeocodeFormatado) {
                            console.warn('Geocode do endereço formatado não retornou bairro complementar.', erroGeocodeFormatado);
                        }
                    }

                    if ((!newBairro || !newAddr) && latitude !== undefined && longitude !== undefined) {
                        try {
                            const resultadoReverse = await geocoder.geocode({
                                location: { lat: latitude, lng: longitude }
                            });

                            const primeiroResultado = selecionarMelhorResultadoGeocode(resultadoReverse.results || []);
                            if (!newBairro) {
                                newBairro = extrairBairroDosResultadosGoogle(resultadoReverse.results || []);
                            }
                            if (!newAddr) {
                                const rota = (primeiroResultado?.address_components || []).find((c) => c.types.includes('route'));
                                if (rota?.long_name) newAddr = rota.long_name.toUpperCase();
                            }
                        } catch (erroReverse) {
                            console.warn('Reverse geocode não retornou bairro complementar.', erroReverse);
                        }
                    }

                    let bairroEncontrado = encontrarBairroEZona(newBairro);

                    if (!bairroEncontrado.bairro) {
                        const bairroInferido = inferirBairroPorEnderecoENumero(newAddr, newNum);
                        if (bairroInferido) {
                            newBairro = bairroInferido;
                            bairroEncontrado = encontrarBairroEZona(newBairro);
                        }
                    }

                    if (newAddr && newNum && newBairro) {
                        try {
                            const resultadoGeocodeComBairro = await geocoder.geocode({
                                address: `${newAddr}, ${newNum}, ${newBairro}, BOA VISTA, RR, BRASIL`,
                                componentRestrictions: { country: 'BR' }
                            });

                            const primeiroResultado = selecionarMelhorResultadoGeocode(resultadoGeocodeComBairro.results || []);
                            if (primeiroResultado?.geometry?.location) {
                                latitude = primeiroResultado.geometry.location.lat();
                                longitude = primeiroResultado.geometry.location.lng();
                            }
                        } catch (erroGeocodeBairro) {
                            console.warn('Geocode com bairro inferido não retornou resultado melhor.', erroGeocodeBairro);
                        }
                    }

                    const latLng = latitude !== undefined && longitude !== undefined ? `${latitude}, ${longitude}` : '';

                    setFormData(prev => {
                        const updated = {
                            ...prev,
                            endereco: newAddr,
                            numero: newNum,
                            loc: latLng,
                            bairro: newBairro || prev.bairro
                        };

                        if (bairroEncontrado.bairro) {
                            updated.bairro = bairroEncontrado.bairro;
                            updated.zona = bairroEncontrado.zona;
                        } else if (!newBairro) {
                            updated.bairro = '';
                            updated.zona = '';
                        } else {
                            updated.zona = '';
                        }
                        return updated;
                    });
                });
                addressInputRef.current.setAttribute('autocomplete', 'off');
            } catch (e) {
                console.error("Erro ao inicializar Google Maps:", e);
            }
        }
    }, [isLoaded, bairrosZonas]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        // Special handling for uppercase text inputs
        const val = (e.target.tagName === 'INPUT' && e.target.type === 'text') || e.target.tagName === 'TEXTAREA' ? value.toUpperCase() : value;

        setFormData(prev => {
            const newData = { ...prev, [id]: val };

            if (id === 'nome' && !String(val).trim()) {
                setVisitCount(0);
                setFoundPatient(null);
                setMostrarSugestoesNome(true);
                setMsg(null);
                setOccurrence({
                    motivoInicial: { tipoId: '', subtipoId: '', extras: {} },
                    motivoConstatado: { tipoId: '', subtipoId: '', extras: {} },
                    detalheLivre: ''
                });

                return {
                    ...prev,
                    id: '',
                    nome: '',
                    nascimento: '',
                    idade: '',
                    sexo: '',
                    raca: '',
                    etnia: '',
                    outraRaca: '',
                    nacionalidade: 'BRASILEIRO',
                    outraNacionalidade: '',
                    endereco: '',
                    numero: '',
                    bairro: '',
                    zona: '',
                    loc: '',
                    ref: '',
                    diag: '',
                    reinc: '',
                    med: 'Sim',
                    pq_med: '',
                    fam: 'Sim',
                    pq_fam: '',
                    raps: 'Não',
                    info: ''
                };
            }

            // Auto-calculate age
            if (id === 'nascimento' && val) {
                newData.idade = calcularIdade(val);

                // Trigger search when birth date is selected
                checkPatient(newData.nome, val);
            }

            // Auto-zone
            if (id === 'bairro') {
                const bairroEncontrado = encontrarBairroEZona(String(val));
                if (bairroEncontrado.zona) {
                    newData.zona = bairroEncontrado.zona;
                } else {
                    newData.zona = '';
                }
            }

            return newData;
        });
    };

    const getSubtipos = (tipoId: string) => occurrenceCatalog.subtipos[tipoId] || [];
    const getExtras = (subtipoId: string) => occurrenceCatalog.extras[subtipoId] || [];

    const encontrarSubtipoPorNome = (nomeSubtipo: string) => {
        const nomeNormalizado = normalizeUpper(nomeSubtipo);

        for (const [tipoId, subtipos] of Object.entries(occurrenceCatalog.subtipos)) {
            const listaSubtipos = subtipos as { id: string; nome: string }[];
            const subtipo = listaSubtipos.find((item) => normalizeUpper(item.nome) === nomeNormalizado);
            if (subtipo) {
                return { tipoId, subtipo };
            }
        }

        return null;
    };

    const handleOccurrenceFieldChange = (bloco: 'motivoInicial' | 'motivoConstatado', campo: 'tipoId' | 'subtipoId', valor: string) => {
        setOccurrence(prev => {
            const current = prev[bloco];
            const next = { ...current, [campo]: valor };

            if (campo === 'tipoId') {
                next.subtipoId = '';
                next.extras = {};
            }

            if (campo === 'subtipoId') {
                next.extras = {};
            }

            return { ...prev, [bloco]: next };
        });
    };

    const handleOccurrenceExtraChange = (
        bloco: 'motivoInicial' | 'motivoConstatado',
        chave: string,
        valor: OccurrenceExtraValue,
        tipoDado: OccurrenceExtraDefinition['tipo_dado']
    ) => {
        setOccurrence(prev => {
            const current = prev[bloco];
            let finalValue: OccurrenceExtraValue = valor;

            if (tipoDado === 'boolean') {
                finalValue = valor === '' ? '' : valor;
            }

            if (tipoDado === 'multiselect') {
                finalValue = Array.isArray(valor) ? valor : [];
            }

            return {
                ...prev,
                [bloco]: {
                    ...current,
                    extras: {
                        ...current.extras,
                        [chave]: finalValue
                    }
                }
            };
        });
    };

    const renderOccurrenceExtraField = (bloco: 'motivoInicial' | 'motivoConstatado', field: OccurrenceExtraDefinition) => {
        const value = occurrence[bloco].extras[field.chave] ?? (field.tipo_dado === 'multiselect' ? [] : '');
        const commonLabel = `${field.rotulo}${field.obrigatorio ? ' *' : ''}`;

        if (field.tipo_dado === 'select') {
            return (
                <div key={`${bloco}-${field.id}`}>
                    <label className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">{commonLabel}</label>
                    <select
                        value={value}
                        onChange={(e) => handleOccurrenceExtraChange(bloco, field.chave, e.target.value, field.tipo_dado)}
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium"
                    >
                        <option value="">Selecione</option>
                        {(field.opcoes || []).map((opcao) => (
                            <option key={opcao} value={opcao}>{opcao}</option>
                        ))}
                    </select>
                    {field.ajuda && <p className="text-[11px] text-gray-500 mt-1">{field.ajuda}</p>}
                </div>
            );
        }

        if (field.tipo_dado === 'boolean') {
            return (
                <div key={`${bloco}-${field.id}`}>
                    <label className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">{commonLabel}</label>
                    <select
                        value={value}
                        onChange={(e) => handleOccurrenceExtraChange(bloco, field.chave, e.target.value, field.tipo_dado)}
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium"
                    >
                        <option value="">Selecione</option>
                        <option value="SIM">SIM</option>
                        <option value="NÃO">NÃO</option>
                    </select>
                </div>
            );
        }

        if (field.tipo_dado === 'multiselect') {
            const values = Array.isArray(value) ? value : [];
            return (
                <div key={`${bloco}-${field.id}`}>
                    <label className="block text-brand-dark dark:text-white font-semibold text-sm mb-2">{commonLabel}</label>
                    <div className="space-y-2">
                        {(field.opcoes || []).map((opcao) => (
                            <label key={opcao} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                                <input
                                    type="checkbox"
                                    checked={values.includes(opcao)}
                                    onChange={(e) => {
                                        const nextValues = e.target.checked
                                            ? [...values, opcao]
                                            : values.filter((item: string) => item !== opcao);
                                        handleOccurrenceExtraChange(bloco, field.chave, nextValues, field.tipo_dado);
                                    }}
                                />
                                {opcao}
                            </label>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div key={`${bloco}-${field.id}`}>
                <label className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">{commonLabel}</label>
                <input
                    type={field.tipo_dado === 'number' ? 'number' : 'text'}
                    value={value}
                    onChange={(e) => handleOccurrenceExtraChange(bloco, field.chave, field.tipo_dado === 'number' ? e.target.value : e.target.value.toUpperCase(), field.tipo_dado)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium uppercase"
                />
                {field.ajuda && <p className="text-[11px] text-gray-500 mt-1">{field.ajuda}</p>}
            </div>
        );
    };

    const [foundPatient, setFoundPatient] = useState<LegacyPatientLookupData | null>(null);

    const preencherCamposBasicosPaciente = (paciente: LegacyPatientLookupData) => {
        const dadosRaca = extrairDadosRaca(paciente.raca);
        const dadosNacionalidade = extrairDadosNacionalidade(paciente.nacionalidade);
        setFormData((prev) => ({
            ...prev,
            id: paciente.id || prev.id,
            nome: prev.nome,
            nascimento: paciente.nascimento || prev.nascimento,
            idade: paciente.nascimento ? calcularIdade(paciente.nascimento) : prev.idade,
            sexo: paciente.sexo || prev.sexo,
            raca: dadosRaca.raca || prev.raca,
            etnia: dadosRaca.etnia || '',
            outraRaca: dadosRaca.outraRaca || '',
            nacionalidade: dadosNacionalidade.nacionalidade || prev.nacionalidade,
            outraNacionalidade: dadosNacionalidade.outraNacionalidade || ''
        }));
    };

    const checkPatient = async (nome: string, nascimento: string) => {
        if (!nome) return;
        try {
            const data: PatientLookupResult = await api.verificarPaciente(nome);
            // Handle count even if 'exists' is not the primary return or works differently
            if (data.result === 'exists' && data.contagem) {
                setVisitCount(data.contagem);
            } else {
                setVisitCount(0);
            }

            if (data.result === 'exists') {
                setFoundPatient(data.p);
                preencherCamposBasicosPaciente(data.p);
                setMsg({ type: 'info', text: '📋 Histórico encontrado! Deseja carregar os dados?' });
            } else {
                setFoundPatient(null);
            }
        } catch (e: unknown) {
            console.error(e);
        }
    };

    const loadPatientHistory = () => {
        if (!foundPatient) return;
        const p = foundPatient;
        const dadosRaca = extrairDadosRaca(p.raca);
        const dadosNacionalidade = extrairDadosNacionalidade(p.nacionalidade);
        const classificacao = p.classificacao;
        setFormData(prev => {
            const updated = {
                ...prev,
                nome: prev.nome,
                id: p.id || prev.id,
                nascimento: p.nascimento || prev.nascimento,
                idade: p.nascimento ? calcularIdade(p.nascimento) : prev.idade,
                sexo: p.sexo || prev.sexo,
                raca: dadosRaca.raca || prev.raca,
                etnia: dadosRaca.etnia || '',
                outraRaca: dadosRaca.outraRaca || '',
                nacionalidade: dadosNacionalidade.nacionalidade || prev.nacionalidade,
                outraNacionalidade: dadosNacionalidade.outraNacionalidade || '',
                endereco: p.endereco || prev.endereco,
                numero: p.num || prev.numero,
                bairro: p.bairro || prev.bairro,
                loc: p.loc || prev.loc,
                ref: p.ref || prev.ref,
                diag: p.diag || prev.diag,
                reinc: p.reinc || 'SIM',
                med: p.med || prev.med,
                pq_med: p.pq_med || prev.pq_med,
                fam: p.fam || prev.fam,
                pq_fam: p.pq_fam || prev.pq_fam,
                raps: p.raps || prev.raps,
                info: p.info || prev.info
            };

            // Recalc zone
            if (p.bairro) {
                for (const [zona, bairrosList] of Object.entries(bairrosZonas)) {
                    const bairros = bairrosList as string[];
                    if (bairros.includes(p.bairro)) {
                        updated.zona = zona;
                        break;
                    }
                }
            }
            return updated;
        });

        if (classificacao) {
            setOccurrence((prev) => {
                const motivoInicialEncontrado = encontrarSubtipoPorNome(classificacao.motivoInicialSubtipo);
                const motivoConstatadoEncontrado = encontrarSubtipoPorNome(classificacao.motivoConstatadoSubtipo);

                const motivoInicialCampos = motivoInicialEncontrado
                    ? getExtras(motivoInicialEncontrado.subtipo.id)
                    : [];
                const motivoConstatadoCampos = motivoConstatadoEncontrado
                    ? getExtras(motivoConstatadoEncontrado.subtipo.id)
                    : [];

                return {
                    ...prev,
                    motivoInicial: {
                        tipoId: motivoInicialEncontrado?.tipoId || '',
                        subtipoId: motivoInicialEncontrado?.subtipo.id || '',
                        extras: normalizarExtrasOcorrencia(classificacao.motivoInicialExtras, motivoInicialCampos)
                    },
                    motivoConstatado: {
                        tipoId: motivoConstatadoEncontrado?.tipoId || '',
                        subtipoId: motivoConstatadoEncontrado?.subtipo.id || '',
                        extras: normalizarExtrasOcorrencia(classificacao.motivoConstatadoExtras, motivoConstatadoCampos)
                    },
                    detalheLivre: classificacao.detalheLivre || ''
                };
            });
        }

        setMsg({ type: 'success', text: '✅ Dados carregados com sucesso!' });
        setTimeout(() => setMsg(null), 3000);
        setFoundPatient(null);
    };

    const handleBlurName = () => {
        setTimeout(() => {
            setMostrarSugestoesNome(false);
            checkPatient(formData.nome, formData.nascimento);
        }, 120);
    };

    const sugestoesNome = patientNames
        .filter((nome) => {
            const termo = formData.nome.trim();
            if (!termo) return true;

            const nomeNormalizado = normalizeUpper(nome);
            const termoNormalizado = normalizeUpper(termo);

            return nomeNormalizado.includes(termoNormalizado);
        })
        .slice(0, 8);

    const handleSelectPatientName = (nome: string) => {
        setFormData((prev) => ({ ...prev, nome }));
        setMostrarSugestoesNome(false);
        checkPatient(nome, formData.nascimento);
        nomeInputRef.current?.focus();
    };

    const handleGetGPS = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(p => {
                setFormData(prev => ({ ...prev, loc: `${p.coords.latitude}, ${p.coords.longitude}` }));
            });
        } else {
            alert("Geolocalização não suportada.");
        }
    };

    const handleSubmit = async () => {
        if (!formData.nome) {
            alert("Nome é obrigatório!");
            return;
        }
        setLoading(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');

            // Format raca/nacionalidade fields logic
            let finalRaca = formData.raca;
            if (formData.raca === 'INDIGENA' && formData.etnia) {
                finalRaca = `INDÍGENA - ${formData.etnia}`;
            } else if (formData.raca === 'OUTROS' && formData.outraRaca) {
                finalRaca = formData.outraRaca;
            }

            let finalNacionalidade = formData.nacionalidade;
            if (formData.nacionalidade === 'OUTROS' && formData.outraNacionalidade) {
                finalNacionalidade = formData.outraNacionalidade;
            }

            const payload: SamuAttendancePayload = {
                id_paciente: formData.id,
                nome: formData.nome,
                nascimento: formData.nascimento,
                sexo: formData.sexo,
                idade: formData.idade,
                endereco: formData.endereco,
                numero: formData.numero,
                bairro: formData.bairro,
                zona: formData.zona,
                localizacao: formData.loc,
                referencia: formData.ref,
                diagnosticado: formData.diag,
                reincidente: formData.reinc,
                medicacao: formData.med,
                pq_med: formData.pq_med,
                apoio_fam: formData.fam,
                porque_fam: formData.pq_fam,
                apoio_raps: formData.raps,
                info_extra: formData.info,
                responsavel: userInfo.nomeCompleto || 'Desconhecido',
                raca: finalRaca,
                nacionalidade: finalNacionalidade,
                classificacao_ocorrencia: {
                    motivo_inicial: {
                        tipo_id: occurrence.motivoInicial.tipoId || null,
                        subtipo_id: occurrence.motivoInicial.subtipoId || null,
                        extras: occurrence.motivoInicial.extras,
                        campos_definicao: getExtras(occurrence.motivoInicial.subtipoId)
                    },
                    motivo_constatado: {
                        tipo_id: occurrence.motivoConstatado.tipoId || null,
                        subtipo_id: occurrence.motivoConstatado.subtipoId || null,
                        extras: occurrence.motivoConstatado.extras,
                        campos_definicao: getExtras(occurrence.motivoConstatado.subtipoId)
                    },
                    detalhe_livre: occurrence.detalheLivre
                }
            };

            const data = await api.salvarSamu(payload);
            if (data.result === 'success') {
                setMsg({ type: 'success', text: '✅ Registro salvo com sucesso!' });
                setTimeout(() => window.location.reload(), 2000);
            } else {
                setMsg({ type: 'error', text: data.message || 'Erro ao salvar.' });
            }

        } catch (e) {
            setMsg({ type: 'error', text: e.message || 'Erro de conexão.' });
        } finally {
            setLoading(false);
        }
    };

    const renderOccurrenceBlock = (titulo: string, bloco: 'motivoInicial' | 'motivoConstatado') => {
        const current = occurrence[bloco];
        const tipoOptions = occurrenceCatalog.tipos;
        const subtipoOptions = getSubtipos(current.tipoId);
        const extraFields = getExtras(current.subtipoId);

        return (
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/80 dark:bg-slate-800/40 dark:border-slate-700 space-y-4">
                <h3 className="text-base font-bold text-brand-dark dark:text-white uppercase">{titulo}</h3>

                <div>
                    <label className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">Tipo</label>
                    <select
                        value={current.tipoId}
                        onChange={(e) => handleOccurrenceFieldChange(bloco, 'tipoId', e.target.value)}
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium"
                    >
                        <option value="">Selecione</option>
                        {tipoOptions.map((tipo) => (
                            <option key={tipo.id} value={tipo.id}>{tipo.nome}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">Subtipo</label>
                    <select
                        value={current.subtipoId}
                        onChange={(e) => handleOccurrenceFieldChange(bloco, 'subtipoId', e.target.value)}
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium"
                    >
                        <option value="">Selecione</option>
                        {subtipoOptions.map((subtipo) => (
                            <option key={subtipo.id} value={subtipo.id}>{subtipo.nome}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-3">
                    <label className="block text-brand-dark dark:text-white font-semibold text-sm">Campos Extras</label>
                    {extraFields.length > 0 ? (
                        extraFields.map((field) => renderOccurrenceExtraField(bloco, field))
                    ) : (
                        <p className="text-sm text-gray-500">Nenhum campo extra para este subtipo.</p>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-[#f3f4f6] dark:bg-background-dark overflow-hidden font-body">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto p-4 md:p-8">

                <div className="max-w-4xl mx-auto w-full bg-white dark:bg-card-dark rounded-xl shadow-card border-t-[6px] border-brand-dark p-6 md:p-8 relative">

                    {/* [NEW] Recidivism Alert */}
                    {visitCount > 3 && (
                        <div className="mb-6 p-4 rounded-lg bg-red-100 border-l-4 border-red-600 flex items-start gap-3 animate-pulse">
                            <span className="material-symbols-outlined text-red-600 text-3xl">warning</span>
                            <div>
                                <h3 className="text-red-800 font-bold text-lg uppercase">Atenção: Paciente Reincidente</h3>
                                <p className="text-red-700 font-semibold">
                                    Este paciente já possui <strong className="text-xl">{visitCount}</strong> atendimentos registrados.
                                </p>
                                <p className="text-red-700 text-sm mt-1">
                                    Verificar imediatamente o vínculo com a Rede (RAPS) e considerar acionamento de suporte especializado.
                                </p>
                            </div>
                        </div>
                    )}

                    <h2 className="text-2xl font-bold text-brand-dark dark:text-white text-center mb-1">Ficha de Atendimento SAMU</h2>
                    <p className="text-center text-gray-500 text-sm mb-8">Preencha os dados com atenção</p>

                    {msg && (
                        <div className={`mb-6 p-4 rounded-lg text-center font-medium ${msg.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
                            msg.type === 'info' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                'bg-red-100 text-red-800 border border-red-200'
                            }`}>
                            {msg.text}
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Nome */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                            <div className="relative">
                                <div className="mb-1 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                    <label className="block text-brand-dark dark:text-white font-semibold text-sm">
                                        Nome do Paciente
                                    </label>
                                    {foundPatient && (
                                        <button
                                            type="button"
                                            onClick={loadPatientHistory}
                                            className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-medium/30 bg-brand-light/20 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-medium shadow-sm transition-all hover:-translate-y-0.5 hover:bg-brand-light/35 hover:text-brand-dark"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">history</span>
                                            Clique para carregar os últimos dados
                                        </button>
                                    )}
                                </div>
                                <input
                                    ref={nomeInputRef}
                                    type="text"
                                    id="nome"
                                    value={formData.nome}
                                    onChange={handleChange}
                                    onFocus={() => setMostrarSugestoesNome(true)}
                                    onBlur={handleBlurName}
                                    placeholder="NOME COMPLETO"
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium focus:border-transparent uppercase"
                                />
                                {mostrarSugestoesNome && sugestoesNome.length > 0 && (
                                    <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_45px_-24px_rgba(15,23,42,0.35)]">
                                        <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                            Pacientes já cadastrados
                                        </div>
                                        <div className="max-h-64 overflow-y-auto py-1">
                                            {sugestoesNome.map((nome) => (
                                                <button
                                                    key={nome}
                                                    type="button"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => handleSelectPatientName(nome)}
                                                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-brand-light/15 hover:text-brand-dark"
                                                >
                                                    <span className="truncate font-medium">{nome}</span>
                                                    <span className="ml-3 text-[10px] uppercase tracking-wide text-slate-400">Selecionar</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">Qtd. de Atendimentos</label>
                                <input
                                    type="text"
                                    value={visitCount ? String(visitCount) : ''}
                                    readOnly
                                    placeholder="Automático"
                                    className="w-full p-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-500"
                                />
                            </div>
                        </div>

                        {/* ID & Nascimento Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">ID do Paciente</label>
                                <div className={`rounded-lg border px-3 py-2.5 ${formData.id ? 'border-emerald-300 bg-emerald-50' : 'border-gray-300 bg-gray-100'}`}>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={`min-w-0 truncate font-mono text-sm font-semibold ${formData.id ? 'text-emerald-800' : 'text-gray-500'}`}>
                                            {formData.id || 'Gerado automaticamente'}
                                        </span>
                                        {formData.id && (
                                            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                                                Identificado
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">Data de Nascimento</label>
                                <input type="date" id="nascimento" value={formData.nascimento} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium" />
                            </div>
                            <div>
                                <label className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">Idade (Auto)</label>
                                <input type="text" id="idade" value={formData.idade} readOnly className="w-full p-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-500" />
                            </div>
                        </div>

                        {/* [NEW] Demographics Row: Sexo, Raça, Nacionalidade */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">Sexo</label>
                                <select id="sexo" value={formData.sexo} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium">
                                    <option value="">Selecione</option>
                                    <option>Masculino</option>
                                    <option>Feminino</option>
                                </select>
                            </div>

                            {/* Raca */}
                            <div>
                                <label className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">Raça / Cor</label>
                                <select id="raca" value={formData.raca} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium">
                                    <option value="">Selecione</option>
                                    <option value="BRANCA">Branca</option>
                                    <option value="PRETA">Preta</option>
                                    <option value="PARDA">Parda</option>
                                    <option value="AMARELA">Amarela</option>
                                    <option value="INDIGENA">Indígena</option>
                                    <option value="OUTROS">Outros</option>
                                </select>
                                {formData.raca === 'INDIGENA' && (
                                    <select id="etnia" value={formData.etnia} onChange={handleChange} className="w-full p-2.5 mt-2 border border-brand-light bg-blue-50 rounded-lg focus:ring-2 focus:ring-brand-medium text-sm">
                                        <option value="">Selecione a Etnia...</option>
                                        <option value="MACUXI">Macuxi</option>
                                        <option value="WAPICHANA">Wapichana</option>
                                        <option value="TAUREPANG">Taurepang</option>
                                        <option value="IANOMAMI">Yanomami</option>
                                        <option value="YE'KUANA">Ye'kuana</option>
                                        <option value="OUTRA">Outra</option>
                                    </select>
                                )}
                                {formData.raca === 'OUTROS' && (
                                    <input type="text" id="outraRaca" value={formData.outraRaca} onChange={handleChange} placeholder="Qual" className="w-full p-2.5 mt-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium uppercase text-sm" />
                                )}
                            </div>

                            {/* Nacionalidade */}
                            <div>
                                <label className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">Nacionalidade</label>
                                <select id="nacionalidade" value={formData.nacionalidade} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium">
                                    <option value="BRASILEIRO">Brasileiro</option>
                                    <option value="VENEZUELANO">Venezuelano</option>
                                    <option value="GUIANENSE">Guianense</option>
                                    <option value="HAITIANO">Haitiano</option>
                                    <option value="OUTROS">Outros</option>
                                </select>
                                {formData.nacionalidade === 'OUTROS' && (
                                    <input type="text" id="outraNacionalidade" value={formData.outraNacionalidade} onChange={handleChange} placeholder="Qual país" className="w-full p-2.5 mt-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium uppercase text-sm" />
                                )}
                            </div>
                        </div>

                        {/* Endereço Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">Endereço (Busca Google Maps)</label>
                                <input
                                    ref={addressInputRef}
                                    type="text"
                                    id="endereco"
                                    value={formData.endereco}
                                    onChange={handleChange}
                                    placeholder="DIGITE A RUA OU LOCAL..."
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium uppercase"
                                />
                            </div>
                            <div>
                                <label className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">Número</label>
                                <input type="text" id="numero" value={formData.numero} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium uppercase" />
                            </div>
                        </div>

                        {/* Bairro & Zona */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">Bairro</label>
                                <input
                                    type="text"
                                    id="bairro"
                                    list="lista-bairros"
                                    value={formData.bairro}
                                    onChange={handleChange}
                                    placeholder="Bairro detectado ou digitado"
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium uppercase"
                                />
                                <datalist id="lista-bairros">
                                    {listaBairros.map((bairro) => <option key={bairro} value={bairro} />)}
                                </datalist>
                            </div>
                            <div>
                                <label className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">Zona (Automática)</label>
                                <input type="text" id="zona" value={formData.zona} readOnly className="w-full p-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-500" placeholder="Selecione o bairro" />
                            </div>
                        </div>

                        {/* GPS & Localização */}
                        <div className={`p-4 rounded-lg border border-dashed transition-colors ${formData.loc ? 'bg-green-50 border-green-300 dark:bg-green-900/10 dark:border-green-800' : 'bg-gray-50 border-gray-300 dark:bg-slate-800/50 dark:border-gray-600'}`}>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-brand-dark dark:text-white font-semibold text-sm">
                                    Localização (Coordenadas)
                                </label>
                                {formData.loc && (
                                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-bold bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full animate-pulse">
                                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                        GEOCODIFICADO
                                    </span>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    id="loc"
                                    value={formData.loc}
                                    readOnly
                                    placeholder="Aguardando endereço ou GPS..."
                                    className={`w-full p-2.5 border rounded-lg text-sm transition-colors ${formData.loc ? 'bg-white border-green-400 text-green-800 font-medium' : 'bg-gray-100 border-gray-300 text-gray-500'}`}
                                />
                                <button
                                    onClick={handleGetGPS}
                                    className="bg-brand-medium hover:bg-brand-dark text-white px-4 rounded-lg shadow-sm transition-colors"
                                    title="Usar minha localização atual"
                                >
                                    <span className="material-symbols-outlined">my_location</span>
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1 pl-1">
                                * Preechido automaticamente ao selecionar um endereço válido ou clicar no ícone de GPS.
                            </p>
                        </div>

                        {/* Ponto de ref */}
                        <div>
                            <label className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">Ponto de Referência</label>
                            <input type="text" id="ref" value={formData.ref} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium uppercase" />
                        </div>

                        <div className="space-y-4 p-5 rounded-2xl border border-brand-medium/20 bg-brand-light/10">
                            <div>
                                <h3 className="text-lg font-bold text-brand-dark dark:text-white uppercase">Tipo de Ocorrência Constatada</h3>
                                <p className="text-sm text-gray-500">Classificação psiquiátrica vinculada ao atendimento.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {renderOccurrenceBlock('Motivo Inicial', 'motivoInicial')}
                                {renderOccurrenceBlock('Motivo Constatado', 'motivoConstatado')}
                            </div>

                            <div>
                                <label className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">Detalhe Livre</label>
                                <textarea
                                    rows={4}
                                    value={occurrence.detalheLivre}
                                    onChange={(e) => setOccurrence(prev => ({ ...prev, detalheLivre: e.target.value.toUpperCase() }))}
                                    placeholder="Descreva o contexto da situação psiquiátrica..."
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium uppercase"
                                />
                            </div>
                        </div>

                        {/* Diagnostico & Reincidente */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">Já é Diagnosticado</label>
                                <select id="diag" value={formData.diag} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium">
                                    <option value="">Selecione</option>
                                    <option>Não</option>
                                    <option>Sim</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">Reincidente</label>
                                <select id="reinc" value={formData.reinc} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium">
                                    <option value="">Selecione</option>
                                    <option>Não</option>
                                    <option>Sim</option>
                                </select>
                            </div>
                        </div>

                        {/* Medicação */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">Utiliza Medicação</label>
                                <select id="med" value={formData.med} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium">
                                    <option>Sim</option>
                                    <option>Não</option>
                                </select>
                            </div>
                            {formData.med === 'Não' && (
                                <div>
                                    <label className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">Se não, por quê</label>
                                    <input type="text" id="pq_med" list="sugestoes-negativa" value={formData.pq_med} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium uppercase" placeholder="Selecione ou escreva..." />
                                </div>
                            )}
                        </div>

                        {/* Apoio Fam */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">Tem Apoio Familiar</label>
                                <select id="fam" value={formData.fam} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium">
                                    <option>Sim</option>
                                    <option>Não</option>
                                </select>
                            </div>
                            {formData.fam === 'Não' && (
                                <div>
                                    <label className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">Se não, por quê</label>
                                    <input type="text" id="pq_fam" list="sugestoes-negativa" value={formData.pq_fam} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium uppercase" placeholder="Selecione ou escreva..." />
                                </div>
                            )}
                        </div>

                        <datalist id="sugestoes-negativa">
                            <option value="NEGATIVA DE UTILIZAÇÃO" />
                            <option value="PRIMEIRO SURTO" />
                            <option value="OUTRO" />
                        </datalist>

                        {/* RAPS */}
                        <div>
                            <label className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">Tem Apoio da RAPS</label>
                            <select id="raps" value={formData.raps} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium">
                                <option>Não</option>
                                <option>Sim</option>
                            </select>
                        </div>

                        {/* Info */}
                        <div>
                            <label className="block text-brand-dark dark:text-white font-semibold text-sm mb-1">Demais Informações</label>
                            <textarea id="info" rows={4} value={formData.info} onChange={handleChange} placeholder="Detalhes relevantes..." className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-medium uppercase"></textarea>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="w-full bg-brand-dark hover:bg-brand-medium text-white font-bold py-4 rounded-xl shadow-lg transition-transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? 'PROCESSANDO...' : 'SALVAR NO BANCO DE DADOS'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InsertionForm;

