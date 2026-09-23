import { DOMAIN_EVENTS } from "@scp/event-contracts";
import { createDb, createPool } from "./client";
import { loadRootEnv } from "./load-env";
import {
  actors,
  auditEvents,
  buyers,
  contractRefs,
  domainEvents,
  flexibilityBands,
  forecastCommits,
  forecastLines,
  parts,
  sites,
  suppliers,
  tradingPartnerSetups,
} from "./schema";

loadRootEnv();

const IDS = {
  buyer: "11111111-1111-4111-8111-111111111111",
  supplier: "22222222-2222-4222-8222-222222222222",
  part: "33333333-3333-4333-8333-333333333333",
  tpa: "44444444-4444-4444-8444-444444444444",
  shipTo: "55555555-5555-4555-8555-555555555555",
  shipFrom: "66666666-6666-4666-8666-666666666666",
  forecastLine: "88888888-8888-4888-8888-888888888888",
  cra: "77777777-7777-4777-8777-777777777777",
} as const;

const ACTORS = {
  buyerPlanner: "buyer.planner.seed",
  supplierPlanner: "supplier.planner.seed",
  system: "system.scp",
} as const;

const pool = createPool();
const db = createDb(pool);

const existing = await pool.query(
  "select 1 from forecast_lines where forecast_id = $1 and version = 1",
  ["FC-88421"],
);
if (existing.rowCount && existing.rowCount > 0) {
  console.log("Seed already present (FC-88421 v1). Skipping.");
  await pool.end();
  process.exit(0);
}

await db.insert(buyers).values({
  id: IDS.buyer,
  partnerId: "DUNS-00-111-0001",
  name: "Northstar Semiconductor (buyer)",
});

await db.insert(suppliers).values({
  id: IDS.supplier,
  partnerId: "DUNS-00-222-0002",
  name: "Pacific Foundry (qualified supplier)",
});

await db.insert(actors).values([
  {
    id: ACTORS.buyerPlanner,
    displayName: "Buyer planner (seed)",
    partyType: "buyer",
    partnerId: IDS.buyer,
  },
  {
    id: ACTORS.supplierPlanner,
    displayName: "Supplier planner (seed)",
    partyType: "supplier",
    partnerId: IDS.supplier,
  },
  {
    id: ACTORS.system,
    displayName: "SCP system",
    partyType: "system",
    partnerId: null,
  },
]);

await db.insert(parts).values({
  id: IDS.part,
  buyerId: IDS.buyer,
  buyerPartNumber: "NS-88421",
  mpn: "PF-88421-A",
  revision: "C",
  maskSet: "MS-88421-C",
  porId: "POR-88421-C",
});

await db.insert(sites).values([
  {
    id: IDS.shipTo,
    partyType: "buyer",
    buyerId: IDS.buyer,
    siteCode: "NS-AUSTIN",
    role: "ship_to",
    name: "Northstar Austin dock",
  },
  {
    id: IDS.shipFrom,
    partyType: "supplier",
    supplierId: IDS.supplier,
    siteCode: "PF-FAB3",
    role: "ship_from",
    name: "Pacific Foundry Fab 3",
  },
]);

await db.insert(tradingPartnerSetups).values({
  id: IDS.tpa,
  buyerId: IDS.buyer,
  supplierId: IDS.supplier,
  strategicHorizonMonths: 36,
  planningFenceWeeks: 52,
  firmFenceWeeks: 13,
  frozenFenceWeeks: 6,
  responseSlaBusinessDays: 5,
  needByConvention: "dock_date",
  uom: "units",
  incoterms: "DAP",
  currency: "USD",
  channel: "portal",
  timezone: "America/Chicago",
});

await db.insert(flexibilityBands).values([
  {
    tradingPartnerSetupId: IDS.tpa,
    weeksToNeedByMin: 13,
    weeksToNeedByMax: null,
    buyerQtyVariancePct: "30.00",
    commitGrade: "planning",
    horizonZone: "planning",
  },
  {
    tradingPartnerSetupId: IDS.tpa,
    weeksToNeedByMin: 6,
    weeksToNeedByMax: 12,
    buyerQtyVariancePct: "15.00",
    commitGrade: "firming",
    horizonZone: "firm",
  },
  {
    tradingPartnerSetupId: IDS.tpa,
    weeksToNeedByMin: 0,
    weeksToNeedByMax: 5,
    buyerQtyVariancePct: "5.00",
    commitGrade: "frozen",
    horizonZone: "frozen",
  },
]);

await db.insert(contractRefs).values([
  {
    tradingPartnerSetupId: IDS.tpa,
    documentType: "nda",
    clmDocumentId: "CLM-NDA-1001",
    clmUrl: "https://clm.example.com/docs/CLM-NDA-1001",
    clauseRef: null,
  },
  {
    tradingPartnerSetupId: IDS.tpa,
    documentType: "msa",
    clmDocumentId: "CLM-MSA-2044",
    clmUrl: "https://clm.example.com/docs/CLM-MSA-2044",
    clauseRef: "MSA §12 cancellation / reschedule",
  },
  {
    id: IDS.cra,
    tradingPartnerSetupId: IDS.tpa,
    documentType: "cra",
    clmDocumentId: "CLM-CRA-3310",
    clmUrl: "https://clm.example.com/docs/CLM-CRA-3310",
    clauseRef: "CRA exhibit B capacity reservation",
  },
  {
    tradingPartnerSetupId: IDS.tpa,
    documentType: "qaa",
    clmDocumentId: "CLM-QAA-019",
    clmUrl: "https://clm.example.com/docs/CLM-QAA-019",
    clauseRef: null,
  },
  {
    tradingPartnerSetupId: IDS.tpa,
    documentType: "tpa",
    clmDocumentId: "CLM-TPA-88421",
    clmUrl: "https://clm.example.com/docs/CLM-TPA-88421",
    clauseRef: null,
  },
]);

const publishedAt = new Date("2026-09-08T14:00:00.000Z");
const committedAt = new Date("2026-09-10T16:00:00.000Z");

await db.insert(forecastLines).values({
  id: IDS.forecastLine,
  forecastId: "FC-88421",
  version: 1,
  publishedAt,
  horizonBucket: "2026-12-14",
  requestedQty: "100000.0000",
  requestedDate: "2026-12-15",
  demandType: "base",
  priority: 10,
  program: "AURORA",
  status: "published",
  buyerId: IDS.buyer,
  supplierId: IDS.supplier,
  partId: IDS.part,
  tradingPartnerSetupId: IDS.tpa,
  shipToSiteId: IDS.shipTo,
  uom: "units",
  needByConvention: "dock_date",
  publishedBy: ACTORS.buyerPlanner,
});

await db.insert(forecastCommits).values([
  {
    commitId: "CM-01",
    parentForecastId: "FC-88421",
    parentForecastLineId: IDS.forecastLine,
    version: 1,
    committedQty: "40000.0000",
    committedDate: "2026-12-08",
    commitGrade: "firming",
    uncommittedQty: "10000.0000",
    reasonCode: null,
    comment: null,
    committedBy: ACTORS.supplierPlanner,
    committedAt,
    status: "offered",
  },
  {
    commitId: "CM-02",
    parentForecastId: "FC-88421",
    parentForecastLineId: IDS.forecastLine,
    version: 1,
    committedQty: "35000.0000",
    committedDate: "2026-12-15",
    commitGrade: "firming",
    uncommittedQty: "10000.0000",
    reasonCode: null,
    comment: null,
    committedBy: ACTORS.supplierPlanner,
    committedAt,
    status: "offered",
  },
  {
    commitId: "CM-03",
    parentForecastId: "FC-88421",
    parentForecastLineId: IDS.forecastLine,
    version: 1,
    committedQty: "15000.0000",
    committedDate: "2027-01-12",
    commitGrade: "planning",
    uncommittedQty: "10000.0000",
    reasonCode: "PACK",
    comment: "Backend pack slot after the requested dock date. Planning-grade only.",
    committedBy: ACTORS.supplierPlanner,
    committedAt,
    status: "offered",
  },
  {
    commitId: "CM-GAP",
    parentForecastId: "FC-88421",
    parentForecastLineId: IDS.forecastLine,
    version: 1,
    committedQty: "0.0000",
    committedDate: null,
    commitGrade: null,
    uncommittedQty: "10000.0000",
    reasonCode: "CAPACITY",
    comment: "Explicit uncommitted remainder — not an implied yes.",
    committedBy: ACTORS.supplierPlanner,
    committedAt,
    status: "offered",
  },
]);

await db.insert(domainEvents).values([
  {
    eventName: DOMAIN_EVENTS.ForecastPublished,
    aggregateType: "forecast_line",
    aggregateId: "FC-88421",
    aggregateVersion: "1",
    actorId: ACTORS.buyerPlanner,
    payload: {
      forecastId: "FC-88421",
      version: 1,
      requestedQty: "100000.0000",
      requestedDate: "2026-12-15",
      demandType: "base",
    },
  },
  {
    eventName: DOMAIN_EVENTS.CommitOffered,
    aggregateType: "forecast_commit",
    aggregateId: "CM-01",
    aggregateVersion: "1",
    actorId: ACTORS.supplierPlanner,
    payload: {
      commitId: "CM-01",
      version: 1,
      parentForecastId: "FC-88421",
      committedQty: "40000.0000",
      committedDate: "2026-12-08",
      commitGrade: "firming",
      reasonCode: null,
    },
  },
  {
    eventName: DOMAIN_EVENTS.CommitOffered,
    aggregateType: "forecast_commit",
    aggregateId: "CM-02",
    aggregateVersion: "1",
    actorId: ACTORS.supplierPlanner,
    payload: {
      commitId: "CM-02",
      version: 1,
      parentForecastId: "FC-88421",
      committedQty: "35000.0000",
      committedDate: "2026-12-15",
      commitGrade: "firming",
      reasonCode: null,
    },
  },
  {
    eventName: DOMAIN_EVENTS.CommitOffered,
    aggregateType: "forecast_commit",
    aggregateId: "CM-03",
    aggregateVersion: "1",
    actorId: ACTORS.supplierPlanner,
    payload: {
      commitId: "CM-03",
      version: 1,
      parentForecastId: "FC-88421",
      committedQty: "15000.0000",
      committedDate: "2027-01-12",
      commitGrade: "planning",
      reasonCode: "PACK",
    },
  },
  {
    eventName: DOMAIN_EVENTS.CommitOffered,
    aggregateType: "forecast_commit",
    aggregateId: "CM-GAP",
    aggregateVersion: "1",
    actorId: ACTORS.supplierPlanner,
    payload: {
      commitId: "CM-GAP",
      version: 1,
      parentForecastId: "FC-88421",
      committedQty: "0.0000",
      committedDate: null,
      commitGrade: null,
      reasonCode: "CAPACITY",
    },
  },
]);

await db.insert(auditEvents).values([
  {
    actorId: ACTORS.buyerPlanner,
    entityType: "forecast_line",
    entityId: "FC-88421:v1",
    action: "publish",
    reasonCode: null,
    payload: { forecastId: "FC-88421", version: 1 },
  },
  {
    actorId: ACTORS.supplierPlanner,
    entityType: "forecast_commit",
    entityId: "CM-01:v1",
    action: "offer_split",
    reasonCode: null,
    payload: { splits: ["CM-01", "CM-02", "CM-03", "CM-GAP"] },
  },
]);

const metrics = await pool.query(
  `select forecast_id, version, requested_qty, committed_qty, gap_qty, late_flag, late_qty, gap_reason_code
   from forecast_line_metrics
   where forecast_id = 'FC-88421' and version = 1`,
);

console.log("Seeded FC-88421 worked example.");
console.log(metrics.rows[0]);

await pool.end();
