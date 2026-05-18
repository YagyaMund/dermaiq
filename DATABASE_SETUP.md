# 🔐 DermaIQ Authentication & Database Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        DermaIQ App                           │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐   ┌──────────────┐  │
│  │  Login Page  │───▶│  Home Page   │──▶│   Analysis   │  │
│  │   /login     │    │      /       │   │   Results    │  │
│  └──────────────┘    └──────────────┘   └──────────────┘  │
│         │                    │                   │          │
│         ▼                    ▼                   ▼          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              NextAuth.js (Session)                    │  │
│  └──────────────────────────────────────────────────────┘  │
│         │                                        │          │
│         ▼                                        ▼          │
│  ┌──────────────┐                      ┌──────────────┐   │
│  │   Google     │                      │   Database   │   │
│  │    OAuth     │                      │  PostgreSQL  │   │
│  └──────────────┘                      └──────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Authentication Flow

### 1. Email/Password Signup
```
User fills form → API validates → Password hashed → User created → Auto login → Home
```

### 2. Email/Password Login
```
User enters credentials → Check database → Verify password → Create session → Home
```

### 3. Google OAuth
```
Click Google → Redirect to Google → User authorizes → Callback → Create/find user → Session → Home
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  name          TEXT,
  email         TEXT UNIQUE NOT NULL,
  password      TEXT,           -- Hashed with bcrypt
  image         TEXT,           -- Profile picture URL
  email_verified TIMESTAMP,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP
);
```

### Analyses Table (Product History)
```sql
CREATE TABLE analyses (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  product_name TEXT NOT NULL,
  image_url   TEXT,
  
  -- Scores
  quality_score INT,
  safety_score  INT,
  organic_type  TEXT,
  
  -- Ingredients (stored as JSON)
  positive_ingredients JSON,
  negative_ingredients JSON,
  
  verdict     TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_analyses_user_id ON analyses(user_id);
CREATE INDEX idx_analyses_created_at ON analyses(created_at);
```

### Skincare product catalog (global cache)

Separate from per-user `analyses`. Rows in `skincare_product_catalog` store a normalized `lookup_key`, display name, INCI list, optional full scored JSON (`analysis_json`), and `source` (`user_scan`, `name_search`, `backfill`). `/api/analyze` checks this table after vision to avoid duplicate OpenAI scoring when the same product is seen again.

Rows are created automatically when users scan or search products. To score existing rows that only have ingredients, run `npm run catalog:backfill -- --limit=20` (uses `OPENAI_API_KEY`; costs tokens).

## Features Enabled

### Without Login (Public)
- ✅ Single product analysis
- ✅ View results
- ❌ No history saved

### With Login (Authenticated)
- ✅ All public features
- ✅ Analysis history
- ✅ Saved products
- ✅ Profile management
- ✅ Export results

## Environment Variables Required

### Development (.env.local)
```bash
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=random-32-char-string
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=... (optional)
GOOGLE_CLIENT_SECRET=... (optional)
```

### Production (Vercel)
```bash
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=random-32-char-string
NEXTAUTH_URL=https://your-app.vercel.app
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

## Quick Setup Commands

```bash
# Install dependencies (already done)
npm install next-auth @auth/prisma-adapter prisma @prisma/client bcryptjs

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# View database (opens GUI at localhost:5555)
npx prisma studio
```

## Security Features

- ✅ Passwords hashed with bcrypt (10 rounds)
- ✅ JWT sessions
- ✅ CSRF protection
- ✅ Secure cookies
- ✅ API keys never exposed
- ✅ SQL injection prevention (Prisma)

## Database Providers Comparison

| Provider | Free Tier | Setup | Best For |
|----------|-----------|-------|----------|
| Vercel Postgres | 256 MB | Easiest | Vercel apps |
| Supabase | 500 MB | Easy | Full-featured |
| Railway | $5/mo credit | Medium | Flexibility |
| Neon | 3 GB | Easy | Serverless |

## Next Steps

1. **Choose database provider** (recommend: Vercel Postgres)
2. **Add DATABASE_URL** to environment variables
3. **Run `npx prisma db push`** to create tables
4. **Test login** at `/login`
5. **Optional:** Set up Google OAuth

---

**Ready to set up the database? Which provider would you like to use?**
