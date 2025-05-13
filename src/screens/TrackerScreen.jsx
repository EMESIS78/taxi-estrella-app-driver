import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, useColorScheme } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { AuthContext } from '../context/Authcontext';
import { FontAwesome } from '@expo/vector-icons';
import EstadoConductor from '../components/EstadoConductor';
import { darkMapStyle } from '../../constants/MapStyles';

const estados = [
    { nombre: 'Activo', color: 'green' },
    { nombre: 'Ocupado', color: 'red' },
    { nombre: 'ServicioCalle', color: 'blue' },
    { nombre: 'ServicioPeligro', color: 'orange' },
];

const TrackerScreen = () => {
    const { user } = useContext(AuthContext);
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [estadoActual, setEstadoActual] = useState('Activo');
    const theme = useColorScheme();

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.log('Permiso de ubicación denegado');
                setLoading(false);
                return;
            }

            try {
                const currentLocation = await Location.getCurrentPositionAsync({});
                setLocation(currentLocation.coords);
            } catch (err) {
                console.error('Error obteniendo ubicación:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const iconColor = estados.find(e => e.nombre === estadoActual)?.color || 'gray';

    return (
        <View style={styles.container}>
            <Text style={styles.welcome}>Hola, {user?.nombre}</Text>
            {loading ? (
                <ActivityIndicator size="large" style={{ marginTop: 20 }} />
            ) : location ? (
                <MapView
                    style={styles.map}
                    initialRegion={{
                        latitude: location.latitude,
                        longitude: location.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    }}
                    customMapStyle={theme === 'dark' ? darkMapStyle : []} // 👈 Aquí aplicas estilo según tema
                    showsMyLocationButton
                >
                    <Marker coordinate={location}>
                        <FontAwesome name="car" size={36} color={iconColor} />
                    </Marker>
                </MapView>
            ) : (
                <Text style={{ textAlign: 'center', marginTop: 20 }}>
                    No se pudo obtener tu ubicación
                </Text>
            )}
            <EstadoConductor onEstadoChange={setEstadoActual} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    welcome: { textAlign: 'center', marginTop: 20, fontSize: 16 },
    map: { flex: 1, marginTop: 10 },
});

export default TrackerScreen;

