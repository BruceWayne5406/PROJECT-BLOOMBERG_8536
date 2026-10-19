"use client";

import { useQuery } from "@tanstack/react-query";
import { api, type TradingPartnerSetup } from "@/lib/api";

export function PartnersView() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["catalog", "tpa"],
    queryFn: () => api<TradingPartnerSetup[]>("/catalog/trading-partner-setups"),
  });

  if (isLoading) return <p className="lede">Loading trading partner setups…</p>;
  if (error) return <p className="error-text">{(error as Error).message}</p>;

  return (
    <div className="stack">
      {(data ?? []).map((tpa) => (
        <section className="panel" key={tpa.id}>
          <h2>
            {tpa.buyerName} · {tpa.supplierName}
          </h2>
          <dl className="meta-grid">
            <div>
              <dt>Buyer / supplier ids</dt>
              <dd className="mono">
                {tpa.buyerPartnerId} / {tpa.supplierPartnerId}
              </dd>
            </div>
            <div>
              <dt>Need-by / UoM</dt>
              <dd>
                {tpa.needByConvention} · {tpa.uom}
              </dd>
            </div>
            <div>
              <dt>Fences (weeks)</dt>
              <dd>
                planning {tpa.planningFenceWeeks} · firm {tpa.firmFenceWeeks} · frozen{" "}
                {tpa.frozenFenceWeeks}
              </dd>
            </div>
            <div>
              <dt>Response SLA</dt>
              <dd>{tpa.responseSlaBusinessDays} business days</dd>
            </div>
            <div>
              <dt>Incoterms / currency</dt>
              <dd>
                {tpa.incoterms} · {tpa.currency}
              </dd>
            </div>
          </dl>
        </section>
      ))}
    </div>
  );
}
