import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import * as React from "react";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { TableToolbar } from "@/components/table-toolbar";
import { Button } from "@/components/ui/button";
import { listPaymentOrders, runReconciliation } from "@/features/admin/api";
import { errorMessage } from "@/lib/api";
import type { PaymentOrder, ReconcileReport } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";

const STATUSES = ["created", "paid", "failed"];

export function PaymentsPage(): React.JSX.Element {
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState("");
  const [stuckOnly, setStuckOnly] = React.useState(true);
  const [report, setReport] = React.useState<ReconcileReport | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-payments", page, status, stuckOnly],
    queryFn: () => listPaymentOrders(page, { status: status || undefined, stuck: stuckOnly || undefined }),
  });

  const reconcile = useMutation({
    mutationFn: runReconciliation,
    onSuccess: (r) => {
      setReport(r);
      void qc.invalidateQueries({ queryKey: ["admin-payments"] });
    },
    onError: (err) => alert(errorMessage(err)),
  });

  const columns: ColumnDef<PaymentOrder>[] = [
    { id: "order", header: "Razorpay order", cell: ({ row }) => <span className="font-mono">{row.original.provider_order_id}</span> },
    { id: "user", header: "User", cell: ({ row }) => <span className="font-mono">{row.original.user_id.slice(0, 8)}</span> },
    { id: "amount", header: "Amount", cell: ({ row }) => <span className="font-mono">{formatMoney(row.original.amount_minor)}</span> },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <div>
          <StatusBadge status={row.original.status} />
          {row.original.failure_reason && <div className="mt-1 text-xs text-muted-foreground">{row.original.failure_reason}</div>}
        </div>
      ),
    },
    { id: "payment", header: "Payment", cell: ({ row }) => <span className="font-mono">{row.original.provider_payment_id ?? "—"}</span> },
    { id: "created", header: "Created", cell: ({ row }) => formatDate(row.original.created_at) },
    { id: "checked", header: "Last checked", cell: ({ row }) => (row.original.last_checked_at ? formatDate(row.original.last_checked_at) : "—") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payments</h1>
        <Button disabled={reconcile.isPending} onClick={() => reconcile.mutate()}>
          {reconcile.isPending ? "Reconciling…" : "Run reconciliation"}
        </Button>
      </div>
      {report && (
        <div className={`rounded-md border p-3 text-sm ${report.paid_without_ledger || report.errors ? "border-red-300 bg-red-50" : "bg-muted"}`}>
          Checked {report.checked} · credited {report.credited} (captured {report.captured}) · still unpaid {report.still_unpaid} · errors {report.errors}
          {report.paid_without_ledger > 0 && (
            <strong className="ml-2 text-red-700">{report.paid_without_ledger} paid order(s) have no ledger entry — investigate.</strong>
          )}
        </div>
      )}
      <div className="flex items-center gap-4">
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
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={stuckOnly}
            onChange={(e) => {
              setStuckOnly(e.target.checked);
              setPage(1);
            }}
          />
          Only stuck (unpaid &gt; 30 min)
        </label>
      </div>
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
