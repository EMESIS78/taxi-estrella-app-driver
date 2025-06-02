import React, { useContext, useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    LayoutAnimation,
    Platform,
    UIManager,
    useColorScheme,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { API_URL } from '@env';
import { AuthContext } from '../context/Authcontext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const estados = [
    { nombre: 'Activo', color: 'green', icon: 'car' },
    { nombre: 'Ocupado', color: 'red', icon: 'ban' },
    { nombre: 'ServicioCalle', color: 'blue', icon: 'street-view' },
    { nombre: 'ServicioPeligro', color: 'orange', icon: 'exclamation-triangle' },
];

const EstadoConductor = ({ onEstadoChange }) => {
    const { user } = useContext(AuthContext);
    const [visible, setVisible] = useState(true);
    const heightAnim = useRef(new Animated.Value(1)).current;
    const scheme = useColorScheme();

    const fondoPanel = scheme === 'dark' ? '#2c3e50' : '#0076a7';
    const fondoToggle = scheme === 'dark' ? '#34495e' : '#0076a7';
    const colorTexto = scheme === 'dark' ? '#ecf0f1' : '#ffffff';

    const togglePanel = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        Animated.timing(heightAnim, {
            toValue: visible ? 0 : 1,
            duration: 300,
            useNativeDriver: false,
        }).start();
        setVisible(!visible);
    };

    const panelHeight = heightAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 130],
    });

    const opacity = heightAnim;

    const actualizarEstado = async (estado) => {
        if (!user?.dni) return;

        try {
            await fetch(`${API_URL}/conductor/actualizarEstado`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idConductor: parseInt(user.dni, 10), estado }),
            });
            console.log(`Estado actualizado a: ${estado}`);
            onEstadoChange(estado);
        } catch (err) {
            console.error('Error al actualizar estado:', err);
        }
    };

    return (
        <>
            <TouchableOpacity onPress={togglePanel} style={[styles.toggleButton, { backgroundColor: fondoToggle }]}>
                <FontAwesome name={visible ? 'angle-down' : 'angle-up'} size={28} color="white" />
            </TouchableOpacity>

            <Animated.View style={[styles.panel, { height: panelHeight, opacity, backgroundColor: fondoPanel }]}>
                <Text style={[styles.title, { color: colorTexto }]}>Mi Estado</Text>
                <View style={styles.buttonContainer}>
                    {estados.map(({ nombre, color, icon }) => (
                        <TouchableOpacity
                            key={nombre}
                            style={[styles.estadoButton, { backgroundColor: color }]}
                            onPress={() => actualizarEstado(nombre)}
                        >
                            <FontAwesome name={icon} size={20} color="#fff" />
                            <Text style={styles.buttonText}>{nombre}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </Animated.View>
        </>
    );
};

const styles = StyleSheet.create({
    toggleButton: {
        position: 'absolute',
        bottom: 50,
        alignSelf: 'center',
        padding: 10,
        borderRadius: 20,
        elevation: 5,
        zIndex: 10,
    },
    panel: {
        position: 'absolute',
        bottom: 60,
        left: 10,
        right: 10,
        borderRadius: 10,
        overflow: 'hidden',
        padding: 10,
    },
    title: {
        textAlign: 'center',
        fontWeight: 'bold',
        marginBottom: 8,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    estadoButton: {
        flex: 1,
        padding: 8,
        marginHorizontal: 5,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
    },
});

export default EstadoConductor;
