import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { Audio } from 'expo-av';
import AlertaServicio from '../AlertaServicio';

jest.mock('expo-av', () => ({
    Audio: { Sound: { createAsync: jest.fn() } },
}));

const servicio = {
    idServicio: 77,
    nombreCliente: 'Ana',
    celular: '999888777',
    puntoPartida: 'Av. Siempre Viva 742',
    puntoLlegada: 'Plaza Mayor',
    precio: 25,
};

let sound;
let notificarEstado;

const renderAlerta = (props = {}) =>
    render(
        <AlertaServicio
            servicio={servicio}
            onClose={jest.fn()}
            onAceptar={jest.fn()}
            servicioTomado={false}
            {...props}
        />
    );

describe('AlertaServicio', () => {
    beforeEach(() => {
        notificarEstado = undefined;
        sound = {
            playAsync: jest.fn().mockResolvedValue(undefined),
            unloadAsync: jest.fn().mockResolvedValue(undefined),
            setOnPlaybackStatusUpdate: jest.fn((callback) => {
                notificarEstado = callback;
            }),
        };
        Audio.Sound.createAsync.mockResolvedValue({ sound });
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    it('releases the sound once playback has finished', async () => {
        renderAlerta();

        await waitFor(() => expect(sound.playAsync).toHaveBeenCalledTimes(1));
        expect(sound.setOnPlaybackStatusUpdate).toHaveBeenCalledTimes(1);

        await act(async () => {
            notificarEstado({ didJustFinish: true });
        });

        expect(sound.unloadAsync).toHaveBeenCalledTimes(1);
    });

    it('keeps the sound loaded while playback is still running', async () => {
        renderAlerta();

        await waitFor(() => expect(sound.playAsync).toHaveBeenCalledTimes(1));
        await act(async () => {
            notificarEstado({ didJustFinish: false });
        });

        expect(sound.unloadAsync).not.toHaveBeenCalled();
    });

    it('releases the sound when the alert goes away before playback ends', async () => {
        const { unmount } = renderAlerta();

        await waitFor(() => expect(sound.playAsync).toHaveBeenCalledTimes(1));
        await act(async () => {
            unmount();
        });

        expect(sound.unloadAsync).toHaveBeenCalledTimes(1);
    });

    it('renders nothing and plays no sound without a ride', () => {
        renderAlerta({ servicio: null });

        expect(screen.queryByText('📢 Nuevo Servicio')).toBeNull();
        expect(Audio.Sound.createAsync).not.toHaveBeenCalled();
    });

    it('shows the ride details and the accept button', async () => {
        renderAlerta();

        await waitFor(() => expect(sound.playAsync).toHaveBeenCalledTimes(1));
        expect(screen.getByText('📢 Nuevo Servicio')).toBeOnTheScreen();
        expect(screen.getByText(/Cliente:\s*Ana/)).toBeOnTheScreen();
        expect(screen.getByText('Aceptar')).toBeOnTheScreen();
    });

    it('warns that the ride was already taken instead of offering it', async () => {
        renderAlerta({ servicioTomado: true });

        await waitFor(() => expect(sound.playAsync).toHaveBeenCalledTimes(1));
        expect(
            screen.getByText('⚠️ Este servicio ya fue tomado por otro conductor.')
        ).toBeOnTheScreen();
        expect(screen.queryByText('Aceptar')).toBeNull();
    });
});
