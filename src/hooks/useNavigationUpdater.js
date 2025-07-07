import { useEffect } from 'react';
import { getRutaGoogleMaps } from '../utils/geolocation';

export const useNavigationUpdater = (location, destinoCoords, navegacionActiva, setRutaServicio) => {
    useEffect(() => {
        if (!navegacionActiva || !location || !destinoCoords) return;

        const interval = setInterval(async () => {
            try {
                const nuevaRuta = await getRutaGoogleMaps(location, destinoCoords);
                setRutaServicio(nuevaRuta);
            } catch (err) {
                console.error('Error actualizando ruta:', err);
            }
        }, 8000); // Cada 8 segundos actualiza ruta

        return () => clearInterval(interval);
    }, [location, destinoCoords, navegacionActiva]);
};
