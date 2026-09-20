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
import { ackStatusEnum, reasonCodeEnum } from "./enums";
import { actors, buyers, parts, suppliers } from "./identity";
import { contractRefs } from "./trading-partner";

export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    poNumber: text("po_number").notNull(),
    line: text("line").notNull(),
    scheduleLine: text("schedule_line").notNull(),
    sourceCommitId: text("source_commit_id").notNull(),
    sourceCommitVersion: integer("source_commit_version").notNull(),
    firmQty: numeric("firm_qty", { precision: 18, scale: 4 }).notNull(),
    firmDate: date("firm_date").notNull(),
    price: numeric("price", { precision: 18, scale: 6 }),
    contractRefId: uuid("contract_ref_id").references(() => contractRefs.id),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => buyers.id),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    partId: uuid("part_id")
      .notNull()
      .references(() => parts.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by")
      .notNull()
      .references(() => actors.id),
  },
  (t) => [
    unique("po_number_line_schedule_uq").on(t.poNumber, t.line, t.scheduleLine),
  ],
);

export const poAcknowledgements = pgTable("po_acknowledgements", {
  id: uuid("id").primaryKey().defaultRandom(),
  purchaseOrderId: uuid("purchase_order_id")
    .notNull()
    .references(() => purchaseOrders.id),
  ackStatus: ackStatusEnum("ack_status").notNull(),
  promiseQty: numeric("promise_qty", { precision: 18, scale: 4 }).notNull(),
  promiseDate: date("promise_date").notNull(),
  changeReason: reasonCodeEnum("change_reason"),
  acknowledgedBy: text("acknowledged_by")
    .notNull()
    .references(() => actors.id),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
