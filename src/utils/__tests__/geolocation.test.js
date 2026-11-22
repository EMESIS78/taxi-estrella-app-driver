import polyline from '@mapbox/polyline';
import { GOOGLE_API_KEY } from '@env';
import { getRutaGoogleMaps } from '../geolocation';

jest.mock('react-native-geocoding', () => ({ init: jest.fn(), from: jest.fn() }));

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

    it('fails with the Google message when the request is rejected', async () => {
        global.fetch.mockResolvedValue(respuesta(403, {
            error: { status: 'PERMISSION_DENIED', message: 'Routes API has not been used in project' },
        }));

        await expect(getRutaGoogleMaps(origen, destino)).rejects.toThrow('Routes API has not been used in project');
    });
});
