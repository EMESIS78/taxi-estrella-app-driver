import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, useColorScheme, TouchableOpacity, Linking, Platform } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { AuthContext } from '../context/Authcontext';
import { FontAwesome } from '@expo/vector-icons';
import { useLiveLocation } from '../hooks/useLiveLocation';
import { useServicioSocket } from '../hooks/useServicioSocket';
import useEnviarUbicacionConductor from '../hooks/useEnviarUbicacionConductor';
import { geocodeAddress, getRutaGoogleMaps } from '../utils/geolocation';
import { elegirAppNavegacion } from '../utils/navigationUtils';
import EstadoConductor from '../components/EstadoConductor';
import { darkMapStyle } from '../../constants/MapStyles';
import AlertaServicio from '../components/AlertaServicio';

const TrackerScreen = () => {
    const { user } = useContext(AuthContext);
    const [estadoActual, setEstadoActual] = useState('Activo');
    const [nuevoServicio, setNuevoServicio] = useState(null);
    const [rutaACamino, setRutaACamino] = useState([]);
    const [rutaServicio, setRutaServicio] = useState([]);
    const [partidaCoords, setPartidaCoords] = useState(null);
    const [destinoCoords, setDestinoCoords] = useState(null);
    const [mostrarBotonRuta, setMostrarBotonRuta] = useState(false);

    const { location, loading } = useLiveLocation();
    useServicioSocket(location, setNuevoServicio);
    useEnviarUbicacionConductor({ location, user, estado: estadoActual });

    const iniciarRutaAPartida = () => {
        if (location && partidaCoords) {
            const origin = `${location.latitude},${location.longitude}`;
            const destination = `${partidaCoords.latitude},${partidaCoords.longitude}`;
            elegirAppNavegacion(origin, destination);
        }
    };

    const iniciarRutaAlDestino = () => {
        if (partidaCoords && destinoCoords) {
            const origin = `${partidaCoords.latitude},${partidaCoords.longitude}`;
            const destination = `${destinoCoords.latitude},${destinoCoords.longitude}`;
            elegirAppNavegacion(origin, destination);
        }
    };

    const aceptarServicio = async () => {
        try {
            const partida = await geocodeAddress(nuevoServicio.puntoPartida);
            const destino = await geocodeAddress(nuevoServicio.puntoLlegada);
            setPartidaCoords(partida);
            setDestinoCoords(destino);

            const ruta1 = await getRutaGoogleMaps(location, partida);
            setRutaACamino(ruta1);

            const ruta2 = await getRutaGoogleMaps(partida, destino);
            setRutaServicio(ruta2);

            setMostrarBotonRuta(true);
        } catch (err) {
            console.error(err);
        } finally {
            setNuevoServicio(null);
        }
    };

    const iconColor = {
        Activo: 'green',
        Ocupado: 'red',
        ServicioCalle: 'blue',
        ServicioPeligro: 'orange',
    }[estadoActual] || 'gray';

    return (
        <View style={styles.container}>
            <Text style={styles.welcome}>Hola, {user?.nombre}</Text>
            {loading ? (
                <ActivityIndicator size="large" />
            ) : (
                <MapView
                    style={styles.map}
                    initialRegion={{
                        latitude: location.latitude,
                        longitude: location.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    }}
                    customMapStyle={darkMapStyle}
                    showsMyLocationButton
                >
                    <Marker coordinate={location}>
                        <FontAwesome name="car" size={36} color={iconColor} />
                    </Marker>
                    {partidaCoords && <Marker coordinate={partidaCoords} pinColor="blue" />}
                    {destinoCoords && <Marker coordinate={destinoCoords} pinColor="green" />}
                    {rutaACamino.length > 0 && <Polyline coordinates={rutaACamino} strokeColor="#2980b9" strokeWidth={4} />}
                    {rutaServicio.length > 0 && <Polyline coordinates={rutaServicio} strokeColor="#f39c12" strokeWidth={4} />}
                </MapView>
            )}

            {mostrarBotonRuta && (
                <View style={styles.botonesFlotantes}>
                    <TouchableOpacity onPress={iniciarRutaAPartida} style={styles.botonSecundario}>
                        <Text style={styles.botonTexto}>Ruta a la Partida</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={iniciarRutaAlDestino} style={styles.botonNavegar}>
                        <Text style={styles.botonTexto}>Ruta al Destino</Text>
                    </TouchableOpacity>
                </View>
            )}

            <EstadoConductor onEstadoChange={setEstadoActual} />
            <AlertaServicio servicio={nuevoServicio} onClose={() => setNuevoServicio(null)} onAceptar={aceptarServicio} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    welcome: { textAlign: 'center', marginTop: 20, fontSize: 16 },
    map: { flex: 1, marginTop: 10 },
    botonNavegar: {
        backgroundColor: '#2ecc71',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    botonTexto: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    botonSecundario: {
        backgroundColor: '#3498db',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    botonesFlotantes: {
        position: 'absolute',
        bottom: 200, // justo arriba del EstadoConductor
        left: 20,
        right: 20,
        zIndex: 10,
        gap: 10,
    },
});

export default TrackerScreen;