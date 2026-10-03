import { z } from "zod";
import { COMMIT_GRADES, DEMAND_TYPES, REASON_CODES } from "@scp/domain";

export const DOMAIN_EVENTS = {
  ForecastPublished: "forecast.published",
  ForecastSuperseded: "forecast.superseded",
  CommitOffered: "commit.offered",
  CommitAccepted: "commit.accepted",
  CommitRejected: "commit.rejected",
  CommitSuperseded: "commit.superseded",
  DecommitFiled: "commit.decommit_filed",
  SlaBreached: "exception.sla_breached",
  PoConverted: "po.converted_from_commit",
  PoAcknowledged: "po.acknowledged",
  ChangeOrderProposed: "change_order.proposed",
  ChangeOrderAccepted: "change_order.accepted",
  ErpWritebackRequested: "erp.writeback_requested",
  ErpWritebackSucceeded: "erp.writeback_succeeded",
  ErpWritebackFailed: "erp.writeback_failed",
} as const;

export type DomainEventName = (typeof DOMAIN_EVENTS)[keyof typeof DOMAIN_EVENTS];

export const forecastPublishedPayload = z.object({
  forecastId: z.string(),
  version: z.number().int(),
  requestedQty: z.string(),
  requestedDate: z.string(),
  demandType: z.enum(DEMAND_TYPES),
});

export const commitOfferedPayload = z.object({
  commitId: z.string(),
  version: z.number().int(),
  parentForecastId: z.string(),
  committedQty: z.string(),
  committedDate: z.string().nullable(),
  commitGrade: z.enum(COMMIT_GRADES).nullable(),
  reasonCode: z.enum(REASON_CODES).nullable(),
});

export type ForecastPublishedPayload = z.infer<typeof forecastPublishedPayload>;
export type CommitOfferedPayload = z.infer<typeof commitOfferedPayload>;
