import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyHost } from "@/lib/api";
import { setHostPassword } from "@/lib/storage";

export default function HostLoginRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await verifyHost(password);
      setHostPassword(password);
      const next = searchParams.get("next") || "/host/rooms";
      navigate(next, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-5 border rounded-xl p-6 bg-card shadow-sm"
      >
        <div className="text-center">
          <h1 className="text-xl font-semibold">主持人登入</h1>
          <p className="text-sm text-muted-foreground mt-1">
            請輸入後台密碼
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw">密碼</Label>
          <Input
            id="pw"
            type="password"
            required
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "驗證中..." : "進入後台"}
        </Button>
      </form>
    </div>
  );
}
