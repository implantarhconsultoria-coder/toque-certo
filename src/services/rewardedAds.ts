// Versão web/padrão: não há anúncio com recompensa. iOS/Android usam rewardedAds.native.ts.
export const usingTestAds = false;

export function rewardedAdsAvailable(): boolean {
  return false;
}

export function startAds(): void {}

export function preloadRewardedAd(_placement?: string): void {}

export async function showRewardedAd(_placement?: string): Promise<boolean> {
  return false;
}

export async function showAdPrivacyOptions(): Promise<void> {}
