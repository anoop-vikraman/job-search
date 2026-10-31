import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import * as React from "react";

import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { TableToolbar } from "@/components/table-toolbar";
import { Button } from "@/components/ui/button";
import { decideRefund, listRefunds } from "@/features/admin/api";
import type { Refund } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";

const REFUND_STATUSES = ["requested", "approved", "rejected", "processed"];

export function RefundsPage(): React.JSX.Element {
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState("");
  const qc = useQueryClient();

  const onStatus = (v: string): void => {
    setStatus(v);
    setPage(1);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["admin-refunds", page, status],
    queryFn: () => listRefunds(page, status || undefined),
  });

  const decideMutation = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) => decideRefund(id, approve),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-refunds"] }),
  });

  const columns: ColumnDef<Refund>[] = [
    { id: "application", header: "Application", cell: ({ row }) => row.original.application_id.slice(0, 8) },
    {
      id: "amount",
      header: "Amount",
      cell: ({ row }) => <span className="font-mono">{formatMoney(row.original.amount_minor)}</span>,
    },
    { id: "reason", header: "Reason", cell: ({ row }) => row.original.reason ?? "—" },
    { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { id: "requested", header: "Requested", cell: ({ row }) => formatDate(row.original.created_at) },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        row.original.status === "requested" ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={decideMutation.isPending}
              onClick={() =>
                confirm("Approve refund? This reverses the escrow hold.") &&
                decideMutation.mutate({ id: row.original.id, approve: true })
              }
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={decideMutation.isPending}
              onClick={() => decideMutation.mutate({ id: row.original.id, approve: false })}
            >
              Reject
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Refunds</h1>
      <TableToolbar
        filters={[
          {
            label: "Status",
            value: status,
            onChange: onStatus,
            options: REFUND_STATUSES.map((s) => ({ label: s, value: s })),
          },
        ]}
      />
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        limit={data?.limit ?? 20}
        onPageChange={setPage}
        isLoading={isLoading}
      />
    </div>
  );
}
