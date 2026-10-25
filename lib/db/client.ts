import { Pool } from "pg";

// Reuse one pool across Next.js hot reloads in dev (otherwise every reload opens new connections).
const g = globalThis as unknown as { __pgPool?: Pool };

export const pool = g.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") g.__pgPool = pool;