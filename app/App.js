import React, { useEffect, useState, useContext } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AuthProvider } from '../src/context/Authcontext'
import AppNavigator from '../src/navigation/AppNavigator'

const App = () => {
  return (
    <AuthProvider>
      <View style={{ flex: 1 }}>
        <AppNavigator />
      </View>
    </AuthProvider>
  )
}

export default App

const styles = StyleSheet.create({})