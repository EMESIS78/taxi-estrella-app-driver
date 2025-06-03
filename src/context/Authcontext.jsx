import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const storedUser = await AsyncStorage.getItem('user');
                if (storedUser) {
                    const parsedUser = JSON.parse(storedUser);

                    // 👇 Validación adicional
                    if (!parsedUser.habilitado) {
                        console.log('Usuario deshabilitado. Cerrando sesión.');
                        await logout(); // Usamos logout() que ya hace todo bien
                        return;
                    }

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
            setUser(usuario);
            await AsyncStorage.setItem('user', JSON.stringify(usuario));
        } catch (error) {
            console.error('Error guardando sesión:', error);
        }
    };

    const logout = async () => {
        try {
            setUser(null);
            await AsyncStorage.removeItem('user');
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