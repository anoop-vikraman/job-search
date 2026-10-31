import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import * as React from "react";

import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { banUser, listUsers } from "@/features/admin/api";
import { formatDate } from "@/lib/utils";
import type { UserProfile } from "@/lib/types";

export function UsersPage(): React.JSX.Element {
  const [page, setPage] = React.useState(1);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", page],
    queryFn: () => listUsers(page),
  });

  const banMutation = useMutation({
    mutationFn: (u: UserProfile) =>
      banUser(u.id, !u.is_banned, u.is_banned ? undefined : "Policy violation"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const columns: ColumnDef<UserProfile>[] = [
    {
      id: "name",
      header: "Name",
      cell: ({ row }) =>
        `${row.original.first_name ?? ""} ${row.original.last_name ?? ""}`.trim() || "—",
    },
    { id: "phone", header: "Phone", cell: ({ row }) => `${row.original.country_code} ${row.original.phone_number}` },
    { id: "role", header: "Role", accessorKey: "role" },
    {
      id: "rating",
      header: "Rating",
      cell: ({ row }) => `${row.original.rating_avg} (${row.original.rating_count})`,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.is_banned ? "rejected" : "active"} />,
    },
    { id: "joined", header: "Joined", cell: ({ row }) => formatDate(row.original.created_at) },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant={row.original.is_banned ? "outline" : "destructive"}
          size="sm"
          disabled={banMutation.isPending}
          onClick={() => {
            if (row.original.is_banned || confirm(`Ban ${row.original.first_name}?`)) {
              banMutation.mutate(row.original);
            }
          }}
        >
          {row.original.is_banned ? "Unban" : "Ban"}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Users</h1>
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
