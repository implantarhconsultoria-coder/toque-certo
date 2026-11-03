import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY_PROGRESS, levelInfo, applyGame, claimDaily, canClaimDaily, challengeLink, parseChallenge,
} from '../src/utils/progression.ts';

test('níveis sobem com XP acumulado', () => {
  assert.equal(levelInfo(0).level, 1);
  assert.equal(levelInfo(99).level, 1);
  assert.equal(levelInfo(100).level, 2);
  assert.deepEqual(levelInfo(250), { level: 3, current: 0, needed: 200, title: 'NOVATO' });
});

test('partida dá XP e moedas e detecta subida de nível', () => {
  const r = applyGame(EMPTY_PROGRESS, 15, 5);
  assert.equal(r.reward.xp, 10 + 75 + 10);
  assert.equal(r.progress.coins, 20);
  assert.equal(r.leveledUp, false);
  const doubled = applyGame(EMPTY_PROGRESS, 15, 5, 2);
  assert.equal(doubled.progress.coins, 40);
  assert.equal(applyGame({ ...EMPTY_PROGRESS, xp: 90 }, 2, 0).leveledUp, true);
});

test('bônus diário: uma vez por dia e sequência de dias seguidos', () => {
  const d1 = new Date(2026, 10, 3, 10);
  const a = claimDaily(EMPTY_PROGRESS, d1);
  assert.equal(a.coins, 20);
  assert.equal(canClaimDaily(a.progress, d1), false);
  assert.equal(claimDaily(a.progress, d1).coins, 0);
  const b = claimDaily(a.progress, new Date(2026, 10, 4, 9));
  assert.equal(b.progress.streak, 2);
  assert.equal(b.coins, 40);
  const c = claimDaily(b.progress, new Date(2026, 10, 7, 9));
  assert.equal(c.progress.streak, 1);
});

test('link de desafio ida e volta', () => {
  const link = challengeLink('https://toque-certo-pi.vercel.app/', 37, 'Ana');
  assert.equal(link, 'https://toque-certo-pi.vercel.app/?desafio=37&de=Ana');
  assert.deepEqual(parseChallenge(link), { score: 37, from: 'Ana' });
  assert.equal(parseChallenge('https://x.app/'), null);
});
