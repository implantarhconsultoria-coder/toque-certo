# CHECKPOINT 1 — Autenticação | Toque Certo

Status: PREPARADO, AINDA NÃO ATIVADO. Não há projeto Supabase exclusivo disponível.

Provisionamento:
1. Criar projeto Supabase separado chamado Toque Certo após verificar e autorizar eventual custo.
2. Aplicar supabase/schema_auth.sql somente no projeto novo.
3. Configurar Supabase Auth com site URL https://toque-certo-pi.vercel.app e Redirect URLs:
   - https://toque-certo-pi.vercel.app/auth/callback
   - toquecerto://auth/callback
4. Configurar Email Auth (incluindo SMTP/entrega de confirmação e recuperação).
5. Configurar Google OAuth e Apple OAuth com credenciais oficiais do proprietário. O callback do provedor é https://PROJECT_REF.supabase.co/auth/v1/callback.
6. Fornecer somente EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY no Vercel e no EAS, com a chave publicável do projeto novo. Não publicar service_role em apps ou repositórios.
7. Implantar a função supabase/functions/delete-account/index.ts no novo projeto com validação de JWT habilitada.
8. Testar Web e builds iOS/Android, especialmente callbacks de OAuth, e-mail e deep links reais.

A tabela profiles tem RLS e só o dono pode ler ou alterar a própria linha. Os registros são excluídos por cascade ao excluir a identidade autenticada. Não são fornecidos rankings ou perfis fictícios.

Teste de liberação obrigatória:
- Login e cadastro por e-mail, confirmação e sessão persistente.
- Google (web/mobile) e Apple (iOS), sem simulações.
- Recuperação e troca de senha.
- Apelido e avatar salvos e isolados por usuário.
- Logout e exclusão permanente testados no banco.
- Jogar como convidado preservado e sem exigir rede.
- TypeScript e export web; builds nativas testadas.

Checkpoint 2 — Ranking mundial: PROIBIDO iniciar antes de aprovação expressa.
