import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SYMBOLS, ROUND_DURATION_MS, WRONG_TAP_PENALTY_MS,
  gridSizeForScore, createSeededRandom, generateRound, resolveTap,
} from '../src/utils/gameLogic.ts';

test('dificuldade mantém as transições atuais 4/6/9', () => {
  assert.deepEqual([0, 9, 10, 24, 25, 99].map(gridSizeForScore), [4, 4, 6, 6, 9, 9]);
});

test('mesma seed gera sequência idêntica de rodadas', () => {
  const first = createSeededRandom(12345);
  const second = createSeededRandom(12345);
  const scores = [0, 1, 9, 10, 24, 25, 30];
  assert.deepEqual(scores.map(s => generateRound(s, first)), scores.map(s => generateRound(s, second)));
});

test('todas as rodadas contêm símbolos únicos e alvo válido', () => {
  const random = createSeededRandom(42);
  for (let i = 0; i < 200; i++) {
    const round = generateRound(i % 30, random);
    assert.equal(round.options.length, gridSizeForScore(i % 30));
    assert.equal(new Set(round.options).size, round.options.length);
    assert.equal(round.target, round.options[round.targetIndex]);
    assert.ok(round.options.every(value => SYMBOLS.includes(value)));
  }
});

test('combo dá bônus a cada cinco acertos', () => {
  const round = { options: ['★', '●', '▲', '■'], targetIndex: 0, target: '★' };
  let score = 0, combo = 0, best = 0;
  for (let i = 0; i < 10; i++) {
    const outcome = resolveTap(round, 0, '★', score, combo, best);
    assert.equal(outcome.bonus, i === 4 || i === 9 ? 1 : 0);
    score = outcome.score; combo = outcome.combo; best = outcome.bestCombo;
  }
  assert.equal(score, 12);
  assert.equal(best, 10);
});

test('erro preserva score e recorde de combo e aplica 1 segundo', () => {
  const round = { options: ['★', '●', '▲', '■'], targetIndex: 0, target: '★' };
  const outcome = resolveTap(round, 1, '●', 23, 4, 7);
  assert.deepEqual(outcome, {
    correct: false, score: 23, combo: 0, bestCombo: 7, bonus: 0, timePenaltyMs: WRONG_TAP_PENALTY_MS,
  });
  assert.equal(ROUND_DURATION_MS, 30_000);
});

test('RNG inválido é rejeitado, sem corromper rodada', () => {
  assert.throws(() => generateRound(0, () => 1), /Random source/);
});
