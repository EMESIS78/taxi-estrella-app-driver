import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

export const useLiveLocation = () => {
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(true);

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
                        timeInterval: 2000, // cada 2 segundos
                        distanceInterval: 5, // o cada 5 metros
                    },
                    (loc) => {
                        setLocation({
                            latitude: loc.coords.latitude,
                            longitude: loc.coords.longitude,
                        });
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

    return { location, loading };
};