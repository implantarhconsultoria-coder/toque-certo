// Lógica pura do jogo: geração de rodada e regra de dificuldade.
// Sem dependência de rede, sem estado global — tudo consumido pela GameScreen.

export const SYMBOLS = ['★', '●', '▲', '■', '♦', '✚', '❀', '✦', '⬡'];

export function gridSizeForScore(score: number): number {
  if (score < 10) return 4;
  if (score < 25) return 6;
  return 9;
}

export type Round = {
  target: string;
  options: string[];
  targetIndex: number;
};

export function generateRound(score: number): Round {
  const size = gridSizeForScore(score);
  const pool = [...SYMBOLS].sort(() => Math.random() - 0.5).slice(0, size);
  const targetIndex = Math.floor(Math.random() * size);
  const target = pool[targetIndex];
  return { target, options: pool, targetIndex };
}
