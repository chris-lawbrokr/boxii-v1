# Auth (v1)

Boxii handles authentication itself — accounts live in **Neon Postgres** with
scrypt-hashed passwords. No external auth provider. Two surfaces: **customer**
and **admin**.

## How it works

```
login / signup form ─▶ server action ─▶ auth (login | signup)  ─▶ Neon (users)
                                              │
                                              ▼
                            mint Boxii session (jose JWT, httpOnly cookie)
                                              │
     proxy.ts (optimistic) ◀─────────────────┴──────────────▶ DAL requireUser/requireAdmin (secure)
```

- **Auth** (`app/lib/auth/`) — the whole auth API:
  - `index.ts` — `login(email, password)` and `signup(email, name, password)`;
    lazily seeds/repairs demo accounts in development.
  - `password.ts` — Node `scrypt` hashing (`scrypt$salt$hash`); no dependency.
  - `types.ts` — `AuthUser`, `Role`, `AuthError`.
- **Data** (`app/lib/db/`) — Drizzle + Neon. `users` table keyed by `id`, unique
  on `email`.
- **Session** (`app/lib/session.ts`) — encrypted httpOnly cookie `boxii_session`
  (jose HS256, signed with `SESSION_SECRET`).
- **Route protection** — `proxy.ts` (Next 16's renamed middleware) does a fast
  cookie-only check; the DAL (`app/lib/dal.ts`) does the real check at the data
  boundary via `requireUser` / `requireAdmin`.

## Run it locally

```bash
cp .env.example .env.local   # set SESSION_SECRET (openssl rand -base64 32) + DATABASE_URL
npm run dev
```

Requires `DATABASE_URL`. Demo accounts are seeded in development (password
`boxii1234`), or create your own at `/signup`:

| Surface  | URL       | Account               | Lands on     |
|----------|-----------|-----------------------|--------------|
| Sign in  | `/login`  | `customer@boxii.test` | `/dashboard` |
| Sign in  | `/login`  | `admin@boxii.test`    | `/admin`     |
| Sign up  | `/signup` | self-service          | `/dashboard` |

There is **one** login. The `login` action redirects by role — admins land on
`/admin`, everyone else on `/dashboard` — so there's no separate admin login
route. A customer who reaches `/admin` is bounced to `/dashboard`. Self-service
signup always creates a `customer`; admins are promoted in the DB
(`UPDATE users SET role='admin' WHERE email=…`).

## Database

```bash
npm run db:generate   # create a migration from app/lib/db/schema.ts
npm run db:migrate    # apply it (reads DATABASE_URL from .env.local)
npm run db:studio     # browse data
```
