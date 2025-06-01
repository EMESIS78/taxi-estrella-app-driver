import React, { useState, useContext } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { API_URL } from '@env';
import { AuthContext } from '../context/Authcontext';

const LoginScreen = () => {
    const [dni, setDni] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useContext(AuthContext);

    const handleLogin = async () => {
        if (!dni || !password) {
            Alert.alert('Campos requeridos', 'Por favor completa ambos campos.');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/usuario/Login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    usuario: Number(dni),
                    password: password,
                }),
            });

            if (!res.ok) {
                throw new Error('Respuesta no válida');
            }

            const data = await res.json();

            if (data?.rol !== 'Conductor') {
                Alert.alert('Acceso restringido', 'Solo los conductores pueden iniciar sesión.');
                return;
            }

            login(data); // ← Actualiza el contexto global y redirige
        } catch (error) {
            console.error(error);
            Alert.alert('Error de conexión', 'No se pudo iniciar sesión. Intenta nuevamente.');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Iniciar Sesión</Text>
                <Text style={styles.cardDescription}>
                    Ingresa tu DNI y contraseña para acceder como conductor
                </Text>

                <View style={styles.form}>
                    <Text style={styles.label}>DNI</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        placeholder="Ej. 12345678"
                        value={dni}
                        onChangeText={setDni}
                    />

                    <Text style={styles.label}>Contraseña</Text>
                    <TextInput
                        style={styles.input}
                        secureTextEntry
                        placeholder="Tu contraseña"
                        value={password}
                        onChangeText={setPassword}
                    />

                    <TouchableOpacity style={styles.button} onPress={handleLogin}>
                        <Text style={styles.buttonText}>Ingresar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

export default LoginScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#eef1f5',
        justifyContent: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 6,
    },
    cardTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#2c3e50',
        marginBottom: 6,
    },
    cardDescription: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 24,
    },
    form: {
        gap: 16,
    },
    label: {
        fontSize: 14,
        color: '#374151',
        marginBottom: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: '#cbd5e1',
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
    },
    button: {
        backgroundColor: '#2563eb',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 16,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});