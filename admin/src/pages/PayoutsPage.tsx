import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import * as React from "react";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { TableToolbar } from "@/components/table-toolbar";
import { Button } from "@/components/ui/button";
import { decidePayout, listPayouts } from "@/features/admin/api";
import { errorMessage } from "@/lib/api";
import type { Payout } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";

const STATUSES = ["requested", "paid", "rejected"];

export function PayoutsPage(): React.JSX.Element {
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState("requested");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-payouts", page, status],
    queryFn: () => listPayouts(page, status || undefined),
  });

  const decide = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { approve: boolean; reference?: string; reason?: string } }) =>
      decidePayout(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-payouts"] }),
    onError: (err) => alert(errorMessage(err)),
  });

  const columns: ColumnDef<Payout>[] = [
    { id: "user", header: "User", cell: ({ row }) => <span className="font-mono">{row.original.user_id.slice(0, 8)}</span> },
    { id: "amount", header: "Amount", cell: ({ row }) => <span className="font-mono">{formatMoney(row.original.amount_minor)}</span> },
    { id: "upi", header: "UPI", cell: ({ row }) => <span className="font-mono">{row.original.upi_id}</span> },
    { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { id: "ref", header: "Reference", cell: ({ row }) => row.original.reference ?? row.original.failure_reason ?? "—" },
    { id: "requested", header: "Requested", cell: ({ row }) => formatDate(row.original.created_at) },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        row.original.status === "requested" ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={decide.isPending}
              onClick={() => {
                const reference = prompt(`Send ${formatMoney(row.original.amount_minor)} to ${row.original.upi_id}, then enter the UTR / transfer reference:`);
                if (reference) decide.mutate({ id: row.original.id, body: { approve: true, reference } });
              }}
            >
              Mark paid
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={decide.isPending}
              onClick={() => {
                const reason = prompt("Reason (the amount returns to the user's wallet):");
                if (reason) decide.mutate({ id: row.original.id, body: { approve: false, reason } });
              }}
            >
              Reject
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Payouts</h1>
      <TableToolbar
        filters={[
          {
            label: "Status",
            value: status,
            onChange: (v: string) => {
              setStatus(v);
              setPage(1);
            },
            options: STATUSES.map((s) => ({ label: s, value: s })),
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
