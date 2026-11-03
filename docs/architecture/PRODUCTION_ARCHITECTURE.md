# TOQUE CERTO — Arquitetura de Produção
**Versão:** 1.0 | **Data:** 2026-10-30 | **Branch:** architecture/production-monetization-20261030

## 1. Objetivo e princípios
Transformar o jogo casual de reflexos existente em produto mobile comercial para iOS e Android, com monetização desde a primeira versão pública, partidas rápidas, ranking competitivo confiável e compartilhamento orgânico.

Princípios obrigatórios:
- Evoluir o repositório existente; não recriar o app nem substituir telas funcionais sem justificativa.
- Manter o jogo principal jogável offline e sem cadastro obrigatório.
- Nunca exibir anúncio durante uma partida.
- Ranking competitivo só aceita partidas validadas no servidor.
- Monetização não pode comprar pontos, vantagens competitivas ou posições no ranking.
- Nenhuma credencial, chave privilegiada ou segredo fica no app.
- Toda mudança relevante passa por testes, revisão e registro; builds de loja só com release gate aprovado.

## 2. Baseline confirmado
Repositório: https://github.com/implantarhconsultoria-coder/toque-certo
Branch de origem: main
Stack atual: Expo SDK 57, React Native 0.86, React 19, TypeScript, React Navigation 7, AsyncStorage.
Identificadores já definidos:
- iOS bundle: com.implanta.toquecerto
- Android package: com.implanta.toquecerto
- Expo slug: toque-certo

Fluxo atual: Start → Game → GameOver.
Já existem: partidas de 30 segundos, grade de símbolos, níveis progressivos (4/6/9 opções), combo a cada 5 acertos, erro desconta 1 segundo, recorde local, missões básicas, efeitos visuais e compartilhamento.
Persistência atual é local (AsyncStorage). Perfil informa explicitamente que ranking/contas ainda não estão disponíveis.
EAS profiles existentes: preview APK, testflight, production AAB.
Não foi encontrado app Replit correspondente na conta conectada nesta verificação. Não foi confirmada configuração de Supabase, AdMob, RevenueCat, Expo projectId, App Store Connect ou Play Console para este app. O site Vercel não comprova publicação nativa.

## 3. Arquitetura-alvo
### Mobile
- React Native + Expo (manter SDK atual inicialmente).
- TypeScript com módulos por domínio.
- Navegação: Home, Partida, Resultado, Ranking, Perfil, Missões, Loja/Pro, Configurações, Privacidade.
- Game Engine pura e determinística em `src/game/`: geração de rodada, regras, pontuação, combos, dificuldade, encerramento e serialização do replay.
- Estado de sessão em memória; persistência local versionada em `src/storage/` para recordes, preferências, histórico e fila offline.
- Camada de serviços em `src/services/`: auth, leaderboard, ads, purchases, analytics, crash reporting.
- Adaptadores nativos encapsulados para AdMob e compras; telas não chamam SDKs diretamente.
- Feature flags remotas para ativar/desativar anúncios, ranking e ofertas sem publicar nova versão.

### Backend
Supabase Auth + Postgres + RLS + Edge Functions.
- Auth: conta anônima/guest inicialmente, com opção de vincular Apple/Google/e-mail depois; nunca bloquear a primeira partida.
- Postgres: perfis, partidas, placares, temporadas, conquistas, produtos/entitlements e eventos de auditoria.
- Edge Functions: submit-run, leaderboard, claim-entitlement/webhook e configuração pública.
- RLS: usuário lê dados públicos de ranking; escreve apenas seu perfil permitido; nunca escreve diretamente score validado ou entitlements.
- Segredos e service role apenas nas Edge Functions.
- Se o backend estiver indisponível, salvar resultado localmente e sincronizar depois; indicar claramente que resultado pendente não está no ranking.

### Fluxo de pontuação e antifraude
1. Ao iniciar partida online, servidor entrega run_id, seed, regras/versão e horário de expiração.
2. O cliente registra eventos mínimos da partida (índice escolhido, alvo esperado, timestamp monotônico relativo, pausa/retomada e versão do motor).
3. Ao finalizar, cliente envia run_id, eventos e resumo.
4. Edge Function reexecuta/valida sequência determinística, limites de tempo, acertos, erros, combos, pontuação máxima possível, duplicidade e versão de regras.
5. Só o servidor grava score_validated e atualiza ranking.
6. Falha de rede: resultado fica pending_local e é reenviado idempotentemente; não inventar posição de ranking antes da validação.
7. Rate limit por usuário/dispositivo e trilha de auditoria para anomalias. Não usar fingerprint invasivo.

## 4. Modelo de dados inicial
- profiles: id (auth.uid), display_name, avatar_key, created_at, privacy_settings.
- game_runs: id, user_id, rules_version, seed, started_at, finished_at, duration_ms, score_submitted, score_validated, combo_max, status (pending/validated/rejected), validation_reason, replay_digest.
- run_events: run_id, sequence_no, event_type, payload_json, elapsed_ms; escrita somente via Edge Function.
- leaderboard_entries: season_id, user_id, best_score, runs_count, updated_at; atualização server-side.
- seasons: id, starts_at, ends_at, status.
- achievements: id, code, threshold, reward_type.
- user_achievements: user_id, achievement_id, unlocked_at.
- entitlements: user_id, product_id, source, expires_at, status; server/webhook-managed.
- app_config: public feature flags, ad frequency caps, minimum supported version.
Índices: (season_id, best_score DESC), (user_id, created_at DESC), (run_id, sequence_no UNIQUE).

## 5. Monetização desde o lançamento
### AdMob
- Integrar Google Mobile Ads com plugin Expo compatível com SDK 57; validar prebuild/EAS antes de congelar versões.
- IDs de teste em desenvolvimento e QA; IDs reais apenas via configuração de release.
- Rewarded: oferecer recompensa não competitiva (tema visual, tentativa de treino ou bônus de XP cosmético). Nunca acrescentar pontos ao score ranqueado.
- Interstitial: apenas após tela de resultado, nunca durante partida; cap inicial: no máximo 1 a cada 3 partidas e intervalo mínimo de 120 segundos.
- Sem banner na tela de jogo. Banner só pode ser considerado em áreas não críticas após teste de UX.
- Implementar consentimento UMP para regiões aplicáveis e respeitar opt-out. Não solicitar ATT sem necessidade real de tracking.

### Toque Certo Pro (compra dentro das lojas)
- Assinatura mensal/anual e opção vitalícia somente após validação comercial; primeira versão pode lançar mensal e anual.
- Benefícios: remover anúncios, temas e efeitos exclusivos, estatísticas avançadas, histórico ampliado e desafios de treino.
- Sem vantagem competitiva, pontos, multiplicadores ou vidas extras em partidas ranqueadas.
- RevenueCat recomendado como camada de entitlement cross-platform, sujeito à validação de custos/conta. Compras sempre processadas por Apple In-App Purchase e Google Play Billing.
- Restaurar compras, tratar cancelamento/expiração, modo offline e webhooks server-side.
- Preços e disponibilidade definidos nos consoles das lojas; não codificar valores fixos no cliente.

### Métricas comerciais
Eventos: first_open, tutorial_complete, game_start, game_end, share_tap, rewarded_offer/view/reward, interstitial_view, paywall_view, purchase_start/success/cancel, ad_consent.
KPIs: D1/D7 retention, partidas por usuário/dia, taxa de compartilhamento, ARPDAU, fill rate, eCPM, conversão Pro, crash-free sessions.
Não coletar dados pessoais além do necessário.

## 6. Organização sugerida do código
```
src/
  app/                 # providers, feature flags, bootstrap
  navigation/
  game/                # motor puro, regras versionadas, replay
  features/
    home/
    gameplay/
    results/
    leaderboard/
    profile/
    missions/
    monetization/
    settings/
  services/
    supabase/
    ads/
    purchases/
    analytics/
    crash/
  storage/              # AsyncStorage versionado e fila offline
  components/
  theme/
  utils/
supabase/
  migrations/
  functions/
docs/
  architecture/
```
Não mover/refatorar tudo em um único PR. Adotar migrações incrementais mantendo imports e telas funcionais.

## 7. Fases de implementação e critérios de aceite
### Fase 0 — Auditoria técnica
- Confirmar árvore completa, testes existentes, build profiles, Expo project, credenciais/configuração de lojas e estado do Vercel.
- Registrar baseline de build e testes.
- Não alterar IDs de pacote nem criar outro app.

### Fase 1 — Robustez do core
- Extrair regras para motor puro e determinístico.
- Corrigir timers, pausa/retomada, toque duplo, encerramento, persistência e recuperação.
- Testes unitários de regras, score e replay.
Aceite: testes de jogo e TypeScript passam; nenhuma regressão nas 3 telas atuais.

### Fase 2 — Monetização
- AdMob com consentimento, limites de frequência e placements pós-partida.
- Paywall Pro, compras/restauração, validação de entitlement.
Aceite: anúncios de teste aparecem nos placements corretos; compras sandbox iOS/Android e restore funcionam; nenhum anúncio em gameplay.

### Fase 3 — Conta e ranking
- Supabase migrations, guest auth, vinculação de conta e RLS.
- Edge Function de validação de partidas e leaderboard semanal/global.
Aceite: usuário não consegue gravar score diretamente; partidas inválidas são rejeitadas; ranking sincroniza entre dispositivos.

### Fase 4 — Retenção e viralidade
- Missões diárias/semanais, conquistas, desafios compartilháveis, deep links e cards de resultado.
- Onboarding de no máximo 2 telas; primeira partida sem login.
Aceite: compartilhamento real em iOS/Android; missão e progresso persistem.

### Fase 5 — Release candidate e lojas
- QA em iPhone e Android físicos; acessibilidade; performance; crash reporting.
- Ícone, splash, screenshots reais, descrição, palavras-chave, classificação etária, política de privacidade, App Privacy/Data Safety, suporte e contato.
- TestFlight e Google Play testing track; revisar warnings; produção após validação.
Aceite: build assinada, upload confirmado, revisão aprovada e app efetivamente publicado. Build concluída não equivale a publicação.

## 8. Release gates obrigatórios
- [ ] Repositório e branch confirmados; PR revisado.
- [ ] TypeScript, lint (se configurado), testes unitários e export/build nativo aprovados.
- [ ] AdMob test IDs em QA e real IDs somente no release.
- [ ] Consentimento, privacy disclosures e política publicados.
- [ ] Compras sandbox e restore validados.
- [ ] Supabase RLS e Edge Functions testados; sem service key no bundle.
- [ ] Teste físico iOS e Android; crash-free smoke test.
- [ ] Screenshots e metadados correspondem à build enviada.
- [ ] Upload e status de revisão confirmados nos dois consoles.
- [ ] Monitorar crashes, anúncios e compras após publicação.

## 9. Riscos e decisões
- Expo SDK 57 é a base existente; não atualizar junto com integração de ads sem necessidade.
- SDKs nativos de anúncios/compras podem exigir config plugins e rebuild; validar compatibilidade em branch isolada.
- Não foi confirmada infraestrutura Supabase/AdMob/RevenueCat do Toque Certo; criar/configurar somente dentro das contas existentes e documentar IDs não secretos.
- Aprovação de lojas é externa e não pode ser garantida; objetivo é automatizar build/upload e acompanhar até status aprovado/publicado.
- O app atual não possui login, backend, ranking online ou anúncios implementados; essas funções são escopo novo, não devem ser descritas como prontas.
