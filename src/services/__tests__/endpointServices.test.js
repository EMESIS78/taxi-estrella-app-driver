import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@env';
import * as conductorService from '../conductorService';
import * as servicioService from '../servicioService';
import { saveToken, clearToken } from '../tokenStore';

jest.mock('expo-secure-store', () => ({
    setItemAsync: jest.fn(),
    getItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
}));

const ok = (body) => ({
    ok: true,
    status: 200,
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
});

const llamada = () => {
    const [url, options] = global.fetch.mock.calls[0];
    return {
        url,
        method: options.method,
        auth: options.headers.Authorization,
        body: options.body === undefined ? undefined : JSON.parse(options.body),
    };
};

describe('endpoint services', () => {
    beforeEach(async () => {
        global.fetch = jest.fn().mockResolvedValue(ok());
        await AsyncStorage.clear();
        await saveToken('jwt-abc');
    });

    afterEach(async () => {
        delete global.fetch;
        await clearToken();
    });

    describe('conductorService', () => {
        it('logs in without a token, sending the DNI as a number', async () => {
            global.fetch.mockResolvedValue(ok({ dni: 12345678, token: 'jwt-new' }));

            await expect(conductorService.login('12345678', 'clave')).resolves.toEqual({ dni: 12345678, token: 'jwt-new' });

            expect(llamada()).toEqual({
                url: `${API_URL}/conductor/login`,
                method: 'POST',
                auth: undefined,
                body: { dni: 12345678, password: 'clave' },
            });
        });

        it('closes the session with the DNI as a query parameter', async () => {
            await conductorService.cerrarSesion(12345678);

            expect(llamada()).toEqual({
                url: `${API_URL}/conductor/cerrar-sesion?dni=12345678`,
                method: 'PUT',
                auth: 'Bearer jwt-abc',
                body: undefined,
            });
        });

        it('updates the status with the DNI as idConductor', async () => {
            await conductorService.actualizarEstado('12345678', 'Ocupado');

            expect(llamada()).toEqual({
                url: `${API_URL}/conductor/actualizarEstado`,
                method: 'PUT',
                auth: 'Bearer jwt-abc',
                body: { idConductor: 12345678, estado: 'Ocupado' },
            });
        });

        it('saves the status locally only after the backend accepts it', async () => {
            await conductorService.cambiarEstado(12345678, 'Activo');
            expect(await AsyncStorage.getItem(conductorService.ESTADO_KEY)).toBe('Activo');

            global.fetch.mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve('') });
            await expect(conductorService.cambiarEstado(12345678, 'Ocupado')).rejects.toThrow();
            expect(await AsyncStorage.getItem(conductorService.ESTADO_KEY)).toBe('Activo');
        });

        it('sends the location with status and unit', async () => {
            await conductorService.actualizarUbicacion({
                dni: 12345678, estado: 'Activo', unidad: 'U-01', latitud: -16.42, longitud: -71.56,
            });

            expect(llamada()).toEqual({
                url: `${API_URL}/conductor/actualizarUbicacionConductor`,
                method: 'PUT',
                auth: 'Bearer jwt-abc',
                body: { idConductor: 12345678, estado: 'Activo', unidad: 'U-01', latitud: -16.42, longitud: -71.56 },
            });
        });
    });

    describe('servicioService', () => {
        it.each([
            ['tomar', '/conductor/tomarServicioWeb', 'Aceptado'],
            ['finalizar', '/servicio/finalizarServicio', 'Finalizado'],
            ['cancelar', '/servicio/cancelarServicio', 'Cancelado'],
        ])('%s sends the ride, the driver and estadoInforme %s', async (accion, path, estadoInforme) => {
            const acciones = {
                tomar: servicioService.tomar,
                finalizar: servicioService.finalizar,
                cancelar: servicioService.cancelar,
            };

            await acciones[accion](8, 12345678);

            expect(llamada()).toEqual({
                url: `${API_URL}${path}`,
                method: 'PUT',
                auth: 'Bearer jwt-abc',
                body: { idRegistro: 8, idConductor: 12345678, estadoInforme },
            });
        });

        it("requests the authenticated driver's own ride history", async () => {
            global.fetch.mockResolvedValue(ok({ contenido: [] }));

            await expect(servicioService.misServicios()).resolves.toEqual({ contenido: [] });

            expect(llamada()).toEqual({
                url: `${API_URL}/informes/mis-servicios?page=0&size=100`,
                method: 'GET',
                auth: 'Bearer jwt-abc',
                body: undefined,
            });
        });
    });
});
