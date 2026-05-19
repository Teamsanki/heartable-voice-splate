import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export function LoginCard({ onDone }: { onDone?: () => void }) {
  const auth = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "guest">("signin");
  const [agreed, setAgreed] = useState(false);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    if (!agreed) {
      setError("Terms accept karna hoga pehle.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await fn();
      onDone?.();
    } catch (e: any) {
      setError(e?.message || "Kuch galat hua, dobara try kar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-sm bg-white/80 backdrop-blur rounded-[28px] p-7 ring-1 ring-foreground/5 shadow-[0_30px_60px_-30px_oklch(0.66_0.19_38/0.3)] space-y-5">
      <div className="text-center space-y-1">
        <h2 className="font-serif italic text-3xl">Welcome back</h2>
        <p className="text-xs text-sunset-900/60">
          Apni awaaz se baat shuru kar.
        </p>
      </div>

      <div className="flex bg-sunset-100 rounded-full p-1 text-xs font-medium">
        {(["signin", "signup", "guest"] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-full transition ${
              mode === m ? "bg-sunset-900 text-sunset-50" : "text-sunset-900/70"
            }`}
          >
            {m === "signin" ? "Login" : m === "signup" ? "Sign up" : "Guest"}
          </button>
        ))}
      </div>

      {mode !== "guest" ? (
        <>
          <button
            onClick={() => run(() => auth.signInGoogle())}
            disabled={busy}
            className="w-full py-3 rounded-full bg-white ring-1 ring-foreground/10 text-sm font-semibold hover:bg-sunset-50 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span className="size-4 inline-block rounded-full bg-gradient-to-br from-red-400 via-yellow-400 to-blue-500" />
            Continue with Google
          </button>
          <div className="flex items-center gap-3 text-[10px] text-sunset-900/40 uppercase tracking-widest">
            <div className="flex-1 h-px bg-foreground/10" /> or <div className="flex-1 h-px bg-foreground/10" />
          </div>
          <div className="space-y-2.5">
            {mode === "signup" && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Naam"
                maxLength={50}
                className="w-full px-4 py-3 rounded-2xl bg-sunset-50 ring-1 ring-foreground/10 text-sm outline-none focus:ring-sunset-600"
              />
            )}
            <input
              value={email}
              type="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              maxLength={120}
              className="w-full px-4 py-3 rounded-2xl bg-sunset-50 ring-1 ring-foreground/10 text-sm outline-none focus:ring-sunset-600"
            />
            <input
              value={pw}
              type="password"
              onChange={(e) => setPw(e.target.value)}
              placeholder="Password"
              maxLength={64}
              className="w-full px-4 py-3 rounded-2xl bg-sunset-50 ring-1 ring-foreground/10 text-sm outline-none focus:ring-sunset-600"
            />
            <button
              onClick={() =>
                run(() =>
                  mode === "signup"
                    ? auth.signUpEmail(email.trim(), pw, name.trim())
                    : auth.signInEmail(email.trim(), pw),
                )
              }
              disabled={busy}
              className="w-full py-3 rounded-full bg-sunset-600 text-white text-sm font-semibold hover:bg-sunset-700 transition disabled:opacity-50"
            >
              {mode === "signup" ? "Create account" : "Login"}
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Apna naam likh"
            maxLength={50}
            className="w-full px-4 py-3 rounded-2xl bg-sunset-50 ring-1 ring-foreground/10 text-sm outline-none focus:ring-sunset-600"
          />
          <p className="text-[11px] text-sunset-900/60 leading-relaxed">
            Guest mode 7 din ke liye hai — sirf testing. Uske baad login karna hoga
            warna data delete ho jaayega.
          </p>
          <button
            onClick={() => run(() => auth.signInGuest(name.trim() || "Guest"))}
            disabled={busy || !name.trim()}
            className="w-full py-3 rounded-full bg-sunset-900 text-sunset-50 text-sm font-semibold hover:bg-sunset-700 transition disabled:opacity-50"
          >
            Continue as Guest
          </button>
        </div>
      )}

      <label className="flex items-start gap-2 text-[11px] text-sunset-900/70 leading-relaxed">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 accent-sunset-600"
        />
        <span>
          I agree to the Terms & Privacy. Data India region me safely store hota hai
          aur transit + at rest pe encrypted hai.
        </span>
      </label>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
      )}
    </div>
  );
}
