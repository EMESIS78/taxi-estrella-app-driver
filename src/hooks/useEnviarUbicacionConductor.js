import { useEffect, useRef } from 'react';
import * as conductorService from '../services/conductorService';

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
                    await conductorService.actualizarUbicacion({
                        dni: conductor.dni,
                        estado: estadoActual,
                        unidad: conductor.unidad,
                        latitud: ubicacion.latitude,
                        longitud: ubicacion.longitude,
                    });
                    console.log('📍 Ubicación enviada correctamente');
                } catch (err) {
                    console.error('❌ Error enviando ubicación:', err.status, err.message);
                }
            }
        }, 8000);

        return () => clearInterval(interval);
    }, []);
};

export default useEnviarUbicacionConductor;
