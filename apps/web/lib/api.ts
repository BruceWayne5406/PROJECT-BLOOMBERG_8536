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

export type CatalogSite = {
  id: string;
  partyType: string;
  buyerId: string | null;
  supplierId: string | null;
  siteCode: string;
  role: string;
  name: string;
};
