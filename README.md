# DermaIQ - AI Product Image Analyzer

An AI-powered web application that analyzes **skincare** product images, extracts INCI-style ingredients, and scores them with a **Yuka-aligned** risk methodology (see `SCORING_ALGORITHM.md`).

## Features

- 📸 **Image Upload**: JPEG/PNG, max 5MB
- 🤖 **AI pipeline**: Vision (product + INCI) → methodology digest → risk-based score
- 🧪 **Skincare-only**: Hair, makeup-as-makeup, oral care, etc. are rejected with a clear message
- 📊 **Single score (0–100)**: Red / orange / green bands from highest-risk ingredient + penalties
- 💡 **Verdict & categories**: Grouped positives/negatives and optional healthier alternative when score &lt; 50
- 🔐 **Auth**: Sign-in and history (when database and NextAuth are configured)
- 🎨 **Responsive UI** with dark mode

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **AI**: OpenAI Vision API (GPT-4o)
- **Validation**: Zod
- **Deployment**: Vercel-ready

## Prerequisites

- Node.js 20+ (see `package.json` engines)
- npm or yarn
- OpenAI API key

## Getting Started

### 1. Clone or Navigate to Project

```bash
cd product-scan-ai
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your OpenAI API key:

```
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
```

**Important**: Never commit `.env.local` to version control. It's already in `.gitignore`.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Upload Image**: Click the upload area or drag and drop a product image
2. **Analyze**: Click "Analyze Product" to start the AI analysis
3. **View Results**: Review score, ingredient breakdown, and verdict
4. **Try Another**: Click "Analyze Another Product" to start over

## Project Structure

```
product-scan-ai/
├── app/
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts          # API endpoint for analysis
│   ├── globals.css                # Global styles
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Main page with upload UI
├── components/
│   └── ResultsDisplay.tsx         # Results display component
├── lib/
│   ├── openai.ts                  # Models + OpenAI client
│   └── prompts/                   # Vision, Yuka methodology, scoring prompts
├── types/
│   └── index.ts                   # TypeScript type definitions
├── .env.local                     # Environment variables (not in git)
├── .env.example                   # Example environment file
└── README.md
```

## API Endpoints

### POST /api/analyze

Analyzes a product image and returns detailed insights.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `image` (File)

**Response (200):** See `types/index.ts` / `API.md`. Shape includes `product_name`, `product_type`, `detected_ingredients`, `score`, `positive_ingredients`, `negative_ingredients`, `verdict`, optional `healthier_alternative`.

**Error Response:**
```json
{
  "error": "Error message",
  "details": "Detailed error description"
}
```

## How It Works

1. **Image upload** of a skincare product
2. **Vision**: identify SKU, skincare `product_type`, full INCI list
3. **Methodology digest** (small model): confirms Yuka-aligned rules for this product
4. **Scoring** (main model): risk dots, band, penalties, grouped ingredients, verdict
5. **Results** in the UI; logged-in users may persist an analysis row in Postgres

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variable:
   - `OPENAI_API_KEY`: Your OpenAI API key
4. Deploy!

```bash
# Or use Vercel CLI
npm install -g vercel
vercel
```

### Environment Variables for Production

Set these in your Vercel dashboard:

```
OPENAI_API_KEY=your_openai_api_key
```

## Configuration

### Adjust API Timeout

Edit `app/api/analyze/route.ts`:

```typescript
export const maxDuration = 60; // seconds — vision + digest + scoring (Vercel plan limits apply)
```

### Change AI Models

Edit `lib/openai.ts`:

```typescript
export const VISION_MODEL = 'gpt-4o'; // or 'gpt-4-vision-preview'
export const TEXT_MODEL = 'gpt-4o';
export const METHODOLOGY_DIGEST_MODEL = 'gpt-4o-mini'; // see lib/openai.ts
```

## Limitations (MVP)

- Single image analysis only
- Auth and history require env + database setup (see `DATABASE_SETUP.md`, `AUTH_SETUP.md`)
- No barcode scanning
- AI estimates may not be 100% accurate
- Results are for informational purposes only

## Future Enhancements

- [ ] Curated SKU catalog (e.g. high-traffic India skincare) for faster lookup
- [ ] Richer product history and export
- [ ] Barcode scanning
- [ ] Batch analysis
- [ ] Export results as PDF
- [ ] Regional ingredient regulations
- [ ] Mobile app
- [ ] Ingredient database integration

## Important Notes

⚠️ **Disclaimer**: This application provides AI-generated estimates based on visible product information. Results should not replace professional dermatological advice. Always consult with a dermatologist for personalized skincare recommendations.

## Cost Considerations

- OpenAI Vision API calls are more expensive than text-only calls
- Each analysis uses **three** model calls (vision + digest + scoring)
- Cost scales with image/tokens; monitor usage in the OpenAI dashboard
- Consider implementing rate limiting for production use

## Troubleshooting

### "OpenAI API key is not set"
- Make sure `.env.local` exists and contains your API key
- Restart the development server after adding environment variables

### "Image size must be less than 5MB"
- Compress your image before uploading
- Use online tools like TinyPNG or ImageOptim

### "Ingredients could not be confidently identified"
- Ensure the product label is clearly visible
- Take a well-lit, focused photo
- Make sure the ingredients list is readable

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ using Next.js and OpenAI
