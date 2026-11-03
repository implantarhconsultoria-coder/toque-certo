// Anúncios com recompensa (AdMob) — versão nativa (iOS/Android). O web usa rewardedAds.web.ts.
// IDs reais vêm de EXPO_PUBLIC_ADMOB_REWARDED_IOS / _ANDROID; sem eles usa os IDs de TESTE do Google.
import { Platform } from 'react-native';

export function rewardedAdsAvailable(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

function unitId(TestIds: { REWARDED: string }): string {
  const real = Platform.OS === 'ios'
    ? (process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS || 'ca-app-pub-9360827223542670/2709077242')
    : process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID;
  return real?.trim() || TestIds.REWARDED;
}

let initialized = false;

/** Mostra um anúncio com recompensa. Resolve true só se o usuário ganhou a recompensa. */
export async function showRewardedAd(): Promise<boolean> {
  if (!rewardedAdsAvailable()) return false;
  const ads = require('react-native-google-mobile-ads');
  if (!initialized) {
    try { await ads.default().initialize(); } catch {}
    initialized = true;
  }
  const ad = ads.RewardedAd.createForAdRequest(unitId(ads.TestIds), { requestNonPersonalizedAdsOnly: true });
  return new Promise<boolean>(resolve => {
    let earned = false;
    let done = false;
    const subs: Array<() => void> = [];
    const finish = (value: boolean) => {
      if (done) return;
      done = true;
      subs.forEach(unsub => { try { unsub(); } catch {} });
      resolve(value);
    };
    subs.push(ad.addAdEventListener(ads.RewardedAdEventType.LOADED, () => { ad.show().catch(() => finish(false)); }));
    subs.push(ad.addAdEventListener(ads.RewardedAdEventType.EARNED_REWARD, () => { earned = true; }));
    subs.push(ad.addAdEventListener(ads.AdEventType.CLOSED, () => finish(earned)));
    subs.push(ad.addAdEventListener(ads.AdEventType.ERROR, () => finish(false)));
    setTimeout(() => finish(earned), 60_000);
    ad.load();
  });
}
