import { createNativeStackNavigator } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Start: undefined;
  Auth: undefined;
  Profile: undefined;
  Game: undefined;
  GameOver: { score: number; bestCombo: number; isNewRecord: boolean };
};

export const Stack = createNativeStackNavigator<RootStackParamList>();
