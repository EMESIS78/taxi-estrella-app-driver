// components/Mapa.jsx
import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { FontAwesome } from '@expo/vector-icons';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { darkMapStyle } from '../../constants/MapStyles';

// Expo Go ships its own Google Maps key, so the map works there without
// configuration. An own build needs GOOGLE_MAPS_ANDROID_KEY (see app.config.js).
const isMapsEnabled = () =>
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
    Constants.expoConfig?.extra?.mapsEnabled === true;

const Mapa = ({
    location,
    heading,
    mapRef,
    darkMode,
    iconColor,
    rutaACamino,
    rutaServicio,
    partidaCoords,
    destinoCoords,
    servicioActivo
}) => {
    const rotacionActiva = Boolean(servicioActivo) || rutaACamino.length > 0 || rutaServicio.length > 0;

    useEffect(() => {
        if (location && mapRef?.current) {
            mapRef.current.animateCamera({
                center: location,
                heading: rotacionActiva ? heading : 0,
                pitch: 0,
                zoom: 17,
            }, { duration: 1000 });
        }
    }, [location, heading, rotacionActiva]);

    if (!isMapsEnabled()) {
        const textColor = darkMode ? '#ecf0f1' : '#2c3e50';
        return (
            <View style={[styles.placeholder, { backgroundColor: darkMode ? '#2c3e50' : '#ecf0f1' }]}>
                <FontAwesome name="map-o" size={48} color={textColor} />
                <Text style={[styles.placeholderTitle, { color: textColor }]}>Aquí va el mapa</Text>
                <Text style={[styles.placeholderSubtitle, { color: textColor }]}>
                    Falta configurar GOOGLE_MAPS_ANDROID_KEY
                </Text>
            </View>
        );
    }

    return (
        <MapView
            ref={mapRef}
            rotateEnabled={rotacionActiva}
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
                rotation={rotacionActiva ? heading : 0}
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
    placeholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    placeholderTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 12,
    },
    placeholderSubtitle: {
        fontSize: 12,
        marginTop: 4,
        opacity: 0.8,
    },
});

export default Mapa;
