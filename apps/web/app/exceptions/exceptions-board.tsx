"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api, type ExceptionRecord } from "@/lib/api";
import { formatDate, formatQty } from "@/lib/format";
import { StatusChip } from "@/components/chips";

const columns: ColumnDef<ExceptionRecord>[] = [
  {
    accessorKey: "exceptionType",
    header: "Type",
    cell: ({ getValue }) => <span className="mono">{String(getValue())}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusChip status={row.original.status} />,
  },
  {
    accessorKey: "forecastId",
    header: "Forecast",
    cell: ({ row }) => (
      <span className="mono">
        {row.original.forecastId} v{row.original.forecastVersion}
      </span>
    ),
  },
  {
    accessorKey: "commitId",
    header: "Commit",
    cell: ({ getValue }) => {
      const v = getValue();
      return v ? <span className="mono">{String(v)}</span> : "—";
    },
  },
  {
    accessorKey: "dueAt",
    header: "SLA due",
    cell: ({ row }) =>
      row.original.dueAt ? new Date(row.original.dueAt).toLocaleString() : "—",
  },
  {
    accessorKey: "reasonCode",
    header: "Reason",
    cell: ({ getValue }) => {
      const v = getValue();
      return v ? <span className="mono">{String(v)}</span> : "—";
    },
  },
  {
    accessorKey: "summary",
    header: "Summary",
    cell: ({ getValue }) => <span className="lede">{String(getValue())}</span>,
  },
];

export function ExceptionsBoard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["exceptions"],
    queryFn: () => api<ExceptionRecord[]>("/exceptions"),
    refetchInterval: 30_000,
  });

  const scan = useMutation({
    mutationFn: () => api("/exceptions/scan", { method: "POST", body: "{}" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["exceptions"] }),
  });

  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) return <p className="lede">Scanning published forecasts against TPA SLA…</p>;
  if (error) return <p className="error-text">{(error as Error).message}</p>;

  return (
    <>
      <div className="form-actions">
        <button
          type="button"
          className="btn"
          disabled={scan.isPending}
          onClick={() => scan.mutate()}
        >
          Run SLA scan
        </button>
        <span className="muted">
          TPA <code>response_sla_business_days</code> only. No response is never treated as
          accepted.
        </span>
      </div>
      <div className="table-wrap">
        <table className="data-table">
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
                tabIndex={0}
                className={row.original.status !== "resolved" ? undefined : "row-superseded"}
                onClick={() => router.push(`/exceptions/${row.original.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") router.push(`/exceptions/${row.original.id}`);
                }}
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
      {(data ?? []).length === 0 ? (
        <p className="lede">No open or historical exceptions yet.</p>
      ) : null}
    </>
  );
}

export function ExceptionDetail({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["exception", id],
    queryFn: () => api<ExceptionRecord>(`/exceptions/${id}`),
  });
  const ack = useMutation({
    mutationFn: () =>
      api(`/exceptions/${id}/acknowledge`, {
        method: "POST",
        body: JSON.stringify({ note: "acknowledged in portal" }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exception", id] });
      queryClient.invalidateQueries({ queryKey: ["exceptions"] });
    },
  });

  if (isLoading) return <p className="lede">Loading exception…</p>;
  if (error) return <p className="error-text">{(error as Error).message}</p>;
  if (!data) return null;

  const c = data.collaboration;

  return (
    <>
      <p className="lede">{data.summary}</p>
      <dl className="meta-grid">
        <div>
          <dt>Type</dt>
          <dd className="mono">{data.exceptionType}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <StatusChip status={data.status} />
          </dd>
        </div>
        <div>
          <dt>SLA (TPA)</dt>
          <dd>
            {data.slaBusinessDays ?? "—"} business days
            {data.dueAt ? ` · due ${new Date(data.dueAt).toLocaleString()}` : ""}
          </dd>
        </div>
        <div>
          <dt>Reason</dt>
          <dd className="mono">{data.reasonCode ?? "—"}</dd>
        </div>
      </dl>

      <section className="panel">
        <h2>1. What was requested?</h2>
        {c.requested ? (
          <p>
            <span className="mono">
              {c.requested.forecastId} v{c.requested.version}
            </span>{" "}
            · {formatQty(c.requested.requestedQty)} {c.requested.uom} ·{" "}
            {c.requested.needByConvention} {formatDate(c.requested.requestedDate)}
          </p>
        ) : (
          <p className="lede">Forecast line missing.</p>
        )}
      </section>

      <section className="panel">
        <h2>2. What did the supplier commit?</h2>
        {c.commits.length === 0 ? (
          <p className="lede">No commit against this published version. Silence is not acceptance.</p>
        ) : (
          <ul>
            {c.commits.map((row) => (
              <li key={row.commitId}>
                <span className="mono">{row.commitId}</span> v{row.version} ·{" "}
                {formatQty(row.committedQty)} · {row.commitGrade ?? "none"} · {row.status}
                {row.committedDate ? ` · ${formatDate(row.committedDate)}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>3. What is still uncommitted, and why?</h2>
        <p>
          Gap {c.gapQty ? formatQty(c.gapQty) : "—"}
          {data.reasonCode ? (
            <span className="mono"> · {data.reasonCode}</span>
          ) : null}
        </p>
      </section>

      <section className="panel">
        <h2>4. Which slices are now POs, with what acknowledged date?</h2>
        {c.purchaseOrders.length === 0 ? (
          <p className="lede">No binding PO yet. Planning-grade dates are not converted.</p>
        ) : (
          <ul>
            {c.purchaseOrders.map((p) => (
              <li key={p.id}>
                <span className="mono">
                  {p.poNumber} / {p.line} / {p.scheduleLine}
                </span>{" "}
                from <span className="mono">{p.sourceCommitId}</span> · firm{" "}
                {formatQty(p.firmQty)} {formatDate(p.firmDate)}
                {p.promiseDate
                  ? ` · last promise ${formatDate(p.promiseDate)} (${p.ackStatus})`
                  : " · not acknowledged"}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>5. What actually shipped against those promises?</h2>
        {c.shipments.length === 0 ? (
          <p className="lede">No ASN or receipt referenced yet. OTIF waits for a promise date.</p>
        ) : (
          <ul>
            {c.shipments.map((s) => (
              <li key={s.externalId}>
                {s.eventType} <span className="mono">{s.externalId}</span> ·{" "}
                {s.qty ? formatQty(s.qty) : "—"} ·{" "}
                {s.occurredAt ? new Date(s.occurredAt).toLocaleString() : "—"}
              </li>
            ))}
          </ul>
        )}
        {c.purchaseOrders.some((p) => p.otif !== null) ? (
          <p>
            OTIF vs last accepted promise:{" "}
            {c.purchaseOrders
              .map((p) =>
                p.otif === null ? null : `${p.poNumber} ${p.otif ? "on time" : "late"}`,
              )
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}
      </section>

      {data.status === "open" ? (
        <button
          type="button"
          className="btn"
          disabled={ack.isPending}
          onClick={() => ack.mutate()}
        >
          Acknowledge
        </button>
      ) : null}
      {ack.error ? <p className="error-text">{(ack.error as Error).message}</p> : null}
    </>
  );
}
