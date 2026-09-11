"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, type ForecastRecord } from "@/lib/api";
import { formatDate, formatNeedBy, formatQty, signedDelta } from "@/lib/format";
import { DemandChip, StatusChip } from "@/components/chips";

const columns: ColumnDef<ForecastRecord>[] = [
  {
    accessorKey: "forecastId",
    header: "Forecast",
    cell: ({ row }) => (
      <span className="mono">
        {row.original.forecastId} v{row.original.version}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => <StatusChip status={String(getValue())} />,
  },
  {
    id: "part",
    header: "Part / MPN",
    cell: ({ row }) => (
      <div>
        <div className="mono">{row.original.buyerPartNumber}</div>
        <div className="muted mono">
          {row.original.mpn} rev {row.original.revision}
        </div>
      </div>
    ),
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
    accessorKey: "requestedDate",
    header: "Need-by",
    cell: ({ row }) => (
      <div>
        <div>{formatDate(row.original.requestedDate)}</div>
        <div className="muted">{formatNeedBy(row.original.needByConvention)}</div>
      </div>
    ),
  },
  {
    accessorKey: "demandType",
    header: "Demand",
    cell: ({ getValue }) => <DemandChip demandType={String(getValue())} />,
  },
  {
    accessorKey: "supplierName",
    header: "Supplier",
  },
  {
    accessorKey: "versionDeltaQty",
    header: "Δ qty",
    cell: ({ getValue }) => signedDelta(getValue() as string | null),
  },
];

export function ForecastsTable() {
  const router = useRouter();
  const { data, isLoading, error } = useQuery({
    queryKey: ["forecasts"],
    queryFn: () => api<ForecastRecord[]>("/forecasts"),
  });

  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) return <p className="lede">Loading forecasts…</p>;
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
                if (e.key === "Enter") router.push(`/forecasts/${row.original.forecastId}`);
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
      {data?.length === 0 ? (
        <p className="lede">
          No forecasts yet. <Link href="/forecasts/new">Publish the first one.</Link>
        </p>
      ) : null}
    </div>
  );
}
