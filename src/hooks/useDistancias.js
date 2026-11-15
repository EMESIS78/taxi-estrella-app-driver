import { useEffect, useRef, useState } from 'react';
import { calcularDistanciaKm } from '../utils/geolocation';

export const useDistancias = (location, partidaCoords, destinoCoords, navegacionActiva) => {
    const [distanciaAPartida, setDistanciaAPartida] = useState(null);
    const [distanciaADestino, setDistanciaADestino] = useState(null);

    // The GPS watcher emits a new location object every ~2s. Reading the
    // coordinates from a ref keeps the 4s interval alive long enough to fire.
    const coordsRef = useRef({ location, partidaCoords, destinoCoords });

    useEffect(() => {
        coordsRef.current = { location, partidaCoords, destinoCoords };
    }, [location, partidaCoords, destinoCoords]);

    useEffect(() => {
        if (!navegacionActiva) return;

        const interval = setInterval(() => {
            const { location: ubicacion, partidaCoords: partida, destinoCoords: destino } = coordsRef.current;

            if (!ubicacion) return;

            if (partida) {
                setDistanciaAPartida(calcularDistanciaKm(ubicacion, partida));
            }
            if (destino) {
                setDistanciaADestino(calcularDistanciaKm(ubicacion, destino));
            }
        }, 4000);

        return () => clearInterval(interval);
    }, [navegacionActiva]);

    return { distanciaAPartida, distanciaADestino };
};
