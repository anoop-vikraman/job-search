import * as React from "react";

import { Badge } from "@/components/ui/badge";

type Tone = "success" | "danger" | "pending" | "neutral";

const TONES: Record<string, Tone> = {
  active: "success",
  accepted: "success",
  completed: "success",
  approved: "success",
  processed: "success",
  rejected: "danger",
  cancelled: "danger",
  failed: "danger",
  reversed: "danger",
  pending: "pending",
  requested: "pending",
  hold: "pending",
  draft: "neutral",
  closed: "neutral",
  withdrawn: "neutral",
};

export function StatusBadge({ status }: { status: string }): React.JSX.Element {
  return <Badge tone={TONES[status] ?? "neutral"}>{status}</Badge>;
}
