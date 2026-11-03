import AsyncStorage from '@react-native-async-storage/async-storage';
import { EMPTY_PROGRESS, Progress } from '../utils/progression';

const KEY = 'toqueCerto.progress.v1';

export async function loadProgress(): Promise<Progress> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...EMPTY_PROGRESS };
    const data = JSON.parse(raw);
    return {
      xp: Number(data.xp) || 0,
      coins: Number(data.coins) || 0,
      gamesPlayed: Number(data.gamesPlayed) || 0,
      streak: Number(data.streak) || 0,
      lastDailyClaim: typeof data.lastDailyClaim === 'string' ? data.lastDailyClaim : null,
    };
  } catch {
    return { ...EMPTY_PROGRESS };
  }
}

export async function saveProgress(progress: Progress): Promise<void> {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(progress)); } catch {}
}
