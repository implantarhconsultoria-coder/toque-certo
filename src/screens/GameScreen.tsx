import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { generateRound, Round } from '../utils/gameLogic';
import { ArcadeBackdrop, GlassStat, NeonButton } from '../components/ArcadeUI';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;
const TOTAL_TIME = 30000;
const symbols = ['#49E5FF', '#F66EFF', '#CDFF5F', '#FFB759', '#74A5FF', '#FF71A4'];

export default function GameScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [round, setRound] = useState<Round>(() => generateRound(0));
  const [flash, setFlash] = useState<'bonus' | 'wrong' | null>(null);
  const [paused, setPaused] = useState(false);
  const [effects, setEffects] = useState(true);

  const deadline = useRef(Date.now() + TOTAL_TIME);
  const scoreRef = useRef(0);
  const bestComboRef = useRef(0);
  const finishedRef = useRef(false);
  const tapLock = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem('toqueCerto.visualEffects').then(value => setEffects(value !== 'false')).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (paused) return;
      const next = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setTimeLeft(current => current === next ? current : next);
    }, 150);
    return () => clearInterval(timer);
  }, [paused]);

  useEffect(() => {
    if (timeLeft !== 0 || finishedRef.current || paused) return;
    finishedRef.current = true;
    async function finish() {
      const finalScore = scoreRef.current;
      let isNewRecord = false;
      try {
        const value = await AsyncStorage.getItem('toqueCerto.bestScore');
        const saved = Math.max(0, Number(value) || 0);
        isNewRecord = finalScore > saved;
        if (isNewRecord) await AsyncStorage.setItem('toqueCerto.bestScore', String(finalScore));
      } catch {
        // A partida deve terminar mesmo que o armazenamento local falhe.
      }
      navigation.replace('GameOver', { score: finalScore, bestCombo: bestComboRef.current, isNewRecord });
    }
    void finish();
  }, [timeLeft, paused, navigation]);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 380);
    return () => clearTimeout(timer);
  }, [flash]);

  function onTap(symbol: string, index: number) {
    if (paused || timeLeft <= 0 || finishedRef.current || tapLock.current) return;
    tapLock.current = true;
    setTimeout(() => { tapLock.current = false; }, 80);
    if (index === round.targetIndex && symbol === round.target) {
      const nextCombo = combo + 1;
      const bonus = nextCombo % 5 === 0 ? 1 : 0;
      const nextScore = scoreRef.current + 1 + bonus;
      scoreRef.current = nextScore;
      bestComboRef.current = Math.max(bestComboRef.current, nextCombo);
      setScore(nextScore);
      setCombo(nextCombo);
      setBestCombo(bestComboRef.current);
      if (bonus && effects) setFlash('bonus');
      setRound(generateRound(nextScore));
    } else {
      setCombo(0);
      deadline.current -= 1000;
      setTimeLeft(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)));
      if (effects) setFlash('wrong');
    }
  }

  function resume() {
    deadline.current = Date.now() + timeLeft * 1000;
    setPaused(false);
  }

  const columns = round.options.length === 4 ? 2 : 3;
  const level = score >= 25 ? 3 : score >= 10 ? 2 : 1;
  const levelName = level === 1 ? 'INICIANTE' : level === 2 ? 'ÁGIL' : 'AVANÇADO';
  const cellSize = Math.max(63, Math.min(columns === 2 ? 135 : 100, Math.floor((Math.min(width - 56, 370) - (columns - 1) * 10) / columns)));

  return (
    <SafeAreaView style={styles.screen}>
      <ArcadeBackdrop variant="game" minimal={!effects} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => setPaused(true)} accessibilityLabel="Pausar jogo" style={styles.pauseButton}>
            <Text style={styles.pauseGlyph}>Ⅱ</Text>
          </TouchableOpacity>
          <Text style={styles.brand}>TOQUE CERTO</Text>
          <Text style={styles.levelLabel}>NÍVEL {level}</Text>
        </View>
        <View style={styles.progressRail}>
          <LinearGradient colors={[colors.accentCyan, colors.accentBlue, colors.accentPink]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.progressValue, { width: (timeLeft / 30 * 100) + '%' }]} />
        </View>

        <View style={styles.stats}>
          <GlassStat label="PONTOS" value={String(score)} accent="#FFFFFF" />
          <GlassStat label="TEMPO" value={timeLeft + 's'} accent={timeLeft <= 5 ? '#FF7396' : colors.accentCyan} />
          <GlassStat label="COMBO" value={'×' + String(combo)} accent={colors.accentLime} />
        </View>

        <View style={styles.challengeArea}>
          <Text style={styles.challengeEyebrow}>✦  {levelName}  ✦</Text>
          <Text style={styles.challengeTitle}>TOQUE NO SÍMBOLO</Text>
          <View style={styles.targetRim}>
            <LinearGradient colors={['#22E2FF', '#8B39FA', '#F65BEE']} style={styles.targetRimGradient}>
              <View style={styles.targetFace}>
                <Text style={styles.targetSymbol}>{round.target}</Text>
              </View>
            </LinearGradient>
          </View>
          <Text style={styles.challengeHint}>SEJA RÁPIDO E PRECISO!</Text>
          {flash === 'bonus' && <Text style={styles.bonus}>✦ COMBO PERFEITO +1 ✦</Text>}
          {flash === 'wrong' && <Text style={styles.wrong}>ERROU! −1 SEGUNDO</Text>}
        </View>

        <View style={styles.grid}>
          {round.options.map((symbol, index) => (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={'Símbolo ' + symbol + ', opção ' + (index + 1)}
              key={symbol + index} activeOpacity={0.65}
              onPress={() => onTap(symbol, index)}
              style={[styles.tileOuter, { width: cellSize, height: cellSize }]}
            >
              <LinearGradient
                colors={[symbols[index % symbols.length], '#5940BA', '#7140D9']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tileRim}
              >
                <LinearGradient colors={['#272163', '#191544', '#16153B']} style={styles.tileInner}>
                  <Text style={[styles.tileSymbol, { fontSize: columns === 2 ? 45 : 33, color: symbols[index % symbols.length] }]}>{symbol}</Text>
                </LinearGradient>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.bottomPanel}>
          <Text style={styles.bottomInfo}>{round.options.length} ALVOS  •  ACERTO +1  •  ERRO −1s</Text>
          <Text style={styles.bottomSub}>COMBOS DE 5 ACERTOS VALEM PONTO EXTRA</Text>
        </View>
      </ScrollView>

      <Modal visible={paused} transparent animationType="fade" onRequestClose={resume}>
        <View style={styles.pauseBackdrop}>
          <View style={styles.pauseCard}>
            <Text style={styles.pauseTitle}>PAUSA</Text>
            <Text style={styles.pauseMessage}>O relógio está parado. Seus pontos continuam aqui.</Text>
            <NeonButton label="▶  CONTINUAR" onPress={resume} />
            <TouchableOpacity style={styles.exitButton} onPress={() => { setPaused(false); finishedRef.current = true; navigation.reset({ index: 0, routes: [{ name: 'Start' }] }); }}>
              <Text style={styles.exitText}>ENCERRAR PARTIDA</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgDeep },
  scroll: { flex: 1 },
  content: { flexGrow: 1, maxWidth: 470, width: '100%', alignSelf: 'center', paddingHorizontal: 22, paddingTop: 7, paddingBottom: 22 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pauseButton: { height: 39, width: 39, borderRadius: 10, backgroundColor: '#4E1A87', borderColor: '#BE5CFF', borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  pauseGlyph: { color: '#F9E1FF', fontSize: 24, fontWeight: '900', textShadowRadius: 12, textShadowColor: '#FE62FF' },
  brand: { color: '#EAF6FF', fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  levelLabel: { color: colors.accentCyan, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  progressRail: { height: 8, backgroundColor: '#2C2464', overflow: 'hidden', marginTop: 14, borderRadius: 20, borderWidth: 1, borderColor: '#6258B8' },
  progressValue: { height: '100%', borderRadius: 20 },
  stats: { flexDirection: 'row', marginTop: 17, gap: 9 },
  challengeArea: { flexGrow: 1, minHeight: 213, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  challengeEyebrow: { color: colors.accentLime, fontWeight: '900', letterSpacing: 2, fontSize: 11 },
  challengeTitle: { color: '#E1DCFF', fontSize: 15, fontWeight: '900', marginTop: 14, letterSpacing: 1.2, textAlign: 'center' },
  targetRim: { marginTop: 17, borderRadius: 74, shadowColor: colors.accentPink, shadowOpacity: 0.78, shadowRadius: 22, elevation: 6 },
  targetRimGradient: { width: 124, height: 124, borderRadius: 70, padding: 3 },
  targetFace: { flex: 1, borderRadius: 70, backgroundColor: '#190F49', alignItems: 'center', justifyContent: 'center' },
  targetSymbol: { color: '#D5F5FF', fontSize: 66, fontWeight: '900', textShadowColor: colors.accentCyan, textShadowRadius: 23 },
  challengeHint: { color: '#AFB8E3', letterSpacing: 1.2, fontSize: 10, marginTop: 15, fontWeight: '800' },
  bonus: { position: 'absolute', bottom: 4, fontWeight: '900', fontSize: 12, color: colors.accentLime, textShadowRadius: 14, textShadowColor: colors.accentLime },
  wrong: { position: 'absolute', bottom: 4, fontWeight: '900', fontSize: 12, color: colors.danger },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignSelf: 'center', gap: 10, width: '100%' },
  tileOuter: { borderRadius: 22, shadowColor: '#755AFD', shadowOpacity: 0.45, shadowRadius: 10, elevation: 4 },
  tileRim: { flex: 1, padding: 2, borderRadius: 22 },
  tileInner: { flex: 1, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  tileSymbol: { fontWeight: '900', textShadowColor: '#586DFF', textShadowRadius: 13 },
  bottomPanel: { alignItems: 'center', marginTop: 24, paddingVertical: 13, paddingHorizontal: 5, borderTopWidth: 1, borderColor: '#3D376E' },
  bottomInfo: { color: '#C7D0FD', letterSpacing: 0.8, fontWeight: '900', fontSize: 10, textAlign: 'center' },
  bottomSub: { color: '#838DBF', letterSpacing: 0.7, fontWeight: '700', fontSize: 9, textAlign: 'center', marginTop: 7 },
  pauseBackdrop: { flex: 1, backgroundColor: 'rgba(2,3,16,0.87)', justifyContent: 'center', alignItems: 'center', padding: 22 },
  pauseCard: { width: '100%', maxWidth: 380, backgroundColor: '#16103C', padding: 28, borderRadius: 25, borderWidth: 2, borderColor: '#8D3FFC', shadowColor: '#7B3FFF', shadowOpacity: 0.5, shadowRadius: 25 },
  pauseTitle: { fontWeight: '900', fontSize: 34, textAlign: 'center', color: '#F5D5FF', textShadowColor: '#C438FF', textShadowRadius: 15 },
  pauseMessage: { color: '#C3BFE7', textAlign: 'center', marginTop: 14, marginBottom: 26, lineHeight: 21 },
  exitButton: { alignItems: 'center', paddingVertical: 18 },
  exitText: { color: '#B2ABD4', fontWeight: '900', letterSpacing: 1.1, fontSize: 12 },
});
