import { PrismaClient } from '@prisma/client';

/**
 * Prisma reads `env("DATABASE_URL")` from the schema at runtime; it must be non-empty.
 * Vercel Postgres / Supabase often set `POSTGRES_PRISMA_URL` (pooled) without `DATABASE_URL`.
 * Sync those into `DATABASE_URL` / `DIRECT_URL` before the client is created.
 */
function syncDatabaseEnv(): void {
  const pooled =
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    process.env.PRISMA_DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    '';

  if (pooled && !process.env.DATABASE_URL?.trim()) {
    process.env.DATABASE_URL = pooled;
  }

  const direct =
    process.env.DIRECT_URL?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    '';

  if (direct && !process.env.DIRECT_URL?.trim()) {
    process.env.DIRECT_URL = direct;
  }

  if (process.env.DATABASE_URL?.trim() && !process.env.DIRECT_URL?.trim()) {
    process.env.DIRECT_URL = process.env.DATABASE_URL;
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  syncDatabaseEnv();
  const databaseUrl = process.env.DATABASE_URL?.trim() || '';
  if (!databaseUrl) {
    throw new Error(
      'Missing database URL. In Vercel → Project → Settings → Environment Variables, set one of: DATABASE_URL, POSTGRES_URL, or POSTGRES_PRISMA_URL (from Vercel Postgres or your provider). Redeploy after saving.',
    );
  }
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
}

/**
 * Lazy client so importing this module during `next build` does not require DB env
 * (Vercel builds may omit secrets until runtime unless copied to Build env).
 */
function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getPrisma(), prop, receiver);
  },
}) as PrismaClient;
