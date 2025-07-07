import { useEffect, useState } from 'react';
import { calcularDistanciaKm } from '../utils/geolocation';

export const useDistanciaRestante = (location, destinoCoords, navegacionActiva) => {
    const [distanciaRestante, setDistanciaRestante] = useState(null);

    useEffect(() => {
        if (!navegacionActiva || !location || !destinoCoords) return;

        const interval = setInterval(() => {
            const distancia = calcularDistanciaKm(location, destinoCoords);
            setDistanciaRestante(distancia);
        }, 4000);  // cada 4 segundos

        return () => clearInterval(interval);
    }, [location, destinoCoords, navegacionActiva]);

    return distanciaRestante;
};
