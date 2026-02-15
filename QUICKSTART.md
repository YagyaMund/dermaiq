# 🚀 Quick Start Guide

Get DermaIQ up and running in 5 minutes!

## Prerequisites

- ✅ Node.js 18+ installed
- ✅ npm or yarn
- ✅ OpenAI API key ([get one here](https://platform.openai.com/api-keys))

## Step-by-Step Setup

### 1️⃣ Navigate to Project

```bash
cd product-scan-ai
```

### 2️⃣ Install Dependencies

```bash
npm install
```

This installs all required packages including:
- Next.js 16
- React 19
- OpenAI SDK
- Tailwind CSS 4
- TypeScript
- Zod

### 3️⃣ Configure OpenAI API Key

**Option A: Quick Setup**
```bash
# Open .env.local and add your key
nano .env.local
```

Add this line (replace with your actual key):
```
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
```

**Option B: Using Command Line**
```bash
echo "OPENAI_API_KEY=sk-your-actual-key" > .env.local
```

**Get Your API Key:**
1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Click "Create new secret key"
3. Copy the key (starts with `sk-`)
4. Paste it in `.env.local`

### 4️⃣ Start Development Server

```bash
npm run dev
```

You should see:
```
▲ Next.js 16.1.6
- Local:        http://localhost:3000
- Environments: .env.local

✓ Starting...
✓ Ready in 2.5s
```

### 5️⃣ Open in Browser

Navigate to: **http://localhost:3000**

You should see the DermaIQ interface! 🎉

---

## 📸 First Test

### Try It Out:

1. **Take a photo** of a skincare product label (or use a sample image)
2. **Click** the upload area
3. **Select** your image
4. **Click** "Analyze Product"
5. **Wait** 5-10 seconds
6. **View** the results!

### Good Test Products:
- Face creams
- Moisturizers
- Serums
- Sunscreens
- Any product with visible ingredients list

### Image Tips:
- ✅ Clear, focused photo
- ✅ Good lighting
- ✅ Ingredients list visible
- ✅ Straight-on angle
- ❌ Avoid glare/reflections
- ❌ Don't include multiple products

---

## 🎯 What You Should See

After analysis, you'll get:

1. **Product Name** - Identified from the image
2. **Quality Score** (0-100) - Overall quality rating
3. **Safety Score** (0-100) - Safety/skin compatibility
4. **Classification** - Organic/Inorganic/Mixed
5. **Verdict** - Summary assessment
6. **Detailed Analysis** - Explanations for each score
7. **Ingredients List** - All detected ingredients

---

## ⚡ Quick Commands Reference

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Utilities
./setup.sh          # Run setup script (checks config)
```

---

## 🔧 Troubleshooting Quick Fixes

### "OpenAI API key is not set"
```bash
# Check if .env.local exists
ls -la .env.local

# If not, create it
cp .env.example .env.local

# Add your key
nano .env.local
```

### Port 3000 in use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

### Module not found
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Build errors
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

---

## 📚 Next Steps

Once you have it running:

1. **Test with Real Products** - Try different skincare items
2. **Read the README** - Full documentation
3. **Check PROMPTS.md** - Understand AI prompts
4. **Review DEPLOYMENT.md** - Deploy to production
5. **Customize** - Adjust styling, prompts, features

---

## 🚀 Deploy to Production

When you're ready:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd product-scan-ai
vercel

# Add your OpenAI key when prompted
# Or add it in Vercel dashboard
```

Visit your deployed app at: `https://your-app.vercel.app`

---

## 💰 Cost Considerations

- **OpenAI Costs**: ~$0.01-0.03 per analysis
- **Vision API**: More expensive than text
- **Monitor**: Check usage at platform.openai.com/usage
- **Set Alerts**: Recommended for production use

---

## 🆘 Need Help?

- 📖 See `TROUBLESHOOTING.md` for common issues
- 📝 Check `README.md` for full documentation
- 🌐 Visit [platform.openai.com](https://platform.openai.com) for API help
- 🚀 Visit [vercel.com/docs](https://vercel.com/docs) for deployment help

---

## ✅ Success Checklist

- [ ] Node.js 18+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] `.env.local` created with OpenAI API key
- [ ] Dev server running (`npm run dev`)
- [ ] App opens at http://localhost:3000
- [ ] Successfully analyzed a product image
- [ ] Results displayed correctly

---

## 🎉 You're All Set!

**Congratulations!** DermaIQ is now running locally.

Start analyzing products and see the power of AI-driven ingredient analysis!

---

*Built with Next.js, TypeScript, Tailwind CSS, and OpenAI Vision API*

**Happy analyzing! 🧴✨**
