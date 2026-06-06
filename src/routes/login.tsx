import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LoginCard } from "@/components/LoginCard";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Login — Heartable" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, guestExpired, upgradeGuestGoogle, signOut } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (user && !guestExpired) navigate({ to: "/home" });
  }, [user, guestExpired, navigate]);

  const restoreGoogle = async () => {
    setBusy(true); setErr(null);
    try { await upgradeGuestGoogle(); navigate({ to: "/home" }); }
    catch (e: any) { setErr(e?.message || "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-[100dvh] bg-sunset-50 flex flex-col items-center justify-center p-5">
      <div className="text-center mb-8">
        <h1 className="font-serif italic text-5xl flex items-center justify-center gap-2">Heartable <BetaBadge /></h1>
        <p className="text-[10px] tracking-[0.3em] uppercase opacity-60 mt-1">
          Voices of the Soul
        </p>
      </div>
      {guestExpired && (
        <div className="w-full max-w-sm mb-4 p-4 rounded-2xl bg-red-50 ring-1 ring-red-200 text-center space-y-3">
          <p className="text-sm text-red-800 font-semibold">
            ⏰ Guest period expired
          </p>
          <p className="text-xs text-red-700">
            Your guest account has expired. Sign in with Google to restore your data.
          </p>
          <button
            onClick={restoreGoogle}
            disabled={busy}
            className="w-full py-2.5 rounded-full bg-sunset-900 text-sunset-50 text-sm font-semibold disabled:opacity-50"
          >
            🔗 Continue with Google to restore
          </button>
          <button
            onClick={async () => { await signOut(); window.location.reload(); }}
            className="text-[11px] underline opacity-60"
          >
            Naya account banao (data delete)
          </button>
          {err && <p className="text-[11px] text-red-700">{err}</p>}
        </div>
      )}
      {!guestExpired && (
        <LoginCard onDone={() => navigate({ to: "/home" })} />
      )}
    </div>
  );
}
