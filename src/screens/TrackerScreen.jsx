import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, useColorScheme } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { AuthContext } from '../context/Authcontext';
import { FontAwesome } from '@expo/vector-icons';
import EstadoConductor from '../components/EstadoConductor';
import { darkMapStyle } from '../../constants/MapStyles';
import {API_URL} from '@env';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

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
    const estado = estadoActual;

useEffect(() => {
    const socket = new SockJS('http://192.168.0.33:8080/ws'); // Asegúrate de que esté accesible desde el dispositivo físico
    const stompClient = new Client({
        webSocketFactory: () => socket,
        debug: (str) => console.log('[STOMP]', str),
        reconnectDelay: 5000, // Reintento automático cada 5 segundos
        onConnect: () => {
            console.log('📡 Conectado al WebSocket');
            stompClient.subscribe('/topic/servicios', (messageOutput) => {
                const nuevoServicio = JSON.parse(messageOutput.body);
                console.log("📍 Servicio recibido:", nuevoServicio);
                
            });
        },
        onStompError: (frame) => {
            console.error('💥 Error STOMP:', frame.headers['message']);
            console.error('Detalles:', frame.body);
        },
    });

    stompClient.activate(); // Importante para iniciar la conexión

    return () => {
        stompClient.deactivate(); // Limpia cuando el componente se desmonta
    };
}, []);

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

    // Actualiza la ubicación cada 10 segundos
    useEffect(() => {
        const interval = setInterval(async () => {
            if (location) {
                const response = await fetch(`${API_URL}/conductor/actualizarUbicacionConductor`, {
                    method: 'PUT', // Usar PUT para actualizar
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        idConductor: user?.dni, // Asegúrate de tener el ID del conductor
                        estado: estado,
                        unidad: user?.unidad,
                        latitud: location.latitude,
                        longitud: location.longitude,
                    }),
                });

                if (response.ok) {
                    console.log("idconductor: ", user.dni);
                    console.log("estado: ", estadoActual);
                    console.log("unidad: ", user.unidad);
                    console.log('Ubicación enviada correctamente');
                } else {
                    console.error('Error enviando ubicación');
                }
            }
        }, 8000); // 5000 ms = 5 segundos

        return () => clearInterval(interval); // Limpiar interval cuando el componente se desmonta
    }, [location, user, estadoActual]);


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

