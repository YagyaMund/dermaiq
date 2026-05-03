# API Documentation

Complete API reference for DermaIQ Product Image Analyzer.

## Base URL

- **Local Development**: `http://localhost:3000`
- **Production**: `https://your-app.vercel.app`

---

## Endpoints

### POST /api/analyze

Analyzes a **skincare** product image and returns a single **score** (0–100), grouped ingredients, and a verdict. Non-skincare items receive **422** with an explanation.

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
  "product_name": "Example Moisturizer",
  "product_type": "moisturizer",
  "detected_ingredients": ["Aqua", "Glycerin", "..."],
  "score": 72,
  "positive_ingredients": [
    {
      "category": "Moisturizers & Hydrators",
      "items": [
        { "name": "Glycerin", "benefit": "Humectant; helps retain water.", "risk_level": "green" }
      ]
    }
  ],
  "negative_ingredients": [],
  "verdict": "Short consumer-facing summary (2–3 sentences).",
  "healthier_alternative": null,
  "from_catalog_cache": false
}
```

When `score` is below 50, `healthier_alternative` may be an object: `product_name`, `brand`, `estimated_score`, `reason`, optional `image_url`.

When the response was loaded from the global **skincare product catalog** (cache hit), the JSON may include `"from_catalog_cache": true`, and the response header `X-DermaIQ-Catalog-Cache: hit` is set (miss → `miss`).

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `product_name` | string | Identified product name |
| `product_type` | string | Skincare category (e.g. `cleanser`, `serum`, `sunscreen`) |
| `detected_ingredients` | string[] | INCI list used for scoring |
| `score` | number | Single score 0–100 (risk bands: red &lt;25, orange &lt;50, green 50–100) |
| `positive_ingredients` | array | `{ category, items: [{ name, benefit?, risk_level? }] }` |
| `negative_ingredients` | array | `{ category, items: [{ name, concern?, risk_level? }] }` |
| `verdict` | string | Overall assessment |
| `healthier_alternative` | object \| null | Optional cleaner alternative if score &lt; 50 |
| `from_catalog_cache` | boolean (optional) | `true` if score/ingredients served from DB cache |

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

**422 Unprocessable Entity** — Not skincare / could not identify / no ingredients:

```json
{
  "error": "This product is not in-scope skincare for DermaIQ",
  "details": "…"
}
```

```json
{
  "error": "Could not identify the product from the image",
  "details": "Please make sure the product is clearly visible in the image."
}
```

```json
{
  "error": "Could not identify ingredients for this product",
  "details": "Please ensure the product label is clearly visible, or try a different angle."
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
