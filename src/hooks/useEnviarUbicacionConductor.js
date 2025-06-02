import { useEffect } from 'react';
import { API_URL } from '@env';

const useEnviarUbicacionConductor = ({ location, user, estado }) => {
    useEffect(() => {
        const interval = setInterval(async () => {
            if (location && user) {
                try {
                    const response = await fetch(`${API_URL}/conductor/actualizarUbicacionConductor`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            idConductor: user.dni,
                            estado,
                            unidad: user.unidad,
                            latitud: location.latitude,
                            longitud: location.longitude,
                        }),
                    });

                    if (!response.ok) {
                        console.error('❌ Error enviando ubicación');
                    } else {
                        console.log('📍 Ubicación enviada correctamente');
                    }
                } catch (err) {
                    console.error('❌ Error de red al enviar ubicación:', err);
                }
            }
        }, 8000);

        return () => clearInterval(interval);
    }, [location, user, estado]);
};

export default useEnviarUbicacionConductor;