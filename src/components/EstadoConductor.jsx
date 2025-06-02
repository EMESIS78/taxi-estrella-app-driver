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

    const togglePanel = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        Animated.timing(heightAnim, {
            toValue: visible ? 0 : 1,
            duration: 300,
            useNativeDriver: false, // Necesario para height
        }).start();
        setVisible(!visible);
    };

    const panelHeight = heightAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 130], // Altura final del panel visible
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
            {/* Toggle */}
            <TouchableOpacity onPress={togglePanel} style={styles.toggleButton}>
                <FontAwesome name={visible ? 'angle-down' : 'angle-up'} size={28} color="#333" />
            </TouchableOpacity>

            {/* Panel animado */}
            <Animated.View style={[styles.panel, { height: panelHeight, opacity }]}>
                <Text style={styles.title}>Mi Estado</Text>
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
        backgroundColor: '#fff',
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
        backgroundColor: '#fff',
        borderRadius: 10,
        overflow: 'hidden', // Esto oculta el contenido cuando se colapsa
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
