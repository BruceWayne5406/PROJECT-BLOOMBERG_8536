import {
  ACK_STATUSES,
  CHANGE_ORDER_STATUSES,
  COMMIT_GRADES,
  COMMIT_STATUSES,
  CONTRACT_DOCUMENT_TYPES,
  DEMAND_TYPES,
  EXECUTION_EVENT_TYPES,
  EXCEPTION_STATUSES,
  EXCEPTION_TYPES,
  FORECAST_STATUSES,
  HORIZON_ZONES,
  INGESTION_CHANNELS,
  NEED_BY_CONVENTIONS,
  PARTY_TYPES,
  REASON_CODES,
  SITE_ROLES,
  UOMS,
  WRITEBACK_STATUSES,
} from "@scp/domain";
import { pgEnum } from "drizzle-orm/pg-core";

export const demandTypeEnum = pgEnum("demand_type", [...DEMAND_TYPES]);
export const commitGradeEnum = pgEnum("commit_grade", [...COMMIT_GRADES]);
export const needByConventionEnum = pgEnum("need_by_convention", [
  ...NEED_BY_CONVENTIONS,
]);
export const reasonCodeEnum = pgEnum("reason_code", [...REASON_CODES]);
export const horizonZoneEnum = pgEnum("horizon_zone", [...HORIZON_ZONES]);
export const forecastStatusEnum = pgEnum("forecast_status", [
  ...FORECAST_STATUSES,
]);
export const commitStatusEnum = pgEnum("commit_status", [...COMMIT_STATUSES]);
export const ackStatusEnum = pgEnum("ack_status", [...ACK_STATUSES]);
export const changeOrderStatusEnum = pgEnum("change_order_status", [
  ...CHANGE_ORDER_STATUSES,
]);
export const uomEnum = pgEnum("uom", [...UOMS]);
export const ingestionChannelEnum = pgEnum("ingestion_channel", [
  ...INGESTION_CHANNELS,
]);
export const contractDocumentTypeEnum = pgEnum("contract_document_type", [
  ...CONTRACT_DOCUMENT_TYPES,
]);
export const siteRoleEnum = pgEnum("site_role", [...SITE_ROLES]);
export const partyTypeEnum = pgEnum("party_type", [...PARTY_TYPES]);
export const executionEventTypeEnum = pgEnum("execution_event_type", [
  ...EXECUTION_EVENT_TYPES,
]);
export const exceptionTypeEnum = pgEnum("exception_type", [...EXCEPTION_TYPES]);
export const exceptionStatusEnum = pgEnum("exception_status", [
  ...EXCEPTION_STATUSES,
]);
export const writebackStatusEnum = pgEnum("writeback_status", [
  ...WRITEBACK_STATUSES,
]);
