import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { ArcadeBackdrop, NeonButton } from '../components/ArcadeUI';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../auth/supabase';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
  const { user, loading } = useAuth();
  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');

  useEffect(() => {
    if (!loading && !user) navigation.replace('Auth');
  }, [user, loading, navigation]);

  useEffect(() => {
    if (!user || !supabase) return;
    const fallback = typeof user.user_metadata.nickname === 'string' ? user.user_metadata.nickname : (user.email?.split('@')[0] || 'Jogador');
    setNickname(fallback);
    setAvatarUrl(typeof user.user_metadata.avatar_url === 'string' ? user.user_metadata.avatar_url : '');
    supabase.from('profiles').select('nickname,avatar_url').eq('id', user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setNickname(data.nickname || fallback);
          setAvatarUrl(data.avatar_url || '');
        }
      });
  }, [user?.id]);

  async function saveProfile() {
    if (!user || !supabase || busy) return;
    const cleanNick = nickname.trim();
    const cleanUrl = avatarUrl.trim();
    if (cleanNick.length < 3 || cleanNick.length > 32) { setNotice('O apelido precisa ter de 3 a 32 caracteres.'); return; }
    if (cleanUrl && (!cleanUrl.startsWith('https://') || cleanUrl.length > 512)) { setNotice('Use uma URL HTTPS válida para o avatar.'); return; }
    setBusy(true); setNotice('');
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id, nickname: cleanNick, avatar_url: cleanUrl || null,
      }, { onConflict: 'id' });
      if (error) throw error;
      const updated = await supabase.auth.updateUser({ data: { nickname: cleanNick, avatar_url: cleanUrl || null } });
      if (updated.error) throw updated.error;
      setNotice('Perfil atualizado com sucesso.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível salvar o perfil.');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    if (!supabase || busy) return;
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    setBusy(false);
    if (error) setNotice(error.message);
    else navigation.reset({ index: 0, routes: [{ name: 'Start' }] });
  }

  async function deleteAccount() {
    if (!supabase || !user || confirmation !== 'EXCLUIR' || busy) return;
    setBusy(true); setNotice('');
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: { confirm: 'EXCLUIR' },
      });
      if (error || data?.deleted !== true) throw error || new Error('Servidor não confirmou a exclusão.');
      await supabase.auth.signOut({ scope: 'local' });
      setDeleteOpen(false);
      navigation.reset({ index: 0, routes: [{ name: 'Start' }] });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Exclusão indisponível. Tente novamente.');
      setDeleteOpen(false);
    } finally { setBusy(false); }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ArcadeBackdrop minimal />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.navigate('Start')}>
          <Text style={styles.backText}>‹  MENU PRINCIPAL</Text>
        </TouchableOpacity>
        <Text style={styles.title}>MEU PERFIL</Text>
        <View style={styles.avatar}>
          {!!avatarUrl.trim().startsWith('https://') ? <Image source={{ uri: avatarUrl }} style={styles.avatarImage} /> : <Text style={styles.avatarInitial}>{(nickname || '?').charAt(0).toUpperCase()}</Text>}
        </View>
        <Text style={styles.email}>{user?.email ?? 'Conta conectada'}</Text>
        <View style={styles.form}>
          <Text style={styles.label}>APELIDO</Text>
          <TextInput style={styles.input} placeholder="Seu apelido" placeholderTextColor="#9194BE" value={nickname} onChangeText={setNickname} maxLength={32} accessibilityLabel="Apelido" />
          <Text style={styles.label}>URL HTTPS DO AVATAR (OPCIONAL)</Text>
          <TextInput style={styles.input} placeholder="https://..." placeholderTextColor="#9194BE" value={avatarUrl} onChangeText={setAvatarUrl} autoCapitalize="none" autoCorrect={false} accessibilityLabel="URL do avatar" />
          <NeonButton label="SALVAR PERFIL" onPress={() => void saveProfile()} disabled={busy || !user} />
          {busy && <ActivityIndicator color={colors.accentCyan} />}
          {!!notice && <Text style={styles.notice} accessibilityRole="alert">{notice}</Text>}
          <NeonButton label="SAIR DA CONTA" kind="secondary" onPress={() => void logout()} disabled={busy} />
          <TouchableOpacity style={styles.deleteLink} onPress={() => setDeleteOpen(true)}>
            <Text style={styles.deleteText}>EXCLUIR MINHA CONTA</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Modal visible={deleteOpen} transparent animationType="fade" onRequestClose={() => setDeleteOpen(false)}>
        <View style={styles.scrim}>
          <View style={styles.deleteCard}>
            <Text style={styles.deleteTitle}>EXCLUIR CONTA</Text>
            <Text style={styles.deleteMessage}>Essa ação é permanente e remove seu perfil e acesso ao Toque Certo. Digite EXCLUIR para confirmar.</Text>
            <TextInput style={styles.input} value={confirmation} onChangeText={setConfirmation} placeholder="EXCLUIR" placeholderTextColor="#999" autoCapitalize="characters" accessibilityLabel="Confirmação de exclusão" />
            <TouchableOpacity disabled={confirmation !== 'EXCLUIR' || busy} onPress={() => void deleteAccount()} style={[styles.confirmButton, (confirmation !== 'EXCLUIR' || busy) && { opacity: 0.4 }]}>
              <Text style={styles.confirmText}>CONFIRMAR EXCLUSÃO PERMANENTE</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setDeleteOpen(false); setConfirmation(''); }} style={styles.cancel}>
              <Text style={styles.cancelText}>CANCELAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgDeep },
  content: { flexGrow: 1, maxWidth: 460, width: '100%', alignSelf: 'center', padding: 24, paddingBottom: 45 },
  back: { paddingVertical: 10 }, backText: { color: '#CABDF5', fontWeight: '900', fontSize: 12 },
  title: { textAlign: 'center', fontWeight: '900', fontSize: 34, color: '#F2D1FF', textShadowColor: '#AC39FF', textShadowRadius: 15, marginTop: 27 },
  avatar: { alignSelf: 'center', height: 96, width: 96, borderRadius: 48, borderWidth: 3, borderColor: colors.accentCyan, backgroundColor: '#291452', marginTop: 28, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: 92, height: 92, borderRadius: 46 },
  avatarInitial: { color: '#FFF', fontWeight: '900', fontSize: 52 },
  email: { color: '#AFBAED', textAlign: 'center', fontSize: 13, marginTop: 12 },
  form: { marginTop: 30, gap: 13 },
  label: { color: '#BEC2ED', fontSize: 11, letterSpacing: 1.1, fontWeight: '900' },
  input: { height: 55, paddingHorizontal: 15, borderRadius: 14, borderWidth: 1, borderColor: '#6656A9', backgroundColor: '#18133D', color: '#FFF', fontSize: 14 },
  notice: { color: '#E8E5F9', textAlign: 'center', lineHeight: 19 },
  deleteLink: { alignItems: 'center', padding: 19 },
  deleteText: { fontWeight: '900', fontSize: 11, color: '#FF8B9F' },
  scrim: { flex: 1, backgroundColor: 'rgba(2,1,14,0.88)', justifyContent: 'center', padding: 23 },
  deleteCard: { width: '100%', maxWidth: 400, alignSelf: 'center', backgroundColor: '#231442', borderRadius: 20, borderWidth: 1, borderColor: colors.danger, padding: 23, gap: 18 },
  deleteTitle: { color: '#FF9CB5', textAlign: 'center', fontSize: 22, fontWeight: '900' },
  deleteMessage: { color: '#DFD6F6', lineHeight: 21, fontSize: 13 },
  confirmButton: { paddingVertical: 15, backgroundColor: '#9D234E', borderRadius: 10, alignItems: 'center' },
  confirmText: { fontSize: 11, color: '#FFF', fontWeight: '900', textAlign: 'center' },
  cancel: { alignItems: 'center', paddingVertical: 7 }, cancelText: { color: '#D0D0EE', fontWeight: '900' },
});
