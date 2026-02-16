# 🚀 Quick Start: Adding Authentication to DermaIQ

## What You Need

1. **Database** - Choose ONE:
   - Vercel Postgres (easiest if on Vercel)
   - Supabase (popular, free tier)
   - Railway (flexible)
   - Any PostgreSQL database

2. **Environment Variables** - Add to `.env.local`

## Step-by-Step Setup (5 minutes)

### 1️⃣ Choose Your Database

#### **Option A: Vercel Postgres (Recommended)**
```bash
# No local setup needed!
# Just create in Vercel dashboard:
1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to "Storage" tab
4. Click "Create Database" → "Postgres"
5. Copy the DATABASE_URL
```

#### **Option B: Supabase (Free)**
```bash
1. Go to: https://supabase.com
2. Create new project
3. Wait 2-3 minutes for database
4. Go to Settings → Database
5. Copy "Connection string" (URI format)
```

### 2️⃣ Update Your Environment Variables

Open `/Users/Yagya.Mundra/Desktop/DermaIQ/product-scan-ai/.env.local` and add:

```bash
# OpenAI (already have this)
OPENAI_API_KEY=sk-...

# Database - paste your connection string here
DATABASE_URL="postgresql://username:password@host:5432/database?sslmode=require"

# NextAuth - generate a random secret
NEXTAUTH_SECRET="YOUR_RANDOM_SECRET_HERE"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (OPTIONAL - skip if you don't want Google login)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```
Copy the output and paste it as NEXTAUTH_SECRET.

### 3️⃣ Initialize the Database

Run these commands in your terminal:

```bash
cd /Users/Yagya.Mundra/Desktop/DermaIQ/product-scan-ai

# Generate Prisma client
npx prisma generate

# Create database tables
npx prisma db push
```

You should see:
```
✓ Generated Prisma Client
✓ Your database is now in sync with your schema
```

### 4️⃣ Test It!

```bash
npm run dev
```

Visit:
- **http://localhost:3000** - Main page (should show Login button)
- **http://localhost:3000/login** - Login page
- Create an account and test!

---

## 🎉 What Works Now

### ✅ Without Login (Public)
- Analyze any product
- See results immediately
- No account needed

### ✅ With Login (Authenticated)
- All public features PLUS:
- **Analysis history** - See all past scans at `/history`
- **Auto-save** - Every analysis saved to your account
- **Profile** - Personalized experience

---

## 🔧 Optional: Add Google Login

If you want "Continue with Google" to work:

### Get Google OAuth Credentials:

1. Go to: https://console.cloud.google.com
2. Create a new project (or select existing)
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: **Web application**
6. Authorized redirect URIs:
   ```
   http://localhost:3000/api/auth/callback/google
   https://your-app.vercel.app/api/auth/callback/google
   ```
7. Copy **Client ID** and **Client Secret**
8. Add to `.env.local`:
   ```bash
   GOOGLE_CLIENT_ID="your-client-id-here"
   GOOGLE_CLIENT_SECRET="your-client-secret-here"
   ```

Restart your dev server and the Google button will work!

---

## 📊 View Your Database

```bash
npx prisma studio
```

This opens a GUI at `http://localhost:5555` where you can:
- View all users
- See analysis history
- Edit data
- Delete records

---

## 🌐 Deploy to Vercel

### Add Environment Variables in Vercel:

1. Go to: https://vercel.com/dashboard
2. Select your `dermaiq` project
3. Go to **Settings** → **Environment Variables**
4. Add these:

```
OPENAI_API_KEY = sk-your-key
DATABASE_URL = postgresql://...
NEXTAUTH_SECRET = your-random-secret
NEXTAUTH_URL = https://your-app.vercel.app
GOOGLE_CLIENT_ID = ... (optional)
GOOGLE_CLIENT_SECRET = ... (optional)
```

5. Redeploy your app

---

## 🆘 Troubleshooting

### Error: "Can't reach database server"
**Fix:** Check your DATABASE_URL is correct. Make sure database is running.

### Error: "Table does not exist"
**Fix:** Run `npx prisma db push` again.

### Error: "Invalid connection string"
**Fix:** Ensure DATABASE_URL is in correct format:
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

### Google Login Not Working
**Fix:** Check:
1. `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
2. Redirect URI matches in Google Console
3. Google+ API is enabled

### Session Not Persisting
**Fix:** Make sure `NEXTAUTH_SECRET` is set and is at least 32 characters.

---

## 📁 What Was Created

New files:
- `prisma/schema.prisma` - Database schema
- `lib/prisma.ts` - Database client
- `lib/auth.ts` - NextAuth config
- `app/api/auth/[...nextauth]/route.ts` - Auth API
- `app/api/auth/signup/route.ts` - Signup API
- `app/login/page.tsx` - Login page
- `app/history/page.tsx` - History page (server)
- `components/HistoryClient.tsx` - History UI (client)
- `components/AuthProvider.tsx` - Session provider
- Documentation files

Updated files:
- `app/page.tsx` - Added nav with login/history
- `app/layout.tsx` - Added SessionProvider
- `app/api/analyze/route.ts` - Auto-save to DB
- `.env.example` - Added new variables

---

## 💡 Pro Tips

1. **Test locally first** - Make sure everything works before deploying
2. **Use Vercel Postgres** - Easiest integration if you're on Vercel
3. **Backup your database** - Export before making schema changes
4. **Monitor usage** - Check your database size in provider dashboard
5. **Secure your API** - Never commit `.env.local` to git

---

## 🎯 Next Features to Build

With auth & database, you can now add:
- ⭐ **Favorites** - Save products to a favorites list
- 📊 **Compare** - Side-by-side product comparison
- 📥 **Export** - Download analysis as PDF
- 🔔 **Alerts** - Notify when products have recalls
- 👥 **Share** - Share analyses with friends

---

**Need help? Let me know which database you chose and I'll guide you through it!**
