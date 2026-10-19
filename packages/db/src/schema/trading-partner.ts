import {
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { buyers, parts, suppliers } from "./identity";
import {
  commitGradeEnum,
  contractDocumentTypeEnum,
  horizonZoneEnum,
  ingestionChannelEnum,
  needByConventionEnum,
  uomEnum,
} from "./enums";

export const tradingPartnerSetups = pgTable(
  "trading_partner_setups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => buyers.id),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    strategicHorizonMonths: integer("strategic_horizon_months").notNull(),
    planningFenceWeeks: integer("planning_fence_weeks").notNull(),
    firmFenceWeeks: integer("firm_fence_weeks").notNull(),
    frozenFenceWeeks: integer("frozen_fence_weeks").notNull(),
    responseSlaBusinessDays: integer("response_sla_business_days").notNull(),
    needByConvention: needByConventionEnum("need_by_convention").notNull(),
    uom: uomEnum("uom").notNull(),
    incoterms: text("incoterms").notNull(),
    currency: text("currency").notNull(),
    channel: ingestionChannelEnum("channel").notNull(),
    timezone: text("timezone").notNull().default("America/New_York"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("tpa_buyer_supplier_uq").on(t.buyerId, t.supplierId)],
);

export const flexibilityBands = pgTable("flexibility_bands", {
  id: uuid("id").primaryKey().defaultRandom(),
  tradingPartnerSetupId: uuid("trading_partner_setup_id")
    .notNull()
    .references(() => tradingPartnerSetups.id),
  weeksToNeedByMin: integer("weeks_to_need_by_min"),
  weeksToNeedByMax: integer("weeks_to_need_by_max"),
  buyerQtyVariancePct: numeric("buyer_qty_variance_pct", {
    precision: 6,
    scale: 2,
  }).notNull(),
  commitGrade: commitGradeEnum("commit_grade").notNull(),
  horizonZone: horizonZoneEnum("horizon_zone").notNull(),
});

export const contractRefs = pgTable("contract_refs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tradingPartnerSetupId: uuid("trading_partner_setup_id")
    .notNull()
    .references(() => tradingPartnerSetups.id),
  documentType: contractDocumentTypeEnum("document_type").notNull(),
  clmDocumentId: text("clm_document_id").notNull(),
  clmUrl: text("clm_url"),
  clauseRef: text("clause_ref"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const uomConversions = pgTable(
  "uom_conversions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tradingPartnerSetupId: uuid("trading_partner_setup_id")
      .notNull()
      .references(() => tradingPartnerSetups.id),
    partId: uuid("part_id").references(() => parts.id),
    fromUom: uomEnum("from_uom").notNull(),
    toUom: uomEnum("to_uom").notNull(),
    factor: numeric("factor", { precision: 18, scale: 8 }).notNull(),
  },
  (t) => [
    unique("uom_conv_tpa_part_from_to_uq").on(
      t.tradingPartnerSetupId,
      t.partId,
      t.fromUom,
      t.toUom,
    ),
  ],
);
