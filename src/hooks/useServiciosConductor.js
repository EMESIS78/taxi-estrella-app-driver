// hooks/useServiciosConductor.js
import { useEffect, useState, useContext } from 'react';
import { API_URL } from '@env';
import { AuthContext } from '../context/Authcontext';

export const useServiciosConductor = (onLoaded) => {
    const [servicios, setServicios] = useState([]);
    const { user } = useContext(AuthContext);

    useEffect(() => {
        const obtenerServicios = async () => {
            try {
                const res = await fetch(`${API_URL}/informes/general?page=0&size=100`);
                const data = await res.json();
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
