# Kairos AI — Setup Guide

## Architecture Overview

```
Browser (WebRTC mic/audio) ←→ OpenAI Realtime API (gpt-4o-realtime)
                               ↕ ephemeral token
                         Next.js Server
                               ↕
                         Neon Postgres
                         Clerk Auth
```

**Key flow:**
1. User selects scenario → server mints a short-lived OpenAI token with scenario-injected system prompt
2. Browser opens WebRTC peer connection directly to OpenAI Realtime API (low-latency voice)
3. Transcript events stream to the UI via data channel
4. On session end, transcript sent to server → OpenAI GPT-4o generates coaching report → stored in DB

---

## File Tree

```
kairos-ai/
├── app/
│   ├── layout.tsx                    ← Root layout (ClerkProvider)
│   ├── page.tsx                      ← Landing page
│   ├── globals.css
│   ├── (auth)/
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   └── sign-up/[[...sign-up]]/page.tsx
│   ├── (app)/
│   │   ├── train/
│   │   │   ├── page.tsx              ← Server: loads scenarios, user
│   │   │   └── TrainClient.tsx       ← Client: WebRTC, transcript, session
│   │   └── results/[sessionId]/
│   │       └── page.tsx              ← Coaching report display
│   ├── (admin)/
│   │   └── admin/
│   │       ├── page.tsx              ← Admin dashboard
│   │       ├── users/
│   │       │   ├── page.tsx
│   │       │   ├── InviteForm.tsx
│   │       │   └── UserTable.tsx
│   │       ├── scenarios/
│   │       │   ├── page.tsx
│   │       │   └── ScenariosClient.tsx
│   │       └── sessions/page.tsx
│   └── api/
│       ├── realtime-token/route.ts   ← Mints OpenAI ephemeral token
│       ├── session/
│       │   ├── start/route.ts
│       │   └── end/route.ts          ← Saves transcript, generates report
│       └── admin/
│           ├── invite/route.ts
│           ├── users/route.ts
│           ├── users/[clerk_user_id]/route.ts
│           ├── scenarios/route.ts
│           ├── scenarios/[id]/route.ts
│           └── sessions/route.ts
├── lib/
│   ├── db.ts                         ← Neon SQL queries + all types
│   ├── auth.ts                       ← requireUser / requireAdmin helpers
│   └── scenario-prompt.ts            ← Builds prospect system prompt
├── components/
│   └── AppNav.tsx                    ← Shared nav bar
├── middleware.ts                     ← Clerk auth middleware
├── scripts/
│   └── migrate.sql                   ← DB migrations + seed
├── .env.local                        ← Local secrets (never commit)
└── next.config.mjs
```

---

## Step 1: Create Clerk Application

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com) → **Create application**
2. Name it "Kairos AI" → choose **Email** login method
3. After creation, go to **API Keys** → copy:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_`)
   - `CLERK_SECRET_KEY` (starts with `sk_`)

4. **Enable Invite-Only mode:**
   - Go to **User & Authentication → Restrictions**
   - Enable **"Require invitations"** (this disables public signups)
   - Only invited users can create accounts

5. **Set redirect URLs** (Clerk dashboard → Paths):
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - After sign-in: `/train`
   - After sign-up: `/train`

---

## Step 2: Create Neon Database

1. Go to [neon.tech](https://neon.tech) → Create account → **New Project**
2. Name: "kairos-ai" → Region: pick closest to your users
3. Copy the **Connection string** (looks like `postgresql://user:pass@host/dbname?sslmode=require`)
4. Run migrations:

```bash
# Install psql if needed: brew install postgresql
psql "YOUR_DATABASE_URL" -f scripts/migrate.sql
```

Or use the Neon SQL editor in the dashboard — paste the contents of `scripts/migrate.sql` and run.

---

## Step 3: Get OpenAI API Key

1. Go to [platform.openai.com](https://platform.openai.com) → API Keys → **Create new secret key**
2. Ensure you have access to:
   - `gpt-4o` (for coaching reports)
   - `gpt-4o-realtime-preview-2024-12-17` (for real-time voice)
3. Enable **Realtime API** access if it's not already on your account

---

## Step 4: Configure Local Environment

Edit `.env.local` with your real values:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/train
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/train

DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require

OPENAI_API_KEY=sk-...

APP_ADMIN_EMAIL=devontyerman@gmail.com
APP_JWT_SECRET=generate-with-openssl-rand-base64-32
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Generate a secure JWT secret:
```bash
openssl rand -base64 32
```

---

## Step 5: Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**First login:**
1. Go to `/sign-up` — you'll need your own email to create the first account
   *(Since signups are invite-only, temporarily disable restrictions in Clerk dashboard, sign up with `devontyerman@gmail.com`, then re-enable invite-only)*
2. The system auto-assigns admin role to that email on first DB upsert
3. Go to `/admin` → send invitations to other users

---

## Step 6: Deploy to Vercel

1. Push your code to GitHub (ensure `.env.local` is in `.gitignore`)

2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo

3. **Add Environment Variables** in Vercel dashboard → Settings → Environment Variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | pk_live_... |
| `CLERK_SECRET_KEY` | sk_live_... |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | /sign-in |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | /sign-up |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | /train |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | /train |
| `DATABASE_URL` | (your Neon connection string) |
| `OPENAI_API_KEY` | sk-... |
| `APP_ADMIN_EMAIL` | devontyerman@gmail.com |
| `APP_JWT_SECRET` | (random 32-char string) |
| `NEXT_PUBLIC_APP_URL` | https://your-app.vercel.app |

> **Use production Clerk keys** (`pk_live_...`) for Vercel, not `pk_test_...`

4. Deploy → Vercel auto-deploys on every push to main

5. **Update Clerk redirect URLs** for production:
   - Clerk dashboard → Paths → add your Vercel domain
   - Allowed redirect URLs: `https://your-app.vercel.app/*`

---

## Admin First Login (Production)

Since signups are invite-only:
1. In Clerk dashboard → **Users** → **Invite user** → enter `devontyerman@gmail.com`
2. Check email, click invite link, complete signup
3. On first sign-in, the system auto-upserts you as `role='admin'`
4. Navigate to `https://your-app.vercel.app/admin` to access the console

---

## Security Notes

- OpenAI API key is **never sent to the browser** — only a short-lived ephemeral token is
- Ephemeral tokens expire automatically; they cannot be reused to access OpenAI generally
- All admin routes double-check `role='admin'` from the database server-side
- `is_disabled` users are blocked at the `/api/realtime-token` endpoint
- `.env.local` is in `.gitignore` — never commit it

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "publishableKey is invalid" | Add real Clerk keys to `.env.local` |
| "DATABASE_URL is not set" | Check `.env.local` has the Neon connection string |
| Build fails on `/_not-found` | Only occurs with placeholder Clerk keys — fine in production |
| Voice not working | Check microphone permissions in browser; Chrome/Edge work best |
| Admin page shows 403 | First, sign in with `APP_ADMIN_EMAIL`; DB row must exist |
| Invite email not sent | Ensure `CLERK_SECRET_KEY` is set and Clerk invite-only mode is on |
| OpenAI Realtime 403 | Verify your OpenAI account has Realtime API access |
