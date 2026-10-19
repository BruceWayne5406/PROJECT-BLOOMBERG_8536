import { boolean, date, integer, interval, numeric, pgView, text, uuid } from "drizzle-orm/pg-core";
import {
  commitGradeEnum,
  commitStatusEnum,
  demandTypeEnum,
  forecastStatusEnum,
  needByConventionEnum,
  reasonCodeEnum,
  uomEnum,
} from "./enums";

/** Current published forecast — never a superseded row. */
export const vForecastLinesCurrent = pgView("v_forecast_lines_current", {
  id: uuid("id").notNull(),
  forecastId: text("forecast_id").notNull(),
  version: integer("version").notNull(),
  publishedAt: text("published_at"),
  horizonBucket: date("horizon_bucket").notNull(),
  requestedQty: numeric("requested_qty", { precision: 18, scale: 4 }).notNull(),
  requestedDate: date("requested_date").notNull(),
  demandType: demandTypeEnum("demand_type").notNull(),
  priority: integer("priority").notNull(),
  program: text("program"),
  status: forecastStatusEnum("status").notNull(),
  buyerId: uuid("buyer_id").notNull(),
  supplierId: uuid("supplier_id").notNull(),
  partId: uuid("part_id").notNull(),
  tradingPartnerSetupId: uuid("trading_partner_setup_id").notNull(),
  shipToSiteId: uuid("ship_to_site_id").notNull(),
  uom: uomEnum("uom").notNull(),
  needByConvention: needByConventionEnum("need_by_convention").notNull(),
  publishedBy: text("published_by"),
}).existing();

export const vForecastCommitsCurrent = pgView("v_forecast_commits_current", {
  id: uuid("id").notNull(),
  commitId: text("commit_id").notNull(),
  parentForecastId: text("parent_forecast_id").notNull(),
  parentForecastLineId: uuid("parent_forecast_line_id").notNull(),
  version: integer("version").notNull(),
  committedQty: numeric("committed_qty", { precision: 18, scale: 4 }).notNull(),
  committedDate: date("committed_date"),
  commitGrade: commitGradeEnum("commit_grade"),
  uncommittedQty: numeric("uncommitted_qty", { precision: 18, scale: 4 }).notNull(),
  reasonCode: reasonCodeEnum("reason_code"),
  comment: text("comment"),
  committedBy: text("committed_by").notNull(),
  committedAt: text("committed_at").notNull(),
  status: commitStatusEnum("status").notNull(),
}).existing();

/** Derived; not writable. gap_qty = requested − sum(positive offered/accepted commits). */
export const forecastLineMetrics = pgView("forecast_line_metrics", {
  forecastLineId: uuid("forecast_line_id").notNull(),
  forecastId: text("forecast_id").notNull(),
  version: integer("version").notNull(),
  status: forecastStatusEnum("status").notNull(),
  requestedQty: numeric("requested_qty", { precision: 18, scale: 4 }).notNull(),
  committedQty: numeric("committed_qty", { precision: 18, scale: 4 }).notNull(),
  gapQty: numeric("gap_qty", { precision: 18, scale: 4 }).notNull(),
  lateFlag: boolean("late_flag").notNull(),
  lateQty: numeric("late_qty", { precision: 18, scale: 4 }).notNull(),
  commitAge: interval("commit_age"),
  versionDeltaQty: numeric("version_delta_qty", { precision: 18, scale: 4 }),
  versionDeltaDateDays: integer("version_delta_date_days"),
  gapReasonCode: text("gap_reason_code"),
}).existing();

/** OTIF is measured against promise_date, never the original request date. */
export const otifMetrics = pgView("otif_metrics", {
  purchaseOrderId: uuid("purchase_order_id").notNull(),
  poNumber: text("po_number").notNull(),
  line: text("line").notNull(),
  scheduleLine: text("schedule_line").notNull(),
  promiseDate: date("promise_date"),
  promiseQty: numeric("promise_qty", { precision: 18, scale: 4 }),
  receiptDate: date("receipt_date"),
  receivedQty: numeric("received_qty", { precision: 18, scale: 4 }),
  otif: boolean("otif"),
}).existing();
