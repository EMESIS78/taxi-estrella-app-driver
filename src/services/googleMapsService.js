import polyline from '@mapbox/polyline';
import { apiRequest, ApiError } from './apiClient';

// Geocoding (address → coordinates) and driving routes, through the backend
// proxy (/mapas/*). The Google key lives on the server, so the app never
// carries it. Every failure becomes a GoogleMapsError with a `code` and a
// message the driver can read.

export class GoogleMapsError extends Error {
    constructor(code, message) {
        super(message);
        this.name = 'GoogleMapsError';
        this.code = code;
    }
}

const GEOCODE_MESSAGES = {
    ZERO_RESULTS: (address) => `No se encontró la dirección "${address}".`,
    OVER_QUERY_LIMIT: () => 'Se superó el límite de consultas a Google Maps. Intenta en unos minutos.',
    REQUEST_DENIED: () => 'Google Maps rechazó la consulta. Revisa la clave de mapas del servidor.',
};

const proxy = async (path, query) => {
    try {
        return await apiRequest(path, { query });
    } catch (err) {
        if (err instanceof ApiError) {
            throw new GoogleMapsError(err.status === 0 ? 'NETWORK' : `HTTP_${err.status}`, err.message);
        }
        throw err;
    }
};

// The backend accepts at most 8 decimals per coordinate; GPS fixes carry ~15.
// Six decimals is about 11 cm.
const latLng = ({ latitude, longitude }) => `${latitude.toFixed(6)},${longitude.toFixed(6)}`;

export const geocodeAddress = async (address) => {
    const data = await proxy('/mapas/geocodificar', { direccion: address });

    const status = data?.status ?? 'UNKNOWN_ERROR';
    if (status !== 'OK') {
        const message = GEOCODE_MESSAGES[status]?.(address)
            ?? data?.error_message
            ?? `Google Maps no pudo ubicar la dirección (${status}).`;
        throw new GoogleMapsError(status, message);
    }

    const { lat, lng } = data.results[0].geometry.location;
    return { latitude: lat, longitude: lng };
};

export const getRutaGoogleMaps = async (origen, destino) => {
    const data = await proxy('/mapas/ruta', { origen: latLng(origen), destino: latLng(destino) });

    const encoded = data?.routes?.[0]?.polyline?.encodedPolyline;
    if (!encoded) return [];
    return polyline.decode(encoded).map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
};
