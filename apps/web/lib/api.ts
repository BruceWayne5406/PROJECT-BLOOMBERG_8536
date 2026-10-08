export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/backend${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  });
  const body = (await res.json().catch(() => ({}))) as {
    message?: string | string[];
  };
  if (!res.ok) {
    const message = Array.isArray(body.message)
      ? body.message.join(", ")
      : (body.message ?? res.statusText);
    throw new ApiError(message, res.status);
  }
  return body as T;
}

export type ForecastRecord = {
  id: string;
  forecastId: string;
  version: number;
  status: "draft" | "published" | "superseded";
  publishedAt: string | null;
  publishedBy: string | null;
  horizonBucket: string;
  requestedQty: string;
  requestedDate: string;
  demandType: "base" | "upside" | "npi" | "last_time_buy";
  priority: number;
  program: string | null;
  uom: string;
  needByConvention: string;
  tradingPartnerSetupId: string;
  buyerName: string | null;
  buyerPartnerId: string | null;
  supplierName: string | null;
  supplierPartnerId: string | null;
  buyerPartNumber: string | null;
  mpn: string | null;
  revision: string | null;
  maskSet: string | null;
  porId: string | null;
  shipToSiteCode: string | null;
  shipToName: string | null;
  versionDeltaQty: string | null;
  versionDeltaDateDays: number | null;
};

export type ForecastDetail = {
  current: ForecastRecord;
  versions: ForecastRecord[];
  diffs: Array<{
    fromVersion: number;
    toVersion: number;
    fields: Array<{
      field: string;
      from: string | null;
      to: string | null;
      changed: boolean;
    }>;
  }>;
};

export type TradingPartnerSetup = {
  id: string;
  buyerId: string;
  supplierId: string;
  buyerName: string;
  buyerPartnerId: string;
  supplierName: string;
  supplierPartnerId: string;
  uom: string;
  needByConvention: string;
  incoterms: string;
  currency: string;
  firmFenceWeeks: number;
  frozenFenceWeeks: number;
  planningFenceWeeks: number;
  responseSlaBusinessDays: number;
};

export type CatalogPart = {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerPartNumber: string;
  mpn: string;
  revision: string;
  maskSet: string | null;
  porId: string | null;
};

export type CommitRecord = {
  id: string;
  commitId: string;
  version: number;
  forecastVersion?: number;
  parentForecastId: string;
  parentForecastLineId: string;
  committedQty: string;
  committedDate: string | null;
  commitGrade: "planning" | "firming" | "frozen" | null;
  uncommittedQty: string;
  reasonCode: "CAPACITY" | "MATERIAL" | "YIELD" | "PACK" | "OTHER" | null;
  comment: string | null;
  committedBy: string;
  committedAt: string | null;
  status: "offered" | "accepted" | "rejected" | "superseded";
  lateFlag: boolean;
  isRemainder: boolean;
  binding: boolean;
};

export type CommitMetrics = {
  requestedQty: string;
  committedQty: string;
  gapQty: string;
  lateQty: string;
  lateFlag: boolean;
  gapReasonCode: string | null;
  splitCount: number;
  remainderCount: number;
  commitAgeHours: number | null;
};

export type PriorCommitResponse = {
  forecastVersion: number;
  requestedQty: string;
  requestedDate: string;
  metrics: CommitMetrics;
  splits: CommitRecord[];
};

export type ForecastCommits = {
  forecastId: string;
  forecastVersion: number;
  forecastLineId: string;
  forecastStatus: string;
  requestedQty: string;
  requestedDate: string;
  demandType: "base" | "upside" | "npi" | "last_time_buy";
  uom: string;
  needByConvention: string;
  buyerId: string;
  supplierId: string;
  program: string | null;
  metrics: CommitMetrics;
  splits: CommitRecord[];
  history: CommitRecord[];
  priorResponse: PriorCommitResponse | null;
};

export type CatalogSite = {
  id: string;
  partyType: string;
  buyerId: string | null;
  supplierId: string | null;
  siteCode: string;
  role: string;
  name: string;
};

export type PurchaseOrderRecord = {
  id: string;
  poNumber: string;
  line: string;
  scheduleLine: string;
  sourceCommitId: string;
  sourceCommitVersion: number;
  firmQty: string;
  firmDate: string;
  price: string | null;
  buyerId: string;
  supplierId: string;
  createdBy: string;
  forecastId: string | null;
  binding: boolean;
  latestAck: {
    id: string;
    ackStatus: string;
    promiseQty: string;
    promiseDate: string;
    changeReason: string | null;
    acknowledgedBy: string;
    acknowledgedAt: string | null;
  } | null;
  acknowledgements: Array<{
    id: string;
    ackStatus: string;
    promiseQty: string;
    promiseDate: string;
    changeReason: string | null;
    acknowledgedBy: string;
    acknowledgedAt: string | null;
  }>;
  execution: Array<{
    id: string;
    eventType: string;
    externalId: string;
    qty: string | null;
    occurredAt: string | null;
  }>;
  otif: {
    promiseDate: string | null;
    promiseQty: string | null;
    receiptDate: string | null;
    receivedQty: string | null;
    otif: boolean | null;
  } | null;
};

export type ChangeOrderRecord = {
  id: string;
  changeOrderId: string;
  version: number;
  purchaseOrderId: string;
  poNumber: string | null;
  proposedQty: string | null;
  proposedDate: string | null;
  reasonCode: string;
  status: string;
  initiatedByParty: string;
  initiatedBy: string;
  buyerAcceptedAt: string | null;
  supplierAcceptedAt: string | null;
  msaClauseRef: string | null;
};

export type ExceptionRecord = {
  id: string;
  exceptionType: "sla_silence" | "gap" | "late";
  status: "open" | "acknowledged" | "resolved";
  forecastId: string;
  forecastVersion: number;
  forecastLineId: string;
  commitId: string | null;
  slaBusinessDays: number | null;
  dueAt: string | null;
  openedAt: string | null;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  resolvedAt: string | null;
  reasonCode: string | null;
  summary: string;
  payload: Record<string, unknown>;
  collaboration: {
    requested: {
      forecastId: string;
      version: number;
      requestedQty: string;
      requestedDate: string;
      demandType: string;
      uom: string;
      needByConvention: string;
      publishedAt: string | null;
    } | null;
    commits: Array<{
      commitId: string;
      version: number;
      committedQty: string;
      committedDate: string | null;
      commitGrade: string | null;
      status: string;
      reasonCode: string | null;
    }>;
    gapQty: string | null;
    purchaseOrders: Array<{
      id: string;
      poNumber: string;
      line: string;
      scheduleLine: string;
      sourceCommitId: string;
      firmQty: string;
      firmDate: string;
      ackStatus: string | null;
      promiseDate: string | null;
      promiseQty: string | null;
      otif: boolean | null;
      receivedQty: string | null;
      receiptDate: string | null;
    }>;
    changeOrders: Array<{
      changeOrderId: string;
      version: number;
      status: string;
      reasonCode: string;
      proposedQty: string | null;
      proposedDate: string | null;
    }>;
    shipments: Array<{
      eventType: string;
      externalId: string;
      qty: string | null;
      occurredAt: string | null;
    }>;
  };
};
