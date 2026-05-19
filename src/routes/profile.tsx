import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db, VOICE_ROOT } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { BottomNav } from "@/components/BottomNav";
import { badgeFor } from "@/lib/streak";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — Heartable" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, isGuest, signOut, upgradeGuestEmail, upgradeGuestGoogle } = useAuth();
  const navigate = useNavigate();
  const [streak, setStreak] = useState<{ count: number; badge: string } | null>(null);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = onValue(ref(db, `${VOICE_ROOT}/${user.uid}/streak`), (s) =>
      setStreak(s.val()),
    );
    return () => unsub();
  }, [user]);

  if (!user || !profile) {
    return (
      <div className="min-h-screen grid place-items-center">
        <button onClick={() => navigate({ to: "/login" })} className="underline">Login</button>
      </div>
    );
  }

  const days = streak?.count || 0;
  const badge = streak?.badge || badgeFor(days);

  const upgradeEmail = async () => {
    setBusy(true); setErr(null);
    try { await upgradeGuestEmail(email.trim(), pw); }
    catch (e: any) { setErr(e?.message || "Failed"); }
    finally { setBusy(false); }
  };

  const upgradeGoogle = async () => {
    setBusy(true); setErr(null);
    try { await upgradeGuestGoogle(); }
    catch (e: any) { setErr(e?.message || "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-sunset-50 text-sunset-900">
      <div className="max-w-[460px] mx-auto min-h-screen flex flex-col p-6 gap-5 pb-32">
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-full bg-sunset-900 text-sunset-50 grid place-items-center text-2xl font-semibold overflow-hidden">
            {profile.photo ? <img src={profile.photo} className="w-full h-full object-cover" /> : profile.name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h1 className="font-serif italic text-3xl leading-none">{profile.name}</h1>
            <p className="text-xs opacity-60 mt-1">
              {isGuest ? "Guest · 7 din" : user.email || "Signed in"}
            </p>
          </div>
        </div>

        <div className="bg-sunset-900 text-sunset-50 rounded-2xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-60">Awaaz Streak</p>
            <p className="font-serif text-2xl italic mt-1">{days} days · {badge}</p>
          </div>
          <div className="text-3xl">🎙️</div>
        </div>

        {isGuest && (
          <div className="bg-white rounded-2xl p-5 ring-1 ring-foreground/5 space-y-3">
            <h2 className="font-serif italic text-xl">Save your streaks</h2>
            <p className="text-xs opacity-70">
              Guest mode 7 din ka hai. Email ya Google se account bana le — streak,
              friends, sab save reh jaayega.
            </p>
            <button
              onClick={upgradeGoogle}
              disabled={busy}
              className="w-full py-3 rounded-full bg-white ring-1 ring-foreground/10 text-sm font-semibold hover:bg-sunset-50 transition disabled:opacity-50"
            >
              Link with Google
            </button>
            <div className="space-y-2">
              <input
                value={email}
                type="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-4 py-2.5 rounded-xl bg-sunset-50 ring-1 ring-foreground/10 text-sm outline-none"
              />
              <input
                value={pw}
                type="password"
                onChange={(e) => setPw(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-2.5 rounded-xl bg-sunset-50 ring-1 ring-foreground/10 text-sm outline-none"
              />
              <button
                onClick={upgradeEmail}
                disabled={busy || !email || !pw}
                className="w-full py-3 rounded-full bg-sunset-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                Save account
              </button>
            </div>
            {err && <p className="text-xs text-red-600">{err}</p>}
          </div>
        )}

        <button
          onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
          className="w-full py-3 rounded-full bg-sunset-100 text-sunset-900 text-sm font-medium hover:bg-sunset-200 transition"
        >
          Sign out
        </button>

        <BottomNav />
      </div>
    </div>
  );
}
