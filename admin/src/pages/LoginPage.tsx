import * as React from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getMe, login } from "@/features/auth/api";
import { useAuthStore } from "@/features/auth/store";
import { errorMessage } from "@/lib/api";

export function LoginPage(): React.JSX.Element {
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const logout = useAuthStore((s) => s.logout);

  const [countryCode, setCountryCode] = React.useState("+91");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tokens = await login(countryCode, phone, password);
      setTokens(tokens.access_token, tokens.refresh_token);
      const me = await getMe();
      if (me.role !== "admin") {
        logout();
        setError("This account is not an admin.");
        return;
      }
      navigate("/users");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <Card className="w-[380px]">
        <CardHeader>
          <CardTitle>Tweak Admin</CardTitle>
          <p className="text-sm text-muted-foreground">Sign in with your admin account.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex gap-2">
              <Input
                className="w-20"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                aria-label="Country code"
              />
              <Input
                className="flex-1"
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                aria-label="Phone number"
              />
            </div>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-label="Password"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
