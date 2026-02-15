# DermaIQ - AI Product Image Analyzer

An AI-powered web application that analyzes skincare and cosmetic product images to extract ingredients and provide quality insights.

## Features

- 📸 **Image Upload**: Upload product images (JPEG/PNG, max 5MB)
- 🤖 **AI-Powered Analysis**: Uses OpenAI Vision API to extract product information
- 🧪 **Ingredient Detection**: Automatically identifies and lists ingredients
- 📊 **Quality Scoring**: Provides quality and safety scores (0-100)
- 🌿 **Organic Classification**: Categorizes products as Organic, Inorganic, Mixed, or Unknown
- 💡 **Detailed Explanations**: AI-generated insights for each score
- 🎨 **Modern UI**: Beautiful, responsive design with dark mode support

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **AI**: OpenAI Vision API (GPT-4o)
- **Validation**: Zod
- **Deployment**: Vercel-ready

## Prerequisites

- Node.js 18+ 
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
3. **View Results**: Review the quality scores, safety ratings, and ingredient list
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
│   └── openai.ts                  # OpenAI client configuration
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

**Response:**
```json
{
  "product_name": "Example Product",
  "ingredients": ["Ingredient A", "Ingredient B"],
  "scores": {
    "quality": 78,
    "safety": 70,
    "organic": "Mixed"
  },
  "verdict": "Moderate quality product with some inorganic components.",
  "explanations": {
    "quality": "Based on ingredient sourcing and processing.",
    "safety": "Some additives may cause sensitivity.",
    "organic": "Contains both natural and synthetic ingredients."
  }
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "details": "Detailed error description"
}
```

## How It Works

1. **Image Upload**: User uploads a skincare/cosmetic product image
2. **Vision Analysis**: OpenAI Vision model extracts product name and ingredients
3. **Ingredient Scoring**: AI analyzes ingredients and generates:
   - Quality Score (0-100)
   - Safety Score (0-100)
   - Organic Classification
   - Detailed explanations
4. **Results Display**: User sees comprehensive analysis with scores and insights

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
export const maxDuration = 30; // seconds (Vercel limit)
```

### Change AI Models

Edit `lib/openai.ts`:

```typescript
export const VISION_MODEL = 'gpt-4o'; // or 'gpt-4-vision-preview'
export const TEXT_MODEL = 'gpt-4o';   // or 'gpt-4-turbo'
```

## Limitations (MVP)

- Single image analysis only
- No user authentication
- No product history
- No barcode scanning
- AI estimates may not be 100% accurate
- Results are for informational purposes only

## Future Enhancements

- [ ] User accounts and authentication
- [ ] Product history tracking
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
- Each analysis makes 2 API calls (Vision + Text)
- Estimated cost: ~$0.01-0.03 per analysis (depending on image size)
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
