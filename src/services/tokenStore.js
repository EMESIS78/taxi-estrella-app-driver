import * as SecureStore from 'expo-secure-store';

// The JWT returned by POST /conductor/login. It lives in SecureStore (encrypted
// keystore) instead of AsyncStorage, and is cached in memory so every request
// can read it synchronously.
const TOKEN_KEY = 'authToken';

let currentToken = null;

export const getToken = () => currentToken;

export const saveToken = async (token) => {
    currentToken = token;
    await SecureStore.setItemAsync(TOKEN_KEY, token);
};

export const loadToken = async () => {
    currentToken = await SecureStore.getItemAsync(TOKEN_KEY);
    return currentToken;
};

export const clearToken = async () => {
    currentToken = null;
    await SecureStore.deleteItemAsync(TOKEN_KEY);
};
