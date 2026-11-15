import { useEffect, useRef } from 'react';
import { API_URL } from '@env';

const useEnviarUbicacionConductor = ({ location, user, estado }) => {
    // The GPS watcher emits a new location object every ~2s. Keeping these
    // values in a ref lets the 8s interval read the freshest data without the
    // effect tearing the interval down before it ever fires.
    const datosRef = useRef({ location, user, estado });

    useEffect(() => {
        datosRef.current = { location, user, estado };
    }, [location, user, estado]);

    useEffect(() => {
        const interval = setInterval(async () => {
            const { location: ubicacion, user: conductor, estado: estadoActual } = datosRef.current;

            if (ubicacion && conductor) {
                try {
                    const response = await fetch(`${API_URL}/conductor/actualizarUbicacionConductor`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            idConductor: conductor.dni,
                            estado: estadoActual,
                            unidad: conductor.unidad,
                            latitud: ubicacion.latitude,
                            longitud: ubicacion.longitude,
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
    }, []);
};

export default useEnviarUbicacionConductor;
