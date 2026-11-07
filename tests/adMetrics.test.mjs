import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyMetrics, applyAdEvent, summarize, toMicros, reviveMetrics, MAX_TRACKED_INSTANCES,
} from '../src/services/adMetrics.ts';

const base = { format: 'rewarded', platform: 'android', adUnitId: 'ca-app-pub-x/1', test: false };
let n = 0;
const apply = (s, kind, inst, extra = {}) => applyAdEvent(s, { ...base, kind, adInstanceId: inst, ts: Date.UTC(2026, 10, 7, 12), ...extra }, `e${n++}`);

function fullCycle(s, inst, micros) {
  for (const k of ['request', 'loaded', 'show_requested', 'opened', 'impression']) s = apply(s, k, inst).state;
  s = apply(s, 'paid', inst, { valueMicros: micros, currency: 'usd', precision: 1 }).state;
  s = apply(s, 'reward', inst).state;
  return apply(s, 'closed', inst).state;
}

test('micros: prefere valueMicros exato e converte value em unidades da moeda', () => {
  assert.equal(toMicros(0.0123, '12345'), 12345);
  assert.equal(toMicros(0.012345, null), 12345);
  assert.equal(toMicros(undefined, undefined), 0);
  assert.equal(toMicros(-1, null), 0);
  assert.equal(toMicros(Number.NaN, 'abc'), 0);
});

test('ciclo completo: solicitação, carga, exibição, impressão, receita e recompensa', () => {
  let s = emptyMetrics();
  s = fullCycle(s, 'a', 25_000);   // US$ 0,025
  s = fullCycle(s, 'b', 15_000);   // US$ 0,015
  const sum = summarize(s);
  const b = sum.buckets[0];
  assert.equal(b.requests, 2);
  assert.equal(b.loaded, 2);
  assert.equal(b.opened, 2);
  assert.equal(b.impressions, 2);
  assert.equal(b.paidEvents, 2);
  assert.equal(b.rewards, 2);
  assert.equal(b.fillRate, 1);
  assert.ok(Math.abs(b.revenue.USD - 0.04) < 1e-12);
  // eCPM = 0,04 / 2 × 1000 = US$ 20
  assert.ok(Math.abs(b.ecpm.USD - 20) < 1e-9);
  assert.ok(Math.abs(sum.totalRevenue.USD - 0.04) < 1e-12);
  assert.equal(sum.activeDays, 1);
  assert.ok(Math.abs(sum.revenuePerActiveDay.USD - 0.04) < 1e-12);
});

test('eventos duplicados da mesma instância são ignorados (impressão, receita, recompensa)', () => {
  let s = fullCycle(emptyMetrics(), 'a', 10_000);
  for (const k of ['impression', 'reward', 'loaded', 'closed']) {
    const r = apply(s, k, 'a');
    assert.equal(r.duplicate, true);
    s = r.state;
  }
  const r = apply(s, 'paid', 'a', { valueMicros: 10_000, currency: 'USD' });
  assert.equal(r.duplicate, true);
  s = r.state;
  const b = summarize(s).buckets[0];
  assert.equal(b.impressions, 1);
  assert.equal(b.paidEvents, 1);
  assert.equal(b.rewards, 1);
  assert.equal(b.revenue.USD, 0.01);
  assert.equal(s.duplicatesIgnored, 5);
});

test('cliques podem repetir sem afetar outros contadores', () => {
  let s = fullCycle(emptyMetrics(), 'a', 1);
  s = apply(s, 'clicked', 'a').state;
  s = apply(s, 'clicked', 'a').state;
  assert.equal(summarize(s).buckets[0].clicks, 2);
});

test('falhas, sem preenchimento e carregados não exibidos são identificados', () => {
  let s = emptyMetrics();
  s = apply(s, 'request', 'x').state;
  s = apply(s, 'load_failed', 'x', { errorCode: 'googleMobileAds/no-fill' }).state;
  s = apply(s, 'request', 'y').state;
  s = apply(s, 'loaded', 'y').state;
  s = apply(s, 'expired', 'y').state;
  s = apply(s, 'request', 'z').state;
  s = apply(s, 'loaded', 'z').state;
  s = apply(s, 'show_requested', 'z').state;
  s = apply(s, 'opened', 'z').state;
  s = apply(s, 'impression', 'z').state; // sem paid → impressão sem valor
  const b = summarize(s).buckets[0];
  assert.equal(b.requests, 3);
  assert.equal(b.loaded, 2);
  assert.ok(Math.abs(b.fillRate - 2 / 3) < 1e-12);
  assert.equal(b.loadFailed, 1);
  assert.equal(b.errors['googleMobileAds/no-fill'], 1);
  assert.equal(b.loadedNotShown, 1);
  assert.equal(b.expired, 1);
  assert.equal(b.impressionsWithoutPaid, 1);
  assert.deepEqual(b.ecpm, {});
});

test('receita de teste não entra no total de produção e plataformas ficam separadas', () => {
  let s = fullCycle(emptyMetrics(), 'p', 20_000);
  let r = applyAdEvent(s, { ...base, test: true, kind: 'paid', adInstanceId: 't', valueMicros: 999_999, currency: 'USD' }, 'tt');
  s = r.state;
  r = applyAdEvent(s, { ...base, platform: 'ios', kind: 'paid', adInstanceId: 'i', valueMicros: 5_000, currency: 'BRL' }, 'ii');
  s = r.state;
  const sum = summarize(s);
  assert.equal(sum.buckets.length, 3);
  assert.equal(sum.totalRevenue.USD, 0.02);
  assert.equal(sum.totalRevenue.BRL, 0.005);
});

test('controle anti-duplicidade é limitado e o estado salvo é restaurado', () => {
  let s = emptyMetrics();
  for (let i = 0; i < MAX_TRACKED_INSTANCES + 20; i++) s = apply(s, 'request', `i${i}`).state;
  assert.equal(s.seenOrder.length, MAX_TRACKED_INSTANCES);
  assert.equal(Object.keys(s.seen).length, MAX_TRACKED_INSTANCES);
  const revived = reviveMetrics(JSON.parse(JSON.stringify(s)));
  assert.equal(summarize(revived).buckets[0].requests, MAX_TRACKED_INSTANCES + 20);
  assert.deepEqual(reviveMetrics(null), emptyMetrics());
  assert.deepEqual(reviveMetrics({ version: 9 }), emptyMetrics());
});
