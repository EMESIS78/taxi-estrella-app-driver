import { useEffect, useState } from 'react';
import { calcularDistanciaKm } from '../utils/geolocation';

export const useDistancias = (location, partidaCoords, destinoCoords, navegacionActiva) => {
    const [distanciaAPartida, setDistanciaAPartida] = useState(null);
    const [distanciaADestino, setDistanciaADestino] = useState(null);

    useEffect(() => {
        if (!navegacionActiva || !location) return;

        const interval = setInterval(() => {
            if (partidaCoords) {
                const distancia = calcularDistanciaKm(location, partidaCoords);
                setDistanciaAPartida(distancia);
            }
            if (destinoCoords) {
                const distancia = calcularDistanciaKm(location, destinoCoords);
                setDistanciaADestino(distancia);
            }
        }, 4000);

        return () => clearInterval(interval);
    }, [location, partidaCoords, destinoCoords, navegacionActiva]);

    return { distanciaAPartida, distanciaADestino };
};
