import test from 'node:test';
import assert from 'node:assert/strict';
import { RewardedController } from '../src/services/rewardedController.ts';
import { toMicros } from '../src/services/adMetrics.ts';

const EV = {
  LOADED: 'rewarded_loaded', EARNED_REWARD: 'rewarded_earned_reward', ERROR: 'error', OPENED: 'opened',
  CLOSED: 'closed', PAID: 'paid', IMPRESSION: 'impression', CLICKED: 'clicked',
};

class FakeAd {
  constructor() { this.listeners = {}; this.loads = 0; this.shows = 0; this.showError = null; }
  addAdEventListener(type, fn) {
    (this.listeners[type] ??= new Set()).add(fn);
    return () => this.listeners[type].delete(fn);
  }
  emit(type, payload) { [...(this.listeners[type] ?? [])].forEach(fn => fn(payload)); }
  load() { this.loads += 1; }
  show() { this.shows += 1; return this.showError ? Promise.reject(this.showError) : Promise.resolve(); }
  listenerCount() { return Object.values(this.listeners).reduce((n, s) => n + s.size, 0); }
}

function setup(opts = {}) {
  const ads = [];
  const events = [];
  const failures = [];
  const timers = [];
  let clock = 1_000;
  let id = 0;
  const ctrl = new RewardedController({
    createAd: () => {
      if (opts.createError) throw new Error('native unavailable');
      const a = new FakeAd();
      if (opts.loadError) a.load = () => { throw new Error('load failed'); };
      if (opts.showSyncError) a.show = () => { throw new Error('show failed'); };
      ads.push(a); return a;
    },
    events: EV,
    prepare: opts.prepare ?? (async () => true),
    record: (kind, inst, extra = {}) => events.push({ kind, inst, ...extra }),
    toMicros,
    newId: () => `ad${++id}`,
    now: () => clock,
    setTimer: (fn, ms) => { const t = { fn, at: clock + ms, done: false }; timers.push(t); return t; },
    clearTimer: t => { if (t) t.done = true; },
    onUserFacingFailure: (stage) => failures.push(stage),
    loadTimeoutMs: 30_000,
    expiryMs: 55 * 60_000,
    retryDelaysMs: [15_000, 60_000],
  });
  const advance = async ms => {
    clock += ms;
    for (const t of timers) if (!t.done && t.at <= clock) { t.done = true; t.fn(); }
    await flush();
  };
  return { ctrl, ads, events, failures, advance, kinds: () => events.map(e => e.kind) };
}
const flush = () => new Promise(r => setImmediate(r));

test('pré-carrega uma única vez e exibe na hora sem nova solicitação', async () => {
  const t = setup();
  await t.ctrl.preload('inicio');
  await t.ctrl.preload('inicio');
  assert.equal(t.ads.length, 1);
  t.ads[0].emit(EV.LOADED);
  const p = t.ctrl.show('dobrar_moedas');
  await flush();
  assert.equal(t.ads[0].shows, 1);
  const ad = t.ads[0];
  ad.emit(EV.OPENED);
  ad.emit(EV.IMPRESSION);
  ad.emit(EV.PAID, { value: 0.0123, valueMicros: '12300', currency: 'USD', precision: 1,
    responseInfo: { responseId: 'r1', loadedAdapterResponse: { adSourceName: 'AdMob Network' } } });
  ad.emit(EV.EARNED_REWARD, { type: 'coins', amount: 1 });
  ad.emit(EV.CLOSED);
  assert.equal(await p, true);
  assert.deepEqual(t.kinds().slice(0, 9),
    ['request', 'loaded', 'show_requested', 'opened', 'impression', 'paid', 'reward', 'closed', 'request']);
  const paid = t.events.find(e => e.kind === 'paid');
  assert.equal(paid.valueMicros, 12300);
  assert.equal(paid.currency, 'USD');
  assert.equal(paid.adSource, 'AdMob Network');
  assert.equal(paid.responseId, 'r1');
  assert.equal(paid.placement, 'dobrar_moedas');
  // Listeners liberados e próximo anúncio já solicitado.
  assert.equal(ad.listenerCount(), 0);
  assert.equal(t.ads.length, 2);
});

test('fechar sem EARNED_REWARD não concede recompensa', async () => {
  const t = setup();
  const p = t.ctrl.show('continuar_partida');
  await flush();
  t.ads[0].emit(EV.LOADED);
  await flush();
  t.ads[0].emit(EV.OPENED);
  t.ads[0].emit(EV.CLOSED);
  assert.equal(await p, false);
  assert.ok(!t.kinds().includes('reward'));
});

test('recompensa de anúncio que não está em exibição é ignorada', async () => {
  const t = setup();
  await t.ctrl.preload();
  t.ads[0].emit(EV.LOADED);
  t.ads[0].emit(EV.EARNED_REWARD);
  assert.ok(!t.kinds().includes('reward'));
});

test('dois toques simultâneos não abrem dois anúncios', async () => {
  const t = setup();
  await t.ctrl.preload();
  t.ads[0].emit(EV.LOADED);
  const p1 = t.ctrl.show('a');
  const p2 = t.ctrl.show('b');
  assert.equal(await p2, false);
  await flush();
  assert.equal(t.ads[0].shows, 1);
  t.ads[0].emit(EV.EARNED_REWARD);
  t.ads[0].emit(EV.CLOSED);
  assert.equal(await p1, true);
});

test('tempo esgotado não trava, não premia, e o anúncio que chega depois fica em cache', async () => {
  const t = setup();
  const p = t.ctrl.show('bonus_diario');
  await flush();
  await t.advance(30_001);
  assert.equal(await p, false);
  assert.ok(t.kinds().includes('load_timeout'));
  assert.ok(t.kinds().includes('show_unavailable'));
  assert.deepEqual(t.failures, ['tempo-de-carregamento-esgotado']);
  t.ads[0].emit(EV.LOADED);
  assert.equal(t.ctrl.status().state, 'ready');
  const p2 = t.ctrl.show('bonus_diario');
  await flush();
  assert.equal(t.ads.length, 1);
  t.ads[0].emit(EV.EARNED_REWARD);
  t.ads[0].emit(EV.CLOSED);
  assert.equal(await p2, true);
});

test('falha de carregamento registra o código, informa o jogador e repete com espera limitada', async () => {
  const t = setup();
  const p = t.ctrl.show('dobrar_moedas');
  await flush();
  t.ads[0].emit(EV.ERROR, { code: 'googleMobileAds/no-fill', message: 'No fill' });
  assert.equal(await p, false);
  assert.equal(t.events.find(e => e.kind === 'load_failed').errorCode, 'googleMobileAds/no-fill');
  assert.deepEqual(t.failures, ['carregamento']);
  // Pré-carregamento logo após a falha respeita a espera.
  await t.ctrl.preload();
  assert.equal(t.ads.length, 1);
  await t.advance(15_000);
  assert.equal(t.ads.length, 2);
  t.ads[1].emit(EV.ERROR, { code: 'googleMobileAds/no-fill' });
  await t.advance(60_000);
  assert.equal(t.ads.length, 3);
  t.ads[2].emit(EV.ERROR, { code: 'googleMobileAds/no-fill' });
  await t.advance(600_000);
  assert.equal(t.ads.length, 3, 'sem repetição automática além do limite');
});

test('falha ao exibir encerra sem recompensa', async () => {
  const t = setup();
  await t.ctrl.preload();
  t.ads[0].emit(EV.LOADED);
  t.ads[0].showError = Object.assign(new Error('x'), { code: 'googleMobileAds/not-ready' });
  assert.equal(await t.ctrl.show('a'), false);
  assert.equal(t.events.find(e => e.kind === 'show_failed').errorCode, 'googleMobileAds/not-ready');
  assert.deepEqual(t.failures, ['exibicao']);
});

test('anúncio pré-carregado expira após 55 minutos e é substituído', async () => {
  const t = setup();
  await t.ctrl.preload();
  t.ads[0].emit(EV.LOADED);
  await t.advance(56 * 60_000);
  await t.ctrl.preload();
  assert.ok(t.kinds().includes('expired'));
  assert.equal(t.ads.length, 2);
});

test('sem consentimento: não solicita anúncio e não premia', async () => {
  const t = setup({ prepare: async () => false });
  await t.ctrl.preload();
  assert.equal(t.ads.length, 0);
  assert.equal(await t.ctrl.show('a'), false);
  assert.equal(t.ads.length, 0);
  assert.deepEqual(t.failures, ['consentimento-pendente']);
  assert.equal(t.events.find(e => e.kind === 'show_unavailable').errorCode, 'consent');
});

test('eventos repetidos do SDK não duplicam recompensa nem fechamento', async () => {
  const t = setup();
  await t.ctrl.preload();
  t.ads[0].emit(EV.LOADED);
  const p = t.ctrl.show('a');
  await flush();
  t.ads[0].emit(EV.EARNED_REWARD);
  t.ads[0].emit(EV.EARNED_REWARD);
  t.ads[0].emit(EV.CLOSED);
  t.ads[0].emit(EV.CLOSED);
  assert.equal(await p, true);
  assert.equal(t.kinds().filter(k => k === 'reward').length, 1);
  assert.equal(t.kinds().filter(k => k === 'closed').length, 1);
});

for (const failure of ['createError', 'loadError']) {
  test(`falha síncrona em ${failure} não lança e não recompensa`, async () => {
    const t = setup({ [failure]: true });
    assert.equal(await t.ctrl.show('bonus_diario'), false);
    assert.equal(t.ctrl.status().presenting, false);
    assert.ok(t.kinds().includes('load_failed'));
    assert.ok(t.kinds().includes('show_unavailable'));
    assert.ok(!t.kinds().includes('reward'));
  });
}

test('falha síncrona ao exibir libera o controlador e não recompensa', async () => {
  const t = setup({ showSyncError: true });
  await t.ctrl.preload();
  t.ads[0].emit(EV.LOADED);
  assert.equal(await t.ctrl.show('a'), false);
  assert.equal(t.ctrl.status().presenting, false);
  assert.ok(t.kinds().includes('show_failed'));
  assert.ok(!t.kinds().includes('reward'));
});

test('invalidar consentimento libera espera de anúncio em carga', async () => {
  const t = setup();
  const pending = t.ctrl.show('a');
  await flush();
  t.ctrl.invalidate();
  assert.equal(await pending, false);
  assert.ok(!t.kinds().includes('reward'));
});
