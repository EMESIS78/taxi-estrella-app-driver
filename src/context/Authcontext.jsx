import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@env';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const storedUser = await AsyncStorage.getItem('user');
                const storedToken = await AsyncStorage.getItem('sessionToken');
                if (storedUser) {
                    const parsedUser = JSON.parse(storedUser);

                    // Validación adicional
                    if (!parsedUser.habilitado) {
                        console.log('Usuario deshabilitado. Cerrando sesión.');
                        await logout();
                        return;
                    }

                    parsedUser.sessionToken = storedToken; // ✅ Asigna el token al usuario
                    setUser(parsedUser);
                }
            } catch (error) {
                console.error('Error cargando usuario:', error);
            } finally {
                setLoading(false);
            }
        };

        loadUser();
    }, []);
    const login = async (usuario) => {
    try {
        console.log('Usuario recibido en AuthContext:', usuario);
        setUser(usuario);
        await AsyncStorage.setItem('user', JSON.stringify(usuario));
        await AsyncStorage.setItem('sessionToken', usuario.sessionToken);
    } catch (error) {
        console.error('Error guardando sesión:', error);
    }
};

    const logout = async () => {
    try {
        const token = await AsyncStorage.getItem('sessionToken');
        const storedUser = await AsyncStorage.getItem('user');
        const parsedUser = JSON.parse(storedUser);

        // Llama al backend para cerrar la sesión
        await fetch(`${API_URL}/conductor/cerrar-sesion?dni=${parsedUser.dni}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token,
            },
        });

        // Limpia localmente
        setUser(null);
        await AsyncStorage.multiRemove(['user', 'sessionToken']);
    } catch (error) {
        console.error('Error cerrando sesión:', error);
    }
};


    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);