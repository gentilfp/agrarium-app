# Agrarium — App (Expo · web + mobile)

@AGENTS.md

App do Agrarium para produtores de cana. Um codebase → **iOS, Android e web** (Expo Router
+ React Native Web). Consome a API Rails em `../agrarium-backend`.

**Estágio atual: só login/cadastro + tela de boas-vindas.** O fluxo de lançamento de safra
e os indicadores de custo serão desenhados depois (o custo do produtor é **detalhado**, e o
modelo ainda será definido). Princípio: frontend "burro", regra de negócio no backend.

> Contexto de produto em `../app.md` e `../knowledge.md` (raiz do repo pai).

## Stack
- Expo SDK 56 · Expo Router (typed routes) · TypeScript · estrutura em `src/`.
- **React Query** · **axios** · **react-hook-form + zod** · **expo-secure-store**.
- UI com **StyleSheet** + tema verde Agrarium (NativeWind é melhoria futura).

## Comandos
```bash
npx expo start                    # tecla w=web, i=iOS, a=Android
npx tsc --noEmit                  # type-check
npx expo export --platform web    # bundle de validação
```

## Estrutura (atual)
```
src/
├─ app/
│  ├─ _layout.tsx          # providers: QueryClient + AuthProvider + Stack
│  ├─ index.tsx            # redirect: logado → /dashboard, senão → /login
│  ├─ login.tsx            # login (mostra a logo)
│  ├─ register.tsx         # cadastro
│  └─ (app)/
│     ├─ _layout.tsx       # grupo protegido (guarda por auth)
│     └─ dashboard.tsx     # só "bem-vindo" por enquanto
├─ lib/
│  ├─ api.ts               # axios + interceptor de Bearer token (EXPO_PUBLIC_API_URL)
│  ├─ auth.tsx             # AuthContext (signIn/signUp/signOut, /me no boot)
│  ├─ storage.ts           # token cross-platform: SecureStore (nativo) / localStorage (web)
│  └─ theme.ts             # cores Agrarium + helpers
├─ components/ui/          # Button, Field, Card
└─ assets/images/logo.png  # logo Agrarium (usada no login)
```

## Config de ambiente
- `EXPO_PUBLIC_API_URL` (`.env`). Fallback: `http://localhost:3000/api/v1`.
- Em device físico, usar o IP da LAN: `EXPO_PUBLIC_API_URL=http://192.168.x.x:3000/api/v1`.

## Convenções / pegadinhas
- **Conferir docs versionados do Expo antes de escrever código** (ver `AGENTS.md`).
- Tudo deve rodar em **web + nativo**: `expo-secure-store` não roda no web → usar
  `lib/storage.ts`. Evitar `Alert.alert` (usar estado de erro na tela).
- Rotas de grupo `(app)` não aparecem na URL: navegar para `/dashboard`, `/login`, etc.

## Próximo passo (amanhã)
Desenhar, com o agrônomo, o modelo de **custo detalhado** da safra e só então criar as telas
de lançamento e de resultado. Ver `../questions.md`.
