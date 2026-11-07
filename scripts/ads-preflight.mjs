// Verificação estática da monetização antes de uma build de loja.
// Falha se a produção estiver configurada com anúncios de teste ou se os IDs auditados mudarem.
import { readFileSync } from 'node:fs';

const errors = [];
const app = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo;
const eas = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url), 'utf8'));
const native = readFileSync(new URL('../src/services/rewardedAds.native.ts', import.meta.url), 'utf8');

const EXPECTED = {
  iosAppId: 'ca-app-pub-9360827223542670~8448936195',
  androidAppId: 'ca-app-pub-9360827223542670~1221182868',
  rewardedIos: 'ca-app-pub-9360827223542670/2709077242',
  rewardedAndroid: 'ca-app-pub-9360827223542670/8368598037',
};

const adsPlugin = app.plugins.find(p => Array.isArray(p) && p[0] === 'react-native-google-mobile-ads')?.[1];
if (!adsPlugin) errors.push('Plugin react-native-google-mobile-ads ausente em app.json.');
else {
  if (adsPlugin.iosAppId !== EXPECTED.iosAppId) errors.push('iosAppId do AdMob diferente do auditado.');
  if (adsPlugin.androidAppId !== EXPECTED.androidAppId) errors.push('androidAppId do AdMob diferente do auditado.');
  const sk = adsPlugin.skAdNetworkItems ?? [];
  if (!sk.includes('cstr6suwn9.skadnetwork')) errors.push('SKAdNetwork do Google (cstr6suwn9) ausente.');
  if (new Set(sk).size !== sk.length) errors.push('SKAdNetwork duplicado.');
  if (/3940256099942544/.test(JSON.stringify(adsPlugin))) errors.push('App ID de teste no plugin.');
}
if (!app.plugins.some(p => (Array.isArray(p) ? p[0] : p) === 'expo-tracking-transparency')) {
  errors.push('Plugin expo-tracking-transparency ausente (ATT no iOS).');
}
if (!native.includes(`'${EXPECTED.rewardedIos}'`)) errors.push('ID premiado iOS de produção alterado.');
if (!native.includes(`'${EXPECTED.rewardedAndroid}'`)) errors.push('ID premiado Android de produção alterado.');
if (/requestNonPersonalizedAdsOnly\s*:\s*true/.test(native)) errors.push('Anúncios não personalizados forçados para todos.');

for (const name of ['production', 'testflight']) {
  const env = eas.build?.[name]?.env ?? {};
  if (env.EXPO_PUBLIC_ADMOB_USE_TEST_IDS === '1') errors.push(`Perfil ${name} usa anúncios de teste.`);
  if (env.EXPO_PUBLIC_AD_DIAGNOSTICS === '1') errors.push(`Perfil ${name} exibe diagnóstico.`);
  for (const k of ['EXPO_PUBLIC_ADMOB_REWARDED_IOS', 'EXPO_PUBLIC_ADMOB_REWARDED_ANDROID']) {
    if (env[k] && /3940256099942544/.test(env[k])) errors.push(`Perfil ${name}: ${k} é ID de teste.`);
  }
}
const validation = eas.build?.['ads-validation']?.env ?? {};
if (validation.EXPO_PUBLIC_ADMOB_USE_TEST_IDS !== '1') errors.push('Perfil ads-validation deve usar anúncios de teste.');

if (errors.length) {
  console.error('Preflight de anúncios REPROVADO:\n- ' + errors.join('\n- '));
  process.exit(1);
}
console.log('Preflight de anúncios aprovado: IDs de produção preservados, sem teste em produção, SKAdNetwork e ATT configurados.');
