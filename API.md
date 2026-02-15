# API Documentation

Complete API reference for DermaIQ Product Image Analyzer.

## Base URL

- **Local Development**: `http://localhost:3000`
- **Production**: `https://your-app.vercel.app`

---

## Endpoints

### POST /api/analyze

Analyzes a skincare/cosmetic product image and returns ingredient analysis with quality scores.

#### Request

**Method**: `POST`

**Content-Type**: `multipart/form-data`

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `image` | File | Yes | Product image (JPEG/PNG, max 5MB) |

**Example Request (JavaScript)**:

```javascript
const formData = new FormData();
formData.append('image', imageFile);

const response = await fetch('/api/analyze', {
  method: 'POST',
  body: formData,
});

const data = await response.json();
```

**Example Request (cURL)**:

```bash
curl -X POST http://localhost:3000/api/analyze \
  -F "image=@/path/to/product.jpg"
```

#### Response

**Success Response** (200 OK):

```json
{
  "product_name": "CeraVe Moisturizing Cream",
  "ingredients": [
    "Aqua",
    "Glycerin",
    "Cetearyl Alcohol",
    "Caprylic/Capric Triglyceride",
    "Cetyl Alcohol",
    "Dimethicone",
    "Phenoxyethanol",
    "Ceramide NP",
    "Ceramide AP",
    "Ceramide EOP",
    "Hyaluronic Acid",
    "Cholesterol"
  ],
  "scores": {
    "quality": 82,
    "safety": 88,
    "organic": "Mixed"
  },
  "verdict": "High-quality moisturizer with proven ceramides and hyaluronic acid. Formulation is well-balanced with effective humectants and occlusives. Contains some synthetic preservatives but overall safe for most skin types.",
  "explanations": {
    "quality": "Contains three essential ceramides (NP, AP, EOP) which are clinically proven to repair skin barrier. Hyaluronic acid provides excellent hydration. Well-formulated with both humectants and emollients.",
    "safety": "Generally safe formulation. Phenoxyethanol is a commonly used preservative with good safety profile. Fragrance-free reduces risk of sensitivity. Suitable for sensitive skin.",
    "organic": "Mix of naturally-derived ingredients (ceramides from plant sources, hyaluronic acid) and synthetic components (preservatives, emollifiers). Not certified organic but uses biomimetic ingredients."
  }
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `product_name` | string | Identified product name |
| `ingredients` | string[] | Array of detected ingredients |
| `scores.quality` | number | Quality score (0-100) |
| `scores.safety` | number | Safety score (0-100) |
| `scores.organic` | string | Classification: "Organic", "Inorganic", "Mixed", or "Unknown" |
| `verdict` | string | Overall assessment (2-3 sentences) |
| `explanations.quality` | string | Detailed quality analysis |
| `explanations.safety` | string | Detailed safety analysis |
| `explanations.organic` | string | Organic classification explanation |

#### Error Responses

**400 Bad Request** - No Image Provided:

```json
{
  "error": "No image provided"
}
```

**400 Bad Request** - Invalid File Type:

```json
{
  "error": "File must be an image (JPEG or PNG)"
}
```

**400 Bad Request** - File Too Large:

```json
{
  "error": "Image size must be less than 5MB"
}
```

**422 Unprocessable Entity** - Could Not Parse Image:

```json
{
  "error": "Could not parse product information from image",
  "details": "The image may not contain a clear product label with ingredients."
}
```

**422 Unprocessable Entity** - No Ingredients Detected:

```json
{
  "error": "Ingredients could not be confidently identified",
  "details": "Please ensure the product label with ingredients list is clearly visible."
}
```

**500 Internal Server Error** - Analysis Failed:

```json
{
  "error": "Analysis failed",
  "details": "Error message with details"
}
```

**500 Internal Server Error** - OpenAI API Error:

```json
{
  "error": "An unexpected error occurred",
  "details": "Please try again later."
}
```

---

## Rate Limits

### Development
- No built-in rate limiting
- Limited by OpenAI API tier limits

### Production Recommendations
- Implement rate limiting per IP/user
- Suggested: 10 requests per minute per IP
- Consider using Upstash Redis or Vercel Edge Config

---

## Authentication

Current version: **No authentication required**

Future versions may include:
- API key authentication
- JWT tokens
- User accounts

---

## CORS

Default CORS policy:
- Allows requests from same origin
- No cross-origin requests allowed by default

To enable CORS, add headers in `route.ts`:

```typescript
export async function POST(request: NextRequest) {
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  
  // ... rest of code
  
  return NextResponse.json(result, { status: 200, headers });
}
```

---

## Request/Response Examples

### Example 1: Successful Analysis

**Request**:
```bash
curl -X POST http://localhost:3000/api/analyze \
  -F "image=@moisturizer.jpg"
```

**Response**:
```json
{
  "product_name": "Neutrogena Hydro Boost",
  "ingredients": ["Aqua", "Dimethicone", "Glycerin", "..."],
  "scores": {
    "quality": 75,
    "safety": 80,
    "organic": "Inorganic"
  },
  "verdict": "Good quality drugstore moisturizer...",
  "explanations": {
    "quality": "Contains hyaluronic acid...",
    "safety": "Generally safe formulation...",
    "organic": "Primarily synthetic ingredients..."
  }
}
```

### Example 2: Error - No Ingredients Found

**Request**:
```bash
curl -X POST http://localhost:3000/api/analyze \
  -F "image=@blurry-product.jpg"
```

**Response**:
```json
{
  "error": "Ingredients could not be confidently identified",
  "details": "Please ensure the product label with ingredients list is clearly visible."
}
```

---

## TypeScript Types

```typescript
// Request (multipart/form-data)
interface AnalyzeRequest {
  image: File; // JPEG/PNG, max 5MB
}

// Success Response
interface AnalysisResult {
  product_name: string;
  ingredients: string[];
  scores: {
    quality: number; // 0-100
    safety: number;  // 0-100
    organic: 'Organic' | 'Inorganic' | 'Mixed' | 'Unknown';
  };
  verdict: string;
  explanations: {
    quality: string;
    safety: string;
    organic: string;
  };
}

// Error Response
interface AnalysisError {
  error: string;
  details?: string;
}
```

---

## Performance

### Response Times

- **Average**: 5-10 seconds
- **Vision API**: 2-5 seconds
- **Scoring API**: 2-4 seconds
- **Network latency**: 1-2 seconds

### Optimization Tips

1. **Compress images** before upload (reduces Vision API cost)
2. **Cache results** for identical products
3. **Use CDN** for static assets
4. **Implement pagination** for batch processing

---

## Error Handling Best Practices

### Client-Side

```typescript
try {
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await fetch('/api/analyze', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error);
  }
  
  const data = await response.json();
  // Handle success
} catch (error) {
  // Handle error
  console.error('Analysis failed:', error.message);
}
```

### Server-Side

All errors are caught and returned with appropriate HTTP status codes:
- `400`: Client errors (invalid input)
- `422`: Unprocessable entity (can't extract data)
- `500`: Server errors (OpenAI failures, etc.)

---

## Webhooks

**Not implemented in MVP**

Future enhancement:
- Webhook support for async processing
- Notify client when analysis completes

---

## SDK Examples

### React/Next.js

```typescript
import { useState } from 'react';
import type { AnalysisResult } from '@/types';

function useAnalyze() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const analyze = async (file: File): Promise<AnalysisResult | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.details || err.error);
      }
      
      return await response.json();
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  return { analyze, loading, error };
}
```

---

## Monitoring

### Recommended Metrics

1. **Request count** - Total API calls
2. **Success rate** - % of successful analyses
3. **Average response time** - Performance tracking
4. **Error rate** - % of failed requests
5. **OpenAI costs** - Track spending

### Tools

- Vercel Analytics (built-in)
- Sentry (error tracking)
- PostHog (product analytics)
- OpenAI Dashboard (usage/costs)

---

## Changelog

### v1.0.0 (2024-02-15)
- Initial release
- POST /api/analyze endpoint
- Vision-based ingredient extraction
- AI-powered scoring system
- Error handling and validation

---

## Support

For API issues or questions:
- Check `TROUBLESHOOTING.md`
- Review `README.md`
- Open GitHub issue

---

**API Version**: 1.0.0  
**Last Updated**: 2024-02-15
