import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { View, Text, Image, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import TrackerScreen from '../screens/TrackerScreen';
import MisCarrerasScreen from '../screens/MisCarrerasScreen';
import { AuthContext } from '../context/Authcontext';
import LoginScreen from '../components/LoginScreen';
import { useThemeColor } from '../../hooks/useThemeColor';

const Drawer = createDrawerNavigator();

const CustomDrawerContent = ({ navigation }) => {
    const { user, logout } = useContext(AuthContext);
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');

    const handleLogout = () => {
        logout();
    };

    return (
        <DrawerContentScrollView contentContainerStyle={[styles.drawerContainer, { backgroundColor }]}>
            <View style={styles.profileSection}>
                <Image source={{ uri: 'https://i.pravatar.cc/100' }} style={styles.avatar} />
                <Text style={[styles.name, { color: textColor }]}>{user?.nombre}</Text>
                <Text style={[styles.dni, { color: textColor }]}>DNI: {user?.dni}</Text>
            </View>

            <DrawerItem label="Monitoreo" onPress={() => navigation.navigate('Monitoreo')} labelStyle={[styles.drawerLabel, { color: textColor }]} />
            <DrawerItem label="Mis Carreras" onPress={() => navigation.navigate('MisCarreras')} labelStyle={[styles.drawerLabel, { color: textColor }]} />

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

    return (
        <NavigationContainer>
            {user ? (
                <Drawer.Navigator
                    initialRouteName="Monitoreo"
                    drawerContent={(props) => <CustomDrawerContent {...props} />}
                >
                    <Drawer.Screen name="Monitoreo" component={TrackerScreen} />
                    <Drawer.Screen name="MisCarreras" component={MisCarrerasScreen} />
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
        paddingVertical: 20,
        marginBottom: 20,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
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
