import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import * as React from "react";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { TableToolbar } from "@/components/table-toolbar";
import { Button } from "@/components/ui/button";
import { listKyc, openKycDocument, reviewKyc } from "@/features/admin/api";
import { errorMessage } from "@/lib/api";
import type { KycSubmission } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const STATUSES = ["pending", "approved", "rejected"];

export function KycPage(): React.JSX.Element {
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState("pending");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-kyc", page, status],
    queryFn: () => listKyc(page, status || undefined),
  });

  const review = useMutation({
    mutationFn: ({ id, approve, reason }: { id: string; approve: boolean; reason?: string }) =>
      reviewKyc(id, approve, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-kyc"] }),
    onError: (err) => alert(errorMessage(err)),
  });

  const viewDoc = (id: string, index: number): void => {
    openKycDocument(id, index).catch((err: unknown) => alert(errorMessage(err)));
  };

  const columns: ColumnDef<KycSubmission>[] = [
    {
      id: "user",
      header: "User",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.user_name}</div>
          <div className="text-xs text-muted-foreground">{row.original.user_phone}</div>
        </div>
      ),
    },
    { id: "name", header: "Name on ID", cell: ({ row }) => row.original.full_name },
    {
      id: "id",
      header: "ID",
      cell: ({ row }) => `${row.original.id_type.replace("_", " ")} ••••${row.original.id_number_last4}`,
    },
    { id: "upi", header: "UPI", cell: ({ row }) => <span className="font-mono">{row.original.upi_id}</span> },
    {
      id: "docs",
      header: "Documents",
      cell: ({ row }) => (
        <div className="flex gap-1">
          {Array.from({ length: row.original.document_count }, (_, i) => (
            <Button key={i} size="sm" variant="ghost" onClick={() => viewDoc(row.original.id, i)}>
              #{i + 1}
            </Button>
          ))}
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <div>
          <StatusBadge status={row.original.status} />
          {row.original.rejection_reason && (
            <div className="mt-1 text-xs text-muted-foreground">{row.original.rejection_reason}</div>
          )}
        </div>
      ),
    },
    { id: "submitted", header: "Submitted", cell: ({ row }) => formatDate(row.original.created_at) },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        row.original.status === "pending" ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={review.isPending}
              onClick={() =>
                confirm(`Approve ${row.original.full_name}? Withdrawals will go to ${row.original.upi_id}.`) &&
                review.mutate({ id: row.original.id, approve: true })
              }
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={review.isPending}
              onClick={() => {
                const reason = prompt("Reason (shown to the user):");
                if (reason) review.mutate({ id: row.original.id, approve: false, reason });
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
      <h1 className="text-2xl font-bold">Identity verification</h1>
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
