import { act, renderHook } from '@testing-library/react-native';
import { Client } from '@stomp/stompjs';
import { useServicioSocket } from '../useServicioSocket';
import SockJS from 'sockjs-client';
import { geocodeAddress } from '../../services/googleMapsService';
import { getToken } from '../../services/tokenStore';

jest.mock('sockjs-client', () => jest.fn());
jest.mock('@stomp/stompjs', () => ({ Client: jest.fn() }));
jest.mock('../../services/tokenStore', () => ({ getToken: jest.fn() }));
jest.mock('../../services/googleMapsService', () => ({ geocodeAddress: jest.fn() }));

// The GPS watcher pushes a brand new location object roughly every 2 seconds.
const locationAt = (step) => ({
    latitude: -12 + step * 0.001,
    longitude: -77 + step * 0.001,
});

let clients;

const fakeClient = (config) => {
    const handlers = {};
    return {
        config,
        handlers,
        subscribe: jest.fn((destination, handler) => {
            handlers[destination] = handler;
        }),
        activate: jest.fn(() => config.onConnect()),
        deactivate: jest.fn(),
    };
};

const renderSocket = (initialProps, setNuevoServicio, setServicioTomado) =>
    renderHook(
        ({ location, nuevoServicio }) =>
            useServicioSocket(location, setNuevoServicio, nuevoServicio, setServicioTomado),
        { initialProps }
    );

describe('useServicioSocket', () => {
    beforeEach(() => {
        clients = [];
        Client.mockImplementation((config) => {
            const client = fakeClient(config);
            clients.push(client);
            return client;
        });
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
        Client.mockReset();
    });

    it('opens a single connection across several location updates', () => {
        const { rerender } = renderSocket(
            { location: locationAt(0), nuevoServicio: null },
            jest.fn(),
            jest.fn()
        );

        for (let step = 1; step <= 4; step++) {
            rerender({ location: locationAt(step), nuevoServicio: null });
        }

        expect(Client).toHaveBeenCalledTimes(1);
        expect(clients[0].activate).toHaveBeenCalledTimes(1);
        expect(clients[0].deactivate).not.toHaveBeenCalled();
    });

    it('clears the pending offer when another driver takes it, on that same connection', () => {
        const setNuevoServicio = jest.fn();
        const setServicioTomado = jest.fn();
        const { rerender } = renderSocket(
            { location: locationAt(0), nuevoServicio: null },
            setNuevoServicio,
            setServicioTomado
        );

        rerender({ location: locationAt(1), nuevoServicio: { idServicio: 77 } });

        expect(Client).toHaveBeenCalledTimes(1);
        act(() => {
            clients[0].handlers['/topic/servicio-tomado']({ body: '77' });
        });

        expect(setNuevoServicio).toHaveBeenCalledWith(null);
        expect(setServicioTomado).toHaveBeenCalledWith(true);
    });

    it('ignores a servicio-tomado notification for a different ride', () => {
        const setNuevoServicio = jest.fn();
        const setServicioTomado = jest.fn();
        const { rerender } = renderSocket(
            { location: locationAt(0), nuevoServicio: null },
            setNuevoServicio,
            setServicioTomado
        );

        rerender({ location: locationAt(1), nuevoServicio: { idServicio: 77 } });
        act(() => {
            clients[0].handlers['/topic/servicio-tomado']({ body: '99' });
        });

        expect(setNuevoServicio).not.toHaveBeenCalled();
        expect(setServicioTomado).not.toHaveBeenCalled();
    });

    it('offers a nearby ride measured against the latest location', async () => {
        const setNuevoServicio = jest.fn();
        geocodeAddress.mockResolvedValue(locationAt(4));
        const { rerender } = renderSocket(
            { location: locationAt(0), nuevoServicio: null },
            setNuevoServicio,
            jest.fn()
        );

        rerender({ location: locationAt(4), nuevoServicio: null });

        const servicio = { idServicio: 5, puntoPartida: 'Av. Siempre Viva 742' };
        await act(async () => {
            await clients[0].handlers['/topic/servicios']({ body: JSON.stringify(servicio) });
        });

        expect(geocodeAddress).toHaveBeenCalledWith('Av. Siempre Viva 742');
        expect(setNuevoServicio).toHaveBeenCalledWith(servicio);
    });

    it('ignores a ride further than 3 km away', async () => {
        const setNuevoServicio = jest.fn();
        geocodeAddress.mockResolvedValue({ latitude: -12.5, longitude: -77.5 });
        renderSocket({ location: locationAt(0), nuevoServicio: null }, setNuevoServicio, jest.fn());

        await act(async () => {
            await clients[0].handlers['/topic/servicios']({
                body: JSON.stringify({ idServicio: 6, puntoPartida: 'Lejos 1' }),
            });
        });

        expect(setNuevoServicio).not.toHaveBeenCalled();
    });

    it('sends the current JWT as the Authorization header of every STOMP CONNECT', async () => {
        getToken.mockReturnValue('jwt-first');
        renderSocket({ location: locationAt(0), nuevoServicio: null }, jest.fn(), jest.fn());
        const client = clients[0];

        await client.config.beforeConnect(client);
        expect(client.connectHeaders).toEqual({ Authorization: 'Bearer jwt-first' });

        // A reconnection after the token changed picks up the new token.
        getToken.mockReturnValue('jwt-second');
        await client.config.beforeConnect(client);
        expect(client.connectHeaders).toEqual({ Authorization: 'Bearer jwt-second' });
    });

    it('never logs the JWT when STOMP debug prints the CONNECT frame', () => {
        renderSocket({ location: locationAt(0), nuevoServicio: null }, jest.fn(), jest.fn());
        const { debug } = clients[0].config;

        expect(typeof debug).toBe('function');
        debug('>>> CONNECT\nAuthorization:Bearer jwt-secret\naccept-version:1.2\n\n');

        const logged = console.log.mock.calls.flat().join(' ');
        expect(logged).not.toContain('jwt-secret');
    });

    it('opens a fresh SockJS transport on each connection attempt', () => {
        renderSocket({ location: locationAt(0), nuevoServicio: null }, jest.fn(), jest.fn());
        const { webSocketFactory } = clients[0].config;

        webSocketFactory();
        webSocketFactory();

        expect(SockJS).toHaveBeenCalledTimes(2);
        expect(SockJS).toHaveBeenCalledWith(expect.stringMatching(/\/ws$/));
    });

    it('closes the connection on unmount', () => {
        const { unmount } = renderSocket(
            { location: locationAt(0), nuevoServicio: null },
            jest.fn(),
            jest.fn()
        );

        unmount();

        expect(clients[0].deactivate).toHaveBeenCalledTimes(1);
    });
});
