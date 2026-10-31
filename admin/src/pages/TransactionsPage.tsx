import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import * as React from "react";

import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { listTransactions } from "@/features/admin/api";
import type { Transaction } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";

export function TransactionsPage(): React.JSX.Element {
  const [page, setPage] = React.useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-transactions", page],
    queryFn: () => listTransactions(page),
  });

  const columns: ColumnDef<Transaction>[] = [
    { id: "type", header: "Type", accessorKey: "type" },
    {
      id: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="font-mono">{formatMoney(row.original.amount_minor)}</span>
      ),
    },
    { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      id: "reference",
      header: "Reference",
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.reference ?? "—"}</span>,
    },
    { id: "created", header: "Created", cell: ({ row }) => formatDate(row.original.created_at) },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Transactions</h1>
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
