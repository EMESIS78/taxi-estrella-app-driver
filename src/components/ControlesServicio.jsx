// components/ControlesServicio.jsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const ControlesServicio = ({
    servicioActivo,
    onFinalizar,
    onCancelar,
    mostrarBotonRuta,
    iniciarRutaAPartida,
    iniciarRutaAlDestino,
}) => {
    return (
        <>
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
                    <TouchableOpacity onPress={onFinalizar} style={styles.botonCompactoVerde}>
                        <Text style={styles.botonTextoChico}>✔ Completado</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onCancelar} style={styles.botonCompactoRojo}>
                        <Text style={styles.botonTextoChico}>✖ Cancelar</Text>
                    </TouchableOpacity>
                </View>
            )}
        </>
    );
};

const styles = StyleSheet.create({
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
        fontWeight: 'bold',
        marginVertical: 2,
    },
    botonesFlotantes: {
        position: 'absolute',
        bottom: 250,
        left: 10,
        right: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    botonesFlotantesServicio: {
        position: 'absolute',
        bottom: 200,
        left: 10,
        right: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    botonCompactoAzul: {
        flex: 1,
        backgroundColor: '#2563eb',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginRight: 5,
    },
    botonCompactoMorado: {
        flex: 1,
        backgroundColor: '#6b21a8',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginLeft: 5,
    },
    botonCompactoVerde: {
        flex: 1,
        backgroundColor: '#2ecc71',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginRight: 5,
    },
    botonCompactoRojo: {
        flex: 1,
        backgroundColor: '#e74c3c',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginLeft: 5,
    },
    botonTextoChico: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default ControlesServicio;
