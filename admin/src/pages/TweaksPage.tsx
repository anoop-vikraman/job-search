import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import * as React from "react";

import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { closeTweak, listTweaks } from "@/features/admin/api";
import type { Tweak } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";

export function TweaksPage(): React.JSX.Element {
  const [page, setPage] = React.useState(1);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-tweaks", page],
    queryFn: () => listTweaks(page),
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => closeTweak(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-tweaks"] }),
  });

  const columns: ColumnDef<Tweak>[] = [
    { id: "title", header: "Title", accessorKey: "title" },
    { id: "category", header: "Category", accessorKey: "category" },
    { id: "type", header: "Type", accessorKey: "tweak_type" },
    {
      id: "price",
      header: "Price",
      cell: ({ row }) =>
        row.original.price_minor !== null
          ? formatMoney(row.original.price_minor, row.original.currency)
          : "Quote",
    },
    { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { id: "created", header: "Created", cell: ({ row }) => formatDate(row.original.created_at) },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        row.original.status !== "closed" ? (
          <Button
            variant="outline"
            size="sm"
            disabled={closeMutation.isPending}
            onClick={() => confirm("Close this tweak?") && closeMutation.mutate(row.original.id)}
          >
            Close
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Tweaks</h1>
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
