import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { calcularBearing } from '../utils/geolocation';

export const useLiveLocation = () => {
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [previousLocation, setPreviousLocation] = useState(null);
    const [heading, setHeading] = useState(0);

    useEffect(() => {
        let subscription;

        const startTracking = async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.error('Permiso de ubicación denegado');
                setLoading(false);
                return;
            }

            try {
                subscription = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.High,
                        timeInterval: 2000,       // Cada 2 segundos
                        distanceInterval: 2,      // 👈 Muy sensible, detecta casi cualquier movimiento
                    },
                    (loc) => {
                        const newLocation = {
                            latitude: loc.coords.latitude,
                            longitude: loc.coords.longitude,
                        };

                        // Siempre calculamos el bearing
                        if (previousLocation) {
                            const bearing = calcularBearing(previousLocation, newLocation);
                            setHeading(bearing);
                        }

                        setLocation(newLocation);
                        setPreviousLocation(newLocation);
                    }
                );
            } catch (err) {
                console.error('Error al rastrear ubicación:', err);
            } finally {
                setLoading(false);
            }
        };

        startTracking();

        return () => {
            if (subscription) subscription.remove(); // detener el rastreo al desmontar
        };
    }, []);

    return { location, loading, heading };
};