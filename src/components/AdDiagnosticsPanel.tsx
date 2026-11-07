// Painel de diagnóstico da monetização neste aparelho. Visível apenas em desenvolvimento
// ou em builds com EXPO_PUBLIC_AD_DIAGNOSTICS=1. Não aparece para jogadores em produção.
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { adDiagnosticsVisible, getAdMetricsSummary, resetAdMetrics } from '../services/adTelemetry';
import { usingTestAds } from '../services/rewardedAds';
import type { BucketSummary } from '../services/adMetrics';

type Summary = Awaited<ReturnType<typeof getAdMetricsSummary>>;

const pct = (v: number | null) => (v === null ? '—' : `${(v * 100).toFixed(1)}%`);
const money = (m: Record<string, number>) => {
  const entries = Object.entries(m);
  return entries.length ? entries.map(([c, v]) => `${v.toFixed(6)} ${c}`).join(' · ') : '—';
};

function Bucket({ b }: { b: BucketSummary }) {
  return (
    <View style={styles.bucket}>
      <Text style={styles.bucketTitle}>{b.platform.toUpperCase()} · {b.format} {b.test ? '(TESTE)' : '(PRODUÇÃO)'}</Text>
      <Text style={styles.line}>Unidade: {b.adUnitId}</Text>
      <Text style={styles.line}>Solicitados {b.requests} · Carregados {b.loaded} · Falhas {b.loadFailed} · Tempo esgotado {b.timeouts}</Text>
      <Text style={styles.line}>Pedidos do jogador {b.showRequested} · Sem anúncio pronto {b.showUnavailable}</Text>
      <Text style={styles.line}>Exibidos {b.opened} · Falha ao exibir {b.showFailed} · Impressões {b.impressions} · Recompensas {b.rewards}</Text>
      <Text style={styles.line}>Receitas informadas {b.paidEvents} · Impressões sem valor {b.impressionsWithoutPaid} · Carregados não exibidos {b.loadedNotShown} · Expirados {b.expired}</Text>
      <Text style={styles.line}>Preenchimento {pct(b.fillRate)} · Exibição {pct(b.showRate)} · Impressão/exibição {pct(b.impressionRate)}</Text>
      <Text style={styles.line}>Receita {money(b.revenue)}</Text>
      <Text style={styles.line}>eCPM {money(b.ecpm)}</Text>
      {Object.keys(b.errors).length > 0 && <Text style={styles.line}>Erros: {Object.entries(b.errors).map(([k, v]) => `${k}×${v}`).join(', ')}</Text>}
    </View>
  );
}

export default function AdDiagnosticsPanel() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const refresh = useCallback(() => { getAdMetricsSummary().then(setSummary).catch(() => {}); }, []);
  useEffect(() => { refresh(); }, [refresh]);
  if (!adDiagnosticsVisible) return null;
  return (
    <View style={styles.box}>
      <Text style={styles.title}>DIAGNÓSTICO DE ANÚNCIOS (ESTE APARELHO)</Text>
      <Text style={styles.line}>Modo: {usingTestAds ? 'anúncios de TESTE' : 'anúncios de PRODUÇÃO'} · Dias ativos {summary?.activeDays ?? 0}</Text>
      <Text style={styles.line}>Receita produção {money(summary?.totalRevenue ?? {})} · Por dia ativo {money(summary?.revenuePerActiveDay ?? {})}</Text>
      <Text style={styles.line}>Duplicatas ignoradas {summary?.duplicatesIgnored ?? 0} · Pendentes de envio {summary?.pendingUpload ?? 0}</Text>
      <ScrollView style={{ maxHeight: 260 }} nestedScrollEnabled>
        {summary?.buckets.map(b => <Bucket key={b.key} b={b} />)}
      </ScrollView>
      <View style={styles.row}>
        <TouchableOpacity onPress={refresh} style={styles.btn}><Text style={styles.btnText}>ATUALIZAR</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => { void resetAdMetrics().then(refresh); }} style={styles.btn}><Text style={styles.btnText}>ZERAR</Text></TouchableOpacity>
      </View>
      <Text style={styles.hint}>Valores do SDK são estimativas por impressão. A receita oficial é a do relatório AdMob.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 16, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#6656A9', backgroundColor: '#120E30', gap: 4 },
  title: { color: '#4BE8FF', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  bucket: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#2D2668', gap: 2 },
  bucketTitle: { color: '#F2D1FF', fontWeight: '900', fontSize: 11 },
  line: { color: '#D6D8F5', fontSize: 10, lineHeight: 14 },
  row: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#2A2066' },
  btnText: { color: '#FFF', fontWeight: '900', fontSize: 10 },
  hint: { color: '#9194BE', fontSize: 9, marginTop: 6 },
});
