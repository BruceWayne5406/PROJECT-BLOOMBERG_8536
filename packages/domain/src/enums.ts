export const DEMAND_TYPES = ["base", "upside", "npi", "last_time_buy"] as const;
export type DemandType = (typeof DEMAND_TYPES)[number];

export const COMMIT_GRADES = ["planning", "firming", "frozen"] as const;
export type CommitGrade = (typeof COMMIT_GRADES)[number];

export const NEED_BY_CONVENTIONS = [
  "dock_date",
  "ship_date",
  "wafer_start_week",
] as const;
export type NeedByConvention = (typeof NEED_BY_CONVENTIONS)[number];

export const REASON_CODES = [
  "CAPACITY",
  "MATERIAL",
  "YIELD",
  "PACK",
  "OTHER",
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

export const HORIZON_ZONES = [
  "strategic",
  "planning",
  "firm",
  "frozen",
] as const;
export type HorizonZone = (typeof HORIZON_ZONES)[number];

export const FORECAST_STATUSES = ["draft", "published", "superseded"] as const;
export type ForecastStatus = (typeof FORECAST_STATUSES)[number];

export const COMMIT_STATUSES = [
  "offered",
  "accepted",
  "rejected",
  "superseded",
] as const;
export type CommitStatus = (typeof COMMIT_STATUSES)[number];

export const ACK_STATUSES = [
  "accepted",
  "split",
  "rejected",
  "date_change",
] as const;
export type AckStatus = (typeof ACK_STATUSES)[number];

export const CHANGE_ORDER_STATUSES = [
  "proposed",
  "accepted",
  "rejected",
  "superseded",
] as const;
export type ChangeOrderStatus = (typeof CHANGE_ORDER_STATUSES)[number];

export const UOMS = ["units", "wafers", "die"] as const;
export type Uom = (typeof UOMS)[number];

export const INGESTION_CHANNELS = ["portal", "excel", "edi"] as const;
export type IngestionChannel = (typeof INGESTION_CHANNELS)[number];

export const CONTRACT_DOCUMENT_TYPES = [
  "nda",
  "msa",
  "cra",
  "qaa",
  "tpa",
] as const;
export type ContractDocumentType = (typeof CONTRACT_DOCUMENT_TYPES)[number];

export const SITE_ROLES = ["ship_to", "ship_from"] as const;
export type SiteRole = (typeof SITE_ROLES)[number];

export const PARTY_TYPES = ["buyer", "supplier", "system"] as const;
export type PartyType = (typeof PARTY_TYPES)[number];

export const AUTH_PARTY_TYPES = ["buyer", "supplier"] as const;
export type AuthPartyType = (typeof AUTH_PARTY_TYPES)[number];

export const USER_ROLES = ["planner", "procurement"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const EXECUTION_EVENT_TYPES = ["asn", "receipt", "invoice"] as const;
export type ExecutionEventType = (typeof EXECUTION_EVENT_TYPES)[number];

export const EXCEPTION_TYPES = ["sla_silence", "gap", "late"] as const;
export type ExceptionType = (typeof EXCEPTION_TYPES)[number];

export const EXCEPTION_STATUSES = ["open", "acknowledged", "resolved"] as const;
export type ExceptionStatus = (typeof EXCEPTION_STATUSES)[number];

export const WRITEBACK_STATUSES = ["pending", "succeeded", "failed"] as const;
export type WritebackStatus = (typeof WRITEBACK_STATUSES)[number];
