import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import * as React from "react";

import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { listApplications } from "@/features/admin/api";
import type { Application } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";

export function ApplicationsPage(): React.JSX.Element {
  const [page, setPage] = React.useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-applications", page],
    queryFn: () => listApplications(page),
  });

  const columns: ColumnDef<Application>[] = [
    { id: "tweak", header: "Tweak", cell: ({ row }) => row.original.tweak_id.slice(0, 8) },
    { id: "provider", header: "Provider", cell: ({ row }) => row.original.provider_user_id.slice(0, 8) },
    {
      id: "quote",
      header: "Quote",
      cell: ({ row }) =>
        row.original.quoted_price_minor !== null
          ? formatMoney(row.original.quoted_price_minor)
          : "—",
    },
    { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { id: "applied", header: "Applied", cell: ({ row }) => formatDate(row.original.applied_at) },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Applications</h1>
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
