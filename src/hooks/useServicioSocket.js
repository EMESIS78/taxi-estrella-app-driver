import { useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { geocodeAddress, calcularDistanciaKm } from '../utils/geolocation';
import { API_URL } from '@env';

export const useServicioSocket = (location, setNuevoServicio, nuevoServicio, setServicioTomado) => {
    useEffect(() => {
        const socket = new SockJS(`${API_URL}/ws`);
        const stompClient = new Client({
            webSocketFactory: () => socket,
            debug: str => console.log('[STOMP]', str),
            reconnectDelay: 5000,
            onConnect: () => {
                stompClient.subscribe('/topic/servicios', async ({ body }) => {
                    const servicio = JSON.parse(body);
                    console.log("📍 Servicio recibido:", servicio);
                    try {
                        const partidaCoords = await geocodeAddress(servicio.puntoPartida);
                        const distancia = calcularDistanciaKm(location, partidaCoords);
                        if (distancia <= 3) {
                            setNuevoServicio(servicio);
                        } else {
                            console.log('🚫 Servicio fuera de rango:', distancia.toFixed(2), 'km');
                        }
                    } catch (err) {
                        console.error('❌ Error geocodificando:', err);
                    }
                });

                stompClient.subscribe('/topic/servicio-tomado', ({ body }) => {
                    const idServicioTomado = Number(body);
                    console.log('🚨 Servicio tomado:', idServicioTomado);

                    if (nuevoServicio && nuevoServicio.idServicio === idServicioTomado) {
                        console.warn('⚠️ Otro conductor tomó este servicio.');
                        setNuevoServicio(null);
                        setServicioTomado(true);  // 👉 Aquí marcamos que ya fue tomado
                    }
                });
            },
            onStompError: frame => {
                console.error('💥 Error STOMP:', frame.headers['message']);
            },
        });

        stompClient.activate();
        return () => stompClient.deactivate();
    }, [location, nuevoServicio]);
};