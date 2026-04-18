import { PrismaClient } from '@prisma/client';

/** Read env at runtime (avoids build-time inlining missing values on some hosts). */
function env(...keys: string[]): string {
  for (const key of keys) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return '';
}

/**
 * Prisma reads `env("DATABASE_URL")` from the schema; it must be non-empty at runtime.
 * Map common Vercel / Neon / Supabase variable names onto DATABASE_URL / DIRECT_URL.
 */
function syncDatabaseEnv(): void {
  const pooled = env(
    'DATABASE_URL',
    'POSTGRES_PRISMA_URL',
    'PRISMA_DATABASE_URL',
    'POSTGRES_URL',
    'NEON_DATABASE_URL',
    'SUPABASE_DATABASE_URL',
    'SUPABASE_DB_URL',
  );

  if (pooled && !env('DATABASE_URL')) {
    process.env.DATABASE_URL = pooled;
  }

  const direct = env(
    'DIRECT_URL',
    'POSTGRES_URL_NON_POOLING',
    'DATABASE_URL_UNPOOLED',
    'NEON_DATABASE_URL_UNPOOLED',
    'SUPABASE_DATABASE_URL_UNPOOLED',
    'POSTGRES_URL',
  );

  if (direct && !env('DIRECT_URL')) {
    process.env.DIRECT_URL = direct;
  }

  const dbUrl = env('DATABASE_URL');
  if (dbUrl && !env('DIRECT_URL')) {
    process.env.DIRECT_URL = dbUrl;
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  syncDatabaseEnv();
  const databaseUrl = env('DATABASE_URL');
  if (!databaseUrl) {
    throw new Error(
      [
        'Database URL is not configured for this deployment.',
        'In Vercel: Project → Settings → Environment Variables, add DATABASE_URL (or connect Vercel Postgres / Neon so POSTGRES_URL or NEON_DATABASE_URL is set).',
        'Enable it for Production (and Preview if you use preview URLs), then Redeploy.',
      ].join(' '),
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
