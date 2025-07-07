import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
  useColorScheme,
  Animated,
} from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { useServiciosConductor } from '../hooks/useServiciosConductor';
import moment from 'moment';

const MisCarrerasScreen = () => {
  const servicios = useServiciosConductor();
  const scheme = useColorScheme();

  const hoy = servicios.filter(s => moment(s.fecha, 'DD-MM-YYYY HH:mm').isSame(moment(), 'day')).length;
  const semana = servicios.filter(s => moment(s.fecha, 'DD-MM-YYYY HH:mm').isSame(moment(), 'week')).length;
  const mes = servicios.filter(s => moment(s.fecha, 'DD-MM-YYYY HH:mm').isSame(moment(), 'month')).length;

  const pieData = [
    { name: 'Hoy', count: hoy, color: '#4CAF50', legendFontColor: '#333', legendFontSize: 12 },
    { name: 'Semana', count: semana, color: '#2196F3', legendFontColor: '#333', legendFontSize: 12 },
    { name: 'Mes', count: mes, color: '#FFC107', legendFontColor: '#333', legendFontSize: 12 },
  ].filter(item => item.count > 0);

  // Animación al montar (opcional)
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const fondo = scheme === 'dark' ? '#1e1e1e' : '#f9f9f9';
  const texto = scheme === 'dark' ? '#ffffff' : '#333333';

  return (
    <View style={[styles.container, { backgroundColor: fondo }]}>
      <Animated.View style={{ opacity: fadeAnim }}>
        <PieChart
          data={pieData}
          width={Dimensions.get('window').width - 20}
          height={220}
          chartConfig={{
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            labelColor: () => texto,
          }}
          accessor="count"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
      </Animated.View>

      <FlatList
        data={servicios}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View style={[styles.itemCard, { backgroundColor: scheme === 'dark' ? '#2c2c2c' : '#ffffff' }]}>
            <Text style={[styles.itemText, { color: texto }]}>🗓 {item.fecha}</Text>
            <Text style={[styles.itemText, { color: texto }]}>📍 Desde: {item.puntoPartida}</Text>
            <Text style={[styles.itemText, { color: texto }]}>➡️ Hasta: {item.puntoDestino}</Text>
            <Text style={[styles.itemText, { color: texto }]}>💲 Precio: S/ {item.precio.toFixed(2)}</Text>
          </View>
        )}
      />
    </View>
  );
};

export default MisCarrerasScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  itemCard: {
    padding: 15,
    marginVertical: 8,
    borderRadius: 10,
    elevation: 2, // sombra en Android
    shadowColor: '#000', // sombra en iOS
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
  },
  itemText: { marginBottom: 4, fontSize: 14 },
});