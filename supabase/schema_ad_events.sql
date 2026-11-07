-- Toque Certo: telemetria de anúncios (impressões e receita por impressão informada pelo SDK).
-- Aplicar SOMENTE no projeto Supabase exclusivo do Toque Certo.
-- O app só envia eventos quando EXPO_PUBLIC_AD_TELEMETRY_REMOTE=1.
-- Nenhum dado pessoal: install_id é aleatório, gerado no aparelho, sem vínculo com conta ou e-mail.
-- Os valores são ESTIMATIVAS do SDK por impressão; a receita oficial é o relatório do AdMob.

create table if not exists public.ad_events (
  event_id       text primary key check (char_length(event_id) between 8 and 64),
  install_id     text not null check (char_length(install_id) between 8 and 64),
  event_at       timestamptz not null,
  received_at    timestamptz not null default now(),
  local_day      date not null,
  kind           text not null check (kind in ('request','loaded','load_failed','load_timeout','show_requested',
                   'show_unavailable','opened','show_failed','impression','paid','reward','clicked','closed','expired')),
  format         text not null check (format in ('rewarded','interstitial','banner','rewarded_interstitial')),
  platform       text not null check (platform in ('ios','android','web')),
  ad_unit_id     text not null check (char_length(ad_unit_id) <= 80),
  ad_instance_id text not null check (char_length(ad_instance_id) <= 64),
  placement      text check (placement is null or char_length(placement) <= 40),
  is_test        boolean not null default false,
  value_micros   bigint check (value_micros is null or (value_micros >= 0 and value_micros < 100000000)),
  currency       text check (currency is null or currency ~ '^[A-Za-z]{3}$'),
  precision      smallint check (precision is null or precision between 0 and 3),
  ad_source      text check (ad_source is null or char_length(ad_source) <= 120),
  response_id    text check (response_id is null or char_length(response_id) <= 120),
  error_code     text check (error_code is null or char_length(error_code) <= 80),
  latency_ms     integer check (latency_ms is null or latency_ms between 0 and 3600000),
  app_version    text check (app_version is null or char_length(app_version) <= 20)
);

-- Reenvio do mesmo evento é ignorado pela chave event_id; o app já descarta duplicatas por instância.
create index if not exists ad_events_instance_idx on public.ad_events (install_id, ad_instance_id, kind);
create index if not exists ad_events_day_idx on public.ad_events (local_day, platform, format);

alter table public.ad_events enable row level security;
revoke all on table public.ad_events from anon, authenticated;
-- O app só pode inserir; leitura apenas pelo painel/serviço (service_role).
grant insert on table public.ad_events to anon, authenticated;
drop policy if exists "ad_events_insert_only" on public.ad_events;
create policy "ad_events_insert_only" on public.ad_events
  for insert to anon, authenticated
  with check (event_at > now() - interval '30 days' and event_at < now() + interval '1 day');

-- Funil e receita por dia, plataforma, formato e unidade (somente produção).
create or replace view public.ad_daily_report with (security_invoker = true) as
select
  local_day,
  platform,
  format,
  ad_unit_id,
  count(*) filter (where kind = 'request')          as requests,
  count(*) filter (where kind = 'loaded')           as loaded,
  count(*) filter (where kind = 'load_failed')      as load_failed,
  count(*) filter (where kind = 'show_requested')   as show_requested,
  count(*) filter (where kind = 'show_unavailable') as show_unavailable,
  count(*) filter (where kind = 'opened')           as shown,
  count(*) filter (where kind = 'impression')       as impressions,
  count(*) filter (where kind = 'paid')             as paid_events,
  count(*) filter (where kind = 'reward')           as rewards,
  count(*) filter (where kind = 'expired')          as expired_unshown,
  coalesce(sum(value_micros) filter (where kind = 'paid' and upper(currency) = 'USD'), 0) / 1e6 as revenue_usd,
  round(100.0 * count(*) filter (where kind = 'loaded') / nullif(count(*) filter (where kind = 'request'), 0), 2) as fill_rate_pct,
  round(100.0 * count(*) filter (where kind = 'opened') / nullif(count(*) filter (where kind = 'loaded'), 0), 2) as show_rate_pct,
  round((coalesce(sum(value_micros) filter (where kind = 'paid' and upper(currency) = 'USD'), 0) / 1e6)
        / nullif(count(*) filter (where kind = 'paid' and upper(currency) = 'USD'), 0) * 1000, 4) as ecpm_usd,
  count(distinct install_id) as active_installs
from public.ad_events
where not is_test
group by 1, 2, 3, 4;

-- Receita média por usuário ativo (instalação que gerou qualquer evento de anúncio no dia).
create or replace view public.ad_arpdau with (security_invoker = true) as
select
  local_day,
  platform,
  count(distinct install_id) as active_installs,
  coalesce(sum(value_micros) filter (where kind = 'paid' and upper(currency) = 'USD'), 0) / 1e6 as revenue_usd,
  round((coalesce(sum(value_micros) filter (where kind = 'paid' and upper(currency) = 'USD'), 0) / 1e6)
        / nullif(count(distinct install_id), 0), 6) as arpdau_usd
from public.ad_events
where not is_test
group by 1, 2;

-- Receita por fonte de anúncio (útil se a mediação for ativada).
create or replace view public.ad_source_report with (security_invoker = true) as
select local_day, platform, coalesce(ad_source, 'desconhecida') as ad_source, upper(currency) as currency,
       count(*) as paid_impressions, sum(value_micros) / 1e6 as revenue,
       round(sum(value_micros) / 1e6 / nullif(count(*), 0) * 1000, 4) as ecpm
from public.ad_events
where kind = 'paid' and not is_test
group by 1, 2, 3, 4;

revoke all on public.ad_daily_report, public.ad_arpdau, public.ad_source_report from anon, authenticated;
