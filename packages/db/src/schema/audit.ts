import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { reasonCodeEnum } from "./enums";
import { actors } from "./identity";

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: text("actor_id")
    .notNull()
    .references(() => actors.id),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  reasonCode: reasonCodeEnum("reason_code"),
  payload: jsonb("payload").notNull().$type<Record<string, unknown>>(),
});

export const domainEvents = pgTable("domain_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventName: text("event_name").notNull(),
  aggregateType: text("aggregate_type").notNull(),
  aggregateId: text("aggregate_id").notNull(),
  aggregateVersion: text("aggregate_version").notNull(),
  actorId: text("actor_id")
    .notNull()
    .references(() => actors.id),
  payload: jsonb("payload").notNull().$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
