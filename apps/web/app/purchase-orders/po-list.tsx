"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api, type PurchaseOrderRecord } from "@/lib/api";
import { formatDate, formatQty } from "@/lib/format";

const columns: ColumnDef<PurchaseOrderRecord>[] = [
  {
    accessorKey: "poNumber",
    header: "PO",
    cell: ({ row }) => (
      <span className="mono">
        {row.original.poNumber} / {row.original.line} / {row.original.scheduleLine}
      </span>
    ),
  },
  {
    accessorKey: "sourceCommitId",
    header: "From commit",
    cell: ({ row }) => (
      <span className="mono">
        {row.original.sourceCommitId} v{row.original.sourceCommitVersion}
      </span>
    ),
  },
  {
    accessorKey: "firmQty",
    header: "Firm qty",
    cell: ({ row }) => formatQty(row.original.firmQty),
  },
  {
    accessorKey: "firmDate",
    header: "Firm date",
    cell: ({ row }) => formatDate(row.original.firmDate),
  },
  {
    id: "promise",
    header: "Last promise",
    cell: ({ row }) =>
      row.original.latestAck
        ? `${formatDate(row.original.latestAck.promiseDate)} · ${row.original.latestAck.ackStatus}`
        : "unacked",
  },
  {
    id: "otif",
    header: "OTIF",
    cell: ({ row }) => {
      const otif = row.original.otif?.otif;
      if (otif === null || otif === undefined) return "—";
      return (
        <span className={otif ? undefined : "exception-text"}>{otif ? "on time" : "late"}</span>
      );
    },
  },
];

export function PurchaseOrderList() {
  const router = useRouter();
  const { data, isLoading, error } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: () => api<PurchaseOrderRecord[]>("/purchase-orders"),
  });
  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) return <p className="lede">Loading purchase orders…</p>;
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
              onClick={() => router.push(`/purchase-orders/${row.original.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter") router.push(`/purchase-orders/${row.original.id}`);
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
      {(data ?? []).length === 0 ? (
        <p className="lede">
          No POs yet. Convert an accepted firming or frozen commit — never a planning-grade
          date.
        </p>
      ) : null}
    </div>
  );
}
