import {
  date,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { demandTypeEnum, forecastStatusEnum, needByConventionEnum, uomEnum } from "./enums";
import { actors, buyers, parts, sites, suppliers } from "./identity";
import { tradingPartnerSetups } from "./trading-partner";

export const forecastLines = pgTable(
  "forecast_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    forecastId: text("forecast_id").notNull(),
    version: integer("version").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    horizonBucket: date("horizon_bucket").notNull(),
    requestedQty: numeric("requested_qty", { precision: 18, scale: 4 }).notNull(),
    requestedDate: date("requested_date").notNull(),
    demandType: demandTypeEnum("demand_type").notNull(),
    priority: integer("priority").notNull().default(100),
    program: text("program"),
    status: forecastStatusEnum("status").notNull().default("draft"),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => buyers.id),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    partId: uuid("part_id")
      .notNull()
      .references(() => parts.id),
    tradingPartnerSetupId: uuid("trading_partner_setup_id")
      .notNull()
      .references(() => tradingPartnerSetups.id),
    shipToSiteId: uuid("ship_to_site_id")
      .notNull()
      .references(() => sites.id),
    uom: uomEnum("uom").notNull(),
    needByConvention: needByConventionEnum("need_by_convention").notNull(),
    publishedBy: text("published_by").references(() => actors.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("forecast_lines_id_version_uq").on(t.forecastId, t.version)],
);
