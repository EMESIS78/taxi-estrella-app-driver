import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as conductorService from '../services/conductorService';
import { setUnauthorizedHandler } from '../services/apiClient';
import { saveToken, loadToken, clearToken } from '../services/tokenStore';

export const AuthContext = createContext();

const USER_KEY = 'user';
const LEGACY_SESSION_KEY = 'sessionToken';

// The login response carries the JWT (`token`) and the session id
// (`sessionToken`, also inside the JWT as claim `sid`). Neither belongs in the
// user profile: the JWT goes to SecureStore and the session id is never used.
const toProfile = ({ token, sessionToken, ...profile }) => profile;

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const sessionEndedRef = useRef(false);

    const clearLocalSession = useCallback(async () => {
        setUser(null);
        try {
            // LEGACY_SESSION_KEY: written by versions before the JWT migration.
            await Promise.all([AsyncStorage.multiRemove([USER_KEY, LEGACY_SESSION_KEY]), clearToken()]);
        } catch (error) {
            console.error('Error limpiando la sesión local:', error);
        }
    }, []);

    useEffect(() => {
        // A 401 means the token expired or the driver logged in on another
        // device. The backend already closed that session, so only clean up here.
        setUnauthorizedHandler((mensaje) => {
            // Several in-flight requests can fail with 401 at once; end the
            // session and warn the driver only once.
            if (sessionEndedRef.current) return;
            sessionEndedRef.current = true;
            clearLocalSession();
            Alert.alert('Sesión finalizada', mensaje || 'Tu sesión expiró. Inicia sesión nuevamente.');
        });
        return () => setUnauthorizedHandler(null);
    }, [clearLocalSession]);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const [storedUser, token] = await Promise.all([
                    AsyncStorage.getItem(USER_KEY),
                    loadToken(),
                ]);
                if (!storedUser) return;

                const parsedUser = JSON.parse(storedUser);
                if (!token || !parsedUser.habilitado) {
                    await clearLocalSession();
                    return;
                }
                setUser(parsedUser);
            } catch (error) {
                console.error('Error cargando usuario:', error);
            } finally {
                setLoading(false);
            }
        };

        loadUser();
    }, [clearLocalSession]);

    const login = async (loginResponse) => {
        const profile = toProfile(loginResponse);
        try {
            await saveToken(loginResponse.token);
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(profile));
            sessionEndedRef.current = false;
            setUser(profile);
        } catch (error) {
            console.error('Error guardando sesión:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            if (user?.dni) await conductorService.cerrarSesion(user.dni);
        } catch (error) {
            // The driver must be able to leave even without network.
            console.error('Error cerrando sesión en el servidor:', error.message);
        } finally {
            await clearLocalSession();
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
