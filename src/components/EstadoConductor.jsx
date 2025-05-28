import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { API_URL } from '@env';
import { AuthContext } from '../context/Authcontext';

const estados = [
    { nombre: 'Activo', color: 'green', icon: 'car' },
    { nombre: 'Ocupado', color: 'red', icon: 'ban' },
    { nombre: 'ServicioCalle', color: 'blue', icon: 'street-view' },
    { nombre: 'ServicioPeligro', color: 'orange', icon: 'exclamation-triangle' },
];

const EstadoConductor = ({ onEstadoChange }) => {
    const { user } = useContext(AuthContext);

    const actualizarEstado = async (estado) => {
        const dni = user?.dni;

        if (!dni) {
            return;
        }

        const body = {
            idConductor: parseInt(dni, 10),
            estado,
        };

        try {
            const response = await fetch(`${API_URL}/conductor/actualizarEstado`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            const isJson = response.headers.get('content-type')?.includes('application/json');
            const result = isJson ? await response.json() : await response.text();

            if (response.ok) {
                console.log("Estado actualizado")
                onEstadoChange(estado);
            } else {
                console.error('⚠️ Error al actualizar estado:', result);
            }
        } catch (err) {
            console.error('❌ Error de conexión con el servidor:', err);
        }
    };

    return (
        <View style={styles.panel}>
            <Text style={styles.title}>Mi Estado</Text>
            <View style={styles.buttonContainer}>
                {estados.map(({ nombre, color, icon }) => (
                    <TouchableOpacity
                        key={nombre}
                        style={[styles.estadoButton, { backgroundColor: color }]}
                        onPress={() => actualizarEstado(nombre)}
                    >
                        <FontAwesome name={icon} size={24} color="#fff" />
                        <Text style={styles.buttonText}>{nombre}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    panel: {
        position: 'absolute',
        bottom: 50,
        left: 10,
        right: 10,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 10,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 5,
    },
    title: {
        textAlign: 'center',
        fontWeight: 'bold',
        marginBottom: 10,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    estadoButton: {
        flex: 1,
        padding: 10,
        borderRadius: 8,
        marginHorizontal: 5,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        marginTop: 5,
        fontSize: 12,
        fontWeight: '600',
    },
});

export default EstadoConductor;
