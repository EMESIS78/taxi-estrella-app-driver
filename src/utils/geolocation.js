import Geocoder from 'react-native-geocoding';
import { GOOGLE_API_KEY } from '../config/env';
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

export const getRutaGoogleMaps = async (origen, destino) => {
    const origin = `${origen.latitude},${origen.longitude}`;
    const destination = `${destino.latitude},${destino.longitude}`;
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${GOOGLE_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();
    const points = polyline.decode(data.routes[0].overview_polyline.points);
    return points.map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
};
