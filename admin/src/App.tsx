import * as React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { useAuthStore } from "@/features/auth/store";
import { ApplicationsPage } from "@/pages/ApplicationsPage";
import { LoginPage } from "@/pages/LoginPage";
import { RefundsPage } from "@/pages/RefundsPage";
import { TransactionsPage } from "@/pages/TransactionsPage";
import { TweaksPage } from "@/pages/TweaksPage";
import { UsersPage } from "@/pages/UsersPage";

function ProtectedRoute({ children }: { children: React.ReactNode }): React.JSX.Element {
  const isAuthenticated = useAuthStore((s) => s.accessToken !== null);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export function App(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/users" element={<UsersPage />} />
        <Route path="/tweaks" element={<TweaksPage />} />
        <Route path="/applications" element={<ApplicationsPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/refunds" element={<RefundsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/users" replace />} />
    </Routes>
  );
}
