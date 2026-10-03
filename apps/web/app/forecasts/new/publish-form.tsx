"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DEMAND_TYPES } from "@scp/domain";
import {
  api,
  type CatalogPart,
  type CatalogSite,
  type TradingPartnerSetup,
} from "@/lib/api";
import { formatNeedBy } from "@/lib/format";

export function PublishForm() {
  const router = useRouter();
  const setups = useQuery({
    queryKey: ["catalog", "tpa"],
    queryFn: () => api<TradingPartnerSetup[]>("/catalog/trading-partner-setups"),
  });
  const parts = useQuery({
    queryKey: ["catalog", "parts"],
    queryFn: () => api<CatalogPart[]>("/catalog/parts"),
  });
  const sites = useQuery({
    queryKey: ["catalog", "sites"],
    queryFn: () => api<CatalogSite[]>("/catalog/sites"),
  });

  const [tpaId, setTpaId] = useState("");
  const [partId, setPartId] = useState("");
  const [shipToSiteId, setShipToSiteId] = useState("");
  const [requestedQty, setRequestedQty] = useState("100000");
  const [requestedDate, setRequestedDate] = useState("2026-12-15");
  const [demandType, setDemandType] = useState<(typeof DEMAND_TYPES)[number]>("base");
  const [priority, setPriority] = useState("10");
  const [program, setProgram] = useState("AURORA");
  const [forecastId, setForecastId] = useState("");
  const [asDraft, setAsDraft] = useState(false);

  const tpa = useMemo(
    () => setups.data?.find((s) => s.id === tpaId) ?? setups.data?.[0],
    [setups.data, tpaId],
  );

  const resolvedTpaId = tpaId || tpa?.id || "";
  const filteredParts = parts.data?.filter((p) => !tpa || p.buyerId === tpa.buyerId) ?? [];
  const filteredSites =
    sites.data?.filter((s) => s.role === "ship_to" && (!tpa || s.buyerId === tpa.buyerId)) ?? [];

  const mutation = useMutation({
    mutationFn: () =>
      api<{ forecastId: string }>("/forecasts", {
        method: "POST",
        body: JSON.stringify({
          forecastId: forecastId.trim() ? forecastId.trim().toUpperCase() : undefined,
          tradingPartnerSetupId: resolvedTpaId,
          partId: partId || filteredParts[0]?.id,
          shipToSiteId: shipToSiteId || filteredSites[0]?.id,
          requestedQty,
          requestedDate,
          demandType,
          priority: Number(priority),
          program: program.trim() || null,
          asDraft,
        }),
      }),
    onSuccess: (row) => router.push(`/forecasts/${row.forecastId}`),
  });

  if (setups.isLoading || parts.isLoading || sites.isLoading) {
    return <p className="lede">Loading trading partner setup…</p>;
  }

  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <label>
        Trading partner
        <select
          value={resolvedTpaId}
          onChange={(e) => {
            setTpaId(e.target.value);
            setPartId("");
            setShipToSiteId("");
          }}
          required
        >
          {setups.data?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.buyerName} → {s.supplierName} · {s.uom} · {formatNeedBy(s.needByConvention)}
            </option>
          ))}
        </select>
      </label>
      {tpa ? (
        <p className="hint">
          UoM and need-by come from the TPA ({tpa.uom}, {formatNeedBy(tpa.needByConvention)}).
          Firm fence {tpa.firmFenceWeeks}w · response SLA {tpa.responseSlaBusinessDays} business days.
          Not retyped per cycle.
        </p>
      ) : null}

      <label>
        Part (buyer PN + MPN + revision)
        <select
          value={partId || filteredParts[0]?.id || ""}
          onChange={(e) => setPartId(e.target.value)}
          required
        >
          {filteredParts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.buyerPartNumber} / {p.mpn} rev {p.revision}
            </option>
          ))}
        </select>
      </label>

      <label>
        Ship-to
        <select
          value={shipToSiteId || filteredSites[0]?.id || ""}
          onChange={(e) => setShipToSiteId(e.target.value)}
          required
        >
          {filteredSites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.siteCode} — {s.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Requested qty
        <input
          inputMode="decimal"
          value={requestedQty}
          onChange={(e) => setRequestedQty(e.target.value)}
          required
        />
      </label>

      <label>
        Requested date
        <input
          type="date"
          value={requestedDate}
          onChange={(e) => setRequestedDate(e.target.value)}
          required
        />
      </label>

      <label>
        Demand type
        <select
          value={demandType}
          onChange={(e) => setDemandType(e.target.value as (typeof DEMAND_TYPES)[number])}
        >
          {DEMAND_TYPES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>

      <label>
        Priority
        <input
          inputMode="numeric"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        />
      </label>

      <label>
        Program
        <input value={program} onChange={(e) => setProgram(e.target.value)} />
      </label>

      <label>
        Forecast ID (optional)
        <input
          className="mono"
          placeholder="auto-assigned FC-#####"
          value={forecastId}
          onChange={(e) => setForecastId(e.target.value)}
        />
      </label>

      <label className="checkbox">
        <input
          type="checkbox"
          checked={asDraft}
          onChange={(e) => setAsDraft(e.target.checked)}
        />
        Save as draft (not visible to the supplier as a published demand signal)
      </label>

      {mutation.error ? (
        <p className="error-text">{(mutation.error as Error).message}</p>
      ) : null}

      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={mutation.isPending}>
          {asDraft ? "Save draft" : "Publish"}
        </button>
      </div>
    </form>
  );
}
