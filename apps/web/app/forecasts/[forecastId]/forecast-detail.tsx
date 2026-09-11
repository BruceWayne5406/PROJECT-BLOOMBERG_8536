"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { DEMAND_TYPES } from "@scp/domain";
import { api, type ForecastDetail, type ForecastRecord } from "@/lib/api";
import { formatDate, formatNeedBy, formatQty, signedDelta } from "@/lib/format";
import { DemandChip, StatusChip } from "@/components/chips";

const versionColumns: ColumnDef<ForecastRecord>[] = [
  {
    accessorKey: "version",
    header: "Ver",
    cell: ({ getValue }) => <span className="mono">v{String(getValue())}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusChip status={row.original.status} />,
  },
  {
    accessorKey: "requestedQty",
    header: "Requested qty",
    cell: ({ row }) => formatQty(row.original.requestedQty),
  },
  {
    accessorKey: "requestedDate",
    header: "Need-by",
    cell: ({ row }) => formatDate(row.original.requestedDate),
  },
  {
    accessorKey: "demandType",
    header: "Demand",
    cell: ({ getValue }) => <DemandChip demandType={String(getValue())} />,
  },
  {
    accessorKey: "publishedAt",
    header: "Published",
    cell: ({ row }) =>
      row.original.publishedAt
        ? new Date(row.original.publishedAt).toLocaleString()
        : "—",
  },
  {
    accessorKey: "publishedBy",
    header: "Actor",
    cell: ({ getValue }) => <span className="mono">{String(getValue() ?? "—")}</span>,
  },
  {
    accessorKey: "versionDeltaQty",
    header: "Δ qty",
    cell: ({ getValue }) => signedDelta(getValue() as string | null),
  },
];

export function ForecastDetailView({ forecastId }: { forecastId: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["forecast", forecastId],
    queryFn: () => api<ForecastDetail>(`/forecasts/${forecastId}`),
  });

  const table = useReactTable({
    data: data?.versions ?? [],
    columns: versionColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) return <p className="lede">Loading {forecastId}…</p>;
  if (error) return <p className="error-text">{(error as Error).message}</p>;
  if (!data) return null;

  const { current } = data;
  const latestDiff = data.diffs[data.diffs.length - 1];

  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">Forecast record</p>
          <h1>
            <span className="mono">
              {current.forecastId} v{current.version}
            </span>
          </h1>
          <p className="lede">
            {current.buyerName} asked {formatQty(current.requestedQty)} {current.uom} of{" "}
            <span className="mono">{current.buyerPartNumber}</span> /{" "}
            <span className="mono">{current.mpn}</span> rev {current.revision},{" "}
            {formatNeedBy(current.needByConvention)} {formatDate(current.requestedDate)}.
          </p>
        </div>
        <StatusChip status={current.status} />
      </div>

      <dl className="meta-grid">
        <div>
          <dt>Supplier</dt>
          <dd>{current.supplierName}</dd>
        </div>
        <div>
          <dt>Ship-to</dt>
          <dd>
            <span className="mono">{current.shipToSiteCode}</span> {current.shipToName}
          </dd>
        </div>
        <div>
          <dt>Demand</dt>
          <dd>
            <DemandChip demandType={current.demandType} />
          </dd>
        </div>
        <div>
          <dt>Program / priority</dt>
          <dd>
            {current.program ?? "—"} · {current.priority}
          </dd>
        </div>
        <div>
          <dt>Horizon bucket</dt>
          <dd>Week of {formatDate(current.horizonBucket)}</dd>
        </div>
        <div>
          <dt>POR / mask</dt>
          <dd className="mono">
            {current.porId ?? "—"} / {current.maskSet ?? "—"}
          </dd>
        </div>
      </dl>

      {latestDiff ? (
        <section className="panel">
          <h2>Delta vs v{latestDiff.fromVersion}</h2>
          <table className="data-table static">
            <thead>
              <tr>
                <th>Field</th>
                <th>v{latestDiff.fromVersion}</th>
                <th>v{latestDiff.toVersion}</th>
              </tr>
            </thead>
            <tbody>
              {latestDiff.fields.map((f) => (
                <tr key={f.field} className={f.changed ? "row-changed" : undefined}>
                  <td>{f.field}</td>
                  <td className={f.changed ? "old-value" : undefined}>{f.from ?? "—"}</td>
                  <td className={f.changed ? "new-value" : undefined}>{f.to ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <p className="lede">v1 has no prior version. A republish will show the delta here.</p>
      )}

      <section className="panel">
        <h2>Version history</h2>
        <p className="lede">Append-only. Superseded rows stay in the record.</p>
        <div className="table-wrap">
          <table className="data-table static">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th key={header.id}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={row.original.status === "superseded" ? "row-superseded" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {current.status === "draft" ? (
        <PublishDraftButton
          forecastId={current.forecastId}
          onDone={() => queryClient.invalidateQueries({ queryKey: ["forecast", forecastId] })}
        />
      ) : (
        <RepublishForm
          key={current.version}
          current={current}
          onDone={() => {
            queryClient.invalidateQueries({ queryKey: ["forecast", forecastId] });
            queryClient.invalidateQueries({ queryKey: ["forecasts"] });
          }}
        />
      )}

      <p>
        <Link href="/forecasts">Back to forecasts</Link>
      </p>
    </>
  );
}

function PublishDraftButton({
  forecastId,
  onDone,
}: {
  forecastId: string;
  onDone: () => void;
}) {
  const mutation = useMutation({
    mutationFn: () =>
      api(`/forecasts/${forecastId}/publish`, { method: "POST", body: "{}" }),
    onSuccess: onDone,
  });
  return (
    <section className="panel">
      <h2>Publish this draft</h2>
      <p className="lede">Status-only change. Quantities are not rewritten.</p>
      {mutation.error ? (
        <p className="error-text">{(mutation.error as Error).message}</p>
      ) : null}
      <button
        className="btn btn-primary"
        type="button"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        Publish draft
      </button>
    </section>
  );
}

function RepublishForm({
  current,
  onDone,
}: {
  current: ForecastRecord;
  onDone: () => void;
}) {
  const [requestedQty, setRequestedQty] = useState(String(Number(current.requestedQty)));
  const [requestedDate, setRequestedDate] = useState(current.requestedDate);
  const [demandType, setDemandType] = useState(current.demandType);
  const [priority, setPriority] = useState(String(current.priority));
  const [program, setProgram] = useState(current.program ?? "");

  const mutation = useMutation({
    mutationFn: () =>
      api(`/forecasts/${current.forecastId}/versions`, {
        method: "POST",
        body: JSON.stringify({
          requestedQty,
          requestedDate,
          demandType,
          priority: Number(priority),
          program: program.trim() || null,
        }),
      }),
    onSuccess: onDone,
  });

  return (
    <section className="panel">
      <h2>Republish as v{current.version + 1}</h2>
      <p className="lede">
        Inserts a new version and marks v{current.version} superseded. The previous
        numbers remain queryable.
      </p>
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
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
            onChange={(e) =>
              setDemandType(e.target.value as (typeof DEMAND_TYPES)[number])
            }
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
          <input value={priority} onChange={(e) => setPriority(e.target.value)} />
        </label>
        <label>
          Program
          <input value={program} onChange={(e) => setProgram(e.target.value)} />
        </label>
        {mutation.error ? (
          <p className="error-text">{(mutation.error as Error).message}</p>
        ) : null}
        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={mutation.isPending}>
            Publish new version
          </button>
        </div>
      </form>
    </section>
  );
}
