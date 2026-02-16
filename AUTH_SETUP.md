# 🔐 Authentication & Database Setup Guide

Complete guide to add user authentication and database to DermaIQ.

## 📋 What's Been Added

### Authentication Features
- ✅ Email/Password login & signup
- ✅ Google OAuth login
- ✅ Session management with NextAuth
- ✅ Protected routes
- ✅ User dashboard

### Database Features
- ✅ User accounts
- ✅ Analysis history
- ✅ Product tracking
- ✅ PostgreSQL with Prisma ORM

---

## 🗄️ Database Options

Choose one of these databases (all work with Prisma):

### **Option 1: Vercel Postgres (Recommended - Easiest)**
- Free tier: 256 MB storage
- Integrated with Vercel
- No setup needed
- [vercel.com/storage/postgres](https://vercel.com/storage/postgres)

### **Option 2: Supabase (Popular)**
- Free tier: 500 MB
- Full-featured
- [supabase.com](https://supabase.com)

### **Option 3: Railway**
- Free $5 credit/month
- PostgreSQL
- [railway.app](https://railway.app)

### **Option 4: Neon**
- Serverless Postgres
- Free tier
- [neon.tech](https://neon.tech)

---

## 🚀 Setup Instructions

### **Step 1: Choose and Set Up Database**

#### **Using Vercel Postgres (Easiest):**

1. Go to your Vercel dashboard
2. Select your `dermaiq` project
3. Go to "Storage" tab
4. Click "Create Database" → "Postgres"
5. Click "Create"
6. Copy the `DATABASE_URL` connection string

#### **Using Supabase:**

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Wait for database to initialize
4. Go to Settings → Database
5. Copy the connection string (URI format)

---

### **Step 2: Add Environment Variables**

Add these to your `.env.local` file:

```bash
# OpenAI (already have)
OPENAI_API_KEY=sk-your-key

# Database
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# NextAuth
NEXTAUTH_SECRET="your-random-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

#### **Generate NEXTAUTH_SECRET:**

Run this in your terminal:
```bash
openssl rand -base64 32
```

Copy the output and use it as `NEXTAUTH_SECRET`

---

### **Step 3: Set Up Google OAuth (Optional)**

If you want "Continue with Google" button to work:

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or select existing)
3. Enable "Google+ API"
4. Go to "Credentials"
5. Create "OAuth 2.0 Client ID"
6. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (local)
   - `https://your-app.vercel.app/api/auth/callback/google` (production)
7. Copy Client ID and Client Secret

---

### **Step 4: Initialize Database**

Run these commands in your terminal:

```bash
cd /Users/Yagya.Mundra/Desktop/DermaIQ/product-scan-ai

# Generate Prisma client
npx prisma generate

# Create database tables
npx prisma db push

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

---

### **Step 5: Update Main App**

The app now needs to check for authentication. Let me create the updated components...

---

## 🎯 Database Schema

### **Tables Created:**

1. **users** - User accounts
   - id, name, email, password, etc.

2. **accounts** - OAuth accounts (Google, etc.)
   - Links external providers to users

3. **sessions** - Active user sessions
   - Manages logged-in states

4. **analyses** - Product analysis history
   - Stores all product scans per user
   - Includes scores, ingredients, verdict

---

## 🔐 How Authentication Works

### **Login Flow:**
1. User visits `/login`
2. Can login with:
   - Email & Password
   - Google account
3. Session created
4. Redirected to home page
5. Can now see analysis history

### **Signup Flow:**
1. User fills signup form
2. Password hashed with bcrypt
3. User created in database
4. Auto-logged in
5. Redirected to home

### **Protected Features:**
- Analysis history (requires login)
- Saved products (requires login)
- User dashboard (requires login)

### **Public Features:**
- Single product analysis (works without login)
- View results (works without login)

---

## 🌐 Production Deployment (Vercel)

### **Environment Variables to Add in Vercel:**

Go to: Vercel Dashboard → Your Project → Settings → Environment Variables

Add these:

```
OPENAI_API_KEY = sk-your-key
DATABASE_URL = postgresql://...
NEXTAUTH_SECRET = your-random-secret
NEXTAUTH_URL = https://your-app.vercel.app
GOOGLE_CLIENT_ID = your-google-id (optional)
GOOGLE_CLIENT_SECRET = your-google-secret (optional)
```

---

## 📝 Next Steps

After database setup, you'll have:

1. **Login Page** at `/login`
2. **User Sessions** - Remembers logged-in users
3. **Analysis History** - See past products analyzed
4. **Profile Page** - User settings (to be built)
5. **Dashboard** - View all your analyses (to be built)

---

## 🔧 Database Commands

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Open visual database editor
npx prisma studio

# Create migration
npx prisma migrate dev --name init

# Reset database (careful!)
npx prisma migrate reset
```

---

## 🆘 Troubleshooting

### **"Can't reach database server"**
- Check DATABASE_URL is correct
- Verify database is running
- Check firewall/network settings

### **"Table does not exist"**
- Run `npx prisma db push`
- Or `npx prisma migrate dev`

### **"Invalid connection string"**
- Ensure DATABASE_URL is properly formatted
- Check for special characters in password (URL encode them)

---

## 💰 Cost Considerations

### **Free Tiers Available:**
- Vercel Postgres: 256 MB
- Supabase: 500 MB
- Railway: $5 credit/month
- Neon: 0.5 GB

### **Estimated Usage:**
- Each analysis: ~5 KB
- 1000 analyses: ~5 MB
- 10,000 analyses: ~50 MB

---

## 🔜 What to Build Next

With auth & database, you can now add:

1. **Analysis History Page** - View past scans
2. **Favorites** - Save products
3. **Comparison** - Compare products side-by-side
4. **Export** - Download analysis as PDF
5. **Share** - Share analysis with friends
6. **Notes** - Add personal notes to products

---

**Want me to help you set up the database? Let me know which provider you'd like to use!** 🚀
