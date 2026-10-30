# SOP-AGENTES-001 — Protocolo oficial de missões entre agentes

**Data:** 2026-10-30  
**Organização:** Implanta X PRO  
**Aplica-se a:** todos os projetos.  
**PDF oficial:** https://drive.google.com/file/d/1pBjlMa6y4aNnLeS5vXzlJlLe9NmjcgoV/view?usp=drivesdk

## Regra principal
**O Drive é arquivo e caixa de entrada, não um gatilho automático por si só.** Agentes só trabalham quando conectados a um roteador de eventos (por exemplo, GitHub Actions com Claude Code ou API de um agente com credenciais e permissões). Publicar arquivos no Drive isoladamente não prova que Claude ou Grok receberam instruções.

## Pasta oficial
https://drive.google.com/drive/folders/1DvdMe5oo1emcr9Qrn6wFncHo2KkMRCmz

1. [Entrada de missões](https://drive.google.com/drive/folders/13xQD2ukIpX1O8UfOJ0OEvx-rtxoC9tX_)
2. [Em execução](https://drive.google.com/drive/folders/1lljsCSZYDjbFibmsmSKV4L-5sFvHkJAT)
3. [Relatórios recebidos](https://drive.google.com/drive/folders/1jqCtxE7_D6lXnL2f33l_enPeG43TbF2Y)
4. [Validados e arquivados](https://drive.google.com/drive/folders/14f2KNdk4mFXWE49pPyhmaMvVkUrAYhKy)
5. [Bloqueios e correções](https://drive.google.com/drive/folders/1j0jTfBLsdPka53PGzdgmDoPKJIYWR_0H)

## Despacho
Cada missão requer identificador, projeto, destinatário (CLAUDE/GROK/GPT6/HUMANO), link do PDF, issue de código quando aplicável, tipo de ação autorizada, critérios de aceite e prazo.
- **Claude Code:** executa código exclusivamente após receber issue/workflow autorizada.
- **Grok:** auditoria e revisão; exige integração própria ou encaminhamento do material.
- **GPT-6:** define missão, coordena e verifica evidências; consulta por conector/tarefa agendada, não por acesso automático universal a cada evento do Drive.
- **Humano:** autoriza ações financeiras, legais, credenciais, publicação final e outras operações que exijam consentimento.

## Ciclo
`NEW → ACKNOWLEDGED → IN_PROGRESS → REPORT_SUBMITTED → REVIEW → VALIDATED`
ou `CORRECTIONS_REQUIRED / BLOCKED`. `PUBLISHED` somente com prova real de disponibilidade pública.

## Entrega obrigatória por agente
Sempre gerar relatório, inclusive quando parcial/falho:
- missão e projeto;
- data/hora com fuso America/Sao_Paulo;
- nome e versão do agente executor;
- o que foi solicitado; o que foi feito; o que não foi feito;
- arquivos/commits/branches/PRs e ambientes;
- testes com resultados reais, build IDs, URLs e status de lojas;
- erros/logs saneados, causas, correções tentadas;
- pendências, riscos, próxima etapa e responsável;
- conclusão VERIFICÁVEL;
- assinatura declaratória do agente e data (não é assinatura ICP-Brasil);
- link do relatório PDF no Drive, SHA-256 opcional.

Nome padrão `IMX-REL-AAAA-NNN-R01.pdf`; nova revisão em vez de sobrescrever. Registrar links e IDs na issue correspondente.

## Antiloops e segurança
- Roteamento idempotente por `mission_id + revision`.
- Exigir ACK do agente. Armazenar logs de encaminhamento, falhas e reenvios.
- Monitorar apenas pasta de entrada para despacho; relatórios **não** iniciam outra missão automaticamente.
- Não publicar senhas/chaves/tokens no PDF/GitHub/Drive público.
- Não alterar diretamente `main`, publicar ou gastar recursos sem permissão aplicável.
- O agente nunca deve afirmar sucesso sem teste, build e estado real do serviço.

## Primeira missão
**IMX-MIS-2026-001 — TOQUE CERTO / TestFlight**  
GitHub issue #4: https://github.com/implantarhconsultoria-coder/toque-certo/issues/4  
PDF: https://drive.google.com/file/d/15Ucd1N6s_Hw5VGYExhxyBrLtRqEuD_hF/view?usp=drivesdk

**Estado em 30/10/2026:** documentação entregue; roteador Drive→Claude/Grok não configurado; missão não deve ser tratada como executada sem comprovante.
