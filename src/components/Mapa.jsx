// components/Mapa.jsx
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { FontAwesome } from '@expo/vector-icons';
import { darkMapStyle } from '../../constants/MapStyles';

const Mapa = ({
    location,
    heading,
    mapRef,
    darkMode,
    iconColor,
    rutaACamino,
    rutaServicio,
    partidaCoords,
    destinoCoords
}) => {
    useEffect(() => {
        if (location && mapRef?.current) {
            mapRef.current.animateCamera({
                center: location,
                pitch: 0,
                zoom: 17,
            }, { duration: 1000 });
        }
    }, [location, heading]);

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
            <Marker
                coordinate={location}
                anchor={{ x: 0.5, y: 0.5 }}
                rotation={0}  // 👈 Dejas el marcador sin rotación, porque el mapa ya rota
                flat={true}
            >
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
