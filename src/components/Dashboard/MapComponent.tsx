import React, { useState, useCallback, useMemo } from 'react';
import { GoogleMap, MarkerF, HeatmapLayerF, useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY } from '../../constants';
import { LegacyDashboardRow, OccurrenceDetailRecord, OccurrenceDetailsMap } from '../../types';
import { classificarRiscoCaso } from '../../utils/classificacaoRisco';
import { toLegacyDashboardRecord } from '../../utils/dashboardRecords';
import { MASKED_PATIENT_NAME } from '../../utils/dashboardPresentation';

const containerStyle = {
    width: '100%',
    height: '100%'
};

const center = {
    lat: 2.819833,
    lng: -60.673321
};

interface MapProps {
    data: LegacyDashboardRow[];
    occurrenceDetails: OccurrenceDetailsMap;
}

type MapMarkerData = {
    id: string;
    nome: string;
    nasc: string;
    sexo: string;
    idade: string;
    endereco: string;
    bairro: string;
    zona: string;
    diag: string;
    reinc: string;
    raps: string;
    med: string;
    fam: string;
    motivoInicial: string;
    motivoConstatado: string;
    metodo: string;
    detalheLivre: string;
};

type PatientMarker = {
    id: string;
    lat: number;
    lng: number;
    title: string;
    iconUrl: string;
    fullData: MapMarkerData;
};

const libraries: ('places' | 'visualization')[] = ['places', 'visualization'];

const HEALTH_UNITS = {
    samu: [
        { id: 'samu-central', title: 'BASE CENTRAL SAMU - Av. Sorocaima, 123', lat: 2.805562, lng: -60.697472 },
        { id: 'samu-carana', title: 'BASE DESCENTRALIZADA SAMU - CARANÁ', lat: 2.83636, lng: -60.71392 },
        { id: 'samu-olimpico', title: 'BASE DESCENTRALIZADA SAMU - JARDIM OLÍMPICO', lat: 2.79646, lng: -60.73426 }
    ],
    ubs: [
        { id: 'ubs-31-marco', title: 'UBS 31 DE MARÇO', lat: 2.8425, lng: -60.6720 },
        { id: 'ubs-buritis', title: 'UBS BURITIS', lat: 2.8080, lng: -60.7200 },
        { id: 'ubs-mecejana', title: 'UBS MECEJANA', lat: 2.8050, lng: -60.6950 },
        { id: 'hgr', title: 'HOSPITAL GERAL DE RORAIMA', lat: 2.83321, lng: -60.68881 }
    ],
    caps: [
        { id: 'caps-ii', title: 'CAPS II Antônia Constância', lat: 2.82321, lng: -60.69315 },
        { id: 'caps-ad', title: 'CAPS AD III', lat: 2.8150, lng: -60.6800 }
    ]
};

export const MapComponent: React.FC<MapProps> = ({ data, occurrenceDetails = {} }) => {
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        libraries,
        language: 'pt-BR',
        region: 'br'
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [selectedMarker, setSelectedMarker] = useState<PatientMarker | null>(null);

    const onLoad = useCallback((loadedMap: google.maps.Map) => {
        setMap(loadedMap);
    }, []);

    const onUnmount = useCallback(() => {
        setMap(null);
    }, []);

    if (loadError) {
        console.error('Google Maps Load Error:', loadError);
    }

    const extractCoords = (value: string): { lat: number; lng: number } | null => {
        if (!value) return null;

        try {
            if (value.includes(',') && !value.includes('http')) {
                const [lat, lng] = value.split(',').map((item) => parseFloat(item.trim()));
                if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
            }

            const destinationMatch = value.match(/destination=(-\d+\.\d+),(-\d+\.\d+)/);
            if (destinationMatch) {
                return { lat: parseFloat(destinationMatch[1]), lng: parseFloat(destinationMatch[2]) };
            }

            const generalMatch = value.match(/(-\d+\.\d+)\s*,\s*(-\d+\.\d+)/);
            if (generalMatch) {
                return { lat: parseFloat(generalMatch[1]), lng: parseFloat(generalMatch[2]) };
            }
        } catch (error) {
            console.error('Error parsing location:', value, error);
        }

        return null;
    };

    const icons = {
        samu: 'https://maps.google.com/mapfiles/kml/shapes/ambulance.png',
        ubs: 'https://maps.google.com/mapfiles/kml/shapes/hospitals.png',
        caps: 'https://maps.google.com/mapfiles/kml/shapes/plus.png',
        patient: {
            red: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
            yellow: 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
            green: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
        }
    };

    const markers = useMemo(() => {
        const freqMap: Record<string, number> = {};
        data.forEach((row) => {
            const nome = toLegacyDashboardRecord(row).nome;
            if (nome) freqMap[nome] = (freqMap[nome] || 0) + 1;
        });

        return data
            .map((row, index) => {
                const record = toLegacyDashboardRecord(row);
                const coords = extractCoords(record.gps);
                if (!coords) return null;

                const occurrence: OccurrenceDetailRecord | undefined = occurrenceDetails[record.id];
                const classificacaoRisco = classificarRiscoCaso({
                    subtipoMotivoConstatado: occurrence?.motivoConstatado,
                    reincidenteCampo: record.reincidente,
                    totalAtendimentosPaciente: freqMap[record.nome] || 0,
                    usaMedicacao: record.medicacao,
                    apoioFamiliar: record.apoioFamiliar,
                    apoioRaps: record.apoioRaps
                });

                const markerIcon =
                    classificacaoRisco.cor === 'vermelho'
                        ? icons.patient.red
                        : classificacaoRisco.cor === 'amarelo'
                            ? icons.patient.yellow
                            : icons.patient.green;

                return {
                    id: `pac-${index}`,
                    lat: coords.lat,
                    lng: coords.lng,
                    title: record.id,
                    iconUrl: markerIcon,
                    fullData: {
                        id: record.id,
                        nome: record.nome,
                        nasc: record.nascimento,
                        sexo: record.sexo,
                        idade: record.idade,
                        endereco: record.endereco ? `${record.endereco}, ${record.numero || ''}` : '',
                        bairro: record.bairro,
                        zona: record.zona,
                        diag: record.diagnostico,
                        reinc: record.reincidente,
                        raps: record.apoioRaps,
                        med: record.medicacao,
                        fam: record.apoioFamiliar,
                        motivoInicial: occurrence?.motivoInicial || '-',
                        motivoConstatado: occurrence?.motivoConstatado || '-',
                        metodo: occurrence?.metodo || '-',
                        detalheLivre: occurrence?.detalheLivre || '-'
                    }
                };
            })
            .filter((marker): marker is PatientMarker => marker !== null);
    }, [data, occurrenceDetails]);

    const heatmapData = useMemo(() => {
        if (!window.google || !isLoaded) return [];
        return markers.map((marker) => new window.google.maps.LatLng(marker.lat, marker.lng));
    }, [markers, isLoaded]);

    React.useEffect(() => {
        if (map && markers.length > 0) {
            const bounds = new window.google.maps.LatLngBounds();
            markers.forEach((marker) => bounds.extend({ lat: marker.lat, lng: marker.lng }));
            Object.values(HEALTH_UNITS).flat().forEach((unit) => bounds.extend({ lat: unit.lat, lng: unit.lng }));
            map.fitBounds(bounds);
        }
    }, [markers, map]);

    if (loadError) return <div className="p-4 text-red-500">Erro ao carregar o mapa.</div>;
    if (!isLoaded) return <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-500">Carregando mapa...</div>;

    return (
        <div className="relative h-full w-full">
            <div className="absolute right-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] gap-2 rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-lg backdrop-blur-sm sm:right-4 sm:top-4">
                <button
                    onClick={() => setShowHeatmap(false)}
                    className={`rounded px-3 py-1 text-xs font-bold ${!showHeatmap ? 'bg-[#003366] text-white' : 'bg-gray-200 text-gray-600'}`}
                >
                    Pinos
                </button>
                <button
                    onClick={() => setShowHeatmap(true)}
                    className={`rounded px-3 py-1 text-xs font-bold ${showHeatmap ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'}`}
                >
                    Calor
                </button>
            </div>

            <GoogleMap
                mapContainerStyle={containerStyle}
                center={center}
                zoom={12}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={{ mapTypeControl: false, streetViewControl: false }}
                onClick={() => setSelectedMarker(null)}
            >
                {showHeatmap ? (
                    <HeatmapLayerF data={heatmapData} options={{ radius: 30, opacity: 0.8 }} />
                ) : (
                    <>
                        {markers.map((marker) => (
                            <MarkerF
                                key={marker.id}
                                position={{ lat: marker.lat, lng: marker.lng }}
                                title={marker.title}
                                icon={marker.iconUrl}
                                onClick={() => setSelectedMarker(marker)}
                            />
                        ))}

                        {HEALTH_UNITS.samu.map((unit) => (
                            <MarkerF
                                key={unit.id}
                                position={{ lat: unit.lat, lng: unit.lng }}
                                title={unit.title}
                                icon={{ url: icons.samu, scaledSize: new window.google.maps.Size(30, 30) }}
                            />
                        ))}
                        {HEALTH_UNITS.ubs.map((unit) => (
                            <MarkerF
                                key={unit.id}
                                position={{ lat: unit.lat, lng: unit.lng }}
                                title={unit.title}
                                icon={{ url: icons.ubs, scaledSize: new window.google.maps.Size(30, 30) }}
                            />
                        ))}
                        {HEALTH_UNITS.caps.map((unit) => (
                            <MarkerF
                                key={unit.id}
                                position={{ lat: unit.lat, lng: unit.lng }}
                                title={unit.title}
                                icon={{ url: icons.caps, scaledSize: new window.google.maps.Size(30, 30) }}
                            />
                        ))}
                    </>
                )}
            </GoogleMap>

            {selectedMarker && (
                <div className="absolute bottom-3 left-3 right-3 z-20 max-h-[70%] max-w-sm animate-fade-in-up overflow-y-auto rounded-xl border-l-4 border-brand-medium bg-white p-4 shadow-card sm:bottom-4 sm:left-4 sm:right-auto sm:w-80">
                    <div className="mb-2 flex items-start justify-between">
                        <h3 className="text-lg font-bold text-brand-dark">{selectedMarker.fullData.id}</h3>
                        <button onClick={() => setSelectedMarker(null)} className="text-gray-400 hover:text-gray-600">
                            <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                        <p><span className="font-semibold text-gray-800">Nome:</span> {MASKED_PATIENT_NAME}</p>
                        <p><span className="font-semibold text-gray-800">Idade:</span> {selectedMarker.fullData.idade} anos ({selectedMarker.fullData.sexo})</p>
                        <p><span className="font-semibold text-gray-800">Bairro:</span> {selectedMarker.fullData.bairro}</p>
                        <p><span className="font-semibold text-gray-800">Diagnóstico:</span> {selectedMarker.fullData.diag}</p>
                        <p><span className="font-semibold text-gray-800">Reincidente:</span> {selectedMarker.fullData.reinc}</p>
                        <p><span className="font-semibold text-gray-800">Motivo Inicial:</span> {selectedMarker.fullData.motivoInicial}</p>
                        <p><span className="font-semibold text-gray-800">Motivo Constatado:</span> {selectedMarker.fullData.motivoConstatado}</p>
                        {selectedMarker.fullData.metodo !== '-' && (
                            <p><span className="font-semibold text-gray-800">Método:</span> {selectedMarker.fullData.metodo}</p>
                        )}
                    </div>
                    {selectedMarker.fullData.detalheLivre !== '-' && (
                        <div className="mt-3 border-t border-gray-100 pt-2 text-xs text-gray-600">
                            <span className="font-semibold text-gray-800">Detalhe Livre:</span> {selectedMarker.fullData.detalheLivre}
                        </div>
                    )}
                    <div className="mt-3 border-t border-gray-100 pt-2 text-xs text-gray-500">
                        {selectedMarker.lat.toFixed(5)}, {selectedMarker.lng.toFixed(5)}
                    </div>
                </div>
            )}
        </div>
    );
};

const MapComponentMemoizado = React.memo(MapComponent);

export default MapComponentMemoizado;
