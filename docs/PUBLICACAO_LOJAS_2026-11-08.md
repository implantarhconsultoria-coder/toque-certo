# Toque Certo — finalização para App Store e Google Play (08/11/2026)

Branch: `claude/tender-archimedes-ul89k4`, a partir de `main` @ `a5d78cf`. Nada foi enviado às lojas, nada foi publicado e nenhuma build paga foi iniciada.

## 1. Estado encontrado

### Projeto
- Expo SDK 57 / RN 0.86.3.
- Projeto EAS `@implanta-x-pro-jogos/toque-certo` (`a7a30eae-0f98-4ca8-bee7-61ad009e8493`).
- Identificadores conferidos e mantidos: `com.implanta.toquecerto` (iOS e Android) e ASC App ID `6830062323`.

### Credenciais EAS
Consultadas em 08/11/2026.

| Item | Situação |
|---|---|
| Certificado de distribuição iOS | Válido até 07/11/2027 |
| Perfil de provisionamento App Store | Ativo, válido até 07/11/2027 |
| Chave da API do App Store Connect para envio | `G72K444AD7` configurada |
| Keystore Android | JKS, SHA-1 `1E:7F:B6:3A:7B:11:5F:AC:64:2A:DB:54:3D:49:0A:25:35:88:21:F1` |
| Conta de serviço Google Play para envio automático | **Não configurada** (o envio do AAB é manual) |
| Variáveis de ambiente EAS (production/preview/development) | **Nenhuma.** O Supabase não está configurado, então o login fica desligado nas builds de loja. |

### Builds existentes

Todas são **anteriores** às correções de anúncios (PR #10) e às desta branch.

| Plataforma | Build | Commit | Status | Artefato |
|---|---|---|---|---|
| iOS | 1.0.0 (4) | `28f354e` | FINISHED, enviada ao App Store Connect | https://expo.dev/artifacts/eas/JvJs-VSsZ2H1016CJ9SaMF5K7Kb5EpFqmO7iH_S1HUI.ipa |
| iOS | 1.0.0 (3) | `415d576` | ERRORED (prebuild) | — |
| iOS | 1.0.0 (2) | `fc0a37e` | FINISHED, enviada | https://expo.dev/artifacts/eas/-nX3SRa2Z3SwntXq5pI076FWm80ZDdiyykNuAfsrCgM.ipa |
| Android | 1.0.0 (4) | `fc0a37e` | FINISHED (AAB) | https://expo.dev/artifacts/eas/YO0L0dkltyyhREQlzm-o5gRz0VHgJfX0gsKMlhtGwds.aab |
| Android | 1.0.0 (3) | `e3d866d` | FINISHED (AAB) | https://expo.dev/artifacts/eas/OHgorhIca0diFXSN51vkuxQwt42xHimC6OaJMyQYgY8.aab |

**Não envie nenhuma dessas builds para revisão.**
- A iOS (4) não tem o pedido de ATT, os SKAdNetwork, o pré-carregamento nem a correção do NPA forçado. A política publicada já diz que o app pede ATT, então o app e a política não batem.
- A Android (4) é anterior até ao ícone do app (`415d576`).
- Nenhuma tem o acesso à privacidade nem a remoção do login "em preparação".

## 2. Problemas encontrados e correções

| # | Problema | Risco | Correção |
|---|---|---|---|
| 1 | Sem Supabase, a tela inicial mostrava "CONTA ONLINE EM PREPARAÇÃO" e uma tela de login com botões desativados | Rejeição Apple 2.1 (recurso incompleto/placeholder) | Sem Supabase, o botão de perfil abre o painel local de convidado. O link de login só aparece quando o serviço está configurado ("opcional"). O texto do painel de convidado agora é neutro. |
| 2 | Não havia acesso à política de privacidade dentro do app | Apple 5.1.1 e Google User Data | Novo item Ajustes › Privacidade › Política de privacidade |
| 3 | Sem forma de reabrir o consentimento UMP | Exigência do Google UMP/TCF na Europa (opção de privacidade obrigatória quando `privacyOptionsRequirementStatus = REQUIRED`) | Botão "Escolhas de privacidade dos anúncios" (`showPrivacyOptionsForm`), visível quando o UMP exige. Depois da mudança, descarta o anúncio pré-carregado com a escolha anterior. |
| 4 | O Android incluía `SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE` e `WRITE_EXTERNAL_STORAGE`, que o jogo não usa | Declarações extras e revisão no Play | `android.blockedPermissions`. O manifesto final fica com `INTERNET`, `VIBRATE` e `AD_ID`. |
| 5 | O workflow EAS rodava `eas init --force` e citava a conta `rodrigo_pulzr` | Poderia religar o app a outro projeto/conta | Trocado por uma conferência só de leitura do `projectId`. A conta citada agora é `implanta-x-pro-jogos`. |
| 6 | A ficha usava e-mail como "Suporte" | A Apple exige **URL** de suporte | Nova página `public/suporte.html` (FAQ + contato) |
| 7 | A descrição citava marcas de terceiros (WhatsApp, Instagram) | Apple 2.3 / metadados | Texto neutro e palavras-chave ajustadas (95/100 caracteres) |
| 8 | A política não dizia como mudar o consentimento nem o ATT | Transparência LGPD/GDPR | Política atualizada |

O preflight (`npm run preflight:ads`) agora também bloqueia:
- ausência do link de privacidade ou do botão do UMP;
- placeholder "em preparação";
- `eas init --force` no workflow.

Preservados: IDs do AdMob (App IDs e blocos premiados), recompensas, jogo, progressão, desafio e login (que liga automaticamente ao configurar o Supabase).

### Intersticial
**Não existe no app e não há bloco intersticial criado.** Não foi possível validar esse formato e nenhum ID foi inventado. Para adicioná-lo é preciso:
1. criar o bloco no AdMob;
2. decidir em que momento ele aparece (sugestão: entre partidas, no máximo 1 a cada 3 fins de partida, nunca durante o jogo).

Isso muda a experiência e exige sua decisão.

## 3. Testes executados

| Teste | Resultado |
|---|---|
| `npm run typecheck` | Aprovado |
| `npm run test:logic` | 27/27 aprovados (jogo, progressão, contabilização de anúncios, ciclo do premiado: recompensa só com `EARNED_REWARD`, sem dupla exibição e sem prêmio ao fechar antes) |
| `npm run preflight:ads` | Aprovado (com as novas regras) |
| `expo prebuild` iOS | `GADApplicationIdentifier` de produção, 50 SKAdNetwork, texto ATT |
| `expo prebuild` Android | App ID de produção, `AD_ID`, permissões desnecessárias removidas |
| `expo export` iOS / Android | Bundles Hermes gerados com os blocos premiados de produção |
| `expo export` web | Inclui `privacidade.html`, `suporte.html` e `app-ads.txt` |
| Inicialização (web, Chromium 390×844) | Início sem placeholder; Ajustes mostra Privacidade; o perfil abre o painel de convidado; a partida inicia; 0 erros JS |
| Estabilidade (web) | 2 partidas completas de 30 s (~195 toques cada); tela final, XP, nível e moedas corretos; progresso preservado após recarregar; 0 erros |
| `app-ads.txt` e política publicados | HTTP 200 em `toque-certo-pi.vercel.app` |
| Build nativa EAS de validação | **Não executada** (ver seção 4) |
| Anúncios em aparelho real | **Pendente**: precisa da build `ads-validation` instalada |

## 4. Builds

Nenhuma build nova foi gerada nesta sessão. Motivos:
- O token Expo disponível no ambiente deixou de ser aceito no meio da sessão.
- O consumo de builds do plano EAS não pôde ser confirmado, e você pediu para não gerar gastos.

Depois de mesclar esta branch, rode pelo GitHub Actions o workflow **"Toque Certo - Build EAS e envio às lojas (teste)"**.

**a) Validação de anúncios (anúncios de TESTE, nunca envia às lojas):**
`platform=all`, `profile=validacao`, `submit=false`.
- Android: APK interno para instalar no aparelho.
- iOS: perfil `ads-validation-ios`. É uma build de distribuição "store", então pode ser enviada manualmente ao TestFlight interno se quiser testar no iPhone.

Checklist no aparelho (Ajustes mostra o painel de diagnóstico):
1. O consentimento UMP aparece (simule a Europa com o ID do aparelho de teste se precisar). No iOS, o ATT aparece depois.
2. Bônus diário em dobro, +10 s ao acabar o tempo e dobrar moedas:
   - cada um abre o vídeo de teste;
   - a recompensa só vem ao terminar;
   - fechar antes não premia.
3. No painel: solicitados = carregados + falhas, exibidos = impressões, 1 recompensa por vídeo concluído.
4. Ajustes › Privacidade abre a política (e as escolhas de anúncios, quando exigido).

**b) Loja (IDs reais):** `platform=all`, `profile=loja`.
- `submit=true` envia o iOS ao TestFlight. A versão sobe automaticamente, porque `autoIncrement` e `appVersionSource: remote` estão ativos.
- O Android gera o AAB `production`. Sem conta de serviço, faça o upload manual do AAB no Play Console.

## 5. App Store Connect (versão 1.0): o que preencher

Não há acesso de leitura ao App Store Connect a partir deste ambiente. Os campos abaixo estão prontos para colar e conferir.

| Campo | Valor |
|---|---|
| Nome | Toque Certo |
| Subtítulo | Reflexo rápido em 30 segundos |
| Categoria | Jogos › Casual (secundária: Jogos › Arcade) |
| Palavras-chave | `reflexo,rapido,desafio,casual,arcade,cerebro,simbolos,amigos,recorde,offline,toque,atencao,foco` |
| Texto promocional | Desafie seus reflexos: 30 segundos, um símbolo, o toque certo. |
| Descrição | Ver `docs/FICHA_DAS_LOJAS.md` |
| URL de suporte | https://toque-certo-pi.vercel.app/suporte.html (publicada após o deploy desta branch) |
| URL de marketing | https://toque-certo-pi.vercel.app/ |
| Política de privacidade | https://toque-certo-pi.vercel.app/privacidade.html |
| Direitos autorais | 2026 Implanta X PRO |
| Classificação etária | Responder "Nenhum" em todo o questionário de conteúdo; anúncios não alteram a faixa. Resultado esperado: 4+ |
| Login obrigatório | **Não.** Desmarque "É necessário fazer login". Não é preciso conta de demonstração. |
| Build | A nova build `testflight` gerada a partir desta branch (número maior que 4). **Não** a build 4. |
| Criptografia | `ITSAppUsesNonExemptEncryption=false` já está no Info.plist; nenhuma documentação de exportação |
| Lançamento | "Manual após aprovação", para você decidir o momento |

**Notas para o revisor** (colar no campo de informações para revisão):

> Toque Certo é um jogo de reflexo de 30 segundos. Não exige cadastro nem login: toque em JOGAR na tela inicial. Os anúncios são exclusivamente vídeos com recompensa do Google AdMob, sempre opcionais (bônus diário em dobro, +10 segundos ao acabar o tempo e dobrar as moedas da partida). A recompensa só é concedida ao concluir o vídeo. Na primeira abertura o app pode exibir o consentimento do Google (UMP) e, em seguida, a solicitação de rastreamento (ATT); recusar não limita o jogo. A política de privacidade fica em Ajustes › Privacidade.

**Privacidade do app** (formulário da Apple, para a build com AdMob e sem Supabase configurado):

| Tipo de dado | Usado para rastreamento | Finalidade | Vinculado ao usuário |
|---|---|---|---|
| Identificadores › ID do dispositivo | Sim | Publicidade de terceiros | Não |
| Dados de uso › Dados de publicidade | Sim | Publicidade de terceiros, Análise | Não |
| Dados de uso › Interação com o produto | Não | Análise | Não |
| Localização › Localização aproximada | Não | Publicidade de terceiros | Não |
| Diagnóstico › Dados de falhas e de desempenho | Não | Publicidade de terceiros, Análise | Não |

Se o login com Supabase for ativado, acrescente: Informações de contato (e-mail, nome), vinculadas ao usuário, para funcionalidade do app.

**Pendências na Apple:**
1. Gerar a nova build iOS e selecioná-la na versão 1.0.
2. Desmarcar "login necessário" e colar as notas.
3. Conferir que URL de suporte e política respondem (após o deploy).
4. Preencher Privacidade do app e Classificação etária.
5. Capturas de 6,9"/6,7" (obrigatórias) e 6,5", feitas a partir da nova build.
6. No AdMob: publicar a mensagem GDPR e a mensagem explicativa do IDFA.
7. Enviar para revisão (aguarda sua autorização).

## 6. Google Play: o que preencher

| Item | Valor / ação |
|---|---|
| App | Toque Certo, `com.implanta.toquecerto`, Jogo, Gratuito |
| AAB | A nova build `production` desta branch (versionCode maior que 4). **Não** use os AABs 3 ou 4. Faça o upload manual em Teste interno. |
| Assinatura | Assinatura de apps do Google Play. A chave de upload é o keystore EAS (SHA-1 acima). |
| Política de privacidade | https://toque-certo-pi.vercel.app/privacidade.html |
| Anúncios | "Sim, o app contém anúncios" |
| Público-alvo | **13 anos ou mais.** Não marque faixas menores de 13: o app usa AdMob personalizado e a política declara que não é direcionado a crianças. Marcar crianças aciona a política Famílias. |
| Classificação de conteúdo (IARC) | Categoria Jogo; sem violência, sexo, linguagem, drogas, apostas ou compras. Interação entre usuários: não (o compartilhamento usa o sistema). Resultado esperado: Livre / PEGI 3. |
| ID de publicidade | Declarar uso para publicidade (o manifesto inclui `AD_ID`) |
| Acesso ao app | "Todas as funcionalidades estão disponíveis sem acesso especial" |
| Apps governamentais / financeiros / saúde / notícias | Não |

**Segurança dos dados** (com AdMob e sem Supabase):

| Dado | Coletado | Compartilhado | Finalidade | Opcional |
|---|---|---|---|---|
| Local aproximado | Sim | Sim (Google) | Publicidade | Não |
| IDs do dispositivo ou outros | Sim | Sim (Google) | Publicidade, Análise, Prevenção de fraudes | Não |
| Atividade no app › Interações | Sim | Sim (Google) | Publicidade, Análise | Não |
| Informações e desempenho › Registros de falhas, Diagnóstico | Sim | Sim (Google) | Análise | Não |

Demais respostas:
- Criptografado em trânsito: Sim.
- Pedido de exclusão: os dados ficam no aparelho; o pedido pode ser feito pelo e-mail.
- Contas: o app não permite criar conta enquanto o Supabase estiver desligado. Ao ativá-lo, declare e-mail/nome e informe a exclusão de conta (no app, em Perfil, e pelo link da política).

**Testes exigidos pelo Google:**
- **Conta pessoal criada depois de 13/11/2023:** teste fechado com pelo menos 12 testadores por 14 dias seguidos antes de pedir acesso à produção.
- **Conta de organização:** basta o teste interno.

Confirme o tipo da conta no Play Console.

**Pendências no Google Play:**
1. Gerar o AAB novo.
2. Fazer o upload em Teste interno e testar no aparelho.
3. Preencher Conteúdo do app (público-alvo, anúncios, IARC, segurança dos dados, ID de publicidade).
4. Ficha principal: ícone 512, gráfico de recursos 1024×500 e capturas.
5. Teste fechado de 14 dias, se a conta for pessoal.
6. Opcional: criar a conta de serviço e registrá-la no EAS para `eas submit` automático.
7. Pedir acesso à produção e enviar (aguarda sua autorização).

## 7. Próxima ação

1. Revisar e mesclar esta branch em `main`. Isso publica `suporte.html` e a política atualizada no Vercel.
2. Rodar o workflow EAS com `profile=validacao`, instalar no aparelho e passar o checklist da seção 4a.
3. Se estiver tudo certo, rodar com `profile=loja`:
   - selecionar a nova build iOS na versão 1.0;
   - fazer o upload do AAB novo em Teste interno no Play;
   - preencher os formulários acima e só então enviar para revisão.
