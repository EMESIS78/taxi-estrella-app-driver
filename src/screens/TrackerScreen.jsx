import React, { useEffect, useState, useContext, useRef } from 'react';
import { View, useColorScheme, ActivityIndicator, Alert } from 'react-native';
import { AuthContext } from '../context/Authcontext';
import * as servicioService from '../services/servicioService';
import * as conductorService from '../services/conductorService';
import { useLiveLocation } from '../hooks/useLiveLocation';
import { useServicioSocket } from '../hooks/useServicioSocket';
import useEnviarUbicacionConductor from '../hooks/useEnviarUbicacionConductor';
import { geocodeAddress, getRutaGoogleMaps } from '../services/googleMapsService';
import { elegirAppNavegacion } from '../utils/navigationUtils';
import EstadoConductor from '../components/EstadoConductor';
import AlertaServicio from '../components/AlertaServicio';
import Mapa from '../components/Mapa';
import ControlesServicio from '../components/ControlesServicio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useKeepAwake } from 'expo-keep-awake';
import { useIsFocused } from '@react-navigation/native';
import { useDistancias } from '../hooks/useDistancias';
import { useHeading } from '../hooks/useHeading';


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
    const [servicioTomado, setServicioTomado] = useState(false);
    const isFocused = useIsFocused();
    const heading = useHeading();

    const theme = useColorScheme();
    const mapRef = useRef(null);
    const { location, loading } = useLiveLocation();

    useServicioSocket(location, setNuevoServicio, nuevoServicio, setServicioTomado);
    useEnviarUbicacionConductor({ location, user, estado: estadoActual });

    // The GPS watcher emits a new location object every ~2s. Restoring the
    // stored ride is a one-shot job, so it runs on the first location we get
    // and never again: otherwise every update spends 2 geocoding and
    // 2 directions requests of the Google quota.
    const servicioRestauradoRef = useRef(false);

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

        if (location && !servicioRestauradoRef.current) {
            servicioRestauradoRef.current = true;
            restaurarServicio();
        }
    }, [location]);

    const aceptarServicio = async () => {
        const servicio = nuevoServicio;
        setNuevoServicio(null);

        try {
            await servicioService.tomar(servicio.idServicio, user?.dni);
        } catch (err) {
            console.error('Error al aceptar servicio:', err.message);
            Alert.alert('No se pudo aceptar el servicio', err.message);
            return;
        }

        // From here on the ride belongs to this driver, so it stays active even
        // if the route cannot be drawn.
        setServicioActivo(servicio);
        await AsyncStorage.setItem('servicioActivo', JSON.stringify(servicio));

        // A driver on a ride must stop receiving offers. The 8 s location
        // update also carries this status, so a failed save catches up.
        setEstadoActual('Ocupado');
        conductorService.cambiarEstado(user?.dni, 'Ocupado').catch((err) =>
            console.error('Error al marcar el conductor como Ocupado:', err.message)
        );

        try {
            const partida = await geocodeAddress(servicio.puntoPartida);
            const destino = await geocodeAddress(servicio.puntoLlegada);
            setPartidaCoords(partida);
            setDestinoCoords(destino);
            setMostrarBotonRuta(true);

            setRutaACamino(await getRutaGoogleMaps(location, partida));
            setRutaServicio(await getRutaGoogleMaps(partida, destino));
        } catch (err) {
            console.error('Error calculando la ruta:', err.message);
            Alert.alert('No se pudo calcular la ruta', `${err.message} El servicio sigue aceptado.`);
        }
    };

    // Finishing or cancelling keeps the ride open when the backend fails, so
    // the driver can retry.
    const cerrarServicio = async (accion, titulo) => {
        if (!servicioActivo) return;
        try {
            await accion(servicioActivo.idServicio, user?.dni);
            resetServicio();
        } catch (err) {
            console.error(`${titulo}:`, err.message);
            Alert.alert(titulo, `${err.message} Intenta nuevamente.`);
        }
    };

    const finalizarServicio = () => cerrarServicio(servicioService.finalizar, 'No se pudo finalizar el servicio');
    const cancelarServicio = () => cerrarServicio(servicioService.cancelar, 'No se pudo cancelar el servicio');

    const resetServicio = async () => {
        setRutaACamino([]);
        setRutaServicio([]);
        setPartidaCoords(null);
        setDestinoCoords(null);
        setMostrarBotonRuta(false);
        setServicioActivo(null);

        // The ride is over: the driver is available for offers again.
        setEstadoActual('Activo');
        conductorService.cambiarEstado(user?.dni, 'Activo').catch((err) =>
            console.error('Error al marcar el conductor como Activo:', err.message)
        );

        await AsyncStorage.removeItem('servicioActivo');
    };

    const { distanciaAPartida, distanciaADestino } = useDistancias(
        location,
        partidaCoords,
        destinoCoords,
        mostrarBotonRuta // Este es tu "navegacionActiva"
    );

    useEffect(() => {
        if (distanciaAPartida !== null && distanciaAPartida <= 0.05 && rutaACamino.length > 0) {
            console.log('🧹 Llegó al punto de partida, limpiando rutaACamino');
            setRutaACamino([]);
        }

        if (distanciaADestino !== null && distanciaADestino <= 0.05 && rutaServicio.length > 0) {
            console.log('🧹 Llegó al punto de destino, limpiando rutaServicio');
            setRutaServicio([]);
        }
    }, [distanciaAPartida, distanciaADestino]);

    const iconColor = {
        Activo: 'green',
        Ocupado: 'red',
        ServicioCalle: 'blue',
        ServicioPeligro: 'orange',
    }[estadoActual] || 'gray';

    return (
        <View style={{ flex: 1 }}>
            {!isFocused || loading || !location || !theme ? (
                <ActivityIndicator size="large" />
            ) : (
                <Mapa
                    location={location}
                    heading={heading}
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
            <AlertaServicio servicio={nuevoServicio} onClose={() => setNuevoServicio(null)} onAceptar={aceptarServicio} servicioTomado={servicioTomado} />
        </View>
    );
};

export default TrackerScreen;