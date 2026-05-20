import { useEffect, useState } from "react";
import { listenLatestBroadcast, type Broadcast } from "@/lib/social";

const KEY = "heartable.broadcast.seen";

export function BroadcastBanner() {
  const [b, setB] = useState<Broadcast | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    return listenLatestBroadcast((latest) => {
      if (!latest) return;
      const seen = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
      if (seen === latest.id) return;
      setB(latest);
      setDismissed(false);
    });
  }, []);

  if (!b || dismissed) return null;

  return (
    <div className="mx-4 mb-3 rounded-2xl bg-sunset-900 text-sunset-50 p-4 flex items-start justify-between gap-3 shadow-lg">
      <div className="flex-1">
        <p className="text-[10px] uppercase tracking-[0.2em] opacity-60">📣 Announcement</p>
        <p className="font-serif italic text-lg leading-tight mt-1">{b.title}</p>
        <p className="text-xs opacity-80 mt-1">{b.body}</p>
      </div>
      <button
        onClick={() => {
          localStorage.setItem(KEY, b.id);
          setDismissed(true);
        }}
        className="opacity-60 text-lg"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}