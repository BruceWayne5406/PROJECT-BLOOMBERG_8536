import { z } from "zod";
import {
  ACK_STATUSES,
  AUTH_PARTY_TYPES,
  CHANGE_ORDER_STATUSES,
  COMMIT_GRADES,
  COMMIT_STATUSES,
  CONTRACT_DOCUMENT_TYPES,
  DEMAND_TYPES,
  EXECUTION_EVENT_TYPES,
  FORECAST_STATUSES,
  HORIZON_ZONES,
  INGESTION_CHANNELS,
  NEED_BY_CONVENTIONS,
  PARTY_TYPES,
  REASON_CODES,
  SITE_ROLES,
  UOMS,
  USER_ROLES,
} from "./enums";

const qty = z.string().regex(/^-?\d+(\.\d+)?$/, "quantity must be a decimal string");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const actorSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  partyType: z.enum(PARTY_TYPES),
  partnerId: z.string().uuid().nullable(),
});

export const buyerSchema = z.object({
  partnerId: z.string().min(1),
  name: z.string().min(1),
});

export const supplierSchema = buyerSchema;

export const partSchema = z.object({
  buyerId: z.string().uuid(),
  buyerPartNumber: z.string().min(1),
  mpn: z.string().min(1),
  revision: z.string().min(1),
  maskSet: z.string().min(1).nullable(),
  porId: z.string().min(1).nullable(),
});

export const siteSchema = z.object({
  partyType: z.enum(["buyer", "supplier"]),
  partnerRowId: z.string().uuid(),
  siteCode: z.string().min(1),
  role: z.enum(SITE_ROLES),
  name: z.string().min(1),
});

export const contractRefSchema = z.object({
  tradingPartnerSetupId: z.string().uuid(),
  documentType: z.enum(CONTRACT_DOCUMENT_TYPES),
  clmDocumentId: z.string().min(1),
  clmUrl: z.string().url().nullable(),
  clauseRef: z.string().nullable(),
});

export const flexibilityBandSchema = z.object({
  weeksToNeedByMin: z.number().int().nullable(),
  weeksToNeedByMax: z.number().int().nullable(),
  buyerQtyVariancePct: z.string(),
  commitGrade: z.enum(COMMIT_GRADES),
  horizonZone: z.enum(HORIZON_ZONES),
});

export const tradingPartnerSetupSchema = z.object({
  buyerId: z.string().uuid(),
  supplierId: z.string().uuid(),
  strategicHorizonMonths: z.number().int().positive(),
  planningFenceWeeks: z.number().int().positive(),
  firmFenceWeeks: z.number().int().positive(),
  frozenFenceWeeks: z.number().int().positive(),
  responseSlaBusinessDays: z.number().int().positive(),
  needByConvention: z.enum(NEED_BY_CONVENTIONS),
  uom: z.enum(UOMS),
  incoterms: z.string().min(1),
  currency: z.string().length(3),
  channel: z.enum(INGESTION_CHANNELS),
  timezone: z.string().min(1),
});

export const uomConversionSchema = z.object({
  tradingPartnerSetupId: z.string().uuid(),
  partId: z.string().uuid().nullable(),
  fromUom: z.enum(UOMS),
  toUom: z.enum(UOMS),
  factor: z.string(),
});

const qtyInput = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => /^-?\d+(\.\d+)?$/.test(v), "quantity must be a decimal")
  .refine((v) => Number(v) > 0, "quantity must be greater than 0");

export const publishForecastSchema = z.object({
  forecastId: z
    .string()
    .regex(/^FC-[A-Z0-9-]+$/i, "forecastId must look like FC-88421")
    .optional(),
  tradingPartnerSetupId: z.string().uuid(),
  partId: z.string().uuid(),
  shipToSiteId: z.string().uuid(),
  requestedQty: qtyInput,
  requestedDate: isoDate,
  demandType: z.enum(DEMAND_TYPES),
  priority: z.coerce.number().int().positive().optional().default(100),
  program: z.string().min(1).nullable().optional(),
  asDraft: z.boolean().optional().default(false),
});

export const republishForecastSchema = z.object({
  requestedQty: qtyInput,
  requestedDate: isoDate,
  demandType: z.enum(DEMAND_TYPES),
  priority: z.coerce.number().int().positive().optional(),
  program: z.string().min(1).nullable().optional(),
  partId: z.string().uuid().optional(),
  shipToSiteId: z.string().uuid().optional(),
});

export type PublishForecastInput = z.infer<typeof publishForecastSchema>;
export type RepublishForecastInput = z.infer<typeof republishForecastSchema>;

export const forecastLineSchema = z.object({
  forecastId: z.string().min(1),
  version: z.number().int().positive(),
  publishedAt: z.string().datetime().nullable(),
  horizonBucket: isoDate,
  requestedQty: qty,
  requestedDate: isoDate,
  demandType: z.enum(DEMAND_TYPES),
  priority: z.number().int().positive(),
  program: z.string().min(1).nullable(),
  status: z.enum(FORECAST_STATUSES),
  buyerId: z.string().uuid(),
  supplierId: z.string().uuid(),
  partId: z.string().uuid(),
  tradingPartnerSetupId: z.string().uuid(),
  shipToSiteId: z.string().uuid(),
  uom: z.enum(UOMS),
  needByConvention: z.enum(NEED_BY_CONVENTIONS),
  publishedBy: z.string().min(1).nullable(),
});

export const forecastCommitSchema = z.object({
  commitId: z.string().min(1),
  parentForecastId: z.string().min(1),
  parentForecastLineId: z.string().uuid(),
  version: z.number().int().positive(),
  committedQty: qty,
  committedDate: isoDate.nullable(),
  commitGrade: z.enum(COMMIT_GRADES).nullable(),
  uncommittedQty: qty,
  reasonCode: z.enum(REASON_CODES).nullable(),
  comment: z.string().nullable(),
  committedBy: z.string().min(1),
  committedAt: z.string().datetime(),
  status: z.enum(COMMIT_STATUSES),
});

export const purchaseOrderSchema = z.object({
  poNumber: z.string().min(1),
  line: z.string().min(1),
  scheduleLine: z.string().min(1),
  sourceCommitId: z.string().min(1),
  sourceCommitVersion: z.number().int().positive(),
  firmQty: qty,
  firmDate: isoDate,
  price: qty.nullable(),
  contractRefId: z.string().uuid().nullable(),
  buyerId: z.string().uuid(),
  supplierId: z.string().uuid(),
  partId: z.string().uuid(),
});

export const poAcknowledgementSchema = z.object({
  purchaseOrderId: z.string().uuid(),
  ackStatus: z.enum(ACK_STATUSES),
  promiseQty: qty,
  promiseDate: isoDate,
  changeReason: z.enum(REASON_CODES).nullable(),
  acknowledgedBy: z.string().min(1),
});

export const changeOrderSchema = z.object({
  changeOrderId: z.string().min(1),
  purchaseOrderId: z.string().uuid(),
  proposedQty: qty.nullable(),
  proposedDate: isoDate.nullable(),
  reasonCode: z.enum(REASON_CODES),
  status: z.enum(CHANGE_ORDER_STATUSES),
  initiatedByParty: z.enum(["buyer", "supplier"]),
  initiatedBy: z.string().min(1),
  buyerAcceptedAt: z.string().datetime().nullable(),
  supplierAcceptedAt: z.string().datetime().nullable(),
  msaClauseRef: z.string().nullable(),
});

export const executionEventSchema = z.object({
  purchaseOrderId: z.string().uuid(),
  eventType: z.enum(EXECUTION_EVENT_TYPES),
  externalId: z.string().min(1),
  qty: qty.nullable(),
  occurredAt: z.string().datetime(),
});

export const auditEventSchema = z.object({
  actorId: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  action: z.string().min(1),
  reasonCode: z.enum(REASON_CODES).nullable(),
  payload: z.record(z.unknown()),
});

export const loginSchema = z.object({
  email: z.string().email("Work email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signupSchema = z.object({
  email: z.string().email("Work email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().min(2, "Name is required for the audit trail"),
  partyType: z.enum(AUTH_PARTY_TYPES),
  partnerId: z.string().uuid("Select your company"),
  role: z.enum(USER_ROLES),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;

export type ForecastLineInput = z.infer<typeof forecastLineSchema>;
export type ForecastCommitInput = z.infer<typeof forecastCommitSchema>;
export type TradingPartnerSetupInput = z.infer<typeof tradingPartnerSetupSchema>;
export type ChangeOrderInput = z.infer<typeof changeOrderSchema>;

/**
 * After an EDI/Excel/portal parser produces rows, every channel uses this shape.
 * EDI 850/855/860 must not special-case past this boundary.
 */
export type IngestionRow =
  | { kind: "forecast_line"; payload: ForecastLineInput }
  | { kind: "forecast_commit"; payload: ForecastCommitInput };

export interface IngestionPort {
  ingest(rows: IngestionRow[], actorId: string): Promise<void>;
}
