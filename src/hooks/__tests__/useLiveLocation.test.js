import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { useLiveLocation } from '../useLiveLocation';
import { calcularBearing } from '../../utils/geolocation';

jest.mock('expo-location', () => ({
    requestForegroundPermissionsAsync: jest.fn(),
    watchPositionAsync: jest.fn(),
    Accuracy: { High: 4 },
}));

const coordsOf = (latitude, longitude) => ({ coords: { latitude, longitude } });

let emitirPosicion;
let remove;

const renderLiveLocation = async () => {
    const rendered = renderHook(() => useLiveLocation());
    await waitFor(() => expect(Location.watchPositionAsync).toHaveBeenCalled());
    return rendered;
};

describe('useLiveLocation', () => {
    beforeEach(() => {
        remove = jest.fn();
        emitirPosicion = undefined;
        Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
        Location.watchPositionAsync.mockImplementation(async (options, callback) => {
            emitirPosicion = callback;
            return { remove };
        });
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    it('computes a non-zero heading from two successive positions', async () => {
        const { result } = await renderLiveLocation();

        act(() => {
            emitirPosicion(coordsOf(-12, -77));
        });
        act(() => {
            emitirPosicion(coordsOf(-12, -76.99));
        });

        const esperado = calcularBearing(
            { latitude: -12, longitude: -77 },
            { latitude: -12, longitude: -76.99 }
        );
        expect(esperado).not.toBe(0);
        expect(result.current.heading).toBeCloseTo(esperado);
    });

    it('keeps the heading at zero for the very first position', async () => {
        const { result } = await renderLiveLocation();

        act(() => {
            emitirPosicion(coordsOf(-12, -77));
        });

        expect(result.current.heading).toBe(0);
        expect(result.current.location).toEqual({ latitude: -12, longitude: -77 });
    });

    it('exposes the latest position and stops loading', async () => {
        const { result } = await renderLiveLocation();

        act(() => {
            emitirPosicion(coordsOf(-12, -77));
        });
        act(() => {
            emitirPosicion(coordsOf(-12.5, -77.5));
        });

        expect(result.current.location).toEqual({ latitude: -12.5, longitude: -77.5 });
        await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it('stops loading without a location when the permission is denied', async () => {
        Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });
        const { result } = renderHook(() => useLiveLocation());

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.location).toBeNull();
        expect(Location.watchPositionAsync).not.toHaveBeenCalled();
    });

    it('removes the subscription on unmount', async () => {
        const { unmount } = await renderLiveLocation();

        unmount();

        expect(remove).toHaveBeenCalledTimes(1);
    });
});
