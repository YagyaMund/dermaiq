# Troubleshooting Guide

Common issues and their solutions for DermaIQ.

## Setup Issues

### Issue: "OpenAI API key is not set"

**Symptoms:**
- App crashes on startup
- Error in terminal/logs

**Solution:**
1. Ensure `.env.local` exists in the project root
2. Add your OpenAI API key:
   ```
   OPENAI_API_KEY=sk-your-actual-key-here
   ```
3. Restart the development server:
   ```bash
   npm run dev
   ```

### Issue: "Module not found" errors

**Symptoms:**
- Import errors in console
- TypeScript errors

**Solution:**
```bash
# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: Port 3000 already in use

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Option 1: Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Option 2: Use a different port
PORT=3001 npm run dev
```

---

## Upload Issues

### Issue: "Image size must be less than 5MB"

**Symptoms:**
- Error when uploading large images

**Solution:**
- Compress image before upload
- Use tools like:
  - macOS: Preview → Export → Reduce Quality
  - Online: tinypng.com, squoosh.app
  - CLI: `convert input.jpg -quality 85 output.jpg`

### Issue: File upload not working

**Symptoms:**
- No file selected after clicking upload
- Upload button grayed out

**Solution:**
1. Check browser console for errors
2. Ensure file is JPEG or PNG
3. Try a different browser
4. Clear browser cache

---

## Analysis Issues

### Issue: "Ingredients could not be confidently identified"

**Symptoms:**
- Analysis completes but shows this error

**Solution:**
1. **Improve image quality:**
   - Take photo in good lighting
   - Focus on ingredients list
   - Avoid glare/reflections
   - Ensure text is readable

2. **Try different angle:**
   - Photograph label straight-on
   - Flatten any curved surfaces
   - Zoom in on ingredients section

### Issue: Analysis takes too long or times out

**Symptoms:**
- Loading spinner for >30 seconds
- Timeout error

**Solution:**
1. **Check image size:**
   - Reduce to under 2MB for faster processing
   
2. **Check OpenAI API status:**
   - Visit status.openai.com
   
3. **Increase timeout (development only):**
   ```typescript
   // In app/api/analyze/route.ts
   export const maxDuration = 60; // Increase to 60s
   ```

### Issue: Incorrect or weird results

**Symptoms:**
- Product name is wrong
- Missing obvious ingredients
- Scores don't make sense

**Possible Causes:**
1. **Image quality is poor**
   - Solution: Use higher quality image
   
2. **Label is in non-English language**
   - Solution: Currently only supports English well
   - Future: Add language detection
   
3. **Multiple products in image**
   - Solution: Photograph one product at a time
   
4. **AI hallucination**
   - Solution: Cross-reference with actual product
   - Remember: Results are AI estimates only

---

## API Issues

### Issue: 429 Rate Limit Error

**Symptoms:**
```json
{
  "error": "Rate limit exceeded"
}
```

**Solution:**
1. **Check OpenAI usage:**
   - Visit platform.openai.com/usage
   - Ensure you're within rate limits
   
2. **Wait and retry:**
   - OpenAI has rate limits per minute/hour
   
3. **Upgrade OpenAI plan:**
   - Free tier: very limited
   - Tier 1+: Higher rate limits

### Issue: 401 Authentication Error

**Symptoms:**
```json
{
  "error": "Invalid API key"
}
```

**Solution:**
1. Verify API key in `.env.local`
2. Ensure no extra spaces
3. Check key hasn't been revoked at platform.openai.com
4. Generate new API key if needed
5. Restart dev server

### Issue: 500 Internal Server Error

**Symptoms:**
- Generic server error
- Check server logs

**Solution:**
1. **Check server logs:**
   ```bash
   # Look for errors in terminal
   ```
   
2. **Common causes:**
   - OpenAI API down
   - Malformed request
   - Network issues
   
3. **Debug:**
   - Check `app/api/analyze/route.ts` console logs
   - Add more logging if needed

---

## Build/Deployment Issues

### Issue: Build fails with TypeScript errors

**Symptoms:**
```
Type error: Cannot find module...
```

**Solution:**
```bash
# Regenerate types
rm -rf .next
npm run build
```

### Issue: Environment variables not working in production

**Symptoms:**
- Works locally, fails in production
- "API key not set" in deployed app

**Solution (Vercel):**
1. Go to project settings
2. Navigate to "Environment Variables"
3. Add `OPENAI_API_KEY`
4. Redeploy

### Issue: Vercel deployment timeout

**Symptoms:**
```
Error: Function execution timeout
```

**Solution:**
1. **Check maxDuration:**
   ```typescript
   // app/api/analyze/route.ts
   export const maxDuration = 30; // Max for Pro plan
   ```
   
2. **Optimize images before upload**

3. **Upgrade Vercel plan:**
   - Free: 10s limit
   - Pro: 60s limit

---

## Performance Issues

### Issue: Slow image uploads

**Solution:**
- Compress images before upload
- Check internet connection
- Use CDN for static assets

### Issue: High OpenAI costs

**Solution:**
1. **Monitor usage:**
   - Check platform.openai.com/usage
   
2. **Optimize prompts:**
   - Reduce max_tokens if possible
   - Cache results for identical images
   
3. **Implement rate limiting:**
   - Limit requests per user/IP
   
4. **Use cheaper models (if suitable):**
   - Consider GPT-4 Turbo vs GPT-4o

---

## Browser-Specific Issues

### Issue: Upload not working in Safari

**Solution:**
- Ensure file input accepts JPEG/PNG
- Try Chrome/Firefox
- Check Safari console for errors

### Issue: Dark mode looks weird

**Solution:**
- Check system dark mode settings
- Manually test both modes
- CSS may need adjustment

---

## Development Issues

### Issue: Hot reload not working

**Solution:**
```bash
# Restart dev server
npm run dev
```

### Issue: Changes not reflecting

**Solution:**
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

---

## Getting Help

If none of these solutions work:

1. **Check logs:**
   - Browser console (F12)
   - Server terminal
   
2. **Search GitHub Issues:**
   - Next.js issues
   - OpenAI issues
   
3. **OpenAI Support:**
   - help.openai.com
   
4. **Vercel Support:**
   - vercel.com/support

---

## Still Stuck?

Contact support with:
- Error message (full text)
- Browser/OS version
- Steps to reproduce
- Console logs
- Network tab (for API errors)

---

Last updated: 2024-02-15
