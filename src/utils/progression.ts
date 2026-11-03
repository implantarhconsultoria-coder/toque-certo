// Regras puras de progressão, recompensas e desafios do Toque Certo.

export type Progress = {
  xp: number;
  coins: number;
  gamesPlayed: number;
  streak: number;
  lastDailyClaim: string | null; // AAAA-MM-DD (horário local)
};

export const EMPTY_PROGRESS: Progress = { xp: 0, coins: 0, gamesPlayed: 0, streak: 0, lastDailyClaim: null };

export const LEVEL_TITLES = ['NOVATO', 'APRENDIZ', 'ÁGIL', 'VELOZ', 'CERTEIRO', 'MESTRE', 'LENDA'];

/** XP necessário para sair do nível `level` (1-based) para o próximo. Cresce de forma suave. */
export function xpToNext(level: number): number {
  return 100 + (level - 1) * 50;
}

export function levelInfo(xp: number): { level: number; current: number; needed: number; title: string } {
  let level = 1;
  let rest = Math.max(0, Math.floor(xp));
  while (rest >= xpToNext(level)) {
    rest -= xpToNext(level);
    level += 1;
  }
  const title = LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, Math.floor((level - 1) / 3))];
  return { level, current: rest, needed: xpToNext(level), title };
}

export function gameRewards(score: number, bestCombo: number): { xp: number; coins: number } {
  const s = Math.max(0, Math.floor(score));
  const c = Math.max(0, Math.floor(bestCombo));
  return { xp: 10 + s * 5 + c * 2, coins: 5 + s };
}

export function applyGame(progress: Progress, score: number, bestCombo: number, coinMultiplier = 1) {
  const reward = gameRewards(score, bestCombo);
  const before = levelInfo(progress.xp).level;
  const next: Progress = {
    ...progress,
    xp: progress.xp + reward.xp,
    coins: progress.coins + reward.coins * coinMultiplier,
    gamesPlayed: progress.gamesPlayed + 1,
  };
  const after = levelInfo(next.xp).level;
  return { progress: next, reward, leveledUp: after > before, newLevel: after };
}

function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return date.getFullYear() + '-' + m + '-' + d;
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

/** Recompensa diária: cresce com a sequência de dias seguidos (máx. 7). */
export function dailyReward(streak: number): number {
  return 20 * Math.min(Math.max(1, streak), 7);
}

export function canClaimDaily(progress: Progress, now: Date): boolean {
  return progress.lastDailyClaim !== dayKey(now);
}

export function claimDaily(progress: Progress, now: Date, multiplier = 1) {
  const today = dayKey(now);
  if (progress.lastDailyClaim === today) return { progress, coins: 0 };
  const gap = progress.lastDailyClaim ? daysBetween(progress.lastDailyClaim, today) : Infinity;
  const streak = gap === 1 ? progress.streak + 1 : 1;
  const coins = dailyReward(streak) * multiplier;
  return { progress: { ...progress, streak, lastDailyClaim: today, coins: progress.coins + coins }, coins };
}

/** Desafio compartilhável: link com a pontuação a ser batida. */
export function challengeLink(base: string, score: number, name?: string): string {
  const params = 'desafio=' + Math.max(0, Math.floor(score)) + (name ? '&de=' + encodeURIComponent(name.slice(0, 24)) : '');
  return base.replace(/\/$/, '') + '/?' + params;
}

export function parseChallenge(url: string | null | undefined): { score: number; from: string | null } | null {
  if (!url) return null;
  const match = /[?&]desafio=(\d{1,4})(?:&|$)/.exec(url);
  if (!match) return null;
  const from = /[?&]de=([^&#]+)/.exec(url);
  let name: string | null = null;
  if (from) { try { name = decodeURIComponent(from[1]).slice(0, 24); } catch { name = null; } }
  return { score: Number(match[1]), from: name };
}
