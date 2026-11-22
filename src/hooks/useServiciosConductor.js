// hooks/useServiciosConductor.js
import { useEffect, useState, useContext } from 'react';
import * as servicioService from '../services/servicioService';
import { AuthContext } from '../context/Authcontext';

export const useServiciosConductor = (onLoaded) => {
    const [servicios, setServicios] = useState([]);
    const { user } = useContext(AuthContext);

    useEffect(() => {
        const obtenerServicios = async () => {
            try {
                // The backend returns only the rides of the driver in the token.
                const data = await servicioService.misServicios({ page: 0, size: 100 });
                const misCarreras = data?.contenido ?? [];
                setServicios(misCarreras);
                if (onLoaded) {
                    onLoaded(misCarreras);
                }
            } catch (err) {
                console.error('Error obteniendo servicios:', err);
            }
        };
        obtenerServicios();
    }, [user]);

    return servicios;
};
