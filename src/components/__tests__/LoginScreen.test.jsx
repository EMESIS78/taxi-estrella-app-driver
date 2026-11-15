import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import LoginScreen from '../LoginScreen';
import { AuthContext } from '../../context/Authcontext';

const renderWithAuth = (login = jest.fn()) => {
    render(
        <AuthContext.Provider value={{ user: null, login, logout: jest.fn(), loading: false }}>
            <LoginScreen />
        </AuthContext.Provider>
    );
    return { login };
};

describe('LoginScreen', () => {
    beforeEach(() => {
        jest.spyOn(Alert, 'alert').mockImplementation(() => {});
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        delete global.fetch;
    });

    it('renders the title, both inputs and the submit button', () => {
        renderWithAuth();

        expect(screen.getByText('Iniciar Sesión')).toBeOnTheScreen();
        expect(screen.getByPlaceholderText('Ej. 12345678')).toBeOnTheScreen();
        expect(screen.getByPlaceholderText('Tu contraseña')).toBeOnTheScreen();
        expect(screen.getByText('Ingresar')).toBeOnTheScreen();
    });

    it('asks for both fields and does not call the API when they are empty', () => {
        const { login } = renderWithAuth();

        fireEvent.press(screen.getByText('Ingresar'));

        expect(Alert.alert).toHaveBeenCalledWith('Campos requeridos', 'Por favor completa ambos campos.');
        expect(global.fetch).not.toHaveBeenCalled();
        expect(login).not.toHaveBeenCalled();
    });

    it('logs in an enabled driver with the backend response', async () => {
        const driver = { dni: 12345678, rol: 'Conductor', habilitado: true, sessionToken: 'token' };
        global.fetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve(driver),
        });
        const { login } = renderWithAuth();

        fireEvent.changeText(screen.getByPlaceholderText('Ej. 12345678'), '12345678');
        fireEvent.changeText(screen.getByPlaceholderText('Tu contraseña'), '1234');
        fireEvent.press(screen.getByText('Ingresar'));

        await waitFor(() => expect(login).toHaveBeenCalledWith(driver));
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringMatching(/\/conductor\/login$/),
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ dni: 12345678, password: '1234' }),
            })
        );
    });
});
