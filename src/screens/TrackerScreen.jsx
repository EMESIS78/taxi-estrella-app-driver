import React, { useEffect, useState, useContext, useRef } from 'react';
import { View, useColorScheme, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/Authcontext';
import { API_URL } from '../config/env';
import { useLiveLocation } from '../hooks/useLiveLocation';
import { useServicioSocket } from '../hooks/useServicioSocket';
import useEnviarUbicacionConductor from '../hooks/useEnviarUbicacionConductor';
import { geocodeAddress, getRutaGoogleMaps } from '../utils/geolocation';
import { elegirAppNavegacion } from '../utils/navigationUtils';
import EstadoConductor from '../components/EstadoConductor';
import AlertaServicio from '../components/AlertaServicio';
import Mapa from '../components/Mapa';
import ControlesServicio from '../components/ControlesServicio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useKeepAwake } from 'expo-keep-awake';
import { useIsFocused } from '@react-navigation/native';
import { useDrawerStatus } from '@react-navigation/drawer';

const TrackerScreen = () => {
    useKeepAwake();
    const { user } = useContext(AuthContext);
    const [estadoActual, setEstadoActual] = useState('Activo');
    const [servicioActivo, setServicioActivo] = useState(null);
    const [nuevoServicio, setNuevoServicio] = useState(null);
    const [rutaACamino, setRutaACamino] = useState([]);
    const [rutaServicio, setRutaServicio] = useState([]);
    const [partidaCoords, setPartidaCoords] = useState(null);
    const [destinoCoords, setDestinoCoords] = useState(null);
    const [mostrarBotonRuta, setMostrarBotonRuta] = useState(false);
    const isFocused = useIsFocused();

    const theme = useColorScheme();
    const mapRef = useRef(null);
    const { location, loading } = useLiveLocation();

    useServicioSocket(location, setNuevoServicio);
    useEnviarUbicacionConductor({ location, user, estado: estadoActual });

    useEffect(() => {
        if (location && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }, 1000);
        }
    }, [location]);

    useEffect(() => {
        const restaurarServicio = async () => {
            const guardado = await AsyncStorage.getItem('servicioActivo');
            if (guardado) {
                const servicio = JSON.parse(guardado);
                setServicioActivo(servicio);

                const partida = await geocodeAddress(servicio.puntoPartida);
                const destino = await geocodeAddress(servicio.puntoLlegada);
                setPartidaCoords(partida);
                setDestinoCoords(destino);

                const ruta1 = await getRutaGoogleMaps(location, partida);
                const ruta2 = await getRutaGoogleMaps(partida, destino);

                setRutaACamino(ruta1);
                setRutaServicio(ruta2);
                setMostrarBotonRuta(true);
            }
        };

        if (location) {
            restaurarServicio();
        }
    }, [location]);

    const aceptarServicio = async () => {
        try {
            const response = await fetch(`${API_URL}/conductor/tomarServicioWeb`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idRegistro: nuevoServicio.idServicio,
                    idConductor: user?.dni,
                    estadoInforme: 'Aceptado',
                }),
            });

            if (!response.ok) return;

            const partida = await geocodeAddress(nuevoServicio.puntoPartida);
            const destino = await geocodeAddress(nuevoServicio.puntoLlegada);

            setPartidaCoords(partida);
            setDestinoCoords(destino);
            setRutaACamino(await getRutaGoogleMaps(location, partida));
            setRutaServicio(await getRutaGoogleMaps(partida, destino));

            setMostrarBotonRuta(true);
            setServicioActivo(nuevoServicio);
            await AsyncStorage.setItem('servicioActivo', JSON.stringify(nuevoServicio));
        } catch (err) {
            console.error('Error al aceptar servicio:', err);
        } finally {
            setNuevoServicio(null);
        }
    };

    const finalizarServicio = async () => {
        if (!servicioActivo) return;
        try {
            const response = await fetch(`${API_URL}/servicio/finalizarServicio`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idRegistro: servicioActivo.idServicio,
                    idConductor: user?.dni,
                    estadoInforme: 'Finalizado',
                }),
            });

            if (response.ok) resetServicio();
        } catch (err) {
            console.error('Error finalizando servicio:', err);
        }
    };

    const cancelarServicio = async () => {
        if (!servicioActivo) return;
        try {
            const response = await fetch(`${API_URL}/servicio/cancelarServicio`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idRegistro: servicioActivo.idServicio,
                    idConductor: user?.dni,
                    estadoInforme: 'Cancelado',
                }),
            });

            if (response.ok) resetServicio();
        } catch (err) {
            console.error('Error cancelando servicio:', err);
        }
    };

    const resetServicio = async () => {
        setRutaACamino([]);
        setRutaServicio([]);
        setPartidaCoords(null);
        setDestinoCoords(null);
        setMostrarBotonRuta(false);
        setServicioActivo(null);
        await AsyncStorage.removeItem('servicioActivo');
    };

    const iconColor = {
        Activo: 'green',
        Ocupado: 'red',
        ServicioCalle: 'blue',
        ServicioPeligro: 'orange',
    }[estadoActual] || 'gray';

    const isDrawerOpen = useDrawerStatus() === 'open';
    return (
        <View style={{ flex: 1 }}>
            {!isFocused || loading || !location || !theme ? (
                <ActivityIndicator size="large" />
            ) : (
                <Mapa
                    location={location}
                    mapRef={mapRef}
                    darkMode={theme === 'dark'}
                    iconColor={iconColor}
                    rutaACamino={rutaACamino}
                    rutaServicio={rutaServicio}
                    partidaCoords={partidaCoords}
                    destinoCoords={destinoCoords}
                />
            )}

            <ControlesServicio
                servicioActivo={servicioActivo}
                onFinalizar={finalizarServicio}
                onCancelar={cancelarServicio}
                mostrarBotonRuta={mostrarBotonRuta}
                iniciarRutaAPartida={() => elegirAppNavegacion(
                    `${location.latitude},${location.longitude}`,
                    `${partidaCoords?.latitude},${partidaCoords?.longitude}`
                )}
                iniciarRutaAlDestino={() => elegirAppNavegacion(
                    `${partidaCoords?.latitude},${partidaCoords?.longitude}`,
                    `${destinoCoords?.latitude},${destinoCoords?.longitude}`
                )}
            />

            <EstadoConductor onEstadoChange={setEstadoActual} />
            <AlertaServicio servicio={nuevoServicio} onClose={() => setNuevoServicio(null)} onAceptar={aceptarServicio} />
        </View>
    );
};

export default TrackerScreen;