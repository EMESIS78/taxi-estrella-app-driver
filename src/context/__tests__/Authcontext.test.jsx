import React from 'react';
import { Alert, Text } from 'react-native';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { AuthProvider, useAuth } from '../Authcontext';
import { apiRequest } from '../../services/apiClient';
import { getToken } from '../../services/tokenStore';

const mockSecureStore = {};
jest.mock('expo-secure-store', () => ({
    setItemAsync: jest.fn(async (key, value) => { mockSecureStore[key] = value; }),
    getItemAsync: jest.fn(async (key) => mockSecureStore[key] ?? null),
    deleteItemAsync: jest.fn(async (key) => { delete mockSecureStore[key]; }),
}));

const loginResponse = {
    dni: 12345678,
    nombre: 'Ana',
    rol: 'Conductor',
    habilitado: true,
    unidad: 'U-01',
    estado: 'Activo',
    token: 'jwt-abc',
    sessionToken: 'sid-123',
    mensaje: 'ok',
};

const response = (status, body) => ({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
});

let auth;
const Probe = () => {
    auth = useAuth();
    return <Text>{auth.user ? `user:${auth.user.dni}` : 'no-user'}</Text>;
};

const renderAuth = async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await screen.findByText(/user|no-user/);
};

describe('AuthProvider', () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
        Object.keys(mockSecureStore).forEach((key) => delete mockSecureStore[key]);
        jest.clearAllMocks();
        jest.spyOn(Alert, 'alert').mockImplementation(() => {});
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        global.fetch = jest.fn().mockResolvedValue(response(200));
    });

    afterEach(() => {
        delete global.fetch;
    });

    it('keeps the JWT in SecureStore and never persists token or sessionToken with the user', async () => {
        await renderAuth();

        await act(() => auth.login(loginResponse));

        expect(SecureStore.setItemAsync).toHaveBeenCalledWith('authToken', 'jwt-abc');
        expect(getToken()).toBe('jwt-abc');
        const stored = JSON.parse(await AsyncStorage.getItem('user'));
        expect(stored.dni).toBe(12345678);
        expect(stored).not.toHaveProperty('token');
        expect(stored).not.toHaveProperty('sessionToken');
        expect(auth.user).not.toHaveProperty('token');
        expect(auth.user).not.toHaveProperty('sessionToken');
    });

    it('restores the user and the token on start', async () => {
        await AsyncStorage.setItem('user', JSON.stringify({ dni: 12345678, habilitado: true }));
        mockSecureStore.authToken = 'jwt-saved';

        await renderAuth();

        expect(screen.getByText('user:12345678')).toBeTruthy();
        expect(getToken()).toBe('jwt-saved');
    });

    it('drops a stored user that has no token', async () => {
        await AsyncStorage.setItem('user', JSON.stringify({ dni: 12345678, habilitado: true }));

        await renderAuth();

        expect(screen.getByText('no-user')).toBeTruthy();
        expect(await AsyncStorage.getItem('user')).toBeNull();
    });

    it('closes the session on the backend with the Bearer token on logout', async () => {
        await renderAuth();
        await act(() => auth.login(loginResponse));

        await act(() => auth.logout());

        const [url, options] = global.fetch.mock.calls[0];
        expect(url).toMatch(/\/conductor\/cerrar-sesion\?dni=12345678$/);
        expect(options.method).toBe('PUT');
        expect(options.headers.Authorization).toBe('Bearer jwt-abc');
        expect(JSON.stringify(options)).not.toContain('sid-123');
        expect(screen.getByText('no-user')).toBeTruthy();
    });

    it('clears local data on logout even when the network fails', async () => {
        await renderAuth();
        await act(() => auth.login(loginResponse));
        global.fetch.mockRejectedValue(new TypeError('Network request failed'));

        await act(() => auth.logout());

        expect(screen.getByText('no-user')).toBeTruthy();
        expect(await AsyncStorage.getItem('user')).toBeNull();
        expect(getToken()).toBeNull();
        expect(mockSecureStore.authToken).toBeUndefined();
    });

    it('ends the local session and shows the backend message when a request gets 401', async () => {
        await renderAuth();
        await act(() => auth.login(loginResponse));
        global.fetch.mockResolvedValue(response(401, {
            error: 'No autenticado',
            mensaje: 'La sesion fue cerrada o iniciada en otro dispositivo',
        }));

        await act(() => apiRequest('/conductor/actualizarEstado', { method: 'PUT' }).catch(() => {}));

        await waitFor(() => expect(screen.getByText('no-user')).toBeTruthy());
        expect(Alert.alert).toHaveBeenCalledWith(
            'Sesión finalizada',
            'La sesion fue cerrada o iniciada en otro dispositivo'
        );
        expect(getToken()).toBeNull();
        expect(await AsyncStorage.getItem('user')).toBeNull();
        // Only the rejected request: the expired session is not closed again on the backend.
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('shows the session-closed alert once when several requests get 401 at the same time', async () => {
        await renderAuth();
        await act(() => auth.login(loginResponse));
        global.fetch.mockResolvedValue(response(401, { mensaje: 'La sesion fue cerrada o iniciada en otro dispositivo' }));

        await act(() => Promise.all([
            apiRequest('/a', { method: 'PUT' }).catch(() => {}),
            apiRequest('/b', { method: 'PUT' }).catch(() => {}),
            apiRequest('/c').catch(() => {}),
        ]));

        expect(Alert.alert).toHaveBeenCalledTimes(1);

        // A new login re-arms the alert for the next expired session.
        await act(() => auth.login(loginResponse));
        await act(() => apiRequest('/d').catch(() => {}));
        expect(Alert.alert).toHaveBeenCalledTimes(2);
    });
});
