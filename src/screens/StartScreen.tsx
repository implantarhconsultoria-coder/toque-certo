import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { useAuth } from '../auth/AuthContext';
import { ArcadeBackdrop, GlassStat, NeonButton } from '../components/ArcadeUI';

type Props = NativeStackScreenProps<RootStackParamList, 'Start'>;
type Panel = 'missions' | 'settings' | 'profile' | null;
const achievements = [
  { title: 'PRIMEIRO IMPULSO', target: 10, description: 'Marque 10 pontos em uma partida' },
  { title: 'REFLEXOS AFIADOS', target: 25, description: 'Alcance o nível avançado' },
  { title: 'LENDA DO TOQUE', target: 40, description: 'Supere a marca de 40 pontos' },
];

export default function StartScreen({ navigation }: Props) {
  const [best, setBest] = useState(0);
  const { user, configured } = useAuth();
  const [panel, setPanel] = useState<Panel>(null);
  const [effects, setEffects] = useState(true);

  const load = useCallback(async () => {
    try {
      const [saved, setting] = await Promise.all([
        AsyncStorage.getItem('toqueCerto.bestScore'),
        AsyncStorage.getItem('toqueCerto.visualEffects'),
      ]);
      const value = Number(saved);
      setBest(Number.isFinite(value) && value > 0 ? value : 0);
      setEffects(setting !== 'false');
    } catch {
      setBest(0);
    }
  }, []);

  useEffect(() => {
    load();
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [load, navigation]);

  async function toggleEffects(value: boolean) {
    setEffects(value);
    try { await AsyncStorage.setItem('toqueCerto.visualEffects', String(value)); } catch {}
  }

  const completed = achievements.filter(item => best >= item.target).length;
  return (
    <SafeAreaView style={styles.screen}>
      <ArcadeBackdrop minimal={!effects} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setPanel('settings')} accessibilityLabel="Abrir configurações" style={styles.headerIcon}>
            <Text style={styles.headerGlyph}>⚙</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerBrand}>TOQUE CERTO</Text>
            <View style={styles.levelTrack}><LinearGradient colors={[colors.accentCyan, colors.accentPink]} style={[styles.levelProgress, { width: best >= 25 ? '100%' : best >= 10 ? '60%' : '25%' }]} /></View>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate(user ? 'Profile' : 'Auth')} accessibilityLabel="Abrir perfil ou entrar" style={styles.headerIcon}>
            <Text style={styles.headerGlyph}>◉</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          <View style={styles.eyebrowPill}><Text style={styles.eyebrow}>✦  DESAFIE SEUS REFLEXOS  ✦</Text></View>
          <Text style={styles.title}>TOQUE{'\n'}<Text style={styles.titleAccent}>CERTO</Text></Text>
          <Text style={styles.subtitle}>RÁPIDO. PRECISO. VICIANTE.</Text>
          <View style={styles.glass}>
            <Text style={styles.heroInfo}>30 SEGUNDOS PARA SUPERAR SEU LIMITE</Text>
            <Text style={styles.heroSmall}>Cada acerto conta. Cada segundo importa.</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <NeonButton label="▶  JOGAR" onPress={() => navigation.navigate('Game')} />
          <TouchableOpacity onPress={() => navigation.navigate(user ? 'Profile' : 'Auth')} accessibilityRole="button" style={{ alignItems: 'center', paddingVertical: 9 }}>
            <Text style={{ color: colors.accentCyan, fontSize: 11, letterSpacing: 1, fontWeight: '900' }}>{user ? '◉  MEU PERFIL' : configured ? '◉  ENTRAR / CRIAR CONTA' : '◉  CONTA ONLINE EM PREPARAÇÃO'}</Text>
          </TouchableOpacity>
          <View style={styles.secondaryActions}>
            <NeonButton label="✦  MISSÕES" kind="secondary" onPress={() => setPanel('missions')} />
            <NeonButton label="⚙  AJUSTES" kind="secondary" onPress={() => setPanel('settings')} />
          </View>
        </View>

        <View style={styles.bottom}>
          <View style={styles.statRow}>
            <GlassStat label="🏆  RECORDE" value={String(best)} accent={colors.accentLime} />
            <GlassStat label="✦  MISSÕES" value={String(completed) + '/3'} accent={colors.accentCyan} />
          </View>
          <Text style={styles.footerNote}>JOGUE GRÁTIS · SEM CADASTRO · OFFLINE</Text>
        </View>
      </ScrollView>

      <Modal visible={panel !== null} transparent animationType="fade" onRequestClose={() => setPanel(null)}>
        <View style={styles.modalScrim}>
          <View style={styles.modalCard}>
            <LinearGradient colors={['#282465', '#120E36', '#0F1032']} style={StyleSheet.absoluteFill} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{panel === 'missions' ? 'MISSÕES' : panel === 'settings' ? 'AJUSTES' : 'SEU PERFIL'}</Text>
              <TouchableOpacity onPress={() => setPanel(null)} accessibilityLabel="Fechar"><Text style={styles.close}>✕</Text></TouchableOpacity>
            </View>
            {panel === 'missions' && achievements.map((item, index) => (
              <View key={item.title} style={styles.mission}>
                <Text style={[styles.missionNumber, best >= item.target && { color: colors.accentLime }]}>{best >= item.target ? '✓' : String(index + 1).padStart(2, '0')}</Text>
                <View style={styles.missionText}>
                  <Text style={styles.missionTitle}>{item.title}</Text>
                  <Text style={styles.missionDesc}>{item.description}</Text>
                </View>
                <Text style={styles.missionStatus}>{best >= item.target ? 'FEITO' : String(best) + '/' + item.target}</Text>
              </View>
            ))}
            {panel === 'settings' && (
              <>
                <View style={styles.settingLine}>
                  <View style={styles.missionText}><Text style={styles.missionTitle}>Efeitos visuais</Text><Text style={styles.missionDesc}>Ondas de luz e brilhos decorativos</Text></View>
                  <Switch value={effects} onValueChange={toggleEffects} trackColor={{ false: '#3A4165', true: '#8A4FFF' }} thumbColor="#EAF9FF" />
                </View>
                <Text style={styles.settingHelp}>COMO JOGAR</Text>
                <Text style={styles.settingText}>Toque no símbolo indicado. Acertos somam pontos; cada erro custa 1 segundo. A cada 5 acertos consecutivos, você ganha 1 ponto extra. A grade cresce conforme a pontuação.</Text>
              </>
            )}
            {panel === 'profile' && (
              <>
                <Text style={styles.profileIcon}>◉</Text>
                <Text style={styles.profileTitle}>JOGADOR CONVIDADO</Text>
                <Text style={styles.profileSub}>Seu recorde fica salvo neste aparelho. O ranking online e as contas serão liberados quando o serviço estiver pronto.</Text>
                <View style={{ marginTop: 18 }}><GlassStat label="SEU MELHOR RESULTADO" value={String(best)} accent={colors.accentLime} /></View>
              </>
            )}
            <TouchableOpacity onPress={() => setPanel(null)} style={styles.modalDismiss}><Text style={styles.modalDismissText}>VOLTAR AO JOGO</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgDeep },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 22, maxWidth: 460, width: '100%', alignSelf: 'center', paddingTop: 10, paddingBottom: 22 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 54 },
  headerIcon: { height: 43, width: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(32,35,83,0.58)', borderWidth: 1, borderColor: 'rgba(122,141,255,0.4)' },
  headerGlyph: { color: '#D5E3FF', fontSize: 25, fontWeight: '900' },
  headerCenter: { flex: 1, paddingHorizontal: 28, alignItems: 'center', gap: 8 },
  headerBrand: { color: '#AAB5DF', letterSpacing: 3, fontWeight: '900', fontSize: 10 },
  levelTrack: { height: 5, width: '100%', borderRadius: 6, backgroundColor: '#33326D', overflow: 'hidden' },
  levelProgress: { height: '100%', borderRadius: 6 },
  hero: { flex: 1, minHeight: 310, paddingTop: 55, alignItems: 'center', justifyContent: 'center' },
  eyebrowPill: { backgroundColor: 'rgba(11,17,58,0.76)', borderWidth: 1, borderColor: 'rgba(70,220,255,0.3)', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  eyebrow: { color: colors.accentCyan, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  title: { marginTop: 23, textAlign: 'center', fontSize: 58, lineHeight: 61, fontWeight: '900', letterSpacing: -1, color: '#FFFFFF', textShadowColor: '#157AFF', textShadowRadius: 25 },
  titleAccent: { color: '#F5CAFF', textShadowColor: '#FF32EC', textShadowRadius: 21 },
  subtitle: { marginTop: 15, color: '#B5BBE8', fontSize: 11, letterSpacing: 2, fontWeight: '800' },
  glass: { marginTop: 27, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(117,145,255,0.35)', backgroundColor: 'rgba(17,17,61,0.68)', borderRadius: 17, width: '100%' },
  heroInfo: { fontWeight: '900', color: '#F7FAFF', letterSpacing: 1, fontSize: 12, textAlign: 'center' },
  heroSmall: { color: '#A1AAD6', marginTop: 6, textAlign: 'center', fontSize: 12 },
  actions: { width: '100%', gap: 13, paddingHorizontal: 8, marginBottom: 25 },
  secondaryActions: { gap: 11, marginTop: 8 },
  bottom: { marginTop: 'auto' },
  statRow: { flexDirection: 'row', gap: 10 },
  footerNote: { textAlign: 'center', marginTop: 15, color: '#8B94C5', fontWeight: '800', letterSpacing: 1.2, fontSize: 9 },
  modalScrim: { flex: 1, backgroundColor: 'rgba(1,2,17,0.84)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  modalCard: { borderColor: '#8759EF', borderWidth: 1, borderRadius: 25, padding: 22, maxWidth: 440, width: '100%', overflow: 'hidden', shadowColor: '#8437FF', shadowOpacity: 0.45, shadowRadius: 25, elevation: 14 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  modalTitle: { color: '#FFF', fontWeight: '900', fontSize: 23, letterSpacing: 1.5 },
  close: { color: '#F4D4FF', fontSize: 23, paddingHorizontal: 4 },
  mission: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomColor: '#3D3772', borderBottomWidth: 1, gap: 12 },
  missionNumber: { color: colors.accentCyan, fontWeight: '900', fontSize: 19, width: 30 },
  missionText: { flex: 1 },
  missionTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 0.3 },
  missionDesc: { color: '#A8B1D6', fontSize: 11, marginTop: 5 },
  missionStatus: { fontWeight: '900', fontSize: 10, color: colors.accentLime },
  settingLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingHelp: { color: colors.accentCyan, fontSize: 11, fontWeight: '900', letterSpacing: 2, marginTop: 27, marginBottom: 10 },
  settingText: { color: '#C7CAE4', fontSize: 13, lineHeight: 21 },
  profileIcon: { color: colors.accentCyan, fontSize: 50, textAlign: 'center' },
  profileTitle: { color: '#FFF', fontSize: 19, fontWeight: '900', textAlign: 'center', marginTop: 7 },
  profileSub: { color: '#BEC3DF', textAlign: 'center', fontSize: 13, lineHeight: 20, marginTop: 14 },
  modalDismiss: { paddingVertical: 15, backgroundColor: '#5521A6', borderRadius: 13, marginTop: 25 },
  modalDismissText: { color: '#FFF', textAlign: 'center', fontWeight: '900', letterSpacing: 1 },
});
