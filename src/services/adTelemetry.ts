// Persistência local do livro-razão de anúncios e envio opcional ao Supabase.
// Nenhum dado pessoal: apenas um identificador aleatório de instalação, sem e-mail ou conta.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import {
  applyAdEvent, emptyMetrics, markActiveDay, reviveMetrics, summarize,
  type AdEvent, type AdEventInput, type MetricsState, type MetricsSummary,
} from './adMetrics';
import { supabase } from '../auth/supabase';

const METRICS_KEY = 'toqueCerto.adMetrics.v1';
const QUEUE_KEY = 'toqueCerto.adEventQueue.v1';
const INSTALL_KEY = 'toqueCerto.installId.v1';
const MAX_QUEUE = 500;
const BATCH = 50;

/** Envio remoto só quando explicitamente habilitado e o Supabase estiver configurado. */
export const remoteTelemetryEnabled =
  process.env.EXPO_PUBLIC_AD_TELEMETRY_REMOTE?.trim() === '1' && Boolean(supabase);

/** Painel de diagnóstico visível em desenvolvimento ou em builds de validação. */
export const adDiagnosticsVisible =
  (typeof __DEV__ !== 'undefined' && __DEV__) || process.env.EXPO_PUBLIC_AD_DIAGNOSTICS?.trim() === '1';

let state: MetricsState = emptyMetrics();
let queue: AdEvent[] = [];
let installId = '';
let ready: Promise<void> | null = null;
let chain: Promise<void> = Promise.resolve();
let flushing = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function newId(): string {
  const rand = () => Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, '0');
  return `${Date.now().toString(16)}-${rand()}-${rand()}`;
}

function ensureLoaded(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      try {
        const [m, q, id] = await Promise.all([
          AsyncStorage.getItem(METRICS_KEY), AsyncStorage.getItem(QUEUE_KEY), AsyncStorage.getItem(INSTALL_KEY),
        ]);
        state = reviveMetrics(m ? JSON.parse(m) : null);
        const parsed = q ? JSON.parse(q) : [];
        queue = Array.isArray(parsed) ? parsed.slice(-MAX_QUEUE) : [];
        installId = id || newId();
        if (!id) await AsyncStorage.setItem(INSTALL_KEY, installId);
      } catch {
        state = emptyMetrics();
        queue = [];
        installId = installId || newId();
      }
    })();
  }
  return ready;
}

function scheduleSave(immediate = false): void {
  if (saveTimer) clearTimeout(saveTimer);
  const save = () => {
    saveTimer = null;
    AsyncStorage.multiSet([
      [METRICS_KEY, JSON.stringify(state)],
      [QUEUE_KEY, JSON.stringify(queue)],
    ]).catch(() => {});
  };
  if (immediate) save();
  else saveTimer = setTimeout(save, 400);
}

/** Registra um evento de anúncio (serializado; duplicatas da mesma instância são ignoradas). */
export function recordAdEvent(input: AdEventInput): void {
  const ts = input.ts ?? Date.now();
  chain = chain.then(async () => {
    await ensureLoaded();
    const result = applyAdEvent(state, { ...input, ts }, newId());
    state = result.state;
    if (result.event) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        const e = result.event;
        const money = e.kind === 'paid' ? ` ${e.valueMicros} micros ${e.currency} (precisão ${e.precision})` : '';
        console.log(`[anuncios] ${e.platform}/${e.format} ${e.kind}${money} ${e.errorCode ?? ''} inst=${e.adInstanceId}`);
      }
      if (remoteTelemetryEnabled) {
        queue = [...queue, result.event].slice(-MAX_QUEUE);
      }
    }
    const critical = input.kind === 'paid' || input.kind === 'reward' || input.kind === 'closed';
    scheduleSave(critical);
    if (critical) void flushRemote();
  }).catch(() => {});
}

export function markAppActive(): void {
  chain = chain.then(async () => {
    await ensureLoaded();
    state = markActiveDay(state, Date.now());
    scheduleSave();
  }).catch(() => {});
}

export async function getAdMetricsSummary(): Promise<MetricsSummary & { pendingUpload: number; installId: string }> {
  await chain;
  await ensureLoaded();
  return { ...summarize(state), pendingUpload: queue.length, installId };
}

export async function resetAdMetrics(): Promise<void> {
  await chain;
  await ensureLoaded();
  state = emptyMetrics();
  scheduleSave(true);
}

function appVersion(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../../app.json').expo?.version ?? null;
  } catch {
    return null;
  }
}

/** Envia eventos pendentes ao Supabase (tabela public.ad_events). Falhas mantêm a fila. */
export async function flushRemote(): Promise<void> {
  if (!remoteTelemetryEnabled || !supabase || flushing) return;
  flushing = true;
  try {
    await ensureLoaded();
    const version = appVersion();
    while (queue.length) {
      const batch = queue.slice(0, BATCH);
      const rows = batch.map(e => ({
        event_id: e.id,
        install_id: installId,
        event_at: new Date(e.ts).toISOString(),
        local_day: e.day,
        kind: e.kind,
        format: e.format,
        platform: e.platform,
        ad_unit_id: e.adUnitId,
        ad_instance_id: e.adInstanceId,
        placement: e.placement ?? null,
        is_test: e.test,
        value_micros: e.kind === 'paid' ? e.valueMicros ?? 0 : null,
        currency: e.currency ?? null,
        precision: e.precision ?? null,
        ad_source: e.adSource ?? null,
        response_id: e.responseId ?? null,
        error_code: e.errorCode ?? null,
        latency_ms: e.latencyMs ?? null,
        app_version: version,
      }));
      const { error } = await supabase
        .from('ad_events')
        .upsert(rows, { onConflict: 'event_id', ignoreDuplicates: true });
      if (error) {
        // Violação de restrição (dados recusados pelo banco): descarta o lote para não travar a fila.
        if (typeof error.code === 'string' && error.code.startsWith('23')) {
          const bad = new Set(batch.map(e => e.id));
          queue = queue.filter(e => !bad.has(e.id));
          scheduleSave(true);
          continue;
        }
        break;
      }
      const sent = new Set(batch.map(e => e.id));
      queue = queue.filter(e => !sent.has(e.id));
      scheduleSave(true);
    }
  } catch {
    // Sem rede: tenta novamente no próximo evento crítico ou ao ir para segundo plano.
  } finally {
    flushing = false;
  }
}

let lifecycleStarted = false;
/** Marca o dia ativo e envia pendências ao abrir/fechar o app. */
export function startAdTelemetryLifecycle(): void {
  if (lifecycleStarted || Platform.OS === 'web') return;
  lifecycleStarted = true;
  markAppActive();
  void flushRemote();
  AppState.addEventListener('change', s => {
    if (s === 'active') markAppActive();
    else { scheduleSave(true); void flushRemote(); }
  });
}
