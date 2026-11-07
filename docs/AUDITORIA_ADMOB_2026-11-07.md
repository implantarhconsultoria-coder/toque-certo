# Toque Certo — auditoria e correção da monetização AdMob

Data: 07/11/2026. Base auditada: `main` @ `6b3e71b`. Branch das correções: `claude/happy-mendel-8edeex` (sem merge e sem publicação).

## 1. Situação encontrada

| Item | Situação |
|---|---|
| SDK | `react-native-google-mobile-ads` 17.4.0 (Expo SDK 57, RN 0.86.3). Suporta impressão e receita por impressão (`AdEventType.PAID`). |
| App IDs | iOS `ca-app-pub-9360827223542670~8448936195` · Android `ca-app-pub-9360827223542670~1221182868` (no plugin do `app.json`). |
| Blocos | Somente premiado: iOS `ca-app-pub-9360827223542670/2709077242` · Android `ca-app-pub-9360827223542670/8368598037`. |
| Intersticial / banner | Não existem no app nem há IDs desses formatos no repositório. |
| Mediação | Não existe (nenhum adaptador instalado). |
| Teste × produção | `__DEV__` usava `TestIds.REWARDED`; release usava os IDs reais. Correto. |
| UMP | `gatherConsent` antes de cada anúncio. Funcional, porém repetido a cada pedido. |

### Problemas encontrados

1. **Anúncios não personalizados forçados para todos** (`requestNonPersonalizedAdsOnly: true`). Todos os jogadores, mesmo os que consentiram ou estão fora da Europa, recebiam só anúncios não personalizados. Isso reduz bastante os lances do leilão e o eCPM. É a causa técnica mais provável de valores tão baixos, somada ao volume pequeno.
2. **Sem ATT no iOS.** O código nunca pedia a permissão de rastreamento. A política de privacidade dizia que pedia. Sem ATT, o IDFA nunca fica disponível e o eCPM no iOS cai.
3. **Sem SKAdNetworkItems no iOS.** O plugin não recebia a lista. Sem ela, compradores que dependem de atribuição SKAdNetwork lançam menos ou não lançam.
4. **Sem pré-carregamento.** O anúncio só era solicitado quando o jogador tocava. O jogador esperava até 30 s, e o tempo esgotado descartava o anúncio que chegasse depois: solicitação sem impressão e oportunidade perdida.
5. **Nenhuma contabilização.** Não havia escuta de `PAID`, `IMPRESSION`, `OPENED` nem `CLICKED`, e nenhum registro de solicitação, carga ou falha. Não dava para saber se a receita do painel corresponde às impressões reais.
6. **Sem `app-ads.txt`** no site do app (`toque-certo-pi.vercel.app`).
7. Observação: `app.json` tem `owner: implanta-x-pro-jogos`, mas o workflow usa a conta `rodrigo_pulzr` e roda `eas init --force`. Não alterei. Confirme qual é o dono certo do projeto EAS antes da próxima build.

## 2. Correções

- `src/services/rewardedController.ts`: novo ciclo de vida do premiado.
  - Um único anúncio pré-carregado, com validade de 55 min. Uma carga por vez.
  - Espera crescente após falhas (15 s, 60 s, 180 s), com no máximo 3 repetições automáticas.
  - O tempo esgotado não descarta a carga: o anúncio que chega depois fica pronto para o próximo pedido.
  - Toques repetidos não abrem dois anúncios.
  - A recompensa sai **somente** de `EARNED_REWARD` da instância em exibição, uma vez. Fechar sem assistir, falhar ou receber evento atrasado não premia.
- `src/services/rewardedAds.native.ts`:
  - Fluxo único por sessão: UMP → ATT (iOS) → dispositivos de teste → `initialize()`.
  - Removido o NPA forçado: o SDK aplica a escolha do UMP (TCF).
  - Pré-carregamento ao abrir o app e nas telas Início, Partida e Fim de partida. Nunca exibe sozinho.
  - Cada pedido leva um `placement`: `bonus_diario`, `continuar_partida` ou `dobrar_moedas`.
- `src/services/adMetrics.ts`: livro-razão puro.
  - Separa as etapas: solicitação, carregado, falha (com código), tempo esgotado, pedido do jogador, sem anúncio pronto, exibido, falha ao exibir, impressão, receita (`paid`), recompensa, clique, fechado e expirado sem exibição.
  - Deduplica por instância. Calcula preenchimento, taxa de exibição, impressões sem valor, carregados não exibidos, receita por moeda, eCPM real e receita por dia ativo.
  - Guarda a receita em micros inteiros, preferindo `valueMicros`, que é exato no Android.
- `src/services/adTelemetry.ts`:
  - Grava o livro-razão no aparelho (AsyncStorage).
  - Envio opcional ao Supabase (`EXPO_PUBLIC_AD_TELEMETRY_REMOTE=1`), em fila, com reenvio idempotente por `event_id`.
  - Identifica só por um código aleatório da instalação.
- `src/components/AdDiagnosticsPanel.tsx`: painel em Ajustes, visível apenas em desenvolvimento ou com `EXPO_PUBLIC_AD_DIAGNOSTICS=1`.
- `supabase/schema_ad_events.sql`:
  - Tabela `ad_events`, só de inserção para o app.
  - Visões `ad_daily_report` (funil, receita, eCPM, preenchimento), `ad_arpdau` (receita média por usuário ativo) e `ad_source_report` (receita por fonte, útil com mediação).
- `app.json`: 50 identificadores SKAdNetwork da lista oficial do Google (atualizada em 30/01/2026) e o plugin `expo-tracking-transparency`.
- `public/app-ads.txt`: `google.com, pub-9360827223542670, DIRECT, f08c47fec0942fa0`.
- `eas.json`: perfil `ads-validation`, um APK/iOS interno com anúncios de **teste** e o painel de diagnóstico. Os perfis de produção não mudaram.
- `scripts/ads-preflight.mjs` (`npm run preflight:ads`):
  - Bloqueia a build se os IDs de produção mudarem, se a produção usar teste, se o NPA forçado voltar ou se faltar SKAdNetwork ou ATT.
  - Roda no Quality Gate e no workflow EAS.
- `public/privacidade.html`: descreve o ATT real, o consentimento e a medição de anúncios.

Não foram alterados: pisos de eCPM, IDs de produção, recompensas e funcionalidades do jogo.

## 3. Validação

| Verificação | Resultado |
|---|---|
| `npm run typecheck` | Aprovado |
| `npm run test:logic` | 27/27 aprovados: 10 antigos de jogo/progressão e 17 novos de contabilização e ciclo do premiado |
| `npm run preflight:ads` | Aprovado |
| `expo prebuild` (cópia temporária) | Aprovado. Info.plist com `GADApplicationIdentifier` iOS de produção, 50 SKAdNetwork e texto ATT. AndroidManifest com App ID Android de produção, permissão `AD_ID` e flags de otimização. |
| `expo export` Android + iOS | Aprovado. Bundles Hermes gerados com os IDs de produção. |
| `expo export` web | Aprovado. `app-ads.txt` e `privacidade.html` incluídos. |
| Build nativa Android/iOS (EAS) | **Não executada.** Este ambiente não tem `EXPO_TOKEN`, Android SDK nem Xcode. Rode o workflow `eas-build.yml` ou `eas build --profile ads-validation`. |
| Teste em aparelho | **Pendente.** Precisa do build `ads-validation`. |

## 4. Como verificar a receita real

1. Gere `eas build --profile ads-validation -p android` (e `-p ios`). Os anúncios são de teste.
2. No aparelho, abra Ajustes e veja o painel. Faça os três fluxos: bônus em dobro, +10 s e dobrar moedas.
3. Confira, por formato e plataforma: solicitados = carregados + falhas, exibidos = impressões, recompensas e eventos `paid`. Em anúncios de teste o valor costuma ser 0. O que importa é o evento chegar uma vez por impressão.
4. Para builds de produção instaladas por você, cadastre o aparelho em `EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS` (ID mostrado no log do SDK) ou em AdMob → Configurações → Dispositivos de teste. Isso evita tráfego inválido. Não clique em anúncios reais.
5. Em produção, aplique `supabase/schema_ad_events.sql` e defina `EXPO_PUBLIC_AD_TELEMETRY_REMOTE=1` no EAS. Depois consulte `ad_daily_report`, `ad_arpdau` e `ad_source_report` com o service role.
6. Compare com AdMob → Relatórios (solicitações, impressões, taxa de correspondência, eCPM). Os valores do SDK são estimativas. O pagamento segue o relatório final do AdMob.

**Sobre os US$ 0,01:** com poucas impressões, eCPM de US$ 1 a 10 dá US$ 0,001 a 0,01 por vídeo. Valores baixos são normais com volume pequeno. Um eCPM sistematicamente baixo no iOS ou na Europa era agravado pelos problemas 1 a 3. Nenhuma correção garante valor mínimo. A receita depende do leilão, do país, do volume de jogadores e da retenção.

## 5. O que depende do console AdMob / lojas

- **Privacidade e mensagens:** publique a mensagem GDPR (Europa) e, para iOS, a mensagem explicativa do IDFA. Com o IDFA configurado, o UMP mostra a explicação antes do ATT. Sem ele, o app pede o ATT diretamente.
- **app-ads.txt:** o arquivo vai para `toque-certo-pi.vercel.app/app-ads.txt` no próximo deploy web.
  - O site de desenvolvedor das fichas do Google Play e da App Store precisa ser esse domínio.
  - O rastreador do AdMob verifica o host exato e só um nível acima. Ele nunca vai validar `vercel.app`, então o ideal é um domínio próprio com o arquivo na raiz.
  - Depois, confira em AdMob → Apps → app-ads.txt.
- **Verificação do app:** os apps precisam estar vinculados às lojas e "Prontos", não em "veiculação limitada".
- **Pisos de eCPM:** permanecem no automático/otimizado pelo Google, como solicitado.
- **Mediação:** só vale a pena com volume, por exemplo milhares de impressões por dia. Para ativar: criar grupos de mediação no AdMob, instalar os adaptadores (por exemplo AppLovin, Meta, Unity, Mintegral, Pangle, todos com SKAdNetwork já listado) e fazer um teste A/B no AdMob. O `ad_source_report` já separa a receita por fonte para comprovar o ganho. Não instalei adaptadores agora porque o benefício ainda não é comprovável com o volume atual.
- **Novos formatos (banner ou intersticial):** exigem criar blocos no AdMob. Nenhum ID foi inventado.
- **Lojas:** atualizar o questionário de dados (Data safety e App Privacy): identificador de dispositivo e dados de uso de anúncios.
