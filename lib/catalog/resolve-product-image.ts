import { sanitizeProductImageUrl } from '@/lib/utils/product-image-url';

type ObfProduct = {
  product_name?: string;
  brands?: string;
  image_front_url?: string;
  image_url?: string;
  image_small_url?: string;
};

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2)
  );
}

function nameOverlapScore(query: string, candidate: string): number {
  const q = tokenize(query);
  const c = tokenize(candidate);
  if (q.size === 0 || c.size === 0) return 0;
  let hit = 0;
  for (const t of q) {
    if (c.has(t)) hit += 1;
  }
  return hit / q.size;
}

function pickImageUrl(product: ObfProduct): string | null {
  for (const raw of [product.image_front_url, product.image_url, product.image_small_url]) {
    const safe = sanitizeProductImageUrl(raw);
    if (safe) return safe;
  }
  return null;
}

/** Lookup a public product pack image (Open Beauty Facts). */
export async function resolveProductImageUrl(params: {
  product_name: string;
  brand?: string;
}): Promise<string | null> {
  const query = [params.brand, params.product_name].filter(Boolean).join(' ').trim();
  if (query.length < 3) return null;

  try {
    const url = new URL('https://world.openbeautyfacts.org/cgi/search.pl');
    url.searchParams.set('search_terms', query);
    url.searchParams.set('json', '1');
    url.searchParams.set('page_size', '8');
    url.searchParams.set(
      'fields',
      'product_name,brands,image_front_url,image_url,image_small_url'
    );

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'DermaIQ/1.0 (https://dermaiq.vercel.app)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { products?: ObfProduct[] };
    const products = data.products ?? [];

    let best: { score: number; image: string } | null = null;

    for (const product of products) {
      const image = pickImageUrl(product);
      if (!image) continue;

      const candidateName = [product.brands, product.product_name].filter(Boolean).join(' ');
      const score = nameOverlapScore(query, candidateName);
      if (!best || score > best.score) {
        best = { score, image };
      }
    }

    if (best && best.score >= 0.25) return best.image;

    const firstWithImage = products.map(pickImageUrl).find(Boolean);
    return firstWithImage ?? null;
  } catch (error) {
    console.warn('Product image lookup failed:', error);
    return null;
  }
}
