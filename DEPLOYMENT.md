# Deployment Guide for DermaIQ

## Deploy to Vercel (Recommended)

Vercel is the easiest way to deploy your Next.js application.

### Option 1: Deploy via Vercel Dashboard

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: DermaIQ MVP"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Add Environment Variables**
   - In the deployment settings, add:
     - Name: `OPENAI_API_KEY`
     - Value: `your_actual_openai_api_key`
   - Mark as "Production" environment

4. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete
   - Your app will be live!

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   cd product-scan-ai
   vercel
   ```

4. **Add Environment Variables**
   ```bash
   vercel env add OPENAI_API_KEY
   ```
   - Select "Production"
   - Paste your OpenAI API key

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## Deploy to Other Platforms

### Netlify

1. Build command: `npm run build`
2. Publish directory: `.next`
3. Add environment variable: `OPENAI_API_KEY`

### Railway

1. Connect GitHub repo
2. Add environment variable: `OPENAI_API_KEY`
3. Railway will auto-deploy

### AWS Amplify

1. Connect GitHub repo
2. Build settings:
   - Build command: `npm run build`
   - Output directory: `.next`
3. Add environment variable: `OPENAI_API_KEY`

## Post-Deployment Checklist

- [ ] Verify OpenAI API key is set correctly
- [ ] Test image upload functionality
- [ ] Test analysis with multiple product images
- [ ] Check error handling
- [ ] Monitor API usage and costs
- [ ] Set up error logging (Sentry, etc.)
- [ ] Consider rate limiting for production

## Custom Domain (Optional)

### On Vercel
1. Go to your project settings
2. Click "Domains"
3. Add your custom domain
4. Update DNS records as instructed

## Environment Variables for Production

```
OPENAI_API_KEY=sk-...your_key_here
```

## Monitoring & Analytics

Consider adding:
- **Vercel Analytics**: Built-in analytics
- **Sentry**: Error tracking
- **PostHog**: Product analytics
- **OpenAI Usage Dashboard**: Monitor API costs

## Cost Optimization

1. **Monitor OpenAI Usage**
   - Check usage at platform.openai.com
   - Set up billing alerts

2. **Implement Rate Limiting**
   - Use Vercel Edge Config or Upstash Redis
   - Limit requests per IP/user

3. **Image Optimization**
   - Compress images before upload
   - Add file size warnings

4. **Caching**
   - Cache identical product analyses
   - Use Redis or similar

## Security Best Practices

- ✅ Never commit `.env.local` to git
- ✅ Use environment variables for API keys
- ✅ Implement rate limiting
- ✅ Validate file uploads (size, type)
- ✅ Add CORS headers if needed
- ✅ Monitor for abuse

## Troubleshooting Deployment

### "OpenAI API key is not set"
- Check environment variables in Vercel dashboard
- Redeploy after adding variables

### "Function timeout"
- Increase timeout in `route.ts`: `export const maxDuration = 30`
- Vercel free tier: 10s limit
- Vercel Pro: up to 60s

### Build fails
- Check Node.js version (18+)
- Clear build cache
- Check for TypeScript errors

## Support

For deployment issues:
- Vercel: docs.vercel.com
- Next.js: nextjs.org/docs

---

Ready to deploy? Start with: `vercel`
