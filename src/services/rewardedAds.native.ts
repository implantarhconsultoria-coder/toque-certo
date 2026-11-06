// Anúncios premiados para iOS e Android; a versão web não exibe anúncios.
// Desenvolvimento usa exclusivamente unidades oficiais de teste do Google.
// Produção usa as unidades AdMob configuradas para o Toque Certo.
import { Platform } from 'react-native';

export function rewardedAdsAvailable(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

const PRODUCTION_REWARDED_IOS = 'ca-app-pub-9360827223542670/2709077242';
const PRODUCTION_REWARDED_ANDROID = 'ca-app-pub-9360827223542670/8368598037';

function unitId(testId: string): string {
  if (__DEV__) return testId;
  const configured = Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS
    : process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID;
  return configured?.trim() || (Platform.OS === 'ios'
    ? PRODUCTION_REWARDED_IOS
    : PRODUCTION_REWARDED_ANDROID);
}

let initialized = false;

/** Atualiza consentimento UMP antes de inicializar ou solicitar publicidade. */
async function canRequestAds(ads: any): Promise<boolean> {
  try {
    const consent = await ads.AdsConsent.gatherConsent();
    return consent.canRequestAds === true;
  } catch {
    // Só permite o anúncio se o SDK ainda reconhecer consentimento anterior válido.
    try {
      const cached = await ads.AdsConsent.getConsentInfo();
      return cached.canRequestAds === true;
    } catch {
      return false;
    }
  }
}


/** Só concede recompensa após evento EARNED_REWARD do SDK. */
export async function showRewardedAd(): Promise<boolean> {
  if (!rewardedAdsAvailable()) return false;
  try {
    const ads = require('react-native-google-mobile-ads');
    if (!(await canRequestAds(ads))) return false;
    if (!initialized) {
      await ads.default().initialize();
      initialized = true;
    }

    const ad = ads.RewardedAd.createForAdRequest(unitId(ads.TestIds.REWARDED), {
      requestNonPersonalizedAdsOnly: true,
    });

    return await new Promise<boolean>(resolve => {
      let earned = false;
      let done = false;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const subs: Array<() => void> = [];
      const finish = (value: boolean) => {
        if (done) return;
        done = true;
        if (timeout) clearTimeout(timeout);
        subs.forEach(unsub => { try { unsub(); } catch {} });
        resolve(value);
      };

      subs.push(ad.addAdEventListener(ads.RewardedAdEventType.LOADED, () => {
        ad.show().catch(() => finish(false));
      }));
      subs.push(ad.addAdEventListener(ads.RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      }));
      subs.push(ad.addAdEventListener(ads.AdEventType.CLOSED, () => finish(earned)));
      subs.push(ad.addAdEventListener(ads.AdEventType.ERROR, () => finish(false)));
      timeout = setTimeout(() => finish(false), 60_000);
      try { ad.load(); } catch { finish(false); }
    });
  } catch {
    // Sem SDK ou sem anúncio disponível: não bloquear o jogo e não dar recompensa.
    return false;
  }
}
