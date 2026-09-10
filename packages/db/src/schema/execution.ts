import { numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { executionEventTypeEnum } from "./enums";
import { purchaseOrders } from "./purchase-order";

export const executionEvents = pgTable("execution_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  purchaseOrderId: uuid("purchase_order_id")
    .notNull()
    .references(() => purchaseOrders.id),
  eventType: executionEventTypeEnum("event_type").notNull(),
  externalId: text("external_id").notNull(),
  qty: numeric("qty", { precision: 18, scale: 4 }),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
