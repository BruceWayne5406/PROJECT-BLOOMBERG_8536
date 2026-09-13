"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ChangeOrderRecord } from "@/lib/api";
import { formatDate, formatQty } from "@/lib/format";
import { StatusChip } from "@/components/chips";

const columns: ColumnDef<ChangeOrderRecord>[] = [
  {
    accessorKey: "changeOrderId",
    header: "Change order",
    cell: ({ row }) => (
      <span className="mono">
        {row.original.changeOrderId} v{row.original.version}
      </span>
    ),
  },
  {
    accessorKey: "poNumber",
    header: "PO",
    cell: ({ getValue }) => <span className="mono">{String(getValue() ?? "—")}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusChip status={row.original.status} />,
  },
  {
    accessorKey: "reasonCode",
    header: "Reason",
    cell: ({ getValue }) => <span className="mono">{String(getValue())}</span>,
  },
  {
    id: "proposed",
    header: "Proposed",
    cell: ({ row }) =>
      `${row.original.proposedQty ? formatQty(row.original.proposedQty) : "—"} · ${
        row.original.proposedDate ? formatDate(row.original.proposedDate) : "—"
      }`,
  },
  {
    id: "accepts",
    header: "Dual accept",
    cell: ({ row }) =>
      `buyer ${row.original.buyerAcceptedAt ? "yes" : "no"} · supplier ${
        row.original.supplierAcceptedAt ? "yes" : "no"
      }`,
  },
];

export function ChangeOrderList() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["change-orders"],
    queryFn: () => api<ChangeOrderRecord[]>("/change-orders"),
  });
  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "accepted" | "rejected" }) =>
      api(`/change-orders/${id}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["change-orders"] }),
  });

  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) return <p className="lede">Loading change orders…</p>;
  if (error) return <p className="error-text">{(error as Error).message}</p>;

  return (
    <div className="table-wrap">
      <table className="data-table static">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</th>
              ))}
              <th>Action</th>
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
                <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
              ))}
              <td>
                {row.original.status === "proposed" ? (
                  <div className="row-actions">
                    <button
                      type="button"
                      className="btn"
                      disabled={decide.isPending}
                      onClick={() =>
                        decide.mutate({ id: row.original.changeOrderId, decision: "accepted" })
                      }
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="btn"
                      disabled={decide.isPending}
                      onClick={() =>
                        decide.mutate({ id: row.original.changeOrderId, decision: "rejected" })
                      }
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <span className="muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {decide.error ? <p className="error-text">{(decide.error as Error).message}</p> : null}
    </div>
  );
}
