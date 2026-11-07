// Anúncios premiados para iOS e Android; a versão web não exibe anúncios.
// Desenvolvimento (e builds de validação com EXPO_PUBLIC_ADMOB_USE_TEST_IDS=1) usam
// exclusivamente unidades oficiais de teste do Google. Produção usa as unidades AdMob do Toque Certo.
import { Alert, AppState, Platform } from 'react-native';
import { toMicros, type AdEventKind, type AdPlatform } from './adMetrics';
import { RewardedController, type RecordExtras } from './rewardedController';
import { newId, recordAdEvent, startAdTelemetryLifecycle } from './adTelemetry';

export function rewardedAdsAvailable(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

// IDs de produção preservados (não alterar sem conferir no console AdMob).
export const PRODUCTION_REWARDED_IOS = 'ca-app-pub-9360827223542670/2709077242';
export const PRODUCTION_REWARDED_ANDROID = 'ca-app-pub-9360827223542670/8368598037';

/** Anúncios de teste em desenvolvimento ou quando a build de validação pedir. */
export const usingTestAds = __DEV__ || process.env.EXPO_PUBLIC_ADMOB_USE_TEST_IDS?.trim() === '1';

function sdk(): any {
  return require('react-native-google-mobile-ads');
}

function unitId(): string {
  if (usingTestAds) return sdk().TestIds.REWARDED;
  const configured = Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS
    : process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID;
  return configured?.trim() || (Platform.OS === 'ios' ? PRODUCTION_REWARDED_IOS : PRODUCTION_REWARDED_ANDROID);
}

function reportFailure(stage: string, error?: unknown): void {
  const detail = error as { code?: string; message?: string } | undefined;
  const code = detail?.code || stage;
  let message = 'Não foi possível carregar o vídeo. Tente novamente mais tarde.';
  if (code.includes('no-fill')) message = 'Não há vídeo disponível do anunciante neste momento.';
  if (code.includes('network')) message = 'Não foi possível conectar ao serviço de anúncios. Confira sua conexão.';
  if (code.includes('consentimento')) message = 'Os anúncios dependem da sua escolha de privacidade. Tente novamente.';
  // O código permite diagnosticar a falha real no aparelho, sem expor credenciais.
  Alert.alert('Vídeo indisponível', `${message}\n\nCódigo: ${code}\n${detail?.message || stage}`);
}

/** ATT no iOS após o UMP (ordem recomendada pelo Google). Recusa é válida e não bloqueia. */
async function requestTrackingIfNeeded(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    if (AppState.currentState !== 'active') {
      const active = await new Promise<boolean>(resolve => {
        const timer = setTimeout(() => { sub.remove(); resolve(false); }, 15_000);
        const sub = AppState.addEventListener('change', s => {
          if (s === 'active') { clearTimeout(timer); sub.remove(); resolve(true); }
        });
      });
      if (!active) return;
    }
    const tracking = require('expo-tracking-transparency');
    const current = await tracking.getTrackingPermissionsAsync();
    if (current.status === 'undetermined') await tracking.requestTrackingPermissionsAsync();
  } catch {
    // Sem ATT o SDK continua funcionando com anúncios sem IDFA.
  }
}

let initialized = false;
let preparing: Promise<boolean> | null = null;

/** Consentimento UMP → ATT → configuração → inicialização, uma vez por sessão. */
function prepare(): Promise<boolean> {
  if (initialized) return Promise.resolve(true);
  if (preparing) return preparing;
  preparing = (async () => {
    const ads = sdk();
    let canRequest = false;
    try {
      const consent = await ads.AdsConsent.gatherConsent();
      canRequest = consent.canRequestAds === true;
    } catch (consentError) {
      // Só permite o anúncio se o SDK ainda reconhecer consentimento anterior válido.
      try {
        const cached = await ads.AdsConsent.getConsentInfo();
        canRequest = cached.canRequestAds === true;
      } catch { /* preserva o erro original */ }
      if (!canRequest) throw consentError;
    }
    if (!canRequest) return false;
    await requestTrackingIfNeeded();
    const testDevices = (process.env.EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS || '')
      .split(',').map((s: string) => s.trim()).filter(Boolean);
    if (testDevices.length) {
      // Aparelhos do desenvolvedor recebem anúncios de teste mesmo em build de produção.
      await ads.default().setRequestConfiguration({ testDeviceIdentifiers: testDevices });
    }
    await ads.default().initialize();
    initialized = true;
    return true;
  })().finally(() => { preparing = null; });
  return preparing;
}

let controller: RewardedController | null = null;

function getController(): RewardedController {
  if (controller) return controller;
  const ads = sdk();
  const platform = Platform.OS as AdPlatform;
  const adUnitId = unitId();
  controller = new RewardedController({
    // Sem requestNonPersonalizedAdsOnly: o SDK aplica a escolha registrada pelo UMP (TCF).
    // Forçar anúncios não personalizados para todos reduzia o leilão e o eCPM.
    createAd: () => ads.RewardedAd.createForAdRequest(adUnitId),
    events: {
      LOADED: ads.RewardedAdEventType.LOADED,
      EARNED_REWARD: ads.RewardedAdEventType.EARNED_REWARD,
      ERROR: ads.AdEventType.ERROR,
      OPENED: ads.AdEventType.OPENED,
      CLOSED: ads.AdEventType.CLOSED,
      PAID: ads.AdEventType.PAID,
      IMPRESSION: ads.AdEventType.IMPRESSION,
      CLICKED: ads.AdEventType.CLICKED,
    },
    prepare,
    toMicros,
    newId,
    record: (kind: AdEventKind, adInstanceId: string, extras?: RecordExtras) => recordAdEvent({
      kind, adInstanceId, format: 'rewarded', platform, adUnitId, test: usingTestAds, ...extras,
    }),
    onUserFacingFailure: reportFailure,
  });
  return controller;
}

/** Inicia consentimento, SDK e o primeiro pré-carregamento (chamado ao abrir o app). */
export function startAds(): void {
  if (!rewardedAdsAvailable()) return;
  startAdTelemetryLifecycle();
  try { void getController().preload('app_start'); } catch { /* SDK ausente */ }
}

/** Pré-carrega para que o vídeo abra na hora em que o jogador pedir. Nunca exibe. */
export function preloadRewardedAd(placement?: string): void {
  if (!rewardedAdsAvailable()) return;
  try { void getController().preload(placement); } catch { /* SDK ausente */ }
}

/** Só concede recompensa após evento EARNED_REWARD do SDK. */
export async function showRewardedAd(placement = 'desconhecido'): Promise<boolean> {
  if (!rewardedAdsAvailable()) return false;
  try {
    return await getController().show(placement);
  } catch (error) {
    reportFailure('inicializacao', error);
    // Sem SDK ou sem anúncio disponível: não bloquear o jogo e não dar recompensa.
    return false;
  }
}
