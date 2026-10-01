# Agrarium — App (Expo · web + mobile)

@AGENTS.md

Agrarium app for sugarcane producers. One codebase → **iOS, Android and web** (Expo Router
+ React Native Web). Consumes the Rails API in `../agrarium-backend`.

**Current stage: auth + harvest flow (V0).** Producers enter a safra (plant-cane/ratoon split
+ detailed cost items) and get a server-computed report — cost per kg ATR, comparison against a
live base, and sector benchmark. All calc lives in the backend; the app reads it via React Query
(`lib/harvests-api.ts`). Principle: dumb frontend, business logic lives in the backend.

> Product context lives in `../app.md` and `../knowledge.md` (root of the parent repo).

## Stack
- Expo SDK 56 · Expo Router (typed routes) · TypeScript · `src/` layout.
- **React Query** · **axios** · **react-hook-form + zod** · **expo-secure-store**.
- UI with **StyleSheet** + a green Agrarium theme (NativeWind is a future enhancement).

## Commands
```bash
npx expo start --web              # run on web (no Expo Go needed) — current dev path
npx expo start                    # Metro: press w=web, i=iOS, a=Android
npx tsc --noEmit                  # type-check
npx expo export --platform web    # production-ish bundle (validation)
```
Run the backend too so the app has an API: `cd ../agrarium-backend && bin/rails s` (port 3000).
Demo login: `demo@agrarium.com.br` / `agrarium123`.

## Structure (current)
```
src/
├─ app/
│  ├─ _layout.tsx          # providers: QueryClient + AuthProvider + Stack
│  ├─ index.tsx            # redirect: signed in → /dashboard, else → /login
│  ├─ login.tsx            # login (shows the logo)
│  ├─ register.tsx         # sign up
│  └─ (app)/
│     ├─ _layout.tsx       # protected group (auth guard)
│     ├─ dashboard.tsx     # list of analyzed safras (useHarvests) + links to notas/revisão
│     ├─ nova-safra.tsx    # safra wizard (dados + custos) → POST /harvests
│     ├─ resultado.tsx     # server report (useHarvest)
│     ├─ notas.tsx          # AGR-5: fiscal inbox (status filter + counts + sync + upload)
│     ├─ notas/[id].tsx     # AGR-5: detail with manifestation timeline + response modals
│     └─ revisao.tsx        # AGR-6: review queue (product search/create + correction)
├─ lib/
│  ├─ api.ts               # axios + Bearer-token interceptor (EXPO_PUBLIC_API_URL)
│  ├─ fiscal-api.ts         # AGR-6: fiscal DTOs + React Query hooks (upload, review, correct)
│  ├─ auth.tsx             # AuthContext (signIn/signUp/signOut, /me on boot)
│  ├─ harvest.ts           # form taxonomy + display helpers (NO calc — backend owns it)
│  ├─ harvests-api.ts      # React Query hooks + API DTO types
│  ├─ storage.ts           # cross-platform token: SecureStore (native) / localStorage (web)
│  └─ theme.ts             # Agrarium colors + helpers
├─ components/             # Stepper, BarRow, MetricCard, CostChart, ui/ (Button, Field, Card, Select)
└─ assets/images/logo.png  # Agrarium logo (used on login)
```

## Environment
- `EXPO_PUBLIC_API_URL` (`.env`). Fallback: `http://localhost:3000/api/v1`.
- On a physical device, use the machine's LAN IP: `EXPO_PUBLIC_API_URL=http://192.168.x.x:3000/api/v1`.

## Conventions / gotchas
- **Check the versioned Expo docs before writing Expo code** (see `AGENTS.md`).
- Everything must run on **web + native**: `expo-secure-store` doesn't work on web → use
  `lib/storage.ts`. Avoid `Alert.alert` (use on-screen error state instead).
- Route groups `(app)` don't appear in the URL: navigate to `/dashboard`, `/login`, etc.
- **Expo Go vs SDK**: this project is on a very new SDK; Expo Go on the store may not match
  it ("requires a newer version of Expo Go"). For device testing use a **development build**
  (`npx expo run:ios` / `run:android`), not Expo Go. Web is unaffected.

## Next step (tomorrow)
Design the **detailed cost model** for a harvest with the agronomist, then build the
input and result screens. See `../questions.md`.
