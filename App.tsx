import React, { useEffect } from 'react';
import { startAds } from './src/services/rewardedAds';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Stack } from './src/navigation/types';
import { AuthProvider } from './src/auth/AuthContext';
import AuthScreen from './src/screens/AuthScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import StartScreen from './src/screens/StartScreen';
import GameScreen from './src/screens/GameScreen';
import GameOverScreen from './src/screens/GameOverScreen';
import { colors } from './src/theme/colors';

export default function App() {
  // Consentimento (UMP/ATT), inicialização do SDK e pré-carregamento do premiado.
  useEffect(() => { startAds(); }, []);
  return (
    <SafeAreaProvider>
    <AuthProvider>
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName="Start"
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="Start" component={StartScreen} />
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Game" component={GameScreen} />
        <Stack.Screen name="GameOver" component={GameOverScreen} />
      </Stack.Navigator>
    </NavigationContainer>
    </AuthProvider>
    </SafeAreaProvider>
  );
}
