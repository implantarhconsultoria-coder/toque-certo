import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Start'>;

export default function StartScreen({ navigation }: Props) {
  const [best, setBest] = useState(0);

  useEffect(() => {
    const unsub = navigation.addListener('focus', loadBest);
    loadBest();
    return unsub;
  }, [navigation]);

  async function loadBest() {
    const raw = await AsyncStorage.getItem('toqueCerto.bestScore');
    setBest(raw ? parseInt(raw, 10) : 0);
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.bgDeep, colors.bg, '#0D0718']} style={StyleSheet.absoluteFill} />
      <View style={styles.glow} />

      <View style={styles.content}>
        <Text style={styles.eyebrow}>JOGO DE REFLEXO</Text>
        <Text style={styles.title}>TOQUE{'\n'}CERTO</Text>

        <View style={styles.bestCard}>
          <Text style={styles.bestLabel}>SEU RECORDE</Text>
          <Text style={styles.bestValue}>{best}</Text>
        </View>

        <Text style={styles.rules}>
          Toque no símbolo em destaque antes do tempo acabar. Cada erro custa 1 segundo. A grade cresce conforme você pontua.
        </Text>

        <TouchableOpacity activeOpacity={0.88} onPress={() => navigation.navigate('Game')}>
          <LinearGradient colors={colors.gradient} style={styles.playButton}>
            <Text style={styles.playButtonText}>JOGAR</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  glow: { position: 'absolute', width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(139,60,255,0.18)', top: -100, left: -100 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  eyebrow: { color: colors.accentLime, fontSize: 11, fontWeight: '900', letterSpacing: 2.4, marginBottom: 10 },
  title: { color: '#fff', fontSize: 48, lineHeight: 50, fontWeight: '900', textAlign: 'center', letterSpacing: 1, marginBottom: 30 },
  bestCard: { alignItems: 'center', paddingVertical: 18, paddingHorizontal: 40, borderRadius: 20, backgroundColor: 'rgba(20,11,36,0.9)', borderWidth: 1, borderColor: colors.border, marginBottom: 26 },
  bestLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '900', letterSpacing: 1.4, marginBottom: 4 },
  bestValue: { color: colors.accentLime, fontSize: 40, fontWeight: '900' },
  rules: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 36, maxWidth: 300 },
  playButton: { minWidth: 220, borderRadius: 30, paddingVertical: 18, alignItems: 'center' },
  playButtonText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1.4 },
});
