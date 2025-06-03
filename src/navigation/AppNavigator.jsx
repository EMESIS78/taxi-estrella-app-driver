import React, { useContext, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { View, Text, Image, StyleSheet, TouchableOpacity, useColorScheme, Alert } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import TrackerScreen from '../screens/TrackerScreen';
import MisCarrerasScreen from '../screens/MisCarrerasScreen';
import { AuthContext } from '../context/Authcontext';
import LoginScreen from '../components/LoginScreen';
import { useThemeColor } from '../../hooks/useThemeColor';

const Drawer = createDrawerNavigator();

const CustomDrawerContent = ({ navigation }) => {
    const { user, logout } = useContext(AuthContext);
    const scheme = useColorScheme();


    const backgroundColor = scheme === 'dark' ? '#2c3e50' : '#0076a7';
    const textColor = scheme === 'dark' ? '#ecf0f1' : '#ffffff';
    const logo = scheme === 'dark'
        ? require('../Public/icons/logo3copy.png')  // <-- tu logo para fondo oscuro
        : require('../Public/icons/logo4.png'); // <-- tu logo para fondo claro

    const handleLogout = () => {
        logout();
    };



    return (
        <DrawerContentScrollView contentContainerStyle={[styles.drawerContainer, { backgroundColor }]}>
            <View style={styles.profileSection}>
                <Image source={logo} style={styles.avatar} resizeMode="contain" />
                <Text style={[styles.name, { color: textColor }]}>{user?.nombre}</Text>
                <Text style={[styles.dni, { color: textColor }]}>DNI: {user?.dni}</Text>
            </View>

            <DrawerItem
                label="Monitoreo"
                onPress={() => navigation.navigate('Monitoreo')}
                labelStyle={[styles.drawerLabel, { color: textColor }]}
            />

            <View style={styles.logoutContainer}>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                    <Text style={styles.logoutText}>Cerrar sesión</Text>
                </TouchableOpacity>
            </View>
        </DrawerContentScrollView>
    );
};

const AppNavigator = () => {
    const { user } = useContext(AuthContext);
    const scheme = useColorScheme();
    const [loading, setLoading] = useState(true);
    const headerBackground = scheme === 'dark' ? '#2c3e50' : '#0076a7';
    const headerTextColor = scheme === 'dark' ? '#ecf0f1' : '#ffffff';

    useEffect(() => {
        if (user === null && !loading) {
            Alert.alert('Acceso denegado', 'Tu cuenta ha sido deshabilitada.');
        }
    }, [user, loading]);

    return (
        <NavigationContainer>
            {user ? (
                <Drawer.Navigator
                    initialRouteName="Monitoreo"
                    drawerContent={(props) => <CustomDrawerContent {...props} />}
                    screenOptions={{
                        headerStyle: { backgroundColor: headerBackground },
                        headerTintColor: headerTextColor,
                        headerTitleStyle: { fontWeight: 'bold' },
                    }}
                >
                    <Drawer.Screen name="Monitoreo" component={TrackerScreen} />
                    {/* <Drawer.Screen name="MisCarreras" component={MisCarrerasScreen} /> */}
                </Drawer.Navigator>
            ) : (
                <LoginScreen />
            )}
        </NavigationContainer>
    );
};

const styles = StyleSheet.create({
    drawerContainer: { flex: 1 },
    profileSection: {
        alignItems: 'center',
        paddingVertical: 25,
        marginBottom: 20,
    },
    avatar: {
        width: 100,
        height: 100,
        marginBottom: 10,
    },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    dni: {
        fontSize: 14,
    },
    drawerLabel: {
        fontSize: 16,
        marginLeft: -10,
    },
    logoutContainer: {
        marginTop: 'auto',
        borderTopWidth: 1,
        borderColor: '#ccc',
        padding: 20,
    },
    logoutButton: {
        backgroundColor: '#e74c3c',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    logoutText: {
        color: 'white',
        fontWeight: 'bold',
    },
});

export default AppNavigator;
