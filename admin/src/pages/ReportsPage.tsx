import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import * as React from "react";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { TableToolbar } from "@/components/table-toolbar";
import { Button } from "@/components/ui/button";
import { listReports, resolveReport, type ReportResolution } from "@/features/admin/api";
import { errorMessage } from "@/lib/api";
import type { Report } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const STATUSES = ["open", "actioned", "dismissed"];
const TARGETS = ["user", "tweak", "message"];

export function ReportsPage(): React.JSX.Element {
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState("open");
  const [target, setTarget] = React.useState("");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reports", page, status, target],
    queryFn: () => listReports(page, { status: status || undefined, target_type: target || undefined }),
  });

  const mutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: ReportResolution }) => resolveReport(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-reports"] });
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
      void qc.invalidateQueries({ queryKey: ["admin-tweaks"] });
    },
    onError: (err) => alert(errorMessage(err)),
  });

  const act = (report: Report, body: Omit<ReportResolution, "note">, confirmText: string): void => {
    const note = prompt(`${confirmText}\nOptional note:`, "");
    if (note === null) return;
    mutation.mutate({ id: report.id, body: { ...body, note: note || undefined } });
  };

  const columns: ColumnDef<Report>[] = [
    { id: "target", header: "Target", cell: ({ row }) => <span className="font-mono">{row.original.target_type}:{row.original.target_id.slice(0, 8)}</span> },
    {
      id: "user",
      header: "Reported user",
      cell: ({ row }) => (
        <span className="font-mono">
          {row.original.target_user_id.slice(0, 8)}
          {row.original.open_reports_against_user > 1 && (
            <span className="ml-2 rounded bg-red-100 px-1.5 text-xs font-semibold text-red-700">
              {row.original.open_reports_against_user} open
            </span>
          )}
        </span>
      ),
    },
    { id: "reason", header: "Reason", cell: ({ row }) => row.original.reason.replace("_", " ") },
    { id: "details", header: "Details", cell: ({ row }) => <span className="block max-w-xs whitespace-pre-wrap">{row.original.details ?? "—"}</span> },
    { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { id: "created", header: "Reported", cell: ({ row }) => formatDate(row.original.created_at) },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const r = row.original;
        if (r.status !== "open") return r.admin_note ?? null;
        return (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => act(r, { action: "dismissed" }, "Dismiss all open reports on this target?")}>
              Dismiss
            </Button>
            {r.target_type === "tweak" && (
              <Button size="sm" disabled={mutation.isPending} onClick={() => act(r, { action: "actioned", close_tweak: true }, "Close this tweak?")}>
                Close tweak
              </Button>
            )}
            <Button size="sm" variant="destructive" disabled={mutation.isPending} onClick={() => act(r, { action: "actioned", ban_user: true }, "Ban the reported user?")}>
              Ban user
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Reports</h1>
      <TableToolbar
        filters={[
          { label: "Status", value: status, onChange: (v: string) => { setStatus(v); setPage(1); }, options: STATUSES.map((s) => ({ label: s, value: s })) },
          { label: "Target", value: target, onChange: (v: string) => { setTarget(v); setPage(1); }, options: TARGETS.map((s) => ({ label: s, value: s })) },
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
