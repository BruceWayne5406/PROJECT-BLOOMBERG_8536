import { pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { partyTypeEnum, siteRoleEnum } from "./enums";

export const userRoleEnum = pgEnum("user_role", ["planner", "procurement"]);

export const actors = pgTable("actors", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  partyType: partyTypeEnum("party_type").notNull(),
  partnerId: uuid("partner_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const buyers = pgTable("buyers", {
  id: uuid("id").primaryKey().defaultRandom(),
  partnerId: text("partner_id").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  partnerId: text("partner_id").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const parts = pgTable(
  "parts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => buyers.id),
    buyerPartNumber: text("buyer_part_number").notNull(),
    mpn: text("mpn").notNull(),
    revision: text("revision").notNull(),
    maskSet: text("mask_set"),
    porId: text("por_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("parts_buyer_pn_rev_uq").on(t.buyerId, t.buyerPartNumber, t.revision)],
);

export const sites = pgTable(
  "sites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partyType: partyTypeEnum("party_type").notNull(),
    buyerId: uuid("buyer_id").references(() => buyers.id),
    supplierId: uuid("supplier_id").references(() => suppliers.id),
    siteCode: text("site_code").notNull(),
    role: siteRoleEnum("role").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("sites_party_code_role_uq").on(t.siteCode, t.role, t.partyType)],
);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  actorId: text("actor_id")
    .notNull()
    .references(() => actors.id),
  role: userRoleEnum("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
