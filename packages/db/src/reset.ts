import { createPool } from "./client";
import { loadRootEnv } from "./load-env";

loadRootEnv();

const pool = createPool();
await pool.query("DROP SCHEMA IF EXISTS public CASCADE");
await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
await pool.query("CREATE SCHEMA public");
await pool.end();

console.log("Dropped public + drizzle schemas.");
