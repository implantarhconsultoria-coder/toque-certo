import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'GameOver'>;

export default function GameOverScreen({ navigation, route }: Props) {
  const { score, bestCombo, isNewRecord } = route.params;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.bgDeep, colors.bg, '#0D0718']} style={StyleSheet.absoluteFill} />
      <View style={styles.glow} />

      <View style={styles.content}>
        {isNewRecord && (
          <View style={styles.recordPill}>
            <Text style={styles.recordText}>🏆 NOVO RECORDE</Text>
          </View>
        )}

        <Text style={styles.eyebrow}>TEMPO ESGOTADO</Text>
        <Text style={styles.score}>{score}</Text>
        <Text style={styles.scoreLabel}>pontos</Text>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Melhor combo</Text>
          <Text style={styles.statValue}>{bestCombo}</Text>
        </View>

        <TouchableOpacity activeOpacity={0.88} onPress={() => navigation.replace('Game')} style={{ marginTop: 30 }}>
          <LinearGradient colors={colors.gradient} style={styles.button}>
            <Text style={styles.buttonText}>JOGAR DE NOVO</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Start' }] })}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>VOLTAR AO INÍCIO</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  glow: { position: 'absolute', width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(198,255,60,0.1)', bottom: -140, right: -100 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  recordPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(198,255,60,0.12)', borderWidth: 1, borderColor: colors.borderStrong, marginBottom: 18 },
  recordText: { color: colors.accentLime, fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  eyebrow: { color: colors.textSecondary, fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 10 },
  score: { color: '#fff', fontSize: 72, fontWeight: '900', lineHeight: 76 },
  scoreLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '800', marginBottom: 24 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 16, backgroundColor: 'rgba(20,11,36,0.9)', borderWidth: 1, borderColor: colors.border },
  statLabel: { color: colors.textSecondary, fontSize: 12.5, fontWeight: '700' },
  statValue: { color: colors.accentCyan, fontSize: 16, fontWeight: '900' },
  button: { minWidth: 220, borderRadius: 30, paddingVertical: 17, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 14.5, fontWeight: '900', letterSpacing: 1.2 },
  secondaryButton: { marginTop: 16, paddingVertical: 10 },
  secondaryButtonText: { color: colors.textSecondary, fontSize: 12.5, fontWeight: '800', letterSpacing: 0.6 },
});
