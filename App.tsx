import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Stack } from './src/navigation/types';
import StartScreen from './src/screens/StartScreen';
import GameScreen from './src/screens/GameScreen';
import GameOverScreen from './src/screens/GameOverScreen';
import { colors } from './src/theme/colors';

export default function App() {
  return (
    <SafeAreaProvider>
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
        <Stack.Screen name="Game" component={GameScreen} />
        <Stack.Screen name="GameOver" component={GameOverScreen} />
      </Stack.Navigator>
    </NavigationContainer>
    </SafeAreaProvider>
  );
}
