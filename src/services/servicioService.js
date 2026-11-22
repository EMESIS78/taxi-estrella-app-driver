import { apiRequest } from './apiClient';

// Ride (servicio) lifecycle endpoints.

const cambiarEstadoServicio = (path, idServicio, dni, estadoInforme) =>
    apiRequest(path, {
        method: 'PUT',
        body: { idRegistro: idServicio, idConductor: dni, estadoInforme },
    });

export const tomar = (idServicio, dni) =>
    cambiarEstadoServicio('/conductor/tomarServicioWeb', idServicio, dni, 'Aceptado');

export const finalizar = (idServicio, dni) =>
    cambiarEstadoServicio('/servicio/finalizarServicio', idServicio, dni, 'Finalizado');

export const cancelar = (idServicio, dni) =>
    cambiarEstadoServicio('/servicio/cancelarServicio', idServicio, dni, 'Cancelado');

// Rides of the driver in the JWT. /informes/general is reserved for the panel.
export const misServicios = ({ page = 0, size = 100 } = {}) =>
    apiRequest('/informes/mis-servicios', { query: { page, size } });
