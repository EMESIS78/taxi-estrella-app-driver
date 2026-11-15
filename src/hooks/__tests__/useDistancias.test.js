import { act, renderHook } from '@testing-library/react-native';
import { useDistancias } from '../useDistancias';
import { calcularDistanciaKm } from '../../utils/geolocation';

const partidaCoords = { latitude: -12.05, longitude: -77.05 };
const destinoCoords = { latitude: -12.1, longitude: -77.1 };

// The GPS watcher pushes a brand new location object roughly every 2 seconds.
const locationAt = (step) => ({
    latitude: -12 + step * 0.001,
    longitude: -77 + step * 0.001,
});

const renderDistancias = (initialProps) =>
    renderHook(
        ({ location, navegacionActiva }) =>
            useDistancias(location, partidaCoords, destinoCoords, navegacionActiva),
        { initialProps }
    );

describe('useDistancias', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('updates both distances after the 4s interval fires while the location keeps changing', () => {
        const { result, rerender } = renderDistancias({
            location: locationAt(0),
            navegacionActiva: true,
        });

        expect(result.current.distanciaAPartida).toBeNull();

        for (let step = 1; step <= 2; step++) {
            rerender({ location: locationAt(step), navegacionActiva: true });
            act(() => {
                jest.advanceTimersByTime(2000);
            });
        }

        expect(result.current.distanciaAPartida).toBeCloseTo(
            calcularDistanciaKm(locationAt(2), partidaCoords)
        );
        expect(result.current.distanciaADestino).toBeCloseTo(
            calcularDistanciaKm(locationAt(2), destinoCoords)
        );
    });

    it('keeps recomputing the distances on every interval tick as the driver moves', () => {
        const { result, rerender } = renderDistancias({
            location: locationAt(0),
            navegacionActiva: true,
        });

        for (let step = 1; step <= 4; step++) {
            rerender({ location: locationAt(step), navegacionActiva: true });
            act(() => {
                jest.advanceTimersByTime(2000);
            });
        }

        expect(result.current.distanciaAPartida).toBeCloseTo(
            calcularDistanciaKm(locationAt(4), partidaCoords)
        );
    });

    it('does not compute distances while navigation is not active', () => {
        const { result } = renderDistancias({
            location: locationAt(0),
            navegacionActiva: false,
        });

        act(() => {
            jest.advanceTimersByTime(20000);
        });

        expect(result.current.distanciaAPartida).toBeNull();
        expect(result.current.distanciaADestino).toBeNull();
    });

    it('does not compute distances while there is no location', () => {
        const { result } = renderDistancias({ location: null, navegacionActiva: true });

        act(() => {
            jest.advanceTimersByTime(20000);
        });

        expect(result.current.distanciaAPartida).toBeNull();
        expect(result.current.distanciaADestino).toBeNull();
    });
});
