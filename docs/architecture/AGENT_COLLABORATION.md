# TOQUE CERTO — Protocolo de Trabalho dos Agentes
**Data:** 2026-10-30 | **Documento de coordenação**

## Objetivo
Implementar a arquitetura de produção definida em `docs/architecture/PRODUCTION_ARCHITECTURE.md` no repositório existente `implantarhconsultoria-coder/toque-certo`, preservando o jogo atual.

## Responsabilidades
### GPT-6 — arquiteto e integrador
- Mantém a arquitetura, decisões e backlog.
- Define critérios de aceite, revisa resultados e integra entregas.
- Resolve conflitos técnicos; não permite decisões contraditórias em paralelo.
- Não declara pronto sem evidência de teste/build e validação em aparelho.

### Claude Code — engenheiro principal
- Responsável pela implementação no código.
- Antes de alterar: inspecionar main, árvore, testes, workflows, Expo/EAS e estado do projeto.
- Trabalhar em branches curtas por fase; PRs pequenos, commits claros e testes.
- Preservar Start/Game/GameOver, motor de jogo e IDs de pacote.
- Não criar outro repositório/app, não reescrever o projeto e não inserir chaves reais no código.
- Implementar primeiro Fase 1; depois monetização; backend/ranking após aprovação dos testes do core.
- Toda dependência nativa exige validação de compatibilidade com Expo SDK 57 e EAS.

### Grok — auditor independente / red team
- Não editar a mesma branch do Claude.
- Revisar arquitetura, regras de pontuação, economia do jogo, antifraude, placements de anúncio, paywall, retenção e riscos de políticas das lojas.
- Procurar abuso: replay adulterado, score impossível, repetição de requests, relógio manipulado, compras falsas, rewarded sem callback e anúncios excessivos.
- Entregar relatório com: achado, severidade (P0/P1/P2), evidência, correção recomendada e teste de regressão.
- Claude corrige achados aceitos em commits próprios; GPT-6 decide conflitos.

## Protocolo de colaboração
1. GPT-6 publica arquitetura e critérios.
2. Claude audita código e propõe plano de mudanças por PR; não implementa funcionalidades fora da fase aprovada.
3. Grok revisa o plano e lista riscos antes do merge.
4. Claude implementa em branch isolada e publica PR com testes e evidências.
5. Grok revisa o diff e tenta invalidar os critérios (security/gameplay/store policy).
6. GPT-6 aceita, pede correções ou bloqueia merge.
7. Após merge, rodar testes e build; só então iniciar a próxima fase.

## Proibições
- Não trabalhar diretamente em main.
- Não sobrescrever nem descartar alterações de outros agentes.
- Não adicionar backend/SDK pago sem registrar custo, conta necessária e alternativa.
- Não publicar segredo, service-role key, keystore, API key privada ou JSON de credenciais.
- Não usar anúncios reais em builds de desenvolvimento.
- Não recompensar score competitivo com dinheiro/ads.
- Não enviar produção com teste incompleto ou status presumido.
- Não afirmar que app foi publicado apenas porque EAS build ou upload terminou.

## Prompt inicial — Claude Code
Você é o engenheiro principal do TOQUE CERTO. Leia integralmente `docs/architecture/PRODUCTION_ARCHITECTURE.md` e este protocolo. Inspecione o estado real do repositório e entregue primeiro um relatório de auditoria: arquivos, fluxo, motor, testes, dependências, EAS, workflows, IDs e bloqueios. Não altere código ainda. Depois proponha PRs por fase com arquivos previstos, riscos, comandos de validação e critérios de aceite. Preserve tudo que funciona. Não crie outro projeto.

## Prompt inicial — Grok
Atue como auditor técnico independente do TOQUE CERTO. Leia `docs/architecture/PRODUCTION_ARCHITECTURE.md` e este protocolo. Avalie criticamente a arquitetura para um jogo de reflexos casual monetizado em iOS/Android. Foque em antifraude, ranking, anúncios, compras, privacidade, retenção, UX e requisitos das lojas. Não reescreva a arquitetura inteira: liste riscos priorizados P0/P1/P2, pontos frágeis, decisões excessivas e correções objetivas. Não presuma integrações já existentes.
