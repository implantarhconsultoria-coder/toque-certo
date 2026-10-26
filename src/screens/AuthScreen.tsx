import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { ArcadeBackdrop, NeonButton } from '../components/ArcadeUI';
import { useAuth } from '../auth/AuthContext';
import { authRedirectUrl, signInWithProvider, supabase } from '../auth/supabase';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;
type Mode = 'signin' | 'signup' | 'recover' | 'reset';

export default function AuthScreen({ navigation }: Props) {
  const { user, loading, configured, recoveryMode, clearRecoveryMode } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (recoveryMode) setMode('reset');
  }, [recoveryMode]);
  useEffect(() => {
    if (user && !recoveryMode && mode !== 'reset') navigation.replace('Profile');
  }, [user, recoveryMode, mode, navigation]);

  async function submit() {
    if (!supabase) { setNotice('A conta online ainda está em configuração. Você pode jogar como convidado.'); return; }
    if (busy) return;
    setNotice('');
    if (mode !== 'reset' && (!email.trim() || !email.includes('@'))) {
      setNotice('Informe um e-mail válido.'); return;
    }
    if (mode === 'signup' && nickname.trim().length < 3) {
      setNotice('Escolha um apelido com pelo menos 3 caracteres.'); return;
    }
    if (mode !== 'recover' && password.length < 8) {
      setNotice('Use uma senha com pelo menos 8 caracteres.'); return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(), password,
          options: { emailRedirectTo: authRedirectUrl(), data: { nickname: nickname.trim() } },
        });
        if (error) throw error;
        setNotice(data.session
          ? 'Conta criada. Você já pode entrar no seu perfil.'
          : 'Cadastro solicitado. Confira seu e-mail para confirmar a conta.');
      } else if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (error) throw error;
      } else if (mode === 'recover') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: authRedirectUrl() });
        if (error) throw error;
        setNotice('Se houver uma conta com esse e-mail, enviaremos instruções de recuperação.');
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        clearRecoveryMode();
        setMode('signin');
        setPassword('');
        setNotice('Senha alterada. Entre novamente para continuar.');
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível concluir a operação.');
    } finally {
      setBusy(false);
    }
  }

  async function social(provider: 'google' | 'apple') {
    setBusy(true); setNotice('');
    try { await signInWithProvider(provider); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Falha ao entrar com o provedor.'); }
    finally { setBusy(false); }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ArcadeBackdrop minimal />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.navigate('Start')}>
          <Text style={styles.backText}>‹  VOLTAR</Text>
        </TouchableOpacity>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>✦  TOQUE CERTO  ✦</Text>
          <Text style={styles.title}>{mode === 'signup' ? 'CRIAR CONTA' : mode === 'recover' ? 'RECUPERAR SENHA' : mode === 'reset' ? 'NOVA SENHA' : 'ENTRAR'}</Text>
          <Text style={styles.caption}>{mode === 'signin' ? 'Entre para ter um perfil de jogador.' : mode === 'signup' ? 'Sua identidade na arena começa aqui.' : 'Proteja o acesso à sua conta.'}</Text>
        </View>
        <View style={styles.form}>
          {!configured && (
            <View style={styles.warning}><Text style={styles.warningText}>Cadastro online indisponível até ativarmos o Supabase exclusivo do Toque Certo. O modo convidado continua funcionando.</Text></View>
          )}
          {mode === 'signup' && <TextInput
            style={styles.input} placeholder="Apelido (3 a 32 caracteres)" placeholderTextColor="#9297C6"
            accessibilityLabel="Apelido" maxLength={32} value={nickname} onChangeText={setNickname}
            autoCapitalize="words" autoCorrect={false} />}
          {mode !== 'reset' && <TextInput
            style={styles.input} placeholder="Seu e-mail" placeholderTextColor="#9297C6"
            accessibilityLabel="E-mail" autoCapitalize="none" autoCorrect={false}
            keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} />}
          {mode !== 'recover' && <TextInput
            style={styles.input} placeholder={mode === 'reset' ? 'Nova senha (mínimo 8 caracteres)' : 'Senha (mínimo 8 caracteres)'}
            placeholderTextColor="#9297C6" accessibilityLabel="Senha" autoCapitalize="none"
            secureTextEntry autoComplete={mode === 'signup' ? 'new-password' : 'password'}
            value={password} onChangeText={setPassword} />}
          <NeonButton label={mode === 'signin' ? 'ENTRAR' : mode === 'signup' ? 'CRIAR CONTA' : mode === 'recover' ? 'ENVIAR INSTRUÇÕES' : 'SALVAR NOVA SENHA'}
            onPress={() => void submit()} disabled={busy || loading || !configured} />
          {busy && <ActivityIndicator color={colors.accentCyan} size="small" />}
          {!!notice && <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text>}
          {mode === 'signin' && (
            <>
              <TouchableOpacity onPress={() => { setMode('recover'); setNotice(''); }} style={styles.link}><Text style={styles.linkText}>ESQUECI MINHA SENHA</Text></TouchableOpacity>
              <Text style={styles.separator}>OU ENTRE COM</Text>
              <NeonButton label="G  GOOGLE" kind="secondary" onPress={() => void social('google')} disabled={busy || !configured} />
              {(Platform.OS === 'ios' || Platform.OS === 'web') &&
                <NeonButton label="  APPLE" kind="secondary" onPress={() => void social('apple')} disabled={busy || !configured} />}
            </>
          )}
          <TouchableOpacity style={styles.link} onPress={() => {
            setNotice(''); setPassword('');
            setMode(mode === 'signup' ? 'signin' : mode === 'signin' ? 'signup' : 'signin');
          }}>
            <Text style={styles.linkText}>{mode === 'signin' ? 'NÃO TEM CONTA? CADASTRE-SE' : 'VOLTAR AO LOGIN'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.guest} onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Start' }] })}>
            <Text style={styles.guestText}>CONTINUAR COMO CONVIDADO</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgDeep },
  content: { flexGrow: 1, maxWidth: 460, alignSelf: 'center', width: '100%', paddingHorizontal: 25, paddingBottom: 35 },
  back: { paddingVertical: 17 }, backText: { color: '#D8D0FC', fontSize: 13, fontWeight: '900' },
  header: { alignItems: 'center', paddingTop: 32, paddingBottom: 27 },
  eyebrow: { color: colors.accentCyan, fontWeight: '900', letterSpacing: 2, fontSize: 11 },
  title: { fontSize: 32, fontWeight: '900', color: '#F8D7FF', textAlign: 'center', textShadowColor: '#AC3AFF', textShadowRadius: 15, marginTop: 14 },
  caption: { color: '#BAC2E8', textAlign: 'center', fontSize: 13, marginTop: 10 },
  form: { gap: 12, paddingBottom: 25 },
  warning: { padding: 17, backgroundColor: '#393050', borderRadius: 13, borderColor: '#FFCE76', borderWidth: 1 },
  warningText: { color: '#FFECC5', fontSize: 13, lineHeight: 19 },
  input: { height: 55, borderRadius: 14, backgroundColor: '#18133D', borderWidth: 1, borderColor: '#65549D', color: '#FFF', fontSize: 15, paddingHorizontal: 16 },
  notice: { color: '#E7DDF9', textAlign: 'center', fontSize: 13, lineHeight: 19, padding: 8 },
  link: { paddingVertical: 10, alignItems: 'center' }, linkText: { color: colors.accentCyan, fontSize: 12, fontWeight: '900' },
  separator: { color: '#8A91BD', fontSize: 10, textAlign: 'center', letterSpacing: 1.5, fontWeight: '900', marginVertical: 8 },
  guest: { alignItems: 'center', paddingTop: 24 },
  guestText: { color: '#C3C1DB', fontSize: 12, fontWeight: '800' },
});
