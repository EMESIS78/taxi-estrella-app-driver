import * as SecureStore from 'expo-secure-store';
import { API_URL } from '@env';
import { apiRequest, ApiError, setUnauthorizedHandler } from '../apiClient';
import { saveToken, clearToken, loadToken } from '../tokenStore';

jest.mock('expo-secure-store', () => {
    const store = {};
    return {
        setItemAsync: jest.fn(async (key, value) => { store[key] = value; }),
        getItemAsync: jest.fn(async (key) => store[key] ?? null),
        deleteItemAsync: jest.fn(async (key) => { delete store[key]; }),
    };
});

const jsonResponse = (status, body) => ({
    ok: status >= 200 && status < 300,
    status,
    text: jest.fn().mockResolvedValue(body === undefined ? '' : JSON.stringify(body)),
});

describe('apiClient', () => {
    beforeEach(async () => {
        global.fetch = jest.fn();
        await clearToken();
        setUnauthorizedHandler(null);
    });

    afterEach(() => {
        delete global.fetch;
    });

    it('sends the stored token as a Bearer Authorization header', async () => {
        await saveToken('jwt-abc');
        global.fetch.mockResolvedValue(jsonResponse(200, { ok: 1 }));

        const data = await apiRequest('/conductor/actualizarEstado', {
            method: 'PUT',
            body: { idConductor: 1, estado: 'Activo' },
        });

        expect(data).toEqual({ ok: 1 });
        const [url, options] = global.fetch.mock.calls[0];
        expect(url).toBe(`${API_URL}/conductor/actualizarEstado`);
        expect(options.method).toBe('PUT');
        expect(options.headers.Authorization).toBe('Bearer jwt-abc');
        expect(options.headers['Content-Type']).toBe('application/json');
        expect(JSON.parse(options.body)).toEqual({ idConductor: 1, estado: 'Activo' });
    });

    it('omits the Authorization header for public requests', async () => {
        await saveToken('jwt-abc');
        global.fetch.mockResolvedValue(jsonResponse(200, {}));

        await apiRequest('/conductor/login', { method: 'POST', body: {}, auth: false });

        expect(global.fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
    });

    it('encodes query parameters', async () => {
        global.fetch.mockResolvedValue(jsonResponse(200, {}));

        await apiRequest('/conductor/cerrar-sesion', { method: 'PUT', query: { dni: 12345678 } });

        expect(global.fetch.mock.calls[0][0]).toBe(`${API_URL}/conductor/cerrar-sesion?dni=12345678`);
    });

    it('returns null for an empty successful body', async () => {
        global.fetch.mockResolvedValue(jsonResponse(200));

        await expect(apiRequest('/x', { method: 'PUT' })).resolves.toBeNull();
    });

    it('throws an ApiError carrying the status and backend message', async () => {
        global.fetch.mockResolvedValue(jsonResponse(409, { mensaje: 'Sesión activa' }));

        const error = await apiRequest('/conductor/login', { method: 'POST', auth: false }).catch((e) => e);

        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(409);
        expect(error.message).toBe('Sesión activa');
    });

    it('notifies the unauthorized handler with the backend message on an authenticated 401', async () => {
        await saveToken('jwt-old');
        const onUnauthorized = jest.fn();
        setUnauthorizedHandler(onUnauthorized);
        global.fetch.mockResolvedValue(jsonResponse(401, {
            error: 'No autenticado',
            mensaje: 'La sesion fue cerrada o iniciada en otro dispositivo',
        }));

        const error = await apiRequest('/conductor/actualizarUbicacionConductor', { method: 'PUT' }).catch((e) => e);

        expect(error.status).toBe(401);
        expect(onUnauthorized).toHaveBeenCalledWith('La sesion fue cerrada o iniciada en otro dispositivo');
    });

    it('does not notify the unauthorized handler for a public request', async () => {
        const onUnauthorized = jest.fn();
        setUnauthorizedHandler(onUnauthorized);
        global.fetch.mockResolvedValue(jsonResponse(401, { mensaje: 'Credenciales inválidas' }));

        await apiRequest('/conductor/login', { method: 'POST', auth: false }).catch(() => {});

        expect(onUnauthorized).not.toHaveBeenCalled();
    });

    it('turns a network failure into an ApiError with status 0', async () => {
        global.fetch.mockRejectedValue(new TypeError('Network request failed'));

        const error = await apiRequest('/x').catch((e) => e);

        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(0);
    });

    it('aborts a request that exceeds the timeout', async () => {
        jest.useFakeTimers();
        global.fetch.mockImplementation((url, { signal }) => new Promise((resolve, reject) => {
            signal.addEventListener('abort', () => {
                const abort = new Error('Aborted');
                abort.name = 'AbortError';
                reject(abort);
            });
        }));

        const pending = apiRequest('/x', { timeoutMs: 1000 }).catch((e) => e);
        jest.advanceTimersByTime(1000);
        const error = await pending;
        jest.useRealTimers();

        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(0);
        expect(error.timeout).toBe(true);
    });
});

describe('tokenStore', () => {
    it('persists the token in SecureStore and restores it', async () => {
        await saveToken('jwt-persisted');
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith('authToken', 'jwt-persisted');

        await expect(loadToken()).resolves.toBe('jwt-persisted');

        await clearToken();
        await expect(loadToken()).resolves.toBeNull();
    });
});
