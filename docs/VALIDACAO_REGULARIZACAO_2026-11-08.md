# TOQUE CERTO — retomada da regularização

Base: `main` em `a5d78cf` (PR #10 já integrado). Trabalho anterior local preservado em outro checkout. Nenhuma build remota, submissão ou merge executado nesta retomada.

## Correções incrementais

- Falhas síncronas ao criar, carregar ou mostrar o anúncio agora encerram a tentativa sem lançar para a UI, sem recompensa e sem travar o controlador.
- Invalidar um anúncio em carga libera os pedidos que aguardavam o vídeo.
- Ajustes permite rever escolhas UMP. Antes de abrir o formulário, invalida o anúncio em cache e impede novas solicitações; ao retornar, prepara novamente com a escolha atual. Fora de regiões que exigem formulário, informa que não há opções adicionais.
- Workflow EAS inicia em validação e sem envio, usa entradas tipadas, valida plataforma/perfil e apenas consulta o projeto existente. Removido `eas init --force`, que poderia vincular/criar projeto. Não foi disparado.

## Evidências locais

| Verificação | Resultado |
|---|---|
| `npm ci --no-audit --no-fund` | Aprovado |
| `npm run test:logic` | 31/31 aprovados (inclui 4 regressões novas) |
| `npm run typecheck` | Aprovado |
| `npm run preflight:ads` | Aprovado |
| `npx expo prebuild --no-install --platform all` | Aprovado; não compila nem assina binário |
| iOS Info.plist gerado | App ID `~8448936195`, descrição ATT presente, 50 SKAdNetwork |
| AndroidManifest gerado | App ID `~1221182868`, permissão AD_ID presente |
| `npx expo export --platform all` | Bundles Hermes iOS/Android + web gerados |
| Aparelho físico / anúncios reais | Não executado; não considerar validado |

As verificações de formulário UMP/ATT no aparelho, anúncio premiado e recompensa continuam obrigatórias. Os testes simulam o SDK e comprovam as regras do controlador, não a entrega do anunciante.

## Bloqueios externos já registrados no PR #10

- O workflow anterior falhou antes da build: `Entity Not Authorized` ao ler o projeto Expo `a7a30eae-0f98-4ca8-bee7-61ad009e8493`. É preciso token com acesso ao dono `implanta-x-pro-jogos`.
- Certificado de distribuição iOS anteriormente não validado para builds não interativas; requer sessão EAS/Apple autorizada.
- Não foi instalado adaptador de mediação Liftoff; configuração de leilão no AdMob sozinha não comprova presença de adaptador no binário.
- Situação atual App Store/Google Play, Data Safety e mensagens publicadas no AdMob precisam ser conferidas nos consoles autenticados.
- Builds remotas dependem de acesso e de autorização de consumo de créditos; submissão/publicação depende de aprovação final.

Referência: https://github.com/implantarhconsultoria-coder/toque-certo/pull/10
