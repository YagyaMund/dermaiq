import { PrismaClient } from '@prisma/client';

/**
 * Prisma reads `env("DATABASE_URL")` from the schema at runtime; it must be non-empty.
 * Vercel Postgres / Supabase often set `POSTGRES_PRISMA_URL` (pooled) without `DATABASE_URL`.
 * Sync those into `DATABASE_URL` / `DIRECT_URL` before the client is created.
 */
function syncDatabaseEnv(): void {
  const pooled =
    process.env.POSTGRES_PRISMA_URL?.trim() ||
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

syncDatabaseEnv();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl = process.env.DATABASE_URL?.trim() || '';

if (!databaseUrl) {
  throw new Error(
    'Missing database URL. Set DATABASE_URL or POSTGRES_PRISMA_URL in your environment (.env.local, Vercel env, etc.).',
  );
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
