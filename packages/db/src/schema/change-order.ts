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
import { changeOrderStatusEnum, partyTypeEnum, reasonCodeEnum } from "./enums";
import { actors } from "./identity";
import { purchaseOrders } from "./purchase-order";

export const changeOrders = pgTable(
  "change_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    changeOrderId: text("change_order_id").notNull(),
    version: integer("version").notNull().default(1),
    purchaseOrderId: uuid("purchase_order_id")
      .notNull()
      .references(() => purchaseOrders.id),
    proposedQty: numeric("proposed_qty", { precision: 18, scale: 4 }),
    proposedDate: date("proposed_date"),
    reasonCode: reasonCodeEnum("reason_code").notNull(),
    status: changeOrderStatusEnum("status").notNull().default("proposed"),
    initiatedByParty: partyTypeEnum("initiated_by_party").notNull(),
    initiatedBy: text("initiated_by")
      .notNull()
      .references(() => actors.id),
    buyerAcceptedAt: timestamp("buyer_accepted_at", { withTimezone: true }),
    supplierAcceptedAt: timestamp("supplier_accepted_at", { withTimezone: true }),
    msaClauseRef: text("msa_clause_ref"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("change_orders_id_version_uq").on(t.changeOrderId, t.version)],
);
