import React, { useState, useContext } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
import { API_URL } from '@env';
import { AuthContext } from '../context/Authcontext';

const LoginScreen = ({ navigation }) => {
    const [dni, setDni] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useContext(AuthContext);

    const handleLogin = async () => {
        try {
            const res = await fetch(`${API_URL}/usuario/obtenerUsuarios?page=0&size=50`);
            const data = await res.json();

            const usuario = data.contenido.find(u =>
                String(u.dni) === dni &&
                u.password === password &&
                u.rol?.toLowerCase() === 'conductor'
            );

            if (usuario) {
                login(usuario); // ← Aquí actualiza el contexto global
            } else {
                Alert.alert('Acceso denegado', 'Credenciales inválidas o no eres conductor.');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo conectar con el servidor.');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Iniciar Sesión</Text>
            <TextInput
                style={styles.input}
                placeholder="DNI"
                keyboardType="numeric"
                value={dni}
                onChangeText={setDni}
            />
            <TextInput
                style={styles.input}
                placeholder="Contraseña"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />
            <Button title="Ingresar" onPress={handleLogin} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 20 },
    title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
    input: {
        borderBottomWidth: 1,
        marginBottom: 15,
        paddingVertical: 8,
        fontSize: 16,
    },
});

export default LoginScreen;