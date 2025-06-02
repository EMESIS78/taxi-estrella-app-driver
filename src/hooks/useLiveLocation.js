import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

export const useLiveLocation = () => {
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return setLoading(false);

            try {
                const currentLocation = await Location.getCurrentPositionAsync({});
                setLocation(currentLocation.coords);
            } catch (err) {
                console.error('Error al obtener ubicación:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return { location, loading };
};