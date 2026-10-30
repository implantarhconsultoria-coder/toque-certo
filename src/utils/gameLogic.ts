// Regras puras e determinísticas do Toque Certo.
// O RNG pode ser reproduzido a partir de uma seed; não é mecanismo de segurança.
export const SYMBOLS = ['★', '●', '▲', '■', '♦', '✚', '❀', '✦', '⬡'];
export const ROUND_DURATION_MS = 30_000;
export const WRONG_TAP_PENALTY_MS = 1_000;
export const COMBO_BONUS_INTERVAL = 5;

export type RandomSource = () => number;

export type Round = {
  target: string;
  options: string[];
  targetIndex: number;
};

export type TapOutcome = {
  correct: boolean;
  score: number;
  combo: number;
  bestCombo: number;
  bonus: number;
  timePenaltyMs: number;
};

export function gridSizeForScore(score: number): number {
  if (score < 10) return 4;
  if (score < 25) return 6;
  return 9;
}

/** Mulberry32: deterministic pseudo-random generator for reproducible rounds. */
export function createSeededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

/** Fisher-Yates shuffle with injectable randomness. */
export function generateRound(score: number, random: RandomSource = Math.random): Round {
  const size = gridSizeForScore(score);
  const pool = [...SYMBOLS];
  for (let i = pool.length - 1; i > 0; i--) {
    const draw = random();
    if (!Number.isFinite(draw) || draw < 0 || draw >= 1) {
      throw new Error('Random source must return values between 0 (inclusive) and 1 (exclusive)');
    }
    const j = Math.floor(draw * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const options = pool.slice(0, size);
  const draw = random();
  if (!Number.isFinite(draw) || draw < 0 || draw >= 1) {
    throw new Error('Random source must return values between 0 (inclusive) and 1 (exclusive)');
  }
  const targetIndex = Math.floor(draw * size);
  return { target: options[targetIndex], options, targetIndex };
}

export function resolveTap(
  round: Round,
  index: number,
  symbol: string,
  score: number,
  combo: number,
  bestCombo: number,
): TapOutcome {
  if (index !== round.targetIndex || symbol !== round.target) {
    return { correct: false, score, combo: 0, bestCombo, bonus: 0, timePenaltyMs: WRONG_TAP_PENALTY_MS };
  }
  const nextCombo = combo + 1;
  const bonus = nextCombo % COMBO_BONUS_INTERVAL === 0 ? 1 : 0;
  return {
    correct: true,
    score: score + 1 + bonus,
    combo: nextCombo,
    bestCombo: Math.max(bestCombo, nextCombo),
    bonus,
    timePenaltyMs: 0,
  };
}
