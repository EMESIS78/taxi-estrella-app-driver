// components/Mapa.jsx
import React from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { FontAwesome } from '@expo/vector-icons';
import { darkMapStyle } from '../../constants/MapStyles';

const Mapa = ({
    location,
    mapRef,
    darkMode,
    iconColor,
    rutaACamino,
    rutaServicio,
    partidaCoords,
    destinoCoords
}) => {
    return (
        <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }}
            customMapStyle={darkMode ? darkMapStyle : []}
            showsMyLocationButton
        >
            <Marker coordinate={location}>
                <FontAwesome name="car" size={36} color={iconColor} />
            </Marker>
            {partidaCoords && <Marker coordinate={partidaCoords} pinColor="blue" />}
            {destinoCoords && <Marker coordinate={destinoCoords} pinColor="green" />}
            {rutaACamino.length > 0 && (
                <Polyline coordinates={rutaACamino} strokeColor="#2980b9" strokeWidth={4} />
            )}
            {rutaServicio.length > 0 && (
                <Polyline coordinates={rutaServicio} strokeColor="#f39c12" strokeWidth={4} />
            )}
        </MapView>
    );
};

const styles = StyleSheet.create({
    map: {
        flex: 1,
    },
});

export default Mapa;
