import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Share, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { ArcadeBackdrop, NeonButton } from '../components/ArcadeUI';
import { useAuth } from '../auth/AuthContext';
import { loadProgress, saveProgress } from '../services/progressStore';
import { preloadRewardedAd, rewardedAdsAvailable, showRewardedAd } from '../services/rewardedAds';
import { applyGame, challengeLink, levelInfo, Progress } from '../utils/progression';
import { PUBLIC_SITE_URL as publicUrl } from '../utils/links';

type Props = NativeStackScreenProps<RootStackParamList, 'GameOver'>;

export default function GameOverScreen({ navigation, route }: Props) {
  const { score, bestCombo, isNewRecord } = route.params;
  const [best, setBest] = useState(score);
  const [shareMessage, setShareMessage] = useState('');
  const { user } = useAuth();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [earned, setEarned] = useState({ xp: 0, coins: 0 });
  const [leveledUp, setLeveledUp] = useState(false);
  const [doubled, setDoubled] = useState(false);
  const [adBusy, setAdBusy] = useState(false);
  const applied = useRef(false);

  useEffect(() => { preloadRewardedAd('fim_de_partida'); }, []);

  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    loadProgress().then(current => {
      const result = applyGame(current, score, bestCombo);
      setProgress(result.progress);
      setEarned(result.reward);
      setLeveledUp(result.leveledUp);
      void saveProgress(result.progress);
    });
  }, [score, bestCombo]);

  async function doubleCoins() {
    if (adBusy || doubled || !progress) return;
    setAdBusy(true);
    const ok = await showRewardedAd('dobrar_moedas');
    setAdBusy(false);
    if (!ok) { setShareMessage('VÍDEO INDISPONÍVEL AGORA. TENTE MAIS TARDE.'); return; }
    const next = { ...progress, coins: progress.coins + earned.coins };
    setProgress(next);
    setDoubled(true);
    void saveProgress(next);
  }

  useEffect(() => {
    AsyncStorage.getItem('toqueCerto.bestScore').then(raw => {
      const value = Number(raw);
      if (Number.isFinite(value)) setBest(Math.max(score, value));
    }).catch(() => {});
  }, [score]);

  async function shareScore() {
    const name = (user?.user_metadata?.full_name || user?.user_metadata?.name || '') as string;
    const link = challengeLink(publicUrl, score, name.split(' ')[0] || undefined);
    const message = '⚡ DESAFIO TOQUE CERTO ⚡\nFiz ' + score + ' pontos em 30 segundos (nível ' + levelInfo(progress?.xp ?? 0).level + ')! 🏆\nDuvido você me superar 👇\n' + link + '\n#ToqueCerto #Desafio';
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
          await navigator.share({ title: 'Desafio Toque Certo', text: message });
          return;
        }
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(message);
          setShareMessage('DESAFIO COPIADO! ENVIE AOS AMIGOS.');
          return;
        }
        setShareMessage('COMPARTILHE O LINK: ' + link);
        return;
      }
      await Share.share({ message, title: 'Desafio Toque Certo' });
    } catch {
      setShareMessage('NÃO FOI POSSÍVEL COMPARTILHAR AGORA.');
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ArcadeBackdrop variant="result" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <Text style={styles.brand}>TOQUE CERTO</Text>
          <Text style={styles.eyebrow}>✦  FIM DA PARTIDA  ✦</Text>
        </View>

        <View style={styles.headline}>
          <Text style={styles.headlineTop}>{isNewRecord ? 'NOVO' : 'FIM DE'}</Text>
          <Text style={styles.headlineBottom}>{isNewRecord ? 'RECORDE!' : 'JOGO!'}</Text>
        </View>

        <View style={styles.arcadeFrame}>
          <LinearGradient colors={['#168EFF', '#5B31E9', '#AE30EC']} style={styles.arcadeRim}>
            <View style={styles.arcadeInner}>
              <View style={styles.arcadeHeader}>
                <Text style={styles.scoreLabel}>SUA PONTUAÇÃO</Text>
                <Text style={styles.score}>{score}</Text>
                <Text style={styles.pointLabel}>PONTOS</Text>
              </View>
              <View style={styles.line} />
              <View style={styles.row}>
                <Text style={styles.statLabel}>🏆  RECORDE</Text>
                <Text style={styles.statValue}>{best}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.statLabel}>⚡  MELHOR COMBO</Text>
                <Text style={[styles.statValue, { color: colors.accentCyan }]}>×{bestCombo}</Text>
              </View>
              <View style={styles.line} />
              <View style={styles.row}>
                <Text style={styles.statLabel}>✦  XP GANHO</Text>
                <Text style={[styles.statValue, { color: colors.accentLime }]}>+{earned.xp}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.statLabel}>🪙  MOEDAS</Text>
                <Text style={styles.statValue}>+{doubled ? earned.coins * 2 : earned.coins}</Text>
              </View>
              {progress && (() => {
                const info = levelInfo(progress.xp);
                return (
                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.levelText}>{leveledUp ? '⬆ SUBIU PARA O NÍVEL ' : 'NÍVEL '}{info.level} · {info.title}</Text>
                    <View style={styles.xpTrack}><View style={[styles.xpFill, { width: (Math.round(info.current / info.needed * 100) + '%') as '100%' }]} /></View>
                    <Text style={styles.xpText}>{info.current}/{info.needed} XP · 🪙 {progress.coins}</Text>
                  </View>
                );
              })()}
              <Text style={styles.encouragement}>{isNewRecord ? 'VOCÊ SUPEROU SEU LIMITE!' : 'MAIS UMA RODADA PARA IR ALÉM?'}</Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.ctas}>
          <NeonButton label="▶  JOGAR DE NOVO" onPress={() => navigation.replace('Game')} />
          {rewardedAdsAvailable() && !doubled && earned.coins > 0 && (
            <NeonButton label={adBusy ? 'CARREGANDO VÍDEO…' : '🎬  DOBRAR MOEDAS (+' + earned.coins + ')'} kind="secondary" onPress={doubleCoins} />
          )}
          <NeonButton label="⚔  DESAFIAR AMIGOS" kind="cyan" onPress={shareScore} />
          <TouchableOpacity style={styles.menuLink} onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Start' }] })} accessibilityRole="button">
            <Text style={styles.menuText}>⌂   VOLTAR AO MENU</Text>
          </TouchableOpacity>
          {!!shareMessage && <Text style={styles.shareInfo}>{shareMessage}</Text>}
        </View>

        <View style={styles.floor}>
          {['◆', '■', '◆', '■', '◆', '■', '◆'].map((shape, index) => (
            <Text key={index} style={[styles.floorGem, { color: index % 2 ? '#3C8AFF' : '#E949F8' }]}>{shape}</Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#10082E' },
  scroll: { flex: 1 },
  content: { width: '100%', maxWidth: 440, alignSelf: 'center', flexGrow: 1, paddingHorizontal: 24, paddingTop: 15, paddingBottom: 24, justifyContent: 'center' },
  top: { alignItems: 'center' },
  brand: { color: '#C4E6FF', fontSize: 11, letterSpacing: 3, fontWeight: '900' },
  eyebrow: { color: '#B8B6F4', fontSize: 11, letterSpacing: 1.4, fontWeight: '900', marginTop: 12 },
  headline: { alignItems: 'center', marginTop: 20, marginBottom: -8, zIndex: 2 },
  headlineTop: { color: '#FFC5FF', textAlign: 'center', fontSize: 43, fontWeight: '900', lineHeight: 47, textShadowColor: '#F727F2', textShadowRadius: 18, letterSpacing: 1 },
  headlineBottom: { color: '#EB8BFF', textAlign: 'center', fontSize: 52, fontWeight: '900', lineHeight: 58, textShadowColor: '#A51BFF', textShadowRadius: 23, letterSpacing: 1 },
  arcadeFrame: { width: '100%', shadowColor: '#4B93FF', shadowOpacity: 0.84, shadowRadius: 26, elevation: 12, marginTop: 8 },
  arcadeRim: { borderRadius: 29, padding: 5 },
  arcadeInner: { backgroundColor: '#22065B', borderRadius: 25, paddingHorizontal: 24, paddingVertical: 25, borderColor: '#8156FC', borderWidth: 2 },
  arcadeHeader: { alignItems: 'center' },
  scoreLabel: { color: '#EAC6FF', letterSpacing: 1.7, fontWeight: '900', fontSize: 12 },
  score: { fontSize: 84, lineHeight: 94, color: '#FFE35E', fontWeight: '900', textShadowColor: '#FF29E6', textShadowRadius: 23 },
  pointLabel: { color: '#F0D8FF', letterSpacing: 2, fontSize: 12, fontWeight: '900' },
  line: { marginVertical: 23, backgroundColor: '#824DD6', height: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  statLabel: { fontSize: 13, color: '#C8C8FB', letterSpacing: 1.2, fontWeight: '900' },
  statValue: { fontSize: 29, color: '#FFE463', fontWeight: '900', textShadowColor: '#F971EA', textShadowRadius: 8 },
  encouragement: { color: '#F5CCFF', marginTop: 22, fontWeight: '900', fontSize: 11, letterSpacing: 1, textAlign: 'center' },
  ctas: { marginTop: 24, gap: 12 },
  menuLink: { padding: 8, alignItems: 'center' },
  menuText: { color: '#CECEF4', fontWeight: '900', letterSpacing: 1, fontSize: 12 },
  shareInfo: { textAlign: 'center', color: colors.accentLime, fontSize: 11, fontWeight: '900', lineHeight: 16 },
  levelText: { color: '#F5CCFF', fontWeight: '900', fontSize: 12, letterSpacing: 1, textAlign: 'center' },
  xpTrack: { height: 8, borderRadius: 8, backgroundColor: '#3A1F7A', marginTop: 8, overflow: 'hidden' },
  xpFill: { height: '100%', backgroundColor: colors.accentLime, borderRadius: 8 },
  xpText: { color: '#C8C8FB', fontSize: 10, fontWeight: '800', textAlign: 'center', marginTop: 6, letterSpacing: 0.8 },
  floor: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 26, opacity: 0.7 },
  floorGem: { fontSize: 22, textShadowColor: '#B643FF', textShadowRadius: 10 },
});
