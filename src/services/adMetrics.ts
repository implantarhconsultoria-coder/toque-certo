// Livro-razão de monetização: lógica pura (sem React Native) para poder ser testada em Node.
// Registra cada etapa do ciclo de vida do anúncio e calcula preenchimento, exibição,
// impressões, receita informada pelo SDK (onPaidEvent) e eCPM real por formato e plataforma.

export type AdFormat = 'rewarded' | 'interstitial' | 'banner' | 'rewarded_interstitial';
export type AdPlatform = 'ios' | 'android' | 'web';

export type AdEventKind =
  | 'request'          // load() solicitado ao SDK
  | 'loaded'           // anúncio carregado (preenchido)
  | 'load_failed'      // erro de carregamento (no-fill, rede, configuração…)
  | 'load_timeout'     // carregamento não respondeu no prazo do jogador
  | 'show_requested'   // jogador pediu o vídeo
  | 'show_unavailable' // jogador pediu e não havia anúncio pronto a tempo
  | 'opened'           // anúncio aberto em tela cheia
  | 'show_failed'      // falha ao exibir anúncio carregado
  | 'impression'       // impressão registrada pelo SDK
  | 'paid'             // receita por impressão informada pelo SDK
  | 'reward'           // recompensa concedida (EARNED_REWARD)
  | 'clicked'
  | 'closed'
  | 'expired';         // carregado mas descartado sem exibição (validade/consentimento)

export const AD_EVENT_KINDS: AdEventKind[] = [
  'request', 'loaded', 'load_failed', 'load_timeout', 'show_requested', 'show_unavailable',
  'opened', 'show_failed', 'impression', 'paid', 'reward', 'clicked', 'closed', 'expired',
];

/** Eventos que só podem ocorrer uma vez por instância de anúncio (evita duplicidade). */
const REPEATABLE: ReadonlySet<AdEventKind> = new Set(['clicked']);

export interface AdEventInput {
  kind: AdEventKind;
  format: AdFormat;
  platform: AdPlatform;
  adUnitId: string;
  /** Identificador local da instância (um load = uma instância). */
  adInstanceId: string;
  placement?: string;
  test: boolean;
  ts?: number;
  valueMicros?: number;
  currency?: string;
  precision?: number;
  adSource?: string | null;
  responseId?: string | null;
  errorCode?: string;
  latencyMs?: number;
}

export interface AdEvent extends AdEventInput {
  id: string;
  ts: number;
  day: string;
}

export interface Bucket {
  platform: AdPlatform;
  format: AdFormat;
  adUnitId: string;
  test: boolean;
  counts: Record<AdEventKind, number>;
  /** Receita em micros por moeda (1 USD = 1_000_000 micros). */
  revenueMicros: Record<string, number>;
  /** Impressões que tiveram valor pago informado, por moeda (base do eCPM). */
  paidImpressions: Record<string, number>;
  errors: Record<string, number>;
}

export interface MetricsState {
  version: 1;
  buckets: Record<string, Bucket>;
  /** Receita em micros por dia e moeda (somente produção). */
  revenueByDay: Record<string, Record<string, number>>;
  /** Dias em que este aparelho esteve ativo. */
  activeDays: string[];
  /** Controle anti-duplicidade: instância → eventos já registrados. */
  seen: Record<string, AdEventKind[]>;
  seenOrder: string[];
  duplicatesIgnored: number;
}

export const MAX_TRACKED_INSTANCES = 300;
export const MAX_ACTIVE_DAYS = 120;

export function emptyMetrics(): MetricsState {
  return { version: 1, buckets: {}, revenueByDay: {}, activeDays: [], seen: {}, seenOrder: [], duplicatesIgnored: 0 };
}

function zeroCounts(): Record<AdEventKind, number> {
  const out = {} as Record<AdEventKind, number>;
  for (const k of AD_EVENT_KINDS) out[k] = 0;
  return out;
}

export function localDay(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function bucketKey(e: Pick<AdEventInput, 'platform' | 'format' | 'adUnitId' | 'test'>): string {
  return `${e.platform}|${e.format}|${e.adUnitId}|${e.test ? 'test' : 'prod'}`;
}

/**
 * Converte o valor informado pelo SDK em micros inteiros.
 * Prefere `valueMicros` (exato, Android); senão usa `value` (unidades da moeda).
 */
export function toMicros(value: number | undefined | null, valueMicros?: string | null): number {
  if (typeof valueMicros === 'string' && /^\d+$/.test(valueMicros)) {
    const parsed = Number(valueMicros);
    if (Number.isSafeInteger(parsed)) return parsed;
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * 1_000_000);
}

export function markActiveDay(state: MetricsState, ts: number): MetricsState {
  const day = localDay(ts);
  if (state.activeDays.includes(day)) return state;
  const activeDays = [...state.activeDays, day].sort().slice(-MAX_ACTIVE_DAYS);
  return { ...state, activeDays };
}

export interface ApplyResult { state: MetricsState; event: AdEvent | null; duplicate: boolean }

/** Aplica um evento ao livro-razão. Eventos repetidos da mesma instância são ignorados. */
export function applyAdEvent(state: MetricsState, input: AdEventInput, id: string): ApplyResult {
  const ts = input.ts ?? Date.now();
  const seenKinds = state.seen[input.adInstanceId] ?? [];
  if (!REPEATABLE.has(input.kind) && seenKinds.includes(input.kind)) {
    return { state: { ...state, duplicatesIgnored: state.duplicatesIgnored + 1 }, event: null, duplicate: true };
  }

  const event: AdEvent = { ...input, id, ts, day: localDay(ts) };
  const key = bucketKey(input);
  const prev = state.buckets[key];
  const bucket: Bucket = prev
    ? { ...prev, counts: { ...prev.counts }, revenueMicros: { ...prev.revenueMicros },
        paidImpressions: { ...prev.paidImpressions }, errors: { ...prev.errors } }
    : { platform: input.platform, format: input.format, adUnitId: input.adUnitId, test: input.test,
        counts: zeroCounts(), revenueMicros: {}, paidImpressions: {}, errors: {} };

  bucket.counts[input.kind] += 1;
  let revenueByDay = state.revenueByDay;
  if (input.kind === 'paid') {
    const currency = (input.currency || 'UNKNOWN').toUpperCase();
    const micros = Math.max(0, Math.round(input.valueMicros ?? 0));
    bucket.revenueMicros[currency] = (bucket.revenueMicros[currency] ?? 0) + micros;
    bucket.paidImpressions[currency] = (bucket.paidImpressions[currency] ?? 0) + 1;
    if (!input.test) {
      const dayMap = { ...(revenueByDay[event.day] ?? {}) };
      dayMap[currency] = (dayMap[currency] ?? 0) + micros;
      revenueByDay = { ...revenueByDay, [event.day]: dayMap };
    }
  }
  if ((input.kind === 'load_failed' || input.kind === 'show_failed') && input.errorCode) {
    bucket.errors[input.errorCode] = (bucket.errors[input.errorCode] ?? 0) + 1;
  }

  let seen = state.seen;
  let seenOrder = state.seenOrder;
  if (!REPEATABLE.has(input.kind)) {
    seen = { ...seen, [input.adInstanceId]: [...seenKinds, input.kind] };
    if (!seenKinds.length) {
      seenOrder = [...seenOrder, input.adInstanceId];
      if (seenOrder.length > MAX_TRACKED_INSTANCES) {
        const drop = seenOrder.slice(0, seenOrder.length - MAX_TRACKED_INSTANCES);
        seenOrder = seenOrder.slice(-MAX_TRACKED_INSTANCES);
        seen = { ...seen };
        for (const d of drop) delete seen[d];
      }
    }
  }

  const next = markActiveDay({ ...state, buckets: { ...state.buckets, [key]: bucket }, revenueByDay, seen, seenOrder }, ts);
  return { state: next, event, duplicate: false };
}

export interface BucketSummary {
  key: string;
  platform: AdPlatform;
  format: AdFormat;
  adUnitId: string;
  test: boolean;
  requests: number;
  loaded: number;
  loadFailed: number;
  timeouts: number;
  showRequested: number;
  showUnavailable: number;
  opened: number;
  showFailed: number;
  impressions: number;
  paidEvents: number;
  rewards: number;
  clicks: number;
  expired: number;
  /** loaded / requests */
  fillRate: number | null;
  /** opened / loaded */
  showRate: number | null;
  /** impressions / opened */
  impressionRate: number | null;
  /** Impressões sem evento de receita (SDK não informou valor). */
  impressionsWithoutPaid: number;
  /** Carregados que nunca chegaram a ser abertos (inclui o que ainda está em cache). */
  loadedNotShown: number;
  revenue: Record<string, number>;
  /** eCPM por moeda = receita / impressões pagas × 1000 */
  ecpm: Record<string, number>;
  errors: Record<string, number>;
}

const ratio = (a: number, b: number): number | null => (b > 0 ? a / b : null);

export function summarizeBucket(key: string, b: Bucket): BucketSummary {
  const c = b.counts;
  const revenue: Record<string, number> = {};
  const ecpm: Record<string, number> = {};
  for (const [cur, micros] of Object.entries(b.revenueMicros)) {
    revenue[cur] = micros / 1_000_000;
    const imps = b.paidImpressions[cur] ?? 0;
    if (imps > 0) ecpm[cur] = (micros / 1_000_000 / imps) * 1000;
  }
  return {
    key, platform: b.platform, format: b.format, adUnitId: b.adUnitId, test: b.test,
    requests: c.request, loaded: c.loaded, loadFailed: c.load_failed, timeouts: c.load_timeout,
    showRequested: c.show_requested, showUnavailable: c.show_unavailable, opened: c.opened,
    showFailed: c.show_failed, impressions: c.impression, paidEvents: c.paid, rewards: c.reward,
    clicks: c.clicked, expired: c.expired,
    fillRate: ratio(c.loaded, c.request),
    showRate: ratio(c.opened, c.loaded),
    impressionRate: ratio(c.impression, c.opened),
    impressionsWithoutPaid: Math.max(0, c.impression - c.paid),
    loadedNotShown: Math.max(0, c.loaded - c.opened),
    revenue, ecpm, errors: { ...b.errors },
  };
}

export interface MetricsSummary {
  buckets: BucketSummary[];
  /** Receita de produção por moeda (exclui anúncios de teste). */
  totalRevenue: Record<string, number>;
  activeDays: number;
  /** Receita média por dia ativo neste aparelho (ARPDAU local), por moeda. */
  revenuePerActiveDay: Record<string, number>;
  duplicatesIgnored: number;
}

export function summarize(state: MetricsState): MetricsSummary {
  const buckets = Object.entries(state.buckets).map(([k, b]) => summarizeBucket(k, b));
  const totalRevenue: Record<string, number> = {};
  for (const b of buckets) {
    if (b.test) continue;
    for (const [cur, v] of Object.entries(b.revenue)) totalRevenue[cur] = (totalRevenue[cur] ?? 0) + v;
  }
  const days = state.activeDays.length;
  const revenuePerActiveDay: Record<string, number> = {};
  if (days > 0) for (const [cur, v] of Object.entries(totalRevenue)) revenuePerActiveDay[cur] = v / days;
  return { buckets, totalRevenue, activeDays: days, revenuePerActiveDay, duplicatesIgnored: state.duplicatesIgnored };
}

/** Valida e normaliza dados lidos do armazenamento. */
export function reviveMetrics(raw: unknown): MetricsState {
  if (!raw || typeof raw !== 'object') return emptyMetrics();
  const r = raw as Partial<MetricsState>;
  if (r.version !== 1 || typeof r.buckets !== 'object' || !r.buckets) return emptyMetrics();
  const base = emptyMetrics();
  const buckets: Record<string, Bucket> = {};
  for (const [k, b] of Object.entries(r.buckets)) {
    if (!b || typeof b !== 'object') continue;
    buckets[k] = { ...b, counts: { ...zeroCounts(), ...(b.counts ?? {}) },
      revenueMicros: { ...(b.revenueMicros ?? {}) }, paidImpressions: { ...(b.paidImpressions ?? {}) },
      errors: { ...(b.errors ?? {}) } };
  }
  return {
    ...base,
    buckets,
    revenueByDay: typeof r.revenueByDay === 'object' && r.revenueByDay ? r.revenueByDay : {},
    activeDays: Array.isArray(r.activeDays) ? r.activeDays.filter(d => typeof d === 'string') : [],
    seen: typeof r.seen === 'object' && r.seen ? r.seen : {},
    seenOrder: Array.isArray(r.seenOrder) ? r.seenOrder : [],
    duplicatesIgnored: Number(r.duplicatesIgnored) || 0,
  };
}
