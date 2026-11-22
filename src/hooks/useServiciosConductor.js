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
                const data = await servicioService.historial({ page: 0, size: 100 });
                const serviciosFiltrados = data.contenido.filter(
                    s => s.nombreConductor === user?.nombre && s.unidad === user?.unidad
                );
                setServicios(serviciosFiltrados);
                if (onLoaded) {
                    onLoaded(serviciosFiltrados);  // 👈 Llama al callback cuando cargue
                }
            } catch (err) {
                console.error('Error obteniendo servicios:', err);
            }
        };
        obtenerServicios();
    }, [user]);

    return servicios;
};
