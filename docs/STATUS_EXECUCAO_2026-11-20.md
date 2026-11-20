# Status de execução — 2026-11-20 (TOQUE CERTO)

- **Commit verificado:** `b17ea59` (`main`, com PR #14 `hotfix/ads-paused-2026-11` mesclado)
- **Alterações de código:** nenhuma necessária. A suspensão do AdMob já estava na `main`.

## Verificações
- Banners: nenhum `BannerAd` no código.
- `rewardedAdsAvailable()` retorna `false` com `EXPO_PUBLIC_ADS_ENABLED=false`: sem inicialização, requisições ou recompensas.
- Botões de vídeo (`StartScreen`, `GameOverScreen`, `GameScreen`) só aparecem com anúncios disponíveis.
- Sem anúncios, a partida termina normalmente e o bônus diário é concedido sem multiplicador.
- Perfis `production` e `testflight`: `EXPO_PUBLIC_ADS_ENABLED=false`.

## Resultados
- `npx tsc --noEmit`: **OK** (exit 0)
- `npm run test:logic`: **OK** — 31/31
- `npm run preflight:ads`: **aprovado**
- `expo export --platform android` com ambiente `production`: **OK** (exit 0)

## Bloqueios
- **Builds EAS Android/iOS e envio às lojas de teste: não executados.** O token Expo da sessão é rejeitado pela API (`401 bearer token format invalid`). É necessário um token válido da conta `rodrigo_pulzr`.
- Nenhum identificador de build foi gerado.
