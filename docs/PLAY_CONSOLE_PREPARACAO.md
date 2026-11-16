# TOQUE CERTO — preparação do Google Play e App Store

Data: 08/11/2026. Fonte: `main` a5d78cf + correções propostas no PR #12. Documento de preparação; não representa declaração enviada nem aprovação de loja.

## Situação observada nos consoles

Inspeção autenticada da sessão principal nesta missão:

| Plataforma | Estado observado | Consequência |
|---|---|---|
| App Store Connect | Versão iOS 1.0 em “Preparar para envio” | Não consta aprovação/publicação nesta observação |
| Google Play | App em rascunho, área de teste interno, produção inativa | Não tratar como publicado |
| Configuração inicial Play | 5 de 11 tarefas concluídas após salvar rascunhos | Política, anúncios, governo, financeiro e saúde preenchidos; demais tarefas pendentes |

Rascunhos salvos no Play nesta missão: política de privacidade com URL existente; contém anúncios **Sim**; app de governo **Não**; recursos financeiros **Não**; saúde **Não**. Categoria Arcade salva. O botão de contato **“Salvar e publicar” não foi acionado**. Isso não representa publicação nem liberação de produção.

A organização Expo `implanta-x-pro-jogos` foi acessada pelo navegador autenticado. Foi encontrada build iOS **1.0.0 (4)**, perfil `testflight`, commit **28f354e**, concluída com sucesso em 07/11/2026 e com envio ao App Store Connect concluído: https://expo.dev/accounts/implanta-x-pro-jogos/projects/toque-certo/builds/04e93970-c76e-470b-b085-b3778f2bdb5d . Essa build antecede e **não incorpora o PR #12**. Disponibilidade da build não comprova teste em aparelho.

Não aceitar contratos, publicar ou enviar revisão sem aprovação final. Uma nova build não foi tentada nesta missão por depender de eventual autorização de créditos; o acesso web Expo funciona. Os erros antigos de token CI/certificado são históricos, não uma prova de bloqueio atual absoluto.

## Ficha em português — textos prontos para rascunho

**Nome (10 caracteres):** Toque Certo

**Descrição curta:** Desafie seus reflexos em partidas de 30 segundos e supere seu recorde.

**Descrição completa:**

Toque no símbolo indicado, mantenha a sequência de acertos e veja até onde seus reflexos conseguem chegar em 30 segundos.

No Toque Certo, cada acerto soma pontos e cada erro custa um segundo. A cada cinco acertos consecutivos, você recebe um ponto extra. Conforme sua pontuação aumenta, a grade de símbolos cresce e o desafio fica mais intenso.

• Partidas rápidas de 30 segundos.
• Recorde salvo no aparelho.
• XP, níveis e moedas obtidos nas partidas.
• Missões e bônus diário.
• Desafios por link para compartilhar sua pontuação com amigos.
• Vídeos opcionais com recompensa, sujeitos à disponibilidade do anunciante.
• Jogue como convidado, sem cadastro obrigatório.

As moedas fazem parte do jogo e não representam dinheiro real. Os anúncios com recompensa são opcionais. Recursos de conta dependem da disponibilidade do serviço online.

**Categoria sugerida:** Jogos / Arcade. Confirmar opção equivalente disponível no console.

**Monetização comprovada no código:** contém anúncios. Não há implementação de compra integrada/assinatura nem pagamento com dinheiro real. Não anunciar ranking semanal, sincronização de progresso, multiplayer ou prêmios em dinheiro: não estão implementados no código auditado.

**Contato já publicado na política:** implantarh.consultoria@gmail.com. Não substituir nem declarar outro contato como confirmado sem verificar.

## URLs existentes e política publicada

URLs encontradas no código e consultadas por HTTPS sem autenticação nesta sessão:

- Site/desafios: https://toque-certo-pi.vercel.app
- Política: https://toque-certo-pi.vercel.app/privacidade.html
- Arquivo de publicidade: https://toque-certo-pi.vercel.app/app-ads.txt

A raiz e a política retornaram HTTP 200. A política pública informa Toque Certo / Implanta X PRO, atualização 07/11/2026, login opcional, AdMob, medição, direitos e contato. A ferramenta de busca não conseguiu abrir o domínio; isso não equivale a indisponibilidade, pois o GET HTTPS direto retornou o conteúdo. Consulte `docs/TOQUE_URLS_2026-11-08.json` para o resultado da nova consulta dos três URLs.

A política existente serve como URL real para **rascunho**, mas precisa de revisão antes da declaração final: explicar diagnósticos do SDK, localização aproximada inferida do IP (o IP em si não é “aproximado”), armazenamento de apelido/avatar, segurança, retenção e exclusão. Não inventar prazo de retenção: nenhum TTL para telemetria foi encontrado no schema. Não declarar o código de instalação como dado anônimo: é pseudônimo persistente.

O PR #12 adiciona o link da política em Ajustes. O botão “Privacidade dos anúncios” é distinto: reabre as escolhas UMP quando aplicável.

## Inventário do tratamento de dados, fundamentado no código

| Recurso / dado | Origem comprovada | Destino e condição | Implicação para declaração |
|---|---|---|---|
| Recorde, XP, moedas, partidas, sequência e data de bônus, efeitos | `progressStore.ts`, telas de jogo, `AsyncStorage` | Aparelho; não há chamada para enviar progresso ao backend | Não declarar sincronização ou ranking remoto |
| E-mail, senha, apelido; ID Supabase e sessão | `AuthScreen.tsx`, `auth/supabase.ts`, `AuthContext.tsx` | Supabase quando URL/chave pública de ambiente estiverem configuradas | Cadastro é opcional; dados de conta e autenticação devem ser considerados se a build permite conta |
| Google OAuth; Apple OAuth no iOS/web | `signInWithProvider`, `AuthScreen.tsx` | Provedor e Supabase; navegador de autenticação | Não dizer que Apple está disponível no Android; funcionamento dos provedores ainda não validado |
| Apelido e URL HTTPS de avatar | `ProfileScreen.tsx`, `schema_auth.sql` | `profiles` e metadados Auth, com conta; imagem carregada do host escolhido | Apelido se enquadra como nome; avaliar foto/URL do avatar conforme dados efetivamente usados. Host externo também recebe a requisição de imagem |
| Publicidade: IP/localização geral inferida, interações, diagnósticos, identificadores | SDK Google Mobile Ads 25.5.0, via `react-native-google-mobile-ads` 17.4.0 | Google; AdMob inicializado após fluxo UMP/ATT | Há coleta/compartilhamento do SDK. Não responder “nenhum dado” nem “sem identificadores” |
| Escolhas de consentimento | `AdsConsent.gatherConsent` e opções UMP | SDK UMP/Google; mensagem conforme região e configuração no console | Mensagens publicadas/valores efetivos devem ser testados; existência da chamada não comprova formulário exibido |
| ID aleatório de instalação, eventos, posição do vídeo, erro/latência, impressão, recompensa, valor estimado, moeda/fonte/response ID | `adMetrics.ts`, `adTelemetry.ts` | AsyncStorage; envio a Supabase somente com `EXPO_PUBLIC_AD_TELEMETRY_REMOTE=1` **e** cliente configurado | Identificador persistente e telemetria técnica; confirmar ambiente EAS antes de declarar envio remoto ligado/desligado |
| Pontuação e primeiro nome, se houver | `GameOverScreen.tsx`, `challengeLink` | Link e compartilhamento escolhido pelo jogador | Compartilhamento iniciado pelo usuário; não confundir com ranking público hospedado |
| Exclusão de conta | Perfil → `delete-account`; Edge Function no repositório | Supabase Admin exclui usuário; `profiles` tem `ON DELETE CASCADE` | Há implementação, mas deploy, permissões e exclusão real ainda precisam de teste |

Não foram encontrados SDK separado de Firebase Analytics, Crashlytics, Sentry, localização GPS, upload de câmera/microfone, agenda/contatos, compras ou integração de ranking remoto. Isso não elimina a coleta analítica/diagnóstica do próprio SDK publicitário. Liftoff/Vungle não aparece como adaptador instalado; não declarar mediação integrada sem conferir o binário.

`eas.json` não fixa as variáveis de autenticação nem telemetria. Secrets/variáveis do EAS podem mudar o comportamento de uma build; não é possível concluir somente pelo repositório se o app entregue habilita contas ou envio de eventos. A senha é enviada ao Supabase Auth; não é armazenada pelo código do jogo como texto simples.

## Data Safety — respostas sustentadas e campos condicionais

**Resposta inicial sustentada:** o aplicativo coleta/compartilha dados, pois integra o SDK AdMob. O formulário deve cobrir SDKs e ambientes/regiões, além do backend próprio.

| Tipo no formulário | Base para resposta | Finalidades comprovadas / confirmação necessária |
|---|---|---|
| Localização aproximada | Google informa inferência a partir do IP | Publicidade, análise e prevenção de fraude do SDK; não há GPS no jogo |
| Interações no app | Interações do SDK; telemetria publicitária própria opcional | Publicidade, análise; telemetria própria depende de env |
| Diagnósticos | Desempenho do SDK; códigos de erro/latência próprios | Análise e prevenção de fraude do SDK; não marcar “registros de falha” específicos sem confirmar a classificação aplicável |
| Dispositivo ou outros IDs | AD_ID no manifest, SDK e ID aleatório próprio | Publicidade, análise, prevenção de fraude; ID próprio remoto condicionado a env |
| Nome/apelido, e-mail, ID de usuário | Cadastro/OAuth e perfil | Funcionalidade e gerenciamento de conta; coleta opcional se conta habilitada |
| Fotos/vídeos ou outro conteúdo do usuário | URL de avatar opcional, sem upload de arquivo implementado | Verificar a interpretação do formulário e a build; não marcar ausência de fotos por haver apenas uma URL |

O Google documenta os quatro primeiros grupos e TLS no SDK 25.5.0. A declaração deve separar **coleta** de **compartilhamento**. Supabase como operador pode se enquadrar na exceção de prestador de serviço, dependendo do contrato/uso; o SDK de anúncios não deve ser tratado automaticamente como a mesma exceção.

Não classificar toda coleta publicitária como opcional só porque assistir ao vídeo é opcional: o app pré-carrega após consentimento ao iniciar, antes de o jogador pedir recompensa. Confirmar opções reais de consentimento e regras do console. Não afirmar processamento apenas efêmero: há registros persistentes locais e, se habilitados, remotos.

**Criptografia em trânsito:** Google informa TLS; endpoints Supabase e avatar são HTTPS no código. A resposta final deve considerar todos os SDKs/adaptadores do binário efetivamente enviado.

**Exclusão:** a política pública admite solicitação por e-mail e o código possui exclusão no perfil. Ainda falta validar o serviço ativo e detalhar claramente o recurso web de solicitação, dados removidos e qualquer retenção. A exclusão da conta não remove automaticamente o histórico local nem os eventos associados só ao `install_id`; `delete-account` só exclui o usuário Auth. Não prometer exclusão desses registros através desse endpoint.

## Acesso ao app para revisão

O fluxo principal pode ser usado como convidado: abrir → Jogar → tocar no símbolo indicado → resultado → jogar novamente. Não precisa de login para a partida principal. Conta, editar perfil e exclusão, caso habilitados, dependem de autenticação; não declarar acesso irrestrito a todas as funcionalidades. Fornecer conta de demonstração somente após testar login e sem expor credenciais no repositório.

## Checklist para concluir as tarefas iniciais sem publicação

- [ ] Salvar os textos da ficha como rascunho; usar imagens reais da build testada.
- [x] Salvar URL de política existente como rascunho; revisar lacunas antes da declaração final.
- [x] Declarar presença de anúncios (Sim); preservar AdMob e seus IDs.
- [ ] Conferir variáveis EAS da build alvo, adaptadores e SDKs efetivamente incluídos.
- [ ] Preencher Data Safety conforme a tabela, resolvendo os campos condicionais.
- [ ] Testar cadastro, login, perfil e exclusão no backend exclusivo antes de afirmar disponibilidade.
- [ ] Validar recurso web de exclusão e explicar retenção efetiva.
- [ ] Completar acesso ao app com convidado e instruções das funções autenticadas.
- [ ] Classificação indicativa: responder a partir do conteúdo real; não presumir classificação final.
- [ ] Público-alvo: política diz que não é dirigido a menores de 13; confirmar público comercial e configuração publicitária. Não declarar programa infantil por inferência.
- [x] Salvos governo Não, recursos financeiros Não e saúde Não a partir do escopo do jogo. Notícias e demais questionários, se apresentados, dependem de conferência do console.
- [ ] Acesso web Expo confirmado; conferir acesso do token usado no CI e certificado antes de nova build. Build iOS (4) existente não incorpora este PR; nova validação e testes em aparelho continuam pendentes.
- [ ] Manter tudo em rascunho; nenhuma submissão/publicação foi autorizada.

## Referências oficiais consultadas

- Google Mobile Ads, divulgação de dados (SDK 25.5.0): https://developers.google.com/admob/android/privacy/play-data-disclosure
- Tipos, coleta, compartilhamento e exceções Data Safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Política de dados, privacidade e exclusão: https://support.google.com/googleplay/android-developer/answer/10144311
- Recurso web e exclusão de conta: https://support.google.com/googleplay/android-developer/answer/13327111

Essas referências orientam o preenchimento; a verdade da declaração final depende da build e dos serviços implantados. A situação do console acima foi informada pela inspeção autenticada da sessão principal, não inferida do código.
