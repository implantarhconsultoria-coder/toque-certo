# Monetização, progressão e envio às lojas

## O que o app tem
- **Vídeo com recompensa (AdMob, opcional para o jogador):**
  - +10 segundos ao acabar o tempo (1 vez por partida);
  - dobrar as moedas da partida;
  - pegar o bônus diário em dobro.
- **Progressão:** XP por partida → níveis com títulos (NOVATO … LENDA), moedas, bônus diário com sequência de dias (até 7x).
- **Desafio social:** "Desafiar amigos" compartilha texto + link `https://toque-certo-pi.vercel.app/?desafio=PONTOS&de=NOME`; quem abre vê "Desafio recebido" e o botão "Aceitar desafio".
- **Login:** Supabase (Google/Apple/e-mail) já implementado; ativa ao configurar as variáveis abaixo.

## Antes da build de loja (obrigatório)
| Item | Onde |
|---|---|
| App IDs reais do AdMob (iOS e Android) | `app.json` → plugin `react-native-google-mobile-ads` (IDs reais já configurados) |
| IDs dos blocos "Rewarded" | EAS env: `EXPO_PUBLIC_ADMOB_REWARDED_IOS`, `EXPO_PUBLIC_ADMOB_REWARDED_ANDROID` (opcional: os IDs reais já estão no código) |
| Supabase | EAS env: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| Expo/EAS | `EXPO_TOKEN` válido; `eas init` liga o projeto (projectId) |
| Apple | Conta Developer, app criado no App Store Connect com bundle `com.implanta.toquecerto` |
| Lojas | Política de privacidade, questionário de dados (anúncios = coleta de identificador), classificação etária |

O app não roda no Expo Go (AdMob é módulo nativo): usar build de desenvolvimento ou `eas build`.
