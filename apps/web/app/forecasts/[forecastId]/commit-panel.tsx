"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { COMMIT_GRADES, REASON_CODES } from "@scp/domain";
import { useMemo, useState } from "react";
import { api, type CommitRecord, type ForecastCommits } from "@/lib/api";
import { formatDate, formatQty } from "@/lib/format";
import { GradeChip, StatusChip } from "@/components/chips";

type Me = {
  actorId: string;
  partyType: string;
  partnerId: string | null;
  role: string;
};

type DraftSplit = {
  committedQty: string;
  committedDate: string;
  commitGrade: string;
  reasonCode: string;
  comment: string;
};

const columns: ColumnDef<CommitRecord>[] = [
  {
    accessorKey: "commitId",
    header: "Commit",
    cell: ({ row }) => (
      <span className="mono">
        {row.original.commitId} v{row.original.version}
      </span>
    ),
  },
  {
    accessorKey: "committedQty",
    header: "Qty",
    cell: ({ row }) =>
      row.original.isRemainder ? (
        <span className="muted">uncommitted</span>
      ) : (
        formatQty(row.original.committedQty)
      ),
  },
  {
    accessorKey: "committedDate",
    header: "Date",
    cell: ({ row }) =>
      row.original.committedDate ? formatDate(row.original.committedDate) : "—",
  },
  {
    accessorKey: "commitGrade",
    header: "Grade",
    cell: ({ row }) => (
      <GradeChip grade={row.original.commitGrade} binding={row.original.binding} />
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusChip status={row.original.status} />,
  },
  {
    accessorKey: "lateFlag",
    header: "Late",
    cell: ({ row }) =>
      row.original.lateFlag ? <span className="exception-text">late</span> : "—",
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
    accessorKey: "comment",
    header: "Comment",
    cell: ({ getValue }) => String(getValue() ?? "—"),
  },
];

export function CommitPanel({ forecastId }: { forecastId: string }) {
  const queryClient = useQueryClient();
  const me = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) return null;
      return res.json() as Promise<Me>;
    },
  });
  const { data, isLoading, error } = useQuery({
    queryKey: ["commits", forecastId],
    queryFn: () => api<ForecastCommits>(`/forecasts/${forecastId}/commits`),
  });

  const table = useReactTable({
    data: data?.splits ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  const priorTable = useReactTable({
    data: data?.priorResponse?.splits ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) return <p className="lede">Loading commits…</p>;
  if (error) return <p className="error-text">{(error as Error).message}</p>;
  if (!data) return null;

  const { metrics } = data;
  const gap = Number(metrics.gapQty);
  const isSupplier = me.data?.partyType === "supplier" && me.data.partnerId === data.supplierId;
  const isBuyer = me.data?.partyType === "buyer" && me.data.partnerId === data.buyerId;

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["commits", forecastId] });
    queryClient.invalidateQueries({ queryKey: ["commits-inbox"] });
  }

  return (
    <section className="panel">
      <h2>Supplier commits</h2>
      <p className="lede">
        Splits are first-class. A planning-grade date is not a promise to the end
        customer. Gap is a planning fact, not an implied yes.
      </p>
      {data.demandType === "upside" ? (
        <p className="hint exception-text">
          This line is <strong>upside</strong> demand. It cannot silently consume
          capacity already committed to base.
        </p>
      ) : null}

      <div className="metrics-strip">
        <div>
          <dt>Requested</dt>
          <dd>
            {formatQty(metrics.requestedQty)} {data.uom}
          </dd>
        </div>
        <div>
          <dt>Committed (splits)</dt>
          <dd>
            {formatQty(metrics.committedQty)} · {metrics.splitCount} slice
            {metrics.splitCount === 1 ? "" : "s"}
          </dd>
        </div>
        <div className={gap > 0 ? "metric-exception" : undefined}>
          <dt>Gap / uncommitted</dt>
          <dd>
            {formatQty(metrics.gapQty)}
            {metrics.gapReasonCode ? (
              <span className="mono"> · {metrics.gapReasonCode}</span>
            ) : null}
          </dd>
        </div>
        <div className={metrics.lateFlag ? "metric-exception" : undefined}>
          <dt>Late qty</dt>
          <dd>{formatQty(metrics.lateQty)} {metrics.lateFlag ? "(planning fact)" : ""}</dd>
        </div>
      </div>

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
                {isBuyer || isSupplier ? <th>Action</th> : null}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={
                  row.original.status === "superseded" || row.original.status === "rejected"
                    ? "row-superseded"
                    : undefined
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
                {isBuyer || isSupplier ? (
                  <td>
                    <RowActions
                      row={row.original}
                      isBuyer={Boolean(isBuyer)}
                      isSupplier={Boolean(isSupplier)}
                      onDone={refresh}
                    />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.splits.length === 0 ? (
        <p className="lede">
          No commit against v{data.forecastVersion} yet. Silence is not acceptance.
        </p>
      ) : null}

      {data.priorResponse ? (
        <div className="prior-response">
          <h3>
            Last supplier response · v{data.priorResponse.forecastVersion}{" "}
            (superseded request)
          </h3>
          <p className="lede">
            These splits belong to forecast v{data.priorResponse.forecastVersion}{" "}
            ({formatQty(data.priorResponse.requestedQty)} {data.uom},{" "}
            {formatDate(data.priorResponse.requestedDate)}). They do not cover
            the current published version.
          </p>
          <div className="metrics-strip">
            <div>
              <dt>Committed (v{data.priorResponse.forecastVersion})</dt>
              <dd>
                {formatQty(data.priorResponse.metrics.committedQty)} ·{" "}
                {data.priorResponse.metrics.splitCount} slice
                {data.priorResponse.metrics.splitCount === 1 ? "" : "s"}
              </dd>
            </div>
            <div
              className={
                Number(data.priorResponse.metrics.gapQty) > 0
                  ? "metric-exception"
                  : undefined
              }
            >
              <dt>Gap / uncommitted</dt>
              <dd>
                {formatQty(data.priorResponse.metrics.gapQty)}
                {data.priorResponse.metrics.gapReasonCode ? (
                  <span className="mono">
                    {" "}
                    · {data.priorResponse.metrics.gapReasonCode}
                  </span>
                ) : null}
              </dd>
            </div>
            <div
              className={
                data.priorResponse.metrics.lateFlag
                  ? "metric-exception"
                  : undefined
              }
            >
              <dt>Late qty</dt>
              <dd>
                {formatQty(data.priorResponse.metrics.lateQty)}
                {data.priorResponse.metrics.lateFlag ? " (planning fact)" : ""}
              </dd>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table static">
              <thead>
                {priorTable.getHeaderGroups().map((hg) => (
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
                {priorTable.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
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
        </div>
      ) : null}

      {isSupplier ? (
        <OfferSplitsForm
          forecastId={forecastId}
          seed={data.splits.filter((s) => s.status === "offered")}
          onDone={refresh}
        />
      ) : null}
    </section>
  );
}

function RowActions({
  row,
  isBuyer,
  isSupplier,
  onDone,
}: {
  row: CommitRecord;
  isBuyer: boolean;
  isSupplier: boolean;
  onDone: () => void;
}) {
  const decide = useMutation({
    mutationFn: (decision: "accepted" | "rejected") =>
      api(`/commits/${row.commitId}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      }),
    onSuccess: onDone,
  });

  if (row.status !== "offered") {
    return <span className="muted">—</span>;
  }

  return (
    <div className="row-actions">
      {isBuyer ? (
        <>
          <button
            type="button"
            className="btn"
            disabled={decide.isPending}
            onClick={() => decide.mutate("accepted")}
          >
            Accept
          </button>
          <button
            type="button"
            className="btn"
            disabled={decide.isPending}
            onClick={() => decide.mutate("rejected")}
          >
            Reject
          </button>
        </>
      ) : null}
      {isSupplier ? (
        <SupersedeInline row={row} onDone={onDone} />
      ) : null}
      {decide.error ? (
        <p className="error-text">{(decide.error as Error).message}</p>
      ) : null}
    </div>
  );
}

function SupersedeInline({ row, onDone }: { row: CommitRecord; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(String(Number(row.committedQty)));
  const [date, setDate] = useState(row.committedDate ?? "");
  const [reason, setReason] = useState(row.reasonCode ?? "");
  const [comment, setComment] = useState(row.comment ?? "");

  const mutation = useMutation({
    mutationFn: () =>
      api(`/commits/${row.commitId}/versions`, {
        method: "POST",
        body: JSON.stringify({
          committedQty: qty,
          committedDate: date || null,
          reasonCode: reason || null,
          comment: comment || null,
        }),
      }),
    onSuccess: () => {
      setOpen(false);
      onDone();
    },
  });

  if (!open) {
    return (
      <button type="button" className="btn" onClick={() => setOpen(true)}>
        Supersede
      </button>
    );
  }

  return (
    <form
      className="mini-form"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <input value={qty} onChange={(e) => setQty(e.target.value)} aria-label="qty" />
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <select value={reason} onChange={(e) => setReason(e.target.value)}>
        <option value="">reason (required inside firm fence)</option>
        {REASON_CODES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <input
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="comment"
      />
      <button className="btn btn-primary" type="submit" disabled={mutation.isPending}>
        Save v{row.version + 1}
      </button>
      {mutation.error ? (
        <p className="error-text">{(mutation.error as Error).message}</p>
      ) : null}
    </form>
  );
}

function OfferSplitsForm({
  forecastId,
  seed,
  onDone,
}: {
  forecastId: string;
  seed: CommitRecord[];
  onDone: () => void;
}) {
  const initial = useMemo<DraftSplit[]>(
    () =>
      seed.length
        ? seed.map((s) => ({
            committedQty: String(Number(s.committedQty)),
            committedDate: s.committedDate ?? "",
            commitGrade: s.commitGrade ?? "",
            reasonCode: s.reasonCode ?? "",
            comment: s.comment ?? "",
          }))
        : [
            {
              committedQty: "",
              committedDate: "",
              commitGrade: "",
              reasonCode: "",
              comment: "",
            },
          ],
    [seed],
  );
  const [splits, setSplits] = useState<DraftSplit[]>(initial);

  const mutation = useMutation({
    mutationFn: () =>
      api(`/forecasts/${forecastId}/commits`, {
        method: "POST",
        body: JSON.stringify({
          splits: splits.map((s) => ({
            committedQty: s.committedQty || "0",
            committedDate: s.committedDate || null,
            commitGrade: s.commitGrade || null,
            reasonCode: s.reasonCode || null,
            comment: s.comment || null,
          })),
        }),
      }),
    onSuccess: onDone,
  });

  function update(i: number, patch: Partial<DraftSplit>) {
    setSplits((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  return (
    <div className="offer-form">
      <h3>Offer or replace unaccepted splits</h3>
      <p className="lede">
        Accepted slices stay. Offered rows are superseded and replaced. Include a
        zero-qty row with a reason_code for any remainder.
      </p>
      {splits.map((split, i) => (
        <div className="split-row" key={i}>
          <input
            placeholder="qty"
            value={split.committedQty}
            onChange={(e) => update(i, { committedQty: e.target.value })}
          />
          <input
            type="date"
            value={split.committedDate}
            onChange={(e) => update(i, { committedDate: e.target.value })}
          />
          <select
            value={split.commitGrade}
            onChange={(e) => update(i, { commitGrade: e.target.value })}
          >
            <option value="">grade (from TPA if blank)</option>
            {COMMIT_GRADES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            value={split.reasonCode}
            onChange={(e) => update(i, { reasonCode: e.target.value })}
          >
            <option value="">reason</option>
            {REASON_CODES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <input
            placeholder="comment"
            value={split.comment}
            onChange={(e) => update(i, { comment: e.target.value })}
          />
          <button
            type="button"
            className="btn"
            onClick={() => setSplits((rows) => rows.filter((_, idx) => idx !== i))}
            disabled={splits.length === 1}
          >
            Remove
          </button>
        </div>
      ))}
      <div className="form-actions">
        <button
          type="button"
          className="btn"
          onClick={() =>
            setSplits((rows) => [
              ...rows,
              {
                committedQty: "",
                committedDate: "",
                commitGrade: "",
                reasonCode: "",
                comment: "",
              },
            ])
          }
        >
          Add split
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          Publish splits
        </button>
      </div>
      {mutation.error ? (
        <p className="error-text">{(mutation.error as Error).message}</p>
      ) : null}
    </div>
  );
}
