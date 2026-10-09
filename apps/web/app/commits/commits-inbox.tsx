"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api, type ForecastCommits } from "@/lib/api";
import { formatDate, formatQty } from "@/lib/format";
import { DemandChip } from "@/components/chips";

const columns: ColumnDef<ForecastCommits>[] = [
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
    accessorKey: "demandType",
    header: "Demand",
    cell: ({ getValue }) => <DemandChip demandType={String(getValue())} />,
  },
  {
    accessorKey: "requestedQty",
    header: "Requested",
    cell: ({ row }) => (
      <span>
        {formatQty(row.original.requestedQty)} {row.original.uom}
      </span>
    ),
  },
  {
    id: "needBy",
    header: "Need-by",
    cell: ({ row }) => formatDate(row.original.requestedDate),
  },
  {
    id: "splits",
    header: "Splits",
    cell: ({ row }) => row.original.metrics.splitCount,
  },
  {
    id: "committed",
    header: "Committed",
    cell: ({ row }) => formatQty(row.original.metrics.committedQty),
  },
  {
    id: "gap",
    header: "Gap",
    cell: ({ row }) => {
      const gap = Number(row.original.metrics.gapQty);
      return (
        <span className={gap > 0 ? "exception-text" : undefined}>
          {formatQty(row.original.metrics.gapQty)}
          {row.original.metrics.gapReasonCode
            ? ` · ${row.original.metrics.gapReasonCode}`
            : ""}
        </span>
      );
    },
  },
  {
    id: "late",
    header: "Late qty",
    cell: ({ row }) => (
      <span className={row.original.metrics.lateFlag ? "exception-text" : undefined}>
        {formatQty(row.original.metrics.lateQty)}
      </span>
    ),
  },
  {
    id: "lastResponse",
    header: "Last response",
    cell: ({ row }) => {
      const prior = row.original.priorResponse;
      if (row.original.splits.length > 0) {
        return <span>v{row.original.forecastVersion}</span>;
      }
      if (!prior) return "—";
      return (
        <span>
          v{prior.forecastVersion} (prior)
          <span className="muted">
            {" "}
            · {formatQty(prior.metrics.committedQty)} / gap{" "}
            {formatQty(prior.metrics.gapQty)}
            {prior.metrics.lateFlag
              ? ` · late ${formatQty(prior.metrics.lateQty)}`
              : ""}
          </span>
        </span>
      );
    },
  },
];

export function CommitsInbox() {
  const router = useRouter();
  const { data, isLoading, error } = useQuery({
    queryKey: ["commits-inbox"],
    queryFn: () => api<ForecastCommits[]>("/commits"),
  });

  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) return <p className="lede">Loading commit inbox…</p>;
  if (error) return <p className="error-text">{(error as Error).message}</p>;

  return (
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
              onClick={() => router.push(`/forecasts/${row.original.forecastId}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  router.push(`/forecasts/${row.original.forecastId}`);
                }
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
  );
}
