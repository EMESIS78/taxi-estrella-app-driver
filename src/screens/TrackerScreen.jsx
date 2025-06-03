import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, useColorScheme, ActivityIndicator, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { AuthContext } from '../context/Authcontext';
import { API_URL } from '@env';
import { FontAwesome } from '@expo/vector-icons';
import { useLiveLocation } from '../hooks/useLiveLocation';
import { useServicioSocket } from '../hooks/useServicioSocket';
import useEnviarUbicacionConductor from '../hooks/useEnviarUbicacionConductor';
import { geocodeAddress, getRutaGoogleMaps } from '../utils/geolocation';
import { elegirAppNavegacion } from '../utils/navigationUtils';
import EstadoConductor from '../components/EstadoConductor';
import { darkMapStyle } from '../../constants/MapStyles';
import AlertaServicio from '../components/AlertaServicio';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TrackerScreen = () => {
    const { user } = useContext(AuthContext);
    const [estadoActual, setEstadoActual] = useState('Activo');
    const [servicioActivo, setServicioActivo] = useState(null);
    const [nuevoServicio, setNuevoServicio] = useState(null);
    const [rutaACamino, setRutaACamino] = useState([]);
    const theme = useColorScheme();
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
            const response = await fetch(`${API_URL}/conductor/tomarServicioWeb`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    idRegistro: nuevoServicio.idServicio,
                    idConductor: user?.dni,
                    estadoInforme: 'Aceptado',
                }),
            });

            if (!response.ok) {
                console.error('❌ Error al aceptar el servicio');
                return;
            }

            const partida = await geocodeAddress(nuevoServicio.puntoPartida);
            const destino = await geocodeAddress(nuevoServicio.puntoLlegada);
            setPartidaCoords(partida);
            setDestinoCoords(destino);

            const ruta1 = await getRutaGoogleMaps(location, partida);
            setRutaACamino(ruta1);

            const ruta2 = await getRutaGoogleMaps(partida, destino);
            setRutaServicio(ruta2);

            setMostrarBotonRuta(true);
            setServicioActivo(nuevoServicio);

            await AsyncStorage.setItem('servicioActivo', JSON.stringify(nuevoServicio));
        } catch (err) {
            console.error('❌ Error procesando el servicio:', err);
        } finally {
            setNuevoServicio(null);
        }
    };

    useEffect(() => {
        const restaurarServicio = async () => {
            const guardado = await AsyncStorage.getItem('servicioActivo');
            if (guardado) {
                const servicio = JSON.parse(guardado);
                setServicioActivo(servicio);

                const partida = await geocodeAddress(servicio.puntoPartida);
                const destino = await geocodeAddress(servicio.puntoLlegada);
                setPartidaCoords(partida);
                setDestinoCoords(destino);

                const ruta1 = await getRutaGoogleMaps(location, partida);
                const ruta2 = await getRutaGoogleMaps(partida, destino);

                setRutaACamino(ruta1);
                setRutaServicio(ruta2);
                setMostrarBotonRuta(true);
            }
        };

        if (location) {
            restaurarServicio();
        }
    }, [location]);

    const finalizarServicio = async () => {
        if (!servicioActivo) return;
        try {
            const response = await fetch(`${API_URL}/servicio/finalizarServicio`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idRegistro: servicioActivo.idServicio,
                    idConductor: user?.dni,
                    estadoInforme: 'Finalizado',
                }),
            });

            if (response.ok) {
                resetServicio();
                console.log('🚗 Servicio finalizado con éxito');
            } else {
                console.error('❌ Error finalizando el servicio');
            }
        } catch (error) {
            console.error('❌ Error en la solicitud:', error);
        }
    };

    const cancelarServicio = async () => {
        if (!servicioActivo) return;
        try {
            const response = await fetch(`${API_URL}/servicio/cancelarServicio`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idRegistro: servicioActivo.idServicio,
                    idConductor: user?.dni,
                    estadoInforme: 'Cancelado',
                }),
            });

            if (response.ok) {
                resetServicio();
                console.log('🚫 Servicio cancelado con éxito');
            } else {
                console.error('❌ Error cancelando el servicio');
            }
        } catch (error) {
            console.error('❌ Error en la solicitud:', error);
        }
    };

    const resetServicio = async () => {
        setRutaACamino([]);
        setRutaServicio([]);
        setPartidaCoords(null);
        setDestinoCoords(null);
        setMostrarBotonRuta(false);
        setServicioActivo(null);

        await AsyncStorage.removeItem('servicioActivo');
    };

    const iconColor = {
        Activo: 'green',
        Ocupado: 'red',
        ServicioCalle: 'blue',
        ServicioPeligro: 'orange',
    }[estadoActual] || 'gray';

    return (
        <View style={styles.container}>
            {/* <Text style={styles.welcome}>Hola, {user?.nombre}</Text> */}
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
                    customMapStyle={theme === 'dark' ? darkMapStyle : []}
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
            {servicioActivo && (
                <View style={styles.infoCliente}>
                    <Text style={styles.clienteText}>🚖 Cliente: {servicioActivo.nombreCliente}</Text>
                    <Text style={styles.clienteText}>📞 Celular: {servicioActivo.celular}</Text>
                </View>
            )}
            {mostrarBotonRuta && (
                <View style={styles.botonesFlotantes}>
                    <TouchableOpacity onPress={iniciarRutaAPartida} style={styles.botonCompactoAzul}>
                        <Text style={styles.botonTextoChico}>Iniciar Ruta Partida</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={iniciarRutaAlDestino} style={styles.botonCompactoMorado}>
                        <Text style={styles.botonTextoChico}>Iniciar Ruta Destino</Text>
                    </TouchableOpacity>
                </View>
            )}

            {servicioActivo && (
                <View style={styles.botonesFlotantesServicio}>
                    <TouchableOpacity onPress={finalizarServicio} style={styles.botonCompactoVerde}>
                        <Text style={styles.botonTextoChico}>✔ Completado</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={cancelarServicio} style={styles.botonCompactoRojo}>
                        <Text style={styles.botonTextoChico}>✖ Cancelar</Text>
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
    infoCliente: {
        position: 'absolute',
        top: 10,
        left: 20,
        right: 20,
        backgroundColor: '#ecf0f1',
        padding: 10,
        borderRadius: 8,
        zIndex: 15,
    },
    clienteText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2c3e50',
    },
    map: { flex: 1 },
    botonesFlotantes: {
        position: 'absolute',
        bottom: 300,
        left: 10,
        paddingVertical: 10,
        paddingHorizontal: 10,
        flexDirection: 'grid',
        justifyContent: 'space-between',
        zIndex: 10,
    },

    botonesFlotantesServicio: {
        position: 'absolute',
        bottom: 190,
        left: 10,
        paddingVertical: 10,
        paddingHorizontal: 10,
        flexDirection: 'grid',
        justifyContent: 'space-between',
        zIndex: 10,
    },

    botonCompactoAzul: {
        backgroundColor: '#3498db',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        alignItems: 'center',
    },

    botonCompactoVerde: {
        backgroundColor: '#2ecc71',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        alignItems: 'center',
    },

    botonCompactoMorado: {
        backgroundColor: 'purple',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        alignItems: 'center',
    },

    botonCompactoRojo: {
        backgroundColor: '#e74c3c',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        alignItems: 'center',
    },

    botonTextoChico: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
});

export default TrackerScreen;