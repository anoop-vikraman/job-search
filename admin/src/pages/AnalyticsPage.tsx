import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { getFunnel } from "@/features/admin/api";

const LABELS: Record<string, string> = {
  tweak_posted: "Tweaks posted",
  application_submitted: "Applications",
  application_accepted: "Accepted",
  job_completed: "Completed",
  app_open: "App opens",
  tweak_viewed: "Tweak views",
  search_performed: "Searches",
  checkout_opened: "Checkouts opened",
  topup_paid: "Top-ups paid",
  payout_requested: "Withdrawals requested",
  dispute_opened: "Disputes opened",
};
const RANGES = [7, 30, 90];

export function AnalyticsPage(): React.JSX.Element {
  const [days, setDays] = React.useState(30);
  const { data, isLoading } = useQuery({ queryKey: ["admin-funnel", days], queryFn: () => getFunnel(days) });
  const max = Math.max(1, ...(data?.steps.map((s) => s.count) ?? [1]));
  const funnelNames = data?.steps.map((s) => s.name) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex gap-1 rounded-md border p-1">
          {RANGES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`rounded px-3 py-1 text-sm ${days === d ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>

      {isLoading || !data ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <>
          <section className="rounded-lg border bg-card p-5">
            <h2 className="mb-4 font-semibold">Marketplace funnel</h2>
            <div className="space-y-3">
              {data.steps.map((s) => (
                <div key={s.name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{LABELS[s.name] ?? s.name}</span>
                    <span className="text-muted-foreground">
                      {s.count.toLocaleString()} · {s.unique_users} users
                      {s.conversion != null && <> · {(s.conversion * 100).toFixed(1)}% of previous</>}
                    </span>
                  </div>
                  <div className="h-3 rounded bg-muted">
                    <div className="h-3 rounded bg-primary" style={{ width: `${(s.count / max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Object.entries(data.other_events).map(([name, v]) => (
              <div key={name} className="rounded-lg border bg-card p-4">
                <div className="text-xs text-muted-foreground">{LABELS[name] ?? name}</div>
                <div className="text-xl font-bold">{v.count.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{v.unique_users} users</div>
              </div>
            ))}
          </section>

          <section className="rounded-lg border bg-card p-5">
            <h2 className="mb-3 font-semibold">Daily</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1">Date</th>
                  {funnelNames.map((n) => (
                    <th key={n} className="py-1">{LABELS[n] ?? n}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...data.daily].reverse().map((row) => (
                  <tr key={row.date} className="border-t">
                    <td className="py-1 font-mono">{row.date}</td>
                    {funnelNames.map((n) => (
                      <td key={n} className="py-1">{row[n] ?? 0}</td>
                    ))}
                  </tr>
                ))}
                {data.daily.length === 0 && (
                  <tr>
                    <td colSpan={funnelNames.length + 1} className="py-3 text-muted-foreground">
                      No events in this range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
