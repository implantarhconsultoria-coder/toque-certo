import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { generateRound, Round } from '../utils/gameLogic';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

const ROUND_SECONDS = 30;

export default function GameScreen({ navigation }: Props) {
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [round, setRound] = useState<Round>(() => generateRound(0));
  const [flash, setFlash] = useState<'combo' | 'wrong' | null>(null);

  const scoreRef = useRef(score);
  const bestComboRef = useRef(bestCombo);
  scoreRef.current = score;
  bestComboRef.current = bestCombo;

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          endGame();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 280);
    return () => clearTimeout(id);
  }, [flash]);

  async function endGame() {
    const raw = await AsyncStorage.getItem('toqueCerto.bestScore');
    const best = raw ? parseInt(raw, 10) : 0;
    const isNewRecord = scoreRef.current > best;
    if (isNewRecord) {
      await AsyncStorage.setItem('toqueCerto.bestScore', String(scoreRef.current));
    }
    navigation.replace('GameOver', {
      score: scoreRef.current,
      bestCombo: bestComboRef.current,
      isNewRecord,
    });
  }

  function onTap(symbol: string, index: number) {
    if (timeLeft <= 0) return;

    if (index === round.targetIndex && symbol === round.target) {
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      setBestCombo((b) => Math.max(b, nextCombo));
      const bonus = nextCombo > 0 && nextCombo % 5 === 0 ? 1 : 0;
      setScore((s) => s + 1 + bonus);
      if (bonus) setFlash('combo');
      setRound(generateRound(score + 1));
    } else {
      setCombo(0);
      setFlash('wrong');
      setTimeLeft((t) => Math.max(0, t - 1));
    }
  }

  const columns = round.options.length <= 4 ? 2 : 3;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={flash === 'wrong' ? ['#2B0A16', colors.bg, colors.bgDeep] : [colors.bgDeep, colors.bg, '#0D0718']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.hud}>
        <View style={styles.hudBlock}>
          <Text style={styles.hudLabel}>PONTOS</Text>
          <Text style={styles.hudValue}>{score}</Text>
        </View>
        <View style={[styles.timerPill, timeLeft <= 5 && styles.timerDanger]}>
          <Text style={styles.timerText}>{timeLeft}s</Text>
        </View>
        <View style={styles.hudBlock}>
          <Text style={styles.hudLabel}>COMBO</Text>
          <Text style={styles.hudValue}>{combo}</Text>
        </View>
      </View>

      {flash === 'combo' && (
        <View style={styles.comboFlash}>
          <Text style={styles.comboFlashText}>+1 COMBO!</Text>
        </View>
      )}

      <View style={styles.targetArea}>
        <Text style={styles.targetLabel}>TOQUE EM</Text>
        <Text style={styles.targetSymbol}>{round.target}</Text>
      </View>

      <View style={[styles.grid, { maxWidth: columns === 2 ? 240 : 330 }]}>
        {round.options.map((symbol, i) => (
          <TouchableOpacity
            key={`${symbol}-${i}`}
            style={[styles.cell, { width: columns === 2 ? 104 : 96, height: columns === 2 ? 104 : 96 }]}
            activeOpacity={0.75}
            onPress={() => onTap(symbol, i)}
          >
            <Text style={styles.cellSymbol}>{symbol}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingTop: 60 },
  hud: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 28, marginBottom: 14 },
  hudBlock: { alignItems: 'center', width: 80 },
  hudLabel: { color: colors.textSecondary, fontSize: 9.5, fontWeight: '900', letterSpacing: 1.1 },
  hudValue: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 2 },
  timerPill: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(60,240,255,0.1)', borderWidth: 1, borderColor: 'rgba(60,240,255,0.4)' },
  timerDanger: { backgroundColor: 'rgba(255,60,110,0.14)', borderColor: colors.danger },
  timerText: { color: colors.accentCyan, fontSize: 17, fontWeight: '900' },
  comboFlash: { position: 'absolute', top: 110, alignSelf: 'center', zIndex: 5 },
  comboFlashText: { color: colors.accentLime, fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  targetArea: { alignItems: 'center', marginVertical: 26 },
  targetLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '900', letterSpacing: 1.6, marginBottom: 8 },
  targetSymbol: { color: colors.accentLime, fontSize: 64, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'center', justifyContent: 'center', gap: 14 },
  cell: { borderRadius: 20, backgroundColor: 'rgba(20,11,36,0.92)', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  cellSymbol: { color: '#fff', fontSize: 34, fontWeight: '900' },
});
