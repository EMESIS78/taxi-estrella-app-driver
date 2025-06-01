import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, useColorScheme } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { AuthContext } from '../context/Authcontext';
import { FontAwesome } from '@expo/vector-icons';
import EstadoConductor from '../components/EstadoConductor';
import { darkMapStyle } from '../../constants/MapStyles';
import { API_URL, GOOGLE_API_KEY } from '@env';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import AlertaServicio from '../components/AlertaServicio';
import Geocoder from 'react-native-geocoding';
import polyline from '@mapbox/polyline';

const estados = [
    { nombre: 'Activo', color: 'green' },
    { nombre: 'Ocupado', color: 'red' },
    { nombre: 'ServicioCalle', color: 'blue' },
    { nombre: 'ServicioPeligro', color: 'orange' },
];

Geocoder.init(GOOGLE_API_KEY);

const TrackerScreen = () => {
    const { user } = useContext(AuthContext);
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [estadoActual, setEstadoActual] = useState('Activo');
    const theme = useColorScheme();
    const estado = estadoActual;
    const [nuevoServicio, setNuevoServicio] = useState(null);
    const [puntoPartida, setPuntoPartida] = useState(null);
    const [puntoDestino, setPuntoDestino] = useState(null);
    const [rutaCoords, setRutaCoords] = useState([]);
    const [partidaCoords, setPartidaCoords] = useState(null);
    const [destinoCoords, setDestinoCoords] = useState(null);

    useEffect(() => {
        const socket = new SockJS('http://192.168.0.86:8080/ws'); // Asegúrate de que esté accesible desde el dispositivo físico
        const stompClient = new Client({
            webSocketFactory: () => socket,
            debug: (str) => console.log('[STOMP]', str),
            reconnectDelay: 5000, // Reintento automático cada 5 segundos
            onConnect: () => {
                console.log('📡 Conectado al WebSocket');
                stompClient.subscribe('/topic/servicios', (messageOutput) => {
                    const servicio = JSON.parse(messageOutput.body);
                    console.log("📍 Servicio recibido:", servicio);
                    setNuevoServicio(servicio);
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

    const geocodeAddress = async (address) => {
        try {
            const json = await Geocoder.from(address);
            const location = json.results[0].geometry.location;
            return {
                latitude: location.lat,
                longitude: location.lng,
            };
        } catch (error) {
            console.error("Error geocodificando dirección:", error);
            throw error;
        }
    };

    const getRutaGoogleMaps = async (origen, destino) => {
        const origin = `${origen.latitude},${origen.longitude}`;
        const destination = `${destino.latitude},${destino.longitude}`;
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${GOOGLE_API_KEY}`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.routes.length) {
                const points = polyline.decode(data.routes[0].overview_polyline.points);
                const coords = points.map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
                return coords;
            } else {
                console.error("No se encontró ruta");
                return [];
            }
        } catch (error) {
            console.error("Error obteniendo ruta:", error);
            return [];
        }
    };

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
                    customMapStyle={theme === 'dark' ? darkMapStyle : []}
                    showsMyLocationButton
                >
                    <Marker coordinate={location}>
                        <FontAwesome name="car" size={36} color={iconColor} />
                    </Marker>

                    {partidaCoords && (
                        <Marker coordinate={partidaCoords} title="Punto de Partida" pinColor="blue" />
                    )}

                    {destinoCoords && (
                        <Marker coordinate={destinoCoords} title="Destino" pinColor="green" />
                    )}

                    {partidaCoords && (
                        <Polyline
                            coordinates={rutaCoords}
                            strokeColor="#2980b9"
                            strokeWidth={4}
                        />
                    )}
                </MapView>
            ) : (
                <Text style={{ textAlign: 'center', marginTop: 20 }}>
                    No se pudo obtener tu ubicación
                </Text>
            )}
            <EstadoConductor onEstadoChange={setEstadoActual} />
            <AlertaServicio
                servicio={nuevoServicio}
                onClose={() => setNuevoServicio(null)}
                onAceptar={async () => {
                    try {
                        const partida = await geocodeAddress(nuevoServicio.puntoPartida);
                        const destino = await geocodeAddress(nuevoServicio.puntoLlegada);
                        setPartidaCoords(partida);
                        setDestinoCoords(destino);

                        const ruta = await getRutaGoogleMaps(location, partida); // 👉 Ruta real desde ubicación hasta punto de partida
                        setRutaCoords(ruta);
                    } catch (err) {
                        console.error(err);
                    } finally {
                        setNuevoServicio(null);
                    }
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    welcome: { textAlign: 'center', marginTop: 20, fontSize: 16 },
    map: { flex: 1, marginTop: 10 },
});

export default TrackerScreen;

