import { Pool } from "pg";
import { getEnv } from "./env";

let pool: Pool | null | undefined;

export function getDbPool(): Pool | null {
  if (pool !== undefined) return pool;
  const { DATABASE_URL } = getEnv();
  pool = DATABASE_URL ? new Pool({ connectionString: DATABASE_URL }) : null;
  return pool;
}
