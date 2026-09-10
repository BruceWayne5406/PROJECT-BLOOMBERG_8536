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
import { commitGradeEnum, commitStatusEnum, reasonCodeEnum } from "./enums";
import { actors } from "./identity";
import { forecastLines } from "./forecast";

export const forecastCommits = pgTable(
  "forecast_commits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    commitId: text("commit_id").notNull(),
    parentForecastId: text("parent_forecast_id").notNull(),
    parentForecastLineId: uuid("parent_forecast_line_id")
      .notNull()
      .references(() => forecastLines.id),
    version: integer("version").notNull(),
    committedQty: numeric("committed_qty", { precision: 18, scale: 4 }).notNull(),
    committedDate: date("committed_date"),
    commitGrade: commitGradeEnum("commit_grade"),
    uncommittedQty: numeric("uncommitted_qty", { precision: 18, scale: 4 }).notNull(),
    reasonCode: reasonCodeEnum("reason_code"),
    comment: text("comment"),
    committedBy: text("committed_by")
      .notNull()
      .references(() => actors.id),
    committedAt: timestamp("committed_at", { withTimezone: true }).notNull(),
    status: commitStatusEnum("status").notNull().default("offered"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("forecast_commits_id_version_uq").on(t.commitId, t.version)],
);
