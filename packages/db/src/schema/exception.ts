import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { exceptionStatusEnum, exceptionTypeEnum, reasonCodeEnum } from "./enums";
import { actors } from "./identity";
import { forecastLines } from "./forecast";
import { tradingPartnerSetups } from "./trading-partner";

export const exceptions = pgTable(
  "exceptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    exceptionType: exceptionTypeEnum("exception_type").notNull(),
    status: exceptionStatusEnum("status").notNull().default("open"),
    forecastId: text("forecast_id").notNull(),
    forecastLineId: uuid("forecast_line_id")
      .notNull()
      .references(() => forecastLines.id),
    forecastVersion: integer("forecast_version").notNull(),
    commitId: text("commit_id"),
    tradingPartnerSetupId: uuid("trading_partner_setup_id")
      .notNull()
      .references(() => tradingPartnerSetups.id),
    slaBusinessDays: integer("sla_business_days"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    acknowledgedBy: text("acknowledged_by").references(() => actors.id),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: text("resolved_by").references(() => actors.id),
    reasonCode: reasonCodeEnum("reason_code"),
    summary: text("summary").notNull(),
    payload: jsonb("payload").notNull().$type<Record<string, unknown>>().default({}),
  },
);
