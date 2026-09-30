# Smoke checklist (manual)

Run the backend first (`cd ../agrarium-backend && bin/rails s`, port 3000),
then `npx expo start --web`. Demo login: `demo@agrarium.com.br` / `agrarium123`.
Web is the current dev path; repeat on a native dev build before release.

## 1. Register

- Open `/register`, sign up with a new email.
- Expected: lands on `/dashboard`, stays signed in after reload.

## 2. Login

- Sign out, open `/login`, sign in with the new account (then the demo account).
- Expected: dashboard loads; wrong password shows an on-screen error (no alert popup).

## 3. Nova safra (cost entry)

- Open `/nova-safra`, fill crop year, plant-cane + ratoon areas and production,
  ATR and price, and at least one cost item in each of Formação, Tratos da soca,
  Colheita/CCT and Arrendamento. Submit.
- Expected: navigates to `/resultado` for the new safra.

## 4. Resultado

- On `/resultado`, check the server-computed report.
- Expected: custo/kg ATR, breakdown by category, survey comparison,
  sector benchmark and recommendations all render; numbers match the API
  (`GET /api/v1/harvests/:id`).

## 5. Dashboard

- Open `/dashboard`.
- Expected: the new safra is listed with its indicators
  (cost_per_kg_atr, cost_per_t, margin); opening it shows the same report;
  other users' safras are not listed.
