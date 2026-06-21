
# Calorie Snap Tracker — Build Plan

A real (non-mock) calorie tracker with AI photo recognition, social groups, Google Fit step sync, and Stripe Pro upgrade.

## Stack
- **Frontend:** TanStack Start + React + Tailwind (existing stack)
- **Backend:** TypeScript server functions on Lovable Cloud (Supabase: auth, DB, storage)
- **AI:** Lovable AI Gateway, model `google/gemini-3-flash-preview` (vision) for snap → nutrition JSON
- **Payments:** Built-in Stripe payments (Pro = unlimited snaps, $X/mo)
- **Steps:** Google Fit OAuth + Fitness REST API (user supplies Google OAuth client ID/secret)

## User flow
1. **Splash → Questionnaire** (age, sex, height, weight, activity level, goal: lose/maintain/gain, target weight, dietary prefs). Computes daily calorie + macro targets (Mifflin-St Jeor + activity multiplier + goal delta).
2. **Sign up / log in** (email+password and Google). Profile + questionnaire answers saved.
3. **Home dashboard:** today's intake vs targets (calories, protein, carbs, fat, fiber, key vitamins), recent snaps, step count ring.
4. **Snap page:** upload/take a food photo → Gemini vision returns structured JSON (items, portion estimate, kcal, protein, carbs, fat, fiber, sugar, sodium, vitamin A/C/D/B12, iron, calcium). User confirms/edits, saves to `food_logs`.
5. **Steps page:** "Connect Google Fit" button → OAuth → daily step count + 7-day chart. Manual add as fallback.
6. **Friends:** search by username/email, send/accept requests. Friend list shows their daily totals.
7. **Groups:** create/join via invite code; group feed shows each member's day (kcal, macros, vitamins, steps).
8. **Settings / Upgrade:** shows snap quota (3/day free, unlimited Pro); Stripe checkout for Pro.

## Quota rules
- Free: 3 snaps/day (enforced server-side by counting today's `food_logs` rows).
- Pro: unlimited.
- **Owner accounts** (`luqmaan1007@hotmail.com`, `fardowsah994@gmail.com`): a `user_roles` row with role `owner` → server treats as unlimited + Pro features free. Accounts created via migration using Supabase Admin API.

## Database (Lovable Cloud)
- `profiles` (user_id, username, display_name, avatar_url, age, sex, height_cm, weight_kg, activity_level, goal, target_weight_kg, daily_kcal_target, daily_protein_g, daily_carbs_g, daily_fat_g, onboarded_at)
- `user_roles` (user_id, role) — enum `app_role: user | pro | owner`. RLS-safe `has_role()` SECURITY DEFINER fn.
- `food_logs` (id, user_id, image_url, name, kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vit_a_mcg, vit_c_mg, vit_d_mcg, vit_b12_mcg, iron_mg, calcium_mg, ai_raw jsonb, logged_at)
- `step_logs` (id, user_id, date, steps, source) — unique (user_id, date, source)
- `google_fit_tokens` (user_id, access_token, refresh_token, expires_at)
- `friendships` (id, requester_id, addressee_id, status) — `pending|accepted`
- `groups` (id, name, invite_code, owner_id, created_at)
- `group_members` (group_id, user_id, joined_at)
- `subscriptions` (user_id, status, current_period_end) — populated by Stripe webhook
- RLS on all; friends can SELECT each other's logs via policies using `friendships` / `group_members`.
- Storage bucket `snaps` for uploaded food images.

## Server functions (TS)
- `analyzeSnap({ imageBase64 })` — checks quota, uploads to storage, calls Gemini vision with structured `Output.object` schema, inserts `food_logs` row, returns result.
- `submitOnboarding`, `getDashboard`, `listFriends`, `sendFriendRequest`, `respondFriendRequest`, `createGroup`, `joinGroup`, `listGroupFeed`, `getFriendDay`.
- `googleFitStart` (returns auth URL), `/api/google-fit/callback` (server route, exchanges code, saves tokens), `syncGoogleFitSteps` (refreshes token, pulls today + 7-day steps).
- Stripe: `createCheckoutSession`, `/api/public/stripe-webhook` (verifies signature, updates `subscriptions`).

## Secrets required
- `GOOGLE_FIT_CLIENT_ID`, `GOOGLE_FIT_CLIENT_SECRET`, `GOOGLE_FIT_REDIRECT_URI` (I'll prompt after Cloud is up)
- Stripe keys come from `enable_stripe_payments` automatically
- `LOVABLE_API_KEY` auto-provisioned

## Design
Dark, energetic fitness aesthetic. Lime/green primary (`#C7F284`) on near-black (`#0B0F0C`), warm orange accent (`#FF7A45`) for the snap CTA. Inter + Space Grotesk display. Big rounded ring charts, soft glassmorphism cards, micro-interactions on snap capture.

## Build order
1. Enable Lovable Cloud → migrations (tables, roles enum, has_role, RLS, storage bucket, owner accounts via SQL using `auth.users` direct insert + `user_roles` insert).
2. Design system in `src/styles.css` + base layout.
3. Auth pages + onboarding questionnaire + targets calculator.
4. Dashboard + snap upload + Gemini analysis server fn.
5. Steps page + Google Fit OAuth flow (prompt for secrets when reached).
6. Friends + groups.
7. Stripe upgrade + webhook + quota gate.
8. Recommend payment provider + enable Stripe.
