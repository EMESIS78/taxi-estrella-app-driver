import React, { useState, useContext } from 'react';
import {
    View,
    Text,
    TextInput,
    Alert,
    StyleSheet,
    TouchableOpacity,
    Image,
    useColorScheme,
} from 'react-native';
import { API_URL } from '@env';
import { AuthContext } from '../context/Authcontext';

const LoginScreen = () => {
    const [dni, setDni] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useContext(AuthContext);
    const scheme = useColorScheme();

    const fondo = scheme === 'dark' ? '#2c3e50' : '#0076a7';
    const texto = scheme === 'dark' ? '#ecf0f1' : '#ffffff';
    const inputBg = scheme === 'dark' ? '#34495e' : '#f9fafb';
    const inputBorder = scheme === 'dark' ? '#95a5a6' : '#cbd5e1';
    const logo = scheme === 'dark'
        ? require('../Public/icons/logo3copy.png')
        : require('../Public/icons/logo4.png');

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

            login(data);
        } catch (error) {
            console.error(error);
            Alert.alert('Error de conexión', 'No se pudo iniciar sesión. Intenta nuevamente.');
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: fondo }]}>
            <View style={styles.logoContainer}>
                <Image source={logo} style={styles.logo} resizeMode="contain" />
            </View>
            <View style={styles.card}>
                <Text style={[styles.cardTitle, { color: texto }]}>Iniciar Sesión</Text>
                <Text style={[styles.cardDescription, { color: texto }]}>
                    Ingresa tu DNI y contraseña para acceder como conductor
                </Text>

                <View style={styles.form}>
                    <Text style={[styles.label, { color: texto }]}>DNI</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: texto }]}
                        keyboardType="numeric"
                        placeholder="Ej. 12345678"
                        placeholderTextColor={scheme === 'dark' ? '#bdc3c7' : '#6b7280'}
                        value={dni}
                        onChangeText={setDni}
                    />

                    <Text style={[styles.label, { color: texto }]}>Contraseña</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: texto }]}
                        secureTextEntry
                        placeholder="Tu contraseña"
                        placeholderTextColor={scheme === 'dark' ? '#bdc3c7' : '#6b7280'}
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
        justifyContent: 'center',
        padding: 20,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    logo: {
        width: 200,
        height: 150,
    },
    card: {
        borderRadius: 16,
        padding: 24,
        elevation: 6,
    },
    cardTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 6,
    },
    cardDescription: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
    },
    form: {
        gap: 16,
    },
    label: {
        fontSize: 14,
        marginBottom: 4,
    },
    input: {
        borderWidth: 1,
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