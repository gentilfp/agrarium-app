# Agrarium — App (Expo · web + mobile)

@AGENTS.md

App do Agrarium para pequenos/médios produtores de cana. Um codebase → **iOS, Android e
web** (Expo Router + React Native Web). Consome a API Rails em `../agrarium-backend`.
Princípio: **frontend "burro"** — só coleta input e renderiza a resposta da API; todo
cálculo de custo/score/benchmark é do backend.

> Contexto de produto/domínio em `../app.md` e `../knowledge.md` (raiz do repo pai).

## Stack
- Expo SDK 56 · Expo Router (typed routes) · TypeScript · estrutura em `src/`.
- **React Query** (estado de servidor) · **axios** (cliente HTTP) · **react-hook-form + zod** (forms).
- **expo-secure-store** (token no nativo) · UI com **StyleSheet** + tema verde Agrarium.

## Comandos
```bash
npx expo start         # Metro: tecla w=web, i=iOS, a=Android
npx tsc --noEmit       # type-check
npx expo export --platform web   # bundle de validação
```

## Estrutura
```
src/
├─ app/                    # rotas (Expo Router)
│  ├─ _layout.tsx          # providers: QueryClient + AuthProvider + Stack
│  ├─ index.tsx            # redirect: logado → /dashboard, senão → /login
│  ├─ login.tsx  register.tsx
│  └─ (app)/               # grupo protegido (guarda em _layout.tsx)
│     ├─ dashboard.tsx     # lista de safras + score
│     ├─ new-harvest.tsx   # wizard de 3 passos
│     └─ harvest/[id].tsx  # resultado: indicadores, decomposição, recomendações
├─ api/harvests.ts         # hooks React Query (useHarvests/useHarvest/useCreateHarvest)
├─ lib/
│  ├─ api.ts               # axios + interceptor de Bearer token (EXPO_PUBLIC_API_URL)
│  ├─ auth.tsx             # AuthContext (signIn/signUp/signOut, /me no boot)
│  ├─ storage.ts           # token cross-platform: SecureStore (nativo) / localStorage (web)
│  └─ theme.ts             # cores Agrarium, helpers (brl, statusColor)
└─ components/ui/          # Button, Field, Card, Segmented
```

## Config de ambiente
- URL da API vem de `EXPO_PUBLIC_API_URL` (`.env`). Fallback: `http://localhost:3000/api/v1`.
- Em **device físico**, usar o IP da máquina na LAN (não `localhost`):
  `EXPO_PUBLIC_API_URL=http://192.168.x.x:3000/api/v1`.

## Convenções / pegadinhas
- **Antes de escrever código Expo, conferir os docs versionados** (ver `AGENTS.md`) — a API do Expo muda entre SDKs.
- Tudo deve funcionar em **web + nativo**: `expo-secure-store` não roda no web → use o
  wrapper `lib/storage.ts`. Evitar `Alert.alert` (use estado de erro na tela).
- Rotas de grupo `(app)` **não** aparecem na URL: navegar para `/dashboard`, `/new-harvest`,
  `/harvest/:id` (sem o prefixo do grupo).
- **NativeWind** não está instalado (não vem no template) — estilo é StyleSheet + `theme.ts`.
  É uma melhoria futura possível.
- Tipos da API (Harvest, AnalysisResult, etc.) ficam em `src/api/harvests.ts`.
