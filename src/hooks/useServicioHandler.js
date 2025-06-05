import { useState, useEffect } from 'react';
import { API_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { geocodeAddress, getRutaGoogleMaps } from '../utils/geolocation';

export const useServicioHandler = (location, user) => {
    const [servicioActivo, setServicioActivo] = useState(null);
    const [nuevoServicio, setNuevoServicio] = useState(null);
    const [rutaACamino, setRutaACamino] = useState([]);
    const [rutaServicio, setRutaServicio] = useState([]);
    const [partidaCoords, setPartidaCoords] = useState(null);
    const [destinoCoords, setDestinoCoords] = useState(null);
    const [mostrarBotonRuta, setMostrarBotonRuta] = useState(false);

    const aceptarServicio = async (servicio) => {
        try {
            const response = await fetch(`${API_URL}/conductor/tomarServicioWeb`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idRegistro: servicio.idServicio,
                    idConductor: user?.dni,
                    estadoInforme: 'Aceptado',
                }),
            });

            if (!response.ok) return;

            const partida = await geocodeAddress(servicio.puntoPartida);
            const destino = await geocodeAddress(servicio.puntoLlegada);
            setPartidaCoords(partida);
            setDestinoCoords(destino);

            const ruta1 = await getRutaGoogleMaps(location, partida);
            const ruta2 = await getRutaGoogleMaps(partida, destino);
            setRutaACamino(ruta1);
            setRutaServicio(ruta2);

            setServicioActivo(servicio);
            setMostrarBotonRuta(true);
            await AsyncStorage.setItem('servicioActivo', JSON.stringify(servicio));
        } catch (error) {
            console.error('Error al aceptar servicio:', error);
        } finally {
            setNuevoServicio(null);
        }
    };

    const restaurarServicio = async () => {
        const guardado = await AsyncStorage.getItem('servicioActivo');
        if (!guardado || !location) return;

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
    };

    const finalizarServicio = async () => {
        if (!servicioActivo) return;
        await fetch(`${API_URL}/servicio/finalizarServicio`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idRegistro: servicioActivo.idServicio,
                idConductor: user?.dni,
                estadoInforme: 'Finalizado',
            }),
        });
        resetServicio();
    };

    const cancelarServicio = async () => {
        if (!servicioActivo) return;
        await fetch(`${API_URL}/servicio/cancelarServicio`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idRegistro: servicioActivo.idServicio,
                idConductor: user?.dni,
                estadoInforme: 'Cancelado',
            }),
        });
        resetServicio();
    };

    const resetServicio = async () => {
        setServicioActivo(null);
        setRutaACamino([]);
        setRutaServicio([]);
        setPartidaCoords(null);
        setDestinoCoords(null);
        setMostrarBotonRuta(false);
        await AsyncStorage.removeItem('servicioActivo');
    };

    return {
        servicioActivo,
        nuevoServicio,
        setNuevoServicio,
        aceptarServicio,
        finalizarServicio,
        cancelarServicio,
        restaurarServicio,
        rutaACamino,
        rutaServicio,
        partidaCoords,
        destinoCoords,
        mostrarBotonRuta,
    };
};
