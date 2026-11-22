import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { geocodeAddress, calcularDistanciaKm } from '../utils/geolocation';
import { API_URL } from '@env';
import { getToken } from '../services/tokenStore';

export const useServicioSocket = (location, setNuevoServicio, nuevoServicio, setServicioTomado) => {
    // The GPS watcher emits a new location object every ~2s and the pending
    // offer changes while the socket is open. Reading both from a ref keeps a
    // single STOMP connection alive instead of reconnecting and dropping the
    // services that arrive during the reconnection window.
    const datosRef = useRef({ location, nuevoServicio, setNuevoServicio, setServicioTomado });

    useEffect(() => {
        datosRef.current = { location, nuevoServicio, setNuevoServicio, setServicioTomado };
    }, [location, nuevoServicio, setNuevoServicio, setServicioTomado]);

    useEffect(() => {
        const stompClient = new Client({
            // A SockJS instance cannot be reused once closed, so every
            // (re)connection attempt needs a fresh transport.
            webSocketFactory: () => new SockJS(`${API_URL}/ws`),
            // The backend authenticates the STOMP CONNECT frame with the JWT.
            // Read it before each attempt so a reconnection uses the current token.
            beforeConnect: () => {
                stompClient.connectHeaders = { Authorization: `Bearer ${getToken()}` };
            },
            // stompjs logs every frame with all its headers: hide the JWT, and
            // keep the log out of release builds.
            debug: __DEV__
                ? str => console.log('[STOMP]', str.replace(/(Authorization:\s*Bearer\s+)\S+/gi, '$1***'))
                : () => {},
            reconnectDelay: 5000,
            onConnect: () => {
                stompClient.subscribe('/topic/servicios', async ({ body }) => {
                    const servicio = JSON.parse(body);
                    console.log("📍 Servicio recibido:", servicio);
                    try {
                        const partidaCoords = await geocodeAddress(servicio.puntoPartida);
                        const distancia = calcularDistanciaKm(datosRef.current.location, partidaCoords);
                        if (distancia <= 3) {
                            datosRef.current.setNuevoServicio(servicio);
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

                    const servicioPendiente = datosRef.current.nuevoServicio;
                    if (servicioPendiente && servicioPendiente.idServicio === idServicioTomado) {
                        console.warn('⚠️ Otro conductor tomó este servicio.');
                        datosRef.current.setNuevoServicio(null);
                        datosRef.current.setServicioTomado(true);  // 👉 Aquí marcamos que ya fue tomado
                    }
                });
            },
            onStompError: frame => {
                console.error('💥 Error STOMP:', frame.headers['message']);
            },
        });

        stompClient.activate();
        return () => stompClient.deactivate();
    }, []);
};
