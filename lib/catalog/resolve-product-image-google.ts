import { sanitizeProductImageUrl } from '@/lib/utils/product-image-url';

type GoogleImageItem = {
  title?: string;
  link?: string;
  image?: {
    contextLink?: string;
    thumbnailLink?: string;
  };
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

const RETAILER_HINTS =
  /amazon|nykaa|flipkart|sephora|ulta|target|walmart|chemistwarehouse|boots|lookfantastic|maccaron|purplle|1mg|myntra|bigbasket/i;

function scoreImageItem(item: GoogleImageItem, query: string): number {
  const title = item.title ?? '';
  const context = item.image?.contextLink ?? item.link ?? '';
  const text = `${title} ${context}`;
  let score = nameOverlapScore(query, text);

  if (RETAILER_HINTS.test(context)) score += 0.15;
  if (/pinterest|reddit|youtube|tiktok|instagram|facebook/i.test(context)) score -= 0.25;
  if (/\blogo\b|\bbanner\b|\bad\b/i.test(title)) score -= 0.15;

  return score;
}

function pickImageUrl(item: GoogleImageItem): string | null {
  for (const raw of [item.link, item.image?.thumbnailLink]) {
    const safe = sanitizeProductImageUrl(raw);
    if (safe) return safe;
  }
  return null;
}

/** Resolve a product pack photo via Google Custom Search (image). Search flow only. */
export async function resolveProductImageFromGoogle(params: {
  product_name: string;
  brand?: string;
  search_query?: string;
}): Promise<string | null> {
  const identity = [params.brand, params.product_name].filter(Boolean).join(' ').trim();
  const hint = params.search_query?.trim();
  const q = [identity, hint && hint.toLowerCase() !== identity.toLowerCase() ? hint : '']
    .filter(Boolean)
    .join(' ')
    .concat(' skincare product');

  if (q.length < 3) return null;

  const fromCse = await resolveViaGoogleCustomSearch(q, identity);
  if (fromCse) return fromCse;

  return resolveViaSerper(q, identity);
}

async function resolveViaGoogleCustomSearch(
  q: string,
  matchQuery: string
): Promise<string | null> {
  const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY?.trim();
  const cx = process.env.GOOGLE_CUSTOM_SEARCH_CX?.trim();
  if (!apiKey || !cx) return null;

  try {
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('cx', cx);
    url.searchParams.set('q', q);
    url.searchParams.set('searchType', 'image');
    url.searchParams.set('num', '8');
    url.searchParams.set('safe', 'active');
    url.searchParams.set('imgSize', 'medium');
    url.searchParams.set('imgType', 'photo');

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn('Google image search HTTP', res.status, await res.text().catch(() => ''));
      return null;
    }

    const data = (await res.json()) as { items?: GoogleImageItem[] };
    return pickBestImage(
      (data.items ?? []).map((item) => ({
        title: item.title,
        context: item.image?.contextLink ?? item.link,
        imageUrl: pickImageUrl(item),
      })),
      matchQuery
    );
  } catch (error) {
    console.warn('Google product image lookup failed:', error);
    return null;
  }
}

type ScoredImageCandidate = {
  title?: string;
  context?: string;
  imageUrl: string | null;
};

async function resolveViaSerper(q: string, matchQuery: string): Promise<string | null> {
  const apiKey = process.env.SERPER_API_KEY?.trim();
  if (!apiKey) return null;

  try {
    const res = await fetch('https://google.serper.dev/images', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q, num: 8 }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn('Serper image search HTTP', res.status);
      return null;
    }

    const data = (await res.json()) as {
      images?: { title?: string; link?: string; imageUrl?: string }[];
    };

    return pickBestImage(
      (data.images ?? []).map((item) => ({
        title: item.title,
        context: item.link,
        imageUrl: sanitizeProductImageUrl(item.imageUrl),
      })),
      matchQuery
    );
  } catch (error) {
    console.warn('Serper product image lookup failed:', error);
    return null;
  }
}

function pickBestImage(candidates: ScoredImageCandidate[], matchQuery: string): string | null {
  let best: { score: number; image: string } | null = null;

  for (const item of candidates) {
    if (!item.imageUrl) continue;
    const score = scoreImageItem(
      { title: item.title, link: item.context, image: { contextLink: item.context } },
      matchQuery
    );
    if (!best || score > best.score) {
      best = { score, image: item.imageUrl };
    }
  }

  if (best && best.score >= 0.2) return best.image;

  const first = candidates.map((c) => c.imageUrl).find(Boolean);
  return first ?? null;
}
