# TOQUE CERTO — Checklist de Lançamento nas Lojas
**Status inicial:** NÃO PRONTO PARA ENVIO | **Data:** 2026-10-30

## Identidade já presente no projeto
- Nome: Toque Certo
- iOS bundle ID: com.implanta.toquecerto
- Android package: com.implanta.toquecerto
- Expo slug: toque-certo
- Versão no app.json consultado: 1.0.0
- EAS profiles presentes: preview (APK), testflight (iOS store), production (Android AAB / store)

## Antes da primeira build de loja
- [ ] Confirmar Expo account/projectId e vincular EAS.
- [ ] Confirmar Apple Developer Team, App Store Connect app e bundle ID.
- [ ] Confirmar Play Console app e package ID.
- [ ] Configurar credenciais de assinatura via EAS; nunca commitar keystore/certificados.
- [ ] Criar Supabase project e aplicar migrations/RLS/functions, caso ranking seja incluído na primeira versão.
- [ ] Criar AdMob app iOS e Android e unidades Rewarded/Interstitial.
- [ ] Configurar UMP/consentimento e política de privacidade.
- [ ] Definir se Toque Certo Pro será mensal/anual no primeiro lançamento; criar produtos nos consoles.
- [ ] Configurar RevenueCat e webhooks se aprovado.
- [ ] Adicionar Sentry/crash reporting e analytics com minimização de dados.

## QA
- [ ] Testar iPhone físico (instalação limpa, primeira partida, pausa, retomada, resultado, share, anúncios, compras e restore).
- [ ] Testar Android físico equivalente.
- [ ] Verificar modo avião, perda de rede e sincronização posterior.
- [ ] Confirmar que anúncio nunca aparece no meio da partida.
- [ ] Confirmar que rewarded concede somente item não competitivo.
- [ ] Confirmar ranking só recebe score validado.
- [ ] Verificar consumo, memória, orientação, safe areas e acessibilidade.
- [ ] Confirmar crash-free session e logs sem PII.

## Materiais e declarações
- [ ] Ícone final e splash.
- [ ] Capturas reais de iPhone e Android, sem mock enganoso.
- [ ] Descrição curta e longa, palavras-chave e categoria.
- [ ] Política de privacidade pública e URL de suporte.
- [ ] App Privacy (Apple) e Data Safety (Google) preenchidos conforme SDKs/dados reais.
- [ ] Classificação etária e declarações de anúncios.
- [ ] Revisar regras de compras digitais, restauração e cancelamento.
- [ ] Conta de revisão e instruções, se houver login obrigatório.

## Envio e publicação
- [ ] EAS production build Android (.aab) concluída.
- [ ] Upload Play Console confirmado; teste interno/fechado concluído.
- [ ] EAS iOS build concluída e enviada ao App Store Connect.
- [ ] TestFlight instalado e smoke test concluído.
- [ ] Enviar ambas as versões para revisão.
- [ ] Acompanhar rejeições e responder às pendências.
- [ ] Confirmar status Published/Ready for Distribution em cada loja.
- [ ] Verificar app público em cada loja após propagação.

**Regra:** build, upload, envio para revisão, aprovação e publicação são estados diferentes. Registrar cada um com evidência.
