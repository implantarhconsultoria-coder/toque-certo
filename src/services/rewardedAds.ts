// Versão web/padrão: não há anúncio com recompensa. iOS/Android usam rewardedAds.native.ts.
export function rewardedAdsAvailable(): boolean {
  return false;
}

export async function showRewardedAd(): Promise<boolean> {
  return false;
}
