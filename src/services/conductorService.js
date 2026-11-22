import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from './apiClient';

// Driver session and status endpoints.

export const ESTADO_KEY = 'estadoConductor';

export const login = (dni, password) =>
    apiRequest('/conductor/login', {
        method: 'POST',
        auth: false,
        body: { dni: Number(dni), password },
    });

export const cerrarSesion = (dni) =>
    apiRequest('/conductor/cerrar-sesion', { method: 'PUT', query: { dni } });

export const actualizarEstado = (dni, estado) =>
    apiRequest('/conductor/actualizarEstado', {
        method: 'PUT',
        body: { idConductor: Number(dni), estado },
    });

// Saves the status on the backend and remembers it locally, so the app
// restores it on the next start. Used by the status panel and by ride acceptance.
export const cambiarEstado = async (dni, estado) => {
    await actualizarEstado(dni, estado);
    await AsyncStorage.setItem(ESTADO_KEY, estado);
};

export const actualizarUbicacion = ({ dni, estado, unidad, latitud, longitud }) =>
    apiRequest('/conductor/actualizarUbicacionConductor', {
        method: 'PUT',
        body: { idConductor: dni, estado, unidad, latitud, longitud },
    });
