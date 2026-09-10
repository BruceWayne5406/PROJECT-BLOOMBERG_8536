import { migrate } from "drizzle-orm/node-postgres/migrator";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createDb, createPool } from "./client";
import { loadRootEnv, repoRoot } from "./load-env";

loadRootEnv();

const dbPackage = resolve(repoRoot(), "packages/db");
const drizzleDir = resolve(dbPackage, "drizzle");
const viewsSql = readFileSync(resolve(dbPackage, "sql/views.sql"), "utf8");

const pool = createPool();
const db = createDb(pool);

await migrate(db, { migrationsFolder: drizzleDir });
await pool.query(viewsSql);
await pool.end();

console.log("Migrations and views applied.");
