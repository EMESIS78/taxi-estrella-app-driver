import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client } from '@stomp/stompjs';
import TrackerScreen from '../TrackerScreen';
import { AuthContext } from '../../context/Authcontext';
import { useLiveLocation } from '../../hooks/useLiveLocation';
import { geocodeAddress, getRutaGoogleMaps } from '../../utils/geolocation';
import useEnviarUbicacionConductor from '../../hooks/useEnviarUbicacionConductor';
import * as servicioService from '../../services/servicioService';
import * as conductorService from '../../services/conductorService';

jest.mock('sockjs-client', () => jest.fn());
jest.mock('@stomp/stompjs', () => ({ Client: jest.fn() }));
jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
jest.mock('../../hooks/useLiveLocation', () => ({ useLiveLocation: jest.fn() }));
jest.mock('../../hooks/useHeading', () => ({ useHeading: () => 0 }));
jest.mock('../../hooks/useDistancias', () => ({
    useDistancias: () => ({ distanciaAPartida: null, distanciaADestino: null }),
}));
jest.mock('../../hooks/useEnviarUbicacionConductor', () => jest.fn());
jest.mock('../../services/servicioService', () => ({
    tomar: jest.fn(),
    finalizar: jest.fn(),
    cancelar: jest.fn(),
}));
jest.mock('../../services/conductorService', () => ({ cambiarEstado: jest.fn() }));
jest.mock('../../utils/geolocation', () => ({
    ...jest.requireActual('../../utils/geolocation'),
    geocodeAddress: jest.fn(),
    getRutaGoogleMaps: jest.fn(),
}));
jest.mock('../../components/Mapa', () => 'Mapa');
jest.mock('../../components/EstadoConductor', () => 'EstadoConductor');
jest.mock('../../components/ControlesServicio', () => 'ControlesServicio');
jest.mock('expo-av', () => ({
    Audio: {
        Sound: {
            createAsync: jest.fn().mockResolvedValue({
                sound: { playAsync: jest.fn(), unloadAsync: jest.fn() },
            }),
        },
    },
}));

const location = { latitude: -12, longitude: -77 };
const user = { dni: 12345678, unidad: 'U-01' };

const servicio = {
    idServicio: 77,
    nombreCliente: 'Ana',
    celular: '999888777',
    puntoPartida: 'Av. Siempre Viva 742',
    puntoLlegada: 'Plaza Mayor',
    precio: 25,
};

let clients;

// A fresh element on every call: React bails out of re-rendering an element
// that is referentially identical to the previous one.
const trackerTree = () => (
    <AuthContext.Provider value={{ user, login: jest.fn(), logout: jest.fn(), loading: false }}>
        <TrackerScreen />
    </AuthContext.Provider>
);

const renderTracker = () => render(trackerTree());

// The GPS watcher pushes a brand new location object roughly every 2 seconds.
const locationAt = (step) => ({
    latitude: -12 + step * 0.001,
    longitude: -77 + step * 0.001,
});

const servicioGuardado = {
    idServicio: 12,
    nombreCliente: 'Luis',
    celular: '911222333',
    puntoPartida: 'Jr. Union 100',
    puntoLlegada: 'Parque Kennedy',
    precio: 18,
};

describe('TrackerScreen', () => {
    beforeEach(() => {
        clients = [];
        Client.mockImplementation((config) => {
            const handlers = {};
            const client = {
                handlers,
                subscribe: jest.fn((destination, handler) => {
                    handlers[destination] = handler;
                }),
                activate: jest.fn(() => config.onConnect()),
                deactivate: jest.fn(),
            };
            clients.push(client);
            return client;
        });
        useLiveLocation.mockReturnValue({ location, loading: false, heading: 0 });
        geocodeAddress.mockResolvedValue(location);
        getRutaGoogleMaps.mockResolvedValue([]);
        AsyncStorage.getItem.mockResolvedValue(null);
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    const emitirServicio = async () => {
        await act(async () => {
            await clients[0].handlers['/topic/servicios']({ body: JSON.stringify(servicio) });
        });
    };

    it('shows the incoming ride offer coming from the socket', async () => {
        renderTracker();
        await emitirServicio();

        expect(screen.getByText('📢 Nuevo Servicio')).toBeOnTheScreen();
        expect(screen.getByText('Aceptar')).toBeOnTheScreen();
    });

    it('drops the pending offer when another driver takes the ride', async () => {
        renderTracker();
        await emitirServicio();

        await act(async () => {
            clients[0].handlers['/topic/servicio-tomado']({ body: String(servicio.idServicio) });
        });

        expect(screen.queryByText('Aceptar')).toBeNull();
        expect(screen.queryByText('📢 Nuevo Servicio')).toBeNull();
    });

    it('restores a stored ride with a single round of geocoding and route lookups', async () => {
        AsyncStorage.getItem.mockResolvedValue(JSON.stringify(servicioGuardado));
        const { rerender } = renderTracker();

        await waitFor(() => expect(getRutaGoogleMaps).toHaveBeenCalled());

        for (let step = 1; step <= 3; step++) {
            useLiveLocation.mockReturnValue({ location: locationAt(step), loading: false, heading: 0 });
            await act(async () => {
                rerender(trackerTree());
            });
        }

        expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
        expect(geocodeAddress).toHaveBeenCalledTimes(2);
        expect(getRutaGoogleMaps).toHaveBeenCalledTimes(2);
    });

    it('performs no lookup when there is no stored ride', async () => {
        const { rerender } = renderTracker();

        for (let step = 1; step <= 2; step++) {
            useLiveLocation.mockReturnValue({ location: locationAt(step), loading: false, heading: 0 });
            await act(async () => {
                rerender(trackerTree());
            });
        }

        expect(geocodeAddress).not.toHaveBeenCalled();
        expect(getRutaGoogleMaps).not.toHaveBeenCalled();
    });

    const estadoEnviado = () => useEnviarUbicacionConductor.mock.calls.at(-1)[0].estado;

    it('switches the driver to Ocupado when the ride is accepted', async () => {
        servicioService.tomar.mockResolvedValue(null);
        conductorService.cambiarEstado.mockResolvedValue(undefined);
        renderTracker();
        await emitirServicio();
        expect(estadoEnviado()).toBe('Activo');

        await act(async () => {
            fireEvent.press(screen.getByText('Aceptar'));
        });

        await waitFor(() => expect(estadoEnviado()).toBe('Ocupado'));
        expect(servicioService.tomar).toHaveBeenCalledWith(servicio.idServicio, user.dni);
        expect(conductorService.cambiarEstado).toHaveBeenCalledWith(user.dni, 'Ocupado');
    });

    it('keeps the driver status when the backend rejects the ride', async () => {
        servicioService.tomar.mockRejectedValue(Object.assign(new Error('Ya fue tomado'), { status: 409 }));
        renderTracker();
        await emitirServicio();

        await act(async () => {
            fireEvent.press(screen.getByText('Aceptar'));
        });

        await waitFor(() => expect(servicioService.tomar).toHaveBeenCalled());
        expect(conductorService.cambiarEstado).not.toHaveBeenCalled();
        expect(estadoEnviado()).toBe('Activo');
    });

    it('still switches to Ocupado locally when saving the status on the backend fails', async () => {
        servicioService.tomar.mockResolvedValue(null);
        conductorService.cambiarEstado.mockRejectedValue(new Error('Network'));
        renderTracker();
        await emitirServicio();

        await act(async () => {
            fireEvent.press(screen.getByText('Aceptar'));
        });

        // The 8 s location update carries the status, so the backend catches up.
        await waitFor(() => expect(estadoEnviado()).toBe('Ocupado'));
    });

    it('lets the driver accept the next ride after a previous one was taken', async () => {
        renderTracker();
        await emitirServicio();
        await act(async () => {
            clients[0].handlers['/topic/servicio-tomado']({ body: String(servicio.idServicio) });
        });

        const siguiente = { ...servicio, idServicio: 78, nombreCliente: 'Rosa' };
        await act(async () => {
            await clients[0].handlers['/topic/servicios']({ body: JSON.stringify(siguiente) });
        });

        expect(screen.getByText('Aceptar')).toBeOnTheScreen();
        expect(screen.queryByText('⚠️ Este servicio ya fue tomado por otro conductor.')).toBeNull();
    });
});
