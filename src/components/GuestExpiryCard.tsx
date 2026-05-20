import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

function fmt(ms: number) {
  if (ms <= 0) return "expired";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${h}h ${m}m`;
}

export function GuestExpiryCard({ expiresAt }: { expiresAt: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const remaining = expiresAt - now;
  const pct = Math.max(0, Math.min(100, (remaining / (7 * 86400000)) * 100));

  return (
    <div className="bg-white rounded-2xl p-5 ring-1 ring-foreground/5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] opacity-60">Guest Timer</p>
          <p className="font-serif italic text-2xl leading-none mt-1">{fmt(remaining)}</p>
          <p className="text-[11px] opacity-60 mt-1">baaki — uske baad account expire</p>
        </div>
        <div className="text-3xl">⏳</div>
      </div>
      <div className="h-1.5 bg-sunset-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-sunset-400 to-sunset-700 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <Link
        to="/profile"
        className="block text-center text-xs font-semibold text-sunset-700 underline"
      >
        Google se bind kar ke save kar le →
      </Link>
    </div>
  );
}