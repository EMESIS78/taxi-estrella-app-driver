import polyline from '@mapbox/polyline';
import { GOOGLE_API_KEY } from '@env';
import { geocodeAddress, getRutaGoogleMaps, GoogleMapsError } from '../googleMapsService';

const origen = { latitude: -12.05, longitude: -77.04 };
const destino = { latitude: -12.1, longitude: -77.03 };

const respuesta = (status, body) => ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
});

describe('getRutaGoogleMaps (Routes API)', () => {
    beforeEach(() => {
        global.fetch = jest.fn();
    });

    afterEach(() => {
        delete global.fetch;
    });

    it('asks computeRoutes for a driving route and decodes its polyline', async () => {
        const puntos = [[-12.05, -77.04], [-12.07, -77.035], [-12.1, -77.03]];
        global.fetch.mockResolvedValue(respuesta(200, {
            routes: [{ polyline: { encodedPolyline: polyline.encode(puntos) } }],
        }));

        const ruta = await getRutaGoogleMaps(origen, destino);

        const [url, options] = global.fetch.mock.calls[0];
        expect(url).toBe('https://routes.googleapis.com/directions/v2:computeRoutes');
        expect(options.method).toBe('POST');
        expect(options.headers['X-Goog-Api-Key']).toBe(GOOGLE_API_KEY);
        expect(options.headers['X-Goog-FieldMask']).toBe('routes.polyline.encodedPolyline');
        expect(JSON.parse(options.body)).toEqual({
            origin: { location: { latLng: origen } },
            destination: { location: { latLng: destino } },
            travelMode: 'DRIVE',
        });
        expect(ruta).toEqual(puntos.map(([latitude, longitude]) => ({ latitude, longitude })));
    });

    it('returns an empty route when Google finds none', async () => {
        global.fetch.mockResolvedValue(respuesta(200, {}));

        await expect(getRutaGoogleMaps(origen, destino)).resolves.toEqual([]);
    });

    it('fails with a GoogleMapsError carrying the Google message when the request is rejected', async () => {
        global.fetch.mockResolvedValue(respuesta(403, {
            error: { status: 'PERMISSION_DENIED', message: 'Routes API has not been used in project' },
        }));

        const error = await getRutaGoogleMaps(origen, destino).catch((e) => e);
        expect(error).toBeInstanceOf(GoogleMapsError);
        expect(error.code).toBe('PERMISSION_DENIED');
        expect(error.message).toBe('Routes API has not been used in project');
    });
});

describe('geocodeAddress (Geocoding API)', () => {
    beforeEach(() => {
        global.fetch = jest.fn();
    });

    afterEach(() => {
        delete global.fetch;
    });

    it('returns the coordinates of the first result', async () => {
        global.fetch.mockResolvedValue(respuesta(200, {
            status: 'OK',
            results: [{ geometry: { location: { lat: -16.4205, lng: -71.565 } } }],
        }));

        await expect(geocodeAddress('Huaranguillo, Sachaca, Arequipa'))
            .resolves.toEqual({ latitude: -16.4205, longitude: -71.565 });

        const [url] = global.fetch.mock.calls[0];
        expect(url).toBe(
            'https://maps.googleapis.com/maps/api/geocode/json' +
            `?address=${encodeURIComponent('Huaranguillo, Sachaca, Arequipa')}&key=${encodeURIComponent(GOOGLE_API_KEY)}`
        );
    });

    it.each([
        ['ZERO_RESULTS', 'No se encontró la dirección "Calle Falsa 123".'],
        ['OVER_QUERY_LIMIT', 'Se superó el límite de consultas a Google Maps. Intenta en unos minutos.'],
        ['REQUEST_DENIED', 'Google Maps rechazó la consulta. Revisa la clave GOOGLE_API_KEY.'],
    ])('turns the %s status into a GoogleMapsError', async (status, mensaje) => {
        global.fetch.mockResolvedValue(respuesta(200, { status, results: [] }));

        const error = await geocodeAddress('Calle Falsa 123').catch((e) => e);

        expect(error).toBeInstanceOf(GoogleMapsError);
        expect(error.code).toBe(status);
        expect(error.message).toBe(mensaje);
    });

    it('turns a network failure into a GoogleMapsError', async () => {
        global.fetch.mockRejectedValue(new TypeError('Network request failed'));

        const error = await geocodeAddress('Plaza de Armas').catch((e) => e);

        expect(error).toBeInstanceOf(GoogleMapsError);
        expect(error.code).toBe('NETWORK');
    });
});
