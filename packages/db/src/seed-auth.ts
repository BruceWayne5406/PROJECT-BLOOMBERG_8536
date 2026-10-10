import { hash } from "bcryptjs";
import { createDb, createPool } from "./client";
import { loadRootEnv } from "./load-env";
import { actors, users } from "./schema";
import { eq } from "drizzle-orm";

loadRootEnv();

const DEMO = [
  {
    email: "planner@northstar.example",
    password: "Northstar2026!",
    actorId: "buyer.planner.seed",
    role: "planner" as const,
  },
  {
    email: "planner@pacific.example",
    password: "Pacific2026!",
    actorId: "supplier.planner.seed",
    role: "planner" as const,
  },
];

const pool = createPool();
const db = createDb(pool);

for (const account of DEMO) {
  const [actor] = await db.select().from(actors).where(eq(actors.id, account.actorId));
  if (!actor) {
    console.error(`Missing actor ${account.actorId}; run the main seed first.`);
    await pool.end();
    process.exit(1);
  }
  const [existing] = await db.select().from(users).where(eq(users.email, account.email));
  if (existing) {
    console.log(`Auth user already present: ${account.email}`);
    continue;
  }
  await db.insert(users).values({
    email: account.email,
    passwordHash: await hash(account.password, 10),
    actorId: account.actorId,
    role: account.role,
  });
  console.log(`Seeded login ${account.email}`);
}

await pool.end();
