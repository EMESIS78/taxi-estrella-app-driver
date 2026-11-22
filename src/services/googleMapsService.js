import polyline from '@mapbox/polyline';
import { GOOGLE_API_KEY } from '@env';

// Google Maps web services used by the app: Geocoding (address → coordinates)
// and Routes (driving route between two points). Every failure becomes a
// GoogleMapsError with a `code` and a message the driver can read.

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
// The legacy Directions API can no longer be enabled on new Google Cloud projects.
const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

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
    REQUEST_DENIED: () => 'Google Maps rechazó la consulta. Revisa la clave GOOGLE_API_KEY.',
};

const request = async (url, options) => {
    try {
        const response = await fetch(url, options);
        return { response, data: await response.json() };
    } catch {
        throw new GoogleMapsError('NETWORK', 'No se pudo conectar con Google Maps.');
    }
};

export const geocodeAddress = async (address) => {
    const url = `${GEOCODE_URL}?address=${encodeURIComponent(address)}&key=${encodeURIComponent(GOOGLE_API_KEY)}`;
    const { response, data } = await request(url);

    const status = data?.status ?? `HTTP_${response.status}`;
    if (status !== 'OK') {
        const message = GEOCODE_MESSAGES[status]?.(address)
            ?? data?.error_message
            ?? `Google Maps no pudo ubicar la dirección (${status}).`;
        throw new GoogleMapsError(status, message);
    }

    const { lat, lng } = data.results[0].geometry.location;
    return { latitude: lat, longitude: lng };
};

const toLatLng = ({ latitude, longitude }) => ({ location: { latLng: { latitude, longitude } } });

export const getRutaGoogleMaps = async (origen, destino) => {
    const { response, data } = await request(ROUTES_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_API_KEY,
            // Ask only for the polyline: Google bills and sizes the response by field mask.
            'X-Goog-FieldMask': 'routes.polyline.encodedPolyline',
        },
        body: JSON.stringify({
            origin: toLatLng(origen),
            destination: toLatLng(destino),
            travelMode: 'DRIVE',
        }),
    });

    if (!response.ok) {
        throw new GoogleMapsError(
            data?.error?.status ?? `HTTP_${response.status}`,
            data?.error?.message || `Routes API respondió ${response.status}`
        );
    }

    const encoded = data?.routes?.[0]?.polyline?.encodedPolyline;
    if (!encoded) return [];
    return polyline.decode(encoded).map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
};
