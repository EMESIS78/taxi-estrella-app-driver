import { Alert, Linking } from 'react-native';

export const elegirAppNavegacion = (origen, destino) => {
    Alert.alert('Selecciona aplicación', '¿Con cuál app deseas abrir la ruta?', [
        {
            text: 'Google Maps',
            onPress: () => {
                const url = `https://www.google.com/maps/dir/?api=1&origin=${origen}&destination=${destino}&travelmode=driving`;
                Linking.openURL(url);
            },
        },
        {
            text: 'Waze',
            onPress: () => {
                const [lat, lng] = destino.split(',');
                const url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
                Linking.openURL(url);
            },
        },
        { text: 'Cancelar', style: 'cancel' },
    ]);
};
