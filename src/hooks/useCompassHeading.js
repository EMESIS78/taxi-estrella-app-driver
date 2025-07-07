import { useEffect, useState } from 'react';
import { Magnetometer } from 'expo-sensors';

export const useCompassHeading = () => {
    const [heading, setHeading] = useState(0);

    useEffect(() => {
        const subscription = Magnetometer.addListener(({ x, y }) => {
            let angle = Math.atan2(y, x) * (180 / Math.PI);
            if (angle < 0) angle += 360;
            setHeading(angle);
        });

        Magnetometer.setUpdateInterval(500);  // Cada 500 ms, para suavidad

        return () => subscription.remove();
    }, []);

    return heading;
};