import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import * as React from "react";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { TableToolbar } from "@/components/table-toolbar";
import { Button } from "@/components/ui/button";
import { listDisputes, resolveDispute, type DisputeResolution } from "@/features/admin/api";
import { errorMessage } from "@/lib/api";
import type { Dispute, DisputeOutcome } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";

const DISPUTE_STATUSES = ["open", "resolved"];

const OUTCOME_LABEL: Record<DisputeOutcome, string> = {
  release: "Released to provider",
  refund: "Refunded to lister",
  partial: "Partial",
};

/** Ask for the settlement details; returns null if the admin cancels. */
function askResolution(outcome: DisputeOutcome): DisputeResolution | null {
  let provider_amount_minor: number | undefined;
  if (outcome === "partial") {
    const rupees = prompt("Amount (₹) the provider receives before fees:");
    if (rupees === null) return null;
    const value = Number(rupees);
    if (!Number.isFinite(value) || value <= 0) {
      alert("Enter a positive amount.");
      return null;
    }
    provider_amount_minor = Math.round(value * 100);
  }
  const verb = { release: "Release the full payment to the provider", refund: "Refund the lister", partial: "Split the payment" }[outcome];
  const note = prompt(`${verb}? Optional note for both parties:`, "");
  if (note === null) return null;
  return { outcome, provider_amount_minor, note: note || undefined };
}

export function DisputesPage(): React.JSX.Element {
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState("open");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-disputes", page, status],
    queryFn: () => listDisputes(page, status || undefined),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: DisputeResolution }) => resolveDispute(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-disputes"] }),
    onError: (err) => alert(errorMessage(err)),
  });

  const resolve = (id: string, outcome: DisputeOutcome): void => {
    const body = askResolution(outcome);
    if (body) resolveMutation.mutate({ id, body });
  };

  const columns: ColumnDef<Dispute>[] = [
    { id: "application", header: "Application", cell: ({ row }) => <span className="font-mono">{row.original.application_id.slice(0, 8)}</span> },
    { id: "opened_by", header: "Opened by", cell: ({ row }) => <span className="font-mono">{row.original.opened_by_user_id.slice(0, 8)}</span> },
    { id: "reason", header: "Reason", cell: ({ row }) => <span className="block max-w-xs whitespace-pre-wrap">{row.original.reason}</span> },
    {
      id: "evidence",
      header: "Evidence",
      cell: ({ row }) =>
        row.original.evidence.length === 0 ? (
          "—"
        ) : (
          <div className="flex gap-1">
            {row.original.evidence.map((e, i) => (
              <a key={e.url} href={e.url} target="_blank" rel="noreferrer" className="text-primary underline">
                #{i + 1}
              </a>
            ))}
          </div>
        ),
    },
    { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      id: "outcome",
      header: "Outcome",
      cell: ({ row }) => {
        const d = row.original;
        if (!d.outcome) return "—";
        const amount = d.outcome === "partial" && d.provider_amount_minor != null ? ` (${formatMoney(d.provider_amount_minor)})` : "";
        return OUTCOME_LABEL[d.outcome] + amount;
      },
    },
    { id: "opened", header: "Opened", cell: ({ row }) => formatDate(row.original.created_at) },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        row.original.status === "open" ? (
          <div className="flex gap-2">
            <Button size="sm" disabled={resolveMutation.isPending} onClick={() => resolve(row.original.id, "release")}>
              Release
            </Button>
            <Button size="sm" variant="outline" disabled={resolveMutation.isPending} onClick={() => resolve(row.original.id, "refund")}>
              Refund
            </Button>
            <Button size="sm" variant="outline" disabled={resolveMutation.isPending} onClick={() => resolve(row.original.id, "partial")}>
              Split
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Disputes</h1>
      <TableToolbar
        filters={[
          {
            label: "Status",
            value: status,
            onChange: (v: string) => {
              setStatus(v);
              setPage(1);
            },
            options: DISPUTE_STATUSES.map((s) => ({ label: s, value: s })),
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
