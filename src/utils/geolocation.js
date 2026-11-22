// Pure geometry helpers. Google Maps calls live in src/services/googleMapsService.js.

export const calcularDistanciaKm = (coord1, coord2) => {
    const R = 6371;
    const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
    const lat1 = coord1.latitude * Math.PI / 180;
    const lat2 = coord2.latitude * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
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

