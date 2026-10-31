import {
  ArrowLeftRight,
  LogOut,
  ReceiptText,
  Users,
  Wrench,
  ClipboardList,
} from "lucide-react";
import * as React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/features/auth/store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/users", label: "Users", icon: Users },
  { to: "/tweaks", label: "Tweaks", icon: Wrench },
  { to: "/applications", label: "Applications", icon: ClipboardList },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/refunds", label: "Refunds", icon: ReceiptText },
];

export function AppLayout(): React.JSX.Element {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  function onLogout(): void {
    logout();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r bg-card flex flex-col">
        <div className="px-5 py-4 text-lg font-bold">Tweak Admin</div>
        <nav className="flex-1 px-2 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-2 border-t">
          <Button variant="ghost" className="w-full justify-start" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
