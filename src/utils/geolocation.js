import Geocoder from 'react-native-geocoding';
import { GOOGLE_API_KEY } from '@env';
import polyline from '@mapbox/polyline';

Geocoder.init(GOOGLE_API_KEY);

export const geocodeAddress = async (address) => {
    const json = await Geocoder.from(address);
    const location = json.results[0].geometry.location;
    return { latitude: location.lat, longitude: location.lng };
};

export const calcularDistanciaKm = (coord1, coord2) => {
    const R = 6371;
    const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
    const lat1 = coord1.latitude * Math.PI / 180;
    const lat2 = coord2.latitude * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

// Routes API (computeRoutes). The legacy Directions API can no longer be
// enabled on new Google Cloud projects.
const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

const toLatLng = ({ latitude, longitude }) => ({ location: { latLng: { latitude, longitude } } });

export const getRutaGoogleMaps = async (origen, destino) => {
    const response = await fetch(ROUTES_URL, {
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
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data?.error?.message || `Routes API respondió ${response.status}`);
    }

    const encoded = data?.routes?.[0]?.polyline?.encodedPolyline;
    if (!encoded) return [];
    return polyline.decode(encoded).map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
};

export const calcularBearing = (origen, destino) => {
    const startLat = origen.latitude * Math.PI / 180;
    const startLng = origen.longitude * Math.PI / 180;
    const endLat = destino.latitude * Math.PI / 180;
    const endLng = destino.longitude * Math.PI / 180;

    const y = Math.sin(endLng - startLng) * Math.cos(endLat);
    const x = Math.cos(startLat) * Math.sin(endLat) -
              Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);

    let bearing = Math.atan2(y, x) * (180 / Math.PI);
    bearing = (bearing + 360) % 360;  // Ajuste entre 0 y 360 grados
    return bearing;
};

