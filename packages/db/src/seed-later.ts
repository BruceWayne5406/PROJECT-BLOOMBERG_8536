import { createDb, createPool } from "./client";
import { loadRootEnv } from "./load-env";
import { forecastLines } from "./schema";

loadRootEnv();

const IDS = {
  buyer: "11111111-1111-4111-8111-111111111111",
  supplier: "22222222-2222-4222-8222-222222222222",
  part: "33333333-3333-4333-8333-333333333333",
  tpa: "44444444-4444-4444-8444-444444444444",
  shipTo: "55555555-5555-4555-8555-555555555555",
} as const;

const pool = createPool();
const db = createDb(pool);

const existing = await pool.query(
  "select 1 from forecast_lines where forecast_id = $1",
  ["FC-SLA-DEMO"],
);
if (existing.rowCount && existing.rowCount > 0) {
  console.log("FC-SLA-DEMO already present. Skipping.");
  await pool.end();
  process.exit(0);
}

await db.insert(forecastLines).values({
  forecastId: "FC-SLA-DEMO",
  version: 1,
  publishedAt: new Date("2026-08-20T14:00:00.000Z"),
  horizonBucket: "2027-05-31",
  requestedQty: "50000.0000",
  requestedDate: "2027-06-01",
  demandType: "base",
  priority: 20,
  program: "SLA",
  status: "published",
  buyerId: IDS.buyer,
  supplierId: IDS.supplier,
  partId: IDS.part,
  tradingPartnerSetupId: IDS.tpa,
  shipToSiteId: IDS.shipTo,
  uom: "units",
  needByConvention: "dock_date",
  publishedBy: "buyer.planner.seed",
});

console.log("Seeded FC-SLA-DEMO (published 20 Aug 2026, no commit — SLA silence).");
await pool.end();
