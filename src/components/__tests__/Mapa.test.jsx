import React from 'react';
import { render, screen } from '@testing-library/react-native';
import Constants from 'expo-constants';
import Mapa from '../Mapa';

jest.mock('expo-constants', () => ({
    __esModule: true,
    default: { executionEnvironment: 'standalone', expoConfig: { extra: {} } },
    ExecutionEnvironment: { Bare: 'bare', Standalone: 'standalone', StoreClient: 'storeClient' },
}));

jest.mock('react-native-maps', () => {
    const { useImperativeHandle } = require('react');
    const { View } = require('react-native');
    const MapView = ({ ref, children }) => {
        useImperativeHandle(ref, () => ({ animateCamera: jest.fn() }));
        return <View testID="map-view">{children}</View>;
    };
    return { __esModule: true, default: MapView, Marker: () => null, Polyline: () => null };
});

const props = {
    location: { latitude: -16.42, longitude: -71.56 },
    heading: 0,
    mapRef: { current: null },
    darkMode: false,
    iconColor: 'green',
    rutaACamino: [],
    rutaServicio: [],
    partidaCoords: null,
    destinoCoords: null,
    servicioActivo: null,
};

const setEntorno = (executionEnvironment, mapsEnabled) => {
    Constants.executionEnvironment = executionEnvironment;
    Constants.expoConfig = { extra: { mapsEnabled } };
};

describe('Mapa', () => {
    it('shows the real map in Expo Go even without GOOGLE_MAPS_ANDROID_KEY', () => {
        setEntorno('storeClient', false);

        render(<Mapa {...props} />);

        expect(screen.getByTestId('map-view')).toBeOnTheScreen();
        expect(screen.queryByText('Aquí va el mapa')).toBeNull();
    });

    it('shows the placeholder in an own build without GOOGLE_MAPS_ANDROID_KEY', () => {
        setEntorno('standalone', false);

        render(<Mapa {...props} />);

        expect(screen.getByText('Aquí va el mapa')).toBeOnTheScreen();
        expect(screen.queryByTestId('map-view')).toBeNull();
    });

    it('shows the real map in an own build that has the key', () => {
        setEntorno('standalone', true);

        render(<Mapa {...props} />);

        expect(screen.getByTestId('map-view')).toBeOnTheScreen();
    });
});
