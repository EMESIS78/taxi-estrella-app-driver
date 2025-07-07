import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

export const useHeading = () => {
    const [heading, setHeading] = useState(0);

    useEffect(() => {
        let subscription;

        const start = async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.error('Permiso de ubicación denegado');
                return;
            }

            subscription = await Location.watchHeadingAsync((headingData) => {
                setHeading(headingData.trueHeading ?? headingData.magHeading);
            });
        };

        start();

        return () => {
            if (subscription) subscription.remove();
        };
    }, []);

    return heading;
};
