import polyline from '@mapbox/polyline';
import { API_URL } from '@env';
import { geocodeAddress, getRutaGoogleMaps, GoogleMapsError } from '../googleMapsService';
import { saveToken, clearToken } from '../tokenStore';

jest.mock('expo-secure-store', () => ({
    setItemAsync: jest.fn(),
    getItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
}));

// GPS fixes carry ~15 decimals; the proxy accepts at most 8.
const origen = { latitude: -16.420512345678912, longitude: -71.565098765432101 };
const destino = { latitude: -16.398765, longitude: -71.536789 };

const respuesta = (status, body) => ({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
});

const llamada = () => {
    const [url, options] = global.fetch.mock.calls[0];
    return { url, method: options.method, auth: options.headers.Authorization };
};

beforeEach(async () => {
    global.fetch = jest.fn();
    await saveToken('jwt-abc');
});

afterEach(async () => {
    delete global.fetch;
    await clearToken();
});

describe('getRutaGoogleMaps (backend /mapas/ruta)', () => {
    it('asks the backend for the route with lat,lng points and decodes its polyline', async () => {
        const puntos = [[-16.42051, -71.5651], [-16.41, -71.55], [-16.39877, -71.53679]];
        global.fetch.mockResolvedValue(respuesta(200, {
            routes: [{ distanceMeters: 4200, polyline: { encodedPolyline: polyline.encode(puntos) } }],
        }));

        const ruta = await getRutaGoogleMaps(origen, destino);

        expect(llamada()).toEqual({
            url: `${API_URL}/mapas/ruta?origen=${encodeURIComponent('-16.420512,-71.565099')}`
                + `&destino=${encodeURIComponent('-16.398765,-71.536789')}`,
            method: 'GET',
            auth: 'Bearer jwt-abc',
        });
        expect(ruta).toEqual(puntos.map(([latitude, longitude]) => ({ latitude, longitude })));
    });

    it('returns an empty route when Google finds none', async () => {
        global.fetch.mockResolvedValue(respuesta(200, {}));

        await expect(getRutaGoogleMaps(origen, destino)).resolves.toEqual([]);
    });

    it('turns a backend 502 into a GoogleMapsError with the backend message', async () => {
        global.fetch.mockResolvedValue(respuesta(502, {
            error: 'Error de mapas',
            mensaje: 'No se pudo consultar el servicio de mapas',
        }));

        const error = await getRutaGoogleMaps(origen, destino).catch((e) => e);

        expect(error).toBeInstanceOf(GoogleMapsError);
        expect(error.code).toBe('HTTP_502');
        expect(error.message).toBe('No se pudo consultar el servicio de mapas');
    });
});

describe('geocodeAddress (backend /mapas/geocodificar)', () => {
    it('returns the coordinates of the first result', async () => {
        global.fetch.mockResolvedValue(respuesta(200, {
            status: 'OK',
            results: [{ geometry: { location: { lat: -16.4205, lng: -71.565 } } }],
        }));

        await expect(geocodeAddress('Huaranguillo, Sachaca, Arequipa'))
            .resolves.toEqual({ latitude: -16.4205, longitude: -71.565 });

        expect(llamada()).toEqual({
            url: `${API_URL}/mapas/geocodificar?direccion=${encodeURIComponent('Huaranguillo, Sachaca, Arequipa')}`,
            method: 'GET',
            auth: 'Bearer jwt-abc',
        });
    });

    it.each([
        ['ZERO_RESULTS', 'No se encontró la dirección "Calle Falsa 123".'],
        ['OVER_QUERY_LIMIT', 'Se superó el límite de consultas a Google Maps. Intenta en unos minutos.'],
        ['REQUEST_DENIED', 'Google Maps rechazó la consulta. Revisa la clave de mapas del servidor.'],
    ])('turns the %s status into a GoogleMapsError', async (status, mensaje) => {
        global.fetch.mockResolvedValue(respuesta(200, { status, results: [] }));

        const error = await geocodeAddress('Calle Falsa 123').catch((e) => e);

        expect(error).toBeInstanceOf(GoogleMapsError);
        expect(error.code).toBe(status);
        expect(error.message).toBe(mensaje);
    });

    it('reports a backend without a maps key (503)', async () => {
        global.fetch.mockResolvedValue(respuesta(503, {
            error: 'Servicio no disponible',
            mensaje: 'El servicio de mapas no esta configurado',
        }));

        const error = await geocodeAddress('Plaza de Armas').catch((e) => e);

        expect(error.code).toBe('HTTP_503');
        expect(error.message).toBe('El servicio de mapas no esta configurado');
    });

    it('turns a network failure into a GoogleMapsError', async () => {
        global.fetch.mockRejectedValue(new TypeError('Network request failed'));

        const error = await geocodeAddress('Plaza de Armas').catch((e) => e);

        expect(error).toBeInstanceOf(GoogleMapsError);
        expect(error.code).toBe('NETWORK');
    });
});
