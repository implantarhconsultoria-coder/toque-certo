// Controlador do anúncio premiado, independente do React Native (testável em Node).
// - Mantém no máximo UM anúncio pré-carregado, com validade de 55 minutos.
// - Uma carga por vez; falhas aplicam espera crescente, sem repetição em loop.
// - Recompensa SOMENTE pelo evento EARNED_REWARD da instância em exibição.
// - Cada etapa (solicitação → carregamento → exibição → impressão → receita → recompensa)
//   é registrada uma única vez por instância.
import type { AdEventKind } from './adMetrics';

export interface AdHandle {
  load(): void;
  show(): Promise<void>;
  addAdEventListener(type: string, listener: (payload?: any) => void): () => void;
}

export interface AdEventTypes {
  LOADED: string;
  EARNED_REWARD: string;
  ERROR: string;
  OPENED: string;
  CLOSED: string;
  PAID: string;
  IMPRESSION: string;
  CLICKED: string;
}

export interface RecordExtras {
  placement?: string;
  valueMicros?: number;
  currency?: string;
  precision?: number;
  adSource?: string | null;
  responseId?: string | null;
  errorCode?: string;
  latencyMs?: number;
}

export interface ControllerDeps {
  createAd: () => AdHandle;
  events: AdEventTypes;
  /** Consentimento UMP/ATT + inicialização do SDK. Retorna false se não pode solicitar anúncios. */
  prepare: () => Promise<boolean>;
  record: (kind: AdEventKind, adInstanceId: string, extras?: RecordExtras) => void;
  toMicros: (value: number | undefined, valueMicros?: string | null) => number;
  newId: () => string;
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  /** Mensagem ao jogador quando ele pediu o vídeo e não foi possível exibir. */
  onUserFacingFailure?: (stage: string, error?: unknown) => void;
  loadTimeoutMs?: number;
  expiryMs?: number;
  retryDelaysMs?: number[];
}

type SlotState = 'loading' | 'ready' | 'showing' | 'done';

interface Slot {
  id: string;
  ad: AdHandle;
  state: SlotState;
  requestedAt: number;
  loadedAt: number;
  placement?: string;
  earned: boolean;
  subs: Array<() => void>;
  waiters: Array<(result: 'ready' | 'failed') => void>;
  onFinish?: (earned: boolean) => void;
}

export function errorCodeOf(error: unknown): string {
  const e = error as { code?: unknown; message?: unknown } | undefined;
  if (e && typeof e.code === 'string' && e.code) return e.code;
  if (e && typeof e.message === 'string') {
    const m = e.message.match(/\[([^\]]+)\]/);
    if (m) return m[1];
  }
  return 'unknown';
}

export class RewardedController {
  private slot: Slot | null = null;
  private presenting = false;
  private failures = 0;
  private nextPreloadAt = 0;
  private retryTimer: unknown = null;
  private readonly d: Required<Omit<ControllerDeps, 'onUserFacingFailure'>> & Pick<ControllerDeps, 'onUserFacingFailure'>;

  constructor(deps: ControllerDeps) {
    this.d = {
      now: () => Date.now(),
      setTimer: (fn: () => void, ms: number) => setTimeout(fn, ms),
      clearTimer: (h: unknown) => clearTimeout(h as ReturnType<typeof setTimeout>),
      loadTimeoutMs: 30_000,
      expiryMs: 55 * 60_000,
      retryDelaysMs: [15_000, 60_000, 180_000],
      ...deps,
    } as any;
  }

  /** Estado atual, para diagnóstico. */
  status(): { state: SlotState | 'empty'; presenting: boolean; failures: number } {
    return { state: this.slot?.state ?? 'empty', presenting: this.presenting, failures: this.failures };
  }

  /** Pré-carrega sem exibir. Respeita a espera após falhas. Nunca lança. */
  async preload(placement?: string): Promise<void> {
    if (this.presenting) return;
    this.dropIfExpired();
    if (this.slot) return;
    if (this.d.now() < this.nextPreloadAt) return;
    try {
      if (!(await this.d.prepare())) return;
    } catch {
      return;
    }
    if (!this.slot && !this.presenting) this.startLoad(placement);
  }

  /** Descarta anúncio em cache (ex.: mudança de consentimento). */
  invalidate(): void {
    const s = this.slot;
    if (!s || s.state === 'showing') return;
    if (s.state === 'ready') this.d.record('expired', s.id, { errorCode: 'invalidated' });
    this.flush(s, 'failed');
    this.dispose(s);
  }

  /** Exibe o premiado pedido pelo jogador. Resolve true somente se a recompensa foi obtida. */
  async show(placement: string): Promise<boolean> {
    if (this.presenting) return false;
    this.presenting = true;
    try {
      let allowed = false;
      let prepError: unknown;
      try { allowed = await this.d.prepare(); } catch (error) { prepError = error; }
      if (!allowed) {
        const id = this.d.newId();
        this.d.record('show_requested', id, { placement });
        this.d.record('show_unavailable', id, { placement, errorCode: 'consent' });
        this.d.onUserFacingFailure?.(prepError ? 'consentimento' : 'consentimento-pendente', prepError);
        return false;
      }

      this.dropIfExpired();
      if (!this.slot) this.startLoad(placement);
      const slot = this.slot;
      if (!slot) {
        const id = this.d.newId();
        this.d.record('show_requested', id, { placement });
        this.d.record('show_unavailable', id, { placement, errorCode: 'load_failed' });
        this.d.onUserFacingFailure?.('carregamento');
        return false;
      }
      this.d.record('show_requested', slot.id, { placement });

      if (slot.state === 'loading') {
        const outcome = await this.waitReady(slot);
        if (outcome !== 'ready') {
          this.d.record('show_unavailable', slot.id, { placement, errorCode: outcome });
          if (outcome === 'timeout') {
            // A carga continua: se chegar depois, fica pronta para o próximo pedido.
            this.d.record('load_timeout', slot.id, { placement });
            this.d.onUserFacingFailure?.('tempo-de-carregamento-esgotado');
          }
          return false;
        }
      }
      return await this.present(slot, placement);
    } finally {
      this.presenting = false;
      // Prepara o próximo vídeo para o próximo pedido do jogador (nunca exibe sozinho).
      void this.preload(placement);
    }
  }

  private present(slot: Slot, placement: string): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      slot.state = 'showing';
      slot.placement = placement;
      slot.onFinish = earned => resolve(earned);
      // Promise boundary also catches a synchronous native bridge failure.
      Promise.resolve().then(() => slot.ad.show()).catch((error: unknown) => {
        if (slot.state !== 'showing') return;
        this.d.record('show_failed', slot.id, { placement, errorCode: errorCodeOf(error) });
        this.d.onUserFacingFailure?.('exibicao', error);
        this.finish(slot, false);
      });
    });
  }

  private waitReady(slot: Slot): Promise<'ready' | 'failed' | 'timeout'> {
    return new Promise(resolve => {
      let settled = false;
      const timer = this.d.setTimer(() => {
        if (settled) return;
        settled = true;
        slot.waiters = slot.waiters.filter(w => w !== waiter);
        resolve('timeout');
      }, this.d.loadTimeoutMs);
      const waiter = (r: 'ready' | 'failed') => {
        if (settled) return;
        settled = true;
        this.d.clearTimer(timer);
        resolve(r);
      };
      slot.waiters.push(waiter);
    });
  }

  private dropIfExpired(): void {
    const s = this.slot;
    if (s && s.state === 'ready' && this.d.now() - s.loadedAt > this.d.expiryMs) {
      this.d.record('expired', s.id, { errorCode: 'expired' });
      this.dispose(s);
    }
  }

  private startLoad(placement?: string): void {
    if (this.retryTimer) { this.d.clearTimer(this.retryTimer); this.retryTimer = null; }
    let ad: AdHandle;
    const id = this.d.newId();
    try {
      ad = this.d.createAd();
    } catch (error) {
      this.d.record('request', id, { placement });
      this.d.record('load_failed', id, { placement, errorCode: errorCodeOf(error) });
      this.onLoadFailure();
      return;
    }
    const slot: Slot = { id, ad, state: 'loading', requestedAt: this.d.now(), loadedAt: 0, placement,
      earned: false, subs: [], waiters: [] };
    this.slot = slot;
    const ev = this.d.events;
    const on = (type: string, fn: (p?: any) => void) => {
      try { slot.subs.push(ad.addAdEventListener(type, fn)); } catch { /* evento não suportado */ }
    };

    on(ev.LOADED, () => {
      if (slot.state !== 'loading') return;
      slot.state = 'ready';
      slot.loadedAt = this.d.now();
      this.failures = 0;
      this.nextPreloadAt = 0;
      this.d.record('loaded', slot.id, { placement: slot.placement, latencyMs: slot.loadedAt - slot.requestedAt });
      this.flush(slot, 'ready');
    });
    on(ev.ERROR, (error?: unknown) => {
      if (slot.state === 'loading') {
        this.d.record('load_failed', slot.id, { placement: slot.placement, errorCode: errorCodeOf(error) });
        const hadWaiters = slot.waiters.length > 0;
        this.flush(slot, 'failed');
        this.dispose(slot);
        this.onLoadFailure();
        if (hadWaiters) this.d.onUserFacingFailure?.('carregamento', error);
      } else if (slot.state === 'showing') {
        this.d.record('show_failed', slot.id, { placement: slot.placement, errorCode: errorCodeOf(error) });
        this.d.onUserFacingFailure?.('exibicao', error);
        this.finish(slot, false);
      }
    });
    on(ev.OPENED, () => this.d.record('opened', slot.id, { placement: slot.placement }));
    on(ev.IMPRESSION, () => this.d.record('impression', slot.id, { placement: slot.placement }));
    on(ev.CLICKED, () => this.d.record('clicked', slot.id, { placement: slot.placement }));
    on(ev.PAID, (paid?: any) => {
      const info = paid?.responseInfo;
      this.d.record('paid', slot.id, {
        placement: slot.placement,
        valueMicros: this.d.toMicros(paid?.value, paid?.valueMicros),
        currency: typeof paid?.currency === 'string' ? paid.currency : undefined,
        precision: typeof paid?.precision === 'number' ? paid.precision : undefined,
        adSource: info?.loadedAdapterResponse?.adSourceName ?? info?.adapterClassName ?? null,
        responseId: info?.responseId ?? null,
      });
    });
    on(ev.EARNED_REWARD, () => {
      if (slot.state !== 'showing' || slot.earned) return;
      slot.earned = true;
      this.d.record('reward', slot.id, { placement: slot.placement });
    });
    on(ev.CLOSED, () => {
      if (slot.state !== 'showing') return;
      this.d.record('closed', slot.id, { placement: slot.placement });
      this.finish(slot, slot.earned);
    });

    this.d.record('request', slot.id, { placement });
    try {
      ad.load();
    } catch (error) {
      this.d.record('load_failed', slot.id, { placement, errorCode: errorCodeOf(error) });
      this.flush(slot, 'failed');
      this.dispose(slot);
      this.onLoadFailure();
    }
  }

  private onLoadFailure(): void {
    const delays = this.d.retryDelaysMs;
    const delay = delays[Math.min(this.failures, delays.length - 1)];
    this.failures += 1;
    this.nextPreloadAt = this.d.now() + delay;
    // Repetição automática limitada ao número de esperas configuradas.
    if (this.failures <= delays.length) {
      this.retryTimer = this.d.setTimer(() => { this.retryTimer = null; void this.preload(); }, delay);
    }
  }

  private flush(slot: Slot, result: 'ready' | 'failed'): void {
    const waiters = slot.waiters;
    slot.waiters = [];
    waiters.forEach(w => w(result));
  }

  private finish(slot: Slot, earned: boolean): void {
    if (slot.state === 'done') return;
    const done = slot.onFinish;
    this.dispose(slot);
    done?.(earned);
  }

  private dispose(slot: Slot): void {
    slot.state = 'done';
    slot.subs.forEach(unsub => { try { unsub(); } catch { /* ignora */ } });
    slot.subs = [];
    if (this.slot === slot) this.slot = null;
  }
}
