import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const AlertaServicio = ({ servicio, onClose, onAceptar }) => {
    if (!servicio) return null;

    return (
        <View style={styles.alertContainer}>
            <Text style={styles.title}>📢 Nuevo Servicio</Text>
            <Text style={{ display: 'none' }}>
                <Text style={styles.label}>id:</Text> {servicio.idServicio}
            </Text>
            <Text><Text style={styles.label}>Cliente:</Text> {servicio.nombreCliente}</Text>
            <Text><Text style={styles.label}>Celular:</Text> {servicio.celular}</Text>
            <Text><Text style={styles.label}>Partida:</Text> {servicio.puntoPartida}</Text>
            <Text><Text style={styles.label}>Destino:</Text> {servicio.puntoLlegada}</Text>
            <Text><Text style={styles.label}>Precio:</Text> S/ {servicio.precio.toFixed(2)}</Text>
            <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.buttonSecondary} onPress={onClose}>
                    <Text style={styles.buttonText}>Cerrar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.buttonPrimary} onPress={onAceptar}>
                    <Text style={styles.buttonText}>Aceptar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    alertContainer: {
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        zIndex: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#2c3e50',
    },
    label: {
        fontWeight: 'bold',
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
    },
    buttonPrimary: {
        flex: 1,
        backgroundColor: '#2ecc71',
        padding: 8,
        borderRadius: 6,
        alignItems: 'center',
        marginLeft: 5,
    },
    buttonSecondary: {
        flex: 1,
        backgroundColor: '#e74c3c',
        padding: 8,
        borderRadius: 6,
        alignItems: 'center',
        marginRight: 5,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default AlertaServicio;