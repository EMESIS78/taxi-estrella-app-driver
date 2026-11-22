import { apiRequest } from './apiClient';

// Driver session and status endpoints.

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

export const actualizarUbicacion = ({ dni, estado, unidad, latitud, longitud }) =>
    apiRequest('/conductor/actualizarUbicacionConductor', {
        method: 'PUT',
        body: { idConductor: dni, estado, unidad, latitud, longitud },
    });
