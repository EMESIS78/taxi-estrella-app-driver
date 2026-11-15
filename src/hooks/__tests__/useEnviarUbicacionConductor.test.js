import { act, renderHook } from '@testing-library/react-native';
import useEnviarUbicacionConductor from '../useEnviarUbicacionConductor';

const user = { dni: 12345678, unidad: 'U-01' };

// The GPS watcher pushes a brand new location object roughly every 2 seconds.
const locationAt = (step) => ({
    latitude: -12 + step * 0.001,
    longitude: -77 + step * 0.001,
});

const parseBody = (call) => JSON.parse(call[1].body);

describe('useEnviarUbicacionConductor', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        global.fetch = jest.fn().mockResolvedValue({ ok: true });
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
        delete global.fetch;
    });

    it('sends the latest coordinates when the 8s interval fires while the location keeps changing', () => {
        const { rerender } = renderHook((props) => useEnviarUbicacionConductor(props), {
            initialProps: { location: locationAt(0), user, estado: 'Activo' },
        });

        for (let step = 1; step <= 4; step++) {
            rerender({ location: locationAt(step), user, estado: 'Activo' });
            act(() => {
                jest.advanceTimersByTime(2000);
            });
        }

        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(parseBody(global.fetch.mock.calls[0])).toEqual({
            idConductor: user.dni,
            estado: 'Activo',
            unidad: user.unidad,
            latitud: locationAt(4).latitude,
            longitud: locationAt(4).longitude,
        });
    });

    it('reports the current driver state after it changes', () => {
        const { rerender } = renderHook((props) => useEnviarUbicacionConductor(props), {
            initialProps: { location: locationAt(0), user, estado: 'Activo' },
        });

        rerender({ location: locationAt(1), user, estado: 'Ocupado' });
        act(() => {
            jest.advanceTimersByTime(8000);
        });

        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(parseBody(global.fetch.mock.calls[0]).estado).toBe('Ocupado');
    });

    it('does not call the API while there is no location or no user', () => {
        renderHook((props) => useEnviarUbicacionConductor(props), {
            initialProps: { location: null, user: null, estado: 'Activo' },
        });

        act(() => {
            jest.advanceTimersByTime(24000);
        });

        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('stops the interval on unmount', () => {
        const { unmount } = renderHook((props) => useEnviarUbicacionConductor(props), {
            initialProps: { location: locationAt(0), user, estado: 'Activo' },
        });

        unmount();
        act(() => {
            jest.advanceTimersByTime(24000);
        });

        expect(global.fetch).not.toHaveBeenCalled();
    });
});
