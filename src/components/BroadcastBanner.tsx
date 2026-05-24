import { useEffect, useState } from "react";
import { listenLatestBroadcast, listenPollResults, votePoll, type Broadcast } from "@/lib/social";
import { useAuth } from "@/lib/auth-context";

const KEY = "heartable.broadcast.seen";

export function BroadcastBanner() {
  const { user } = useAuth();
  const [b, setB] = useState<Broadcast | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [poll, setPoll] = useState<{ counts: Record<number, number>; myVote: number | null; total: number }>({ counts: {}, myVote: null, total: 0 });

  useEffect(() => {
    return listenLatestBroadcast((latest) => {
      if (!latest) return;
      const seen = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
      if (seen === latest.id) return;
      setB(latest);
      setDismissed(false);
    });
  }, []);

  useEffect(() => {
    if (!b?.poll || !b.id) return;
    return listenPollResults(b.id, setPoll, user?.uid);
  }, [b?.id, b?.poll, user?.uid]);

  if (!b || dismissed) return null;

  return (
    <div className="mx-4 mb-3 rounded-2xl bg-sunset-900 text-sunset-50 p-4 shadow-lg space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-[0.2em] opacity-60">📣 Announcement</p>
          <p className="font-serif italic text-lg leading-tight mt-1">{b.title}</p>
          <p className="text-xs opacity-80 mt-1">{b.body}</p>
        </div>
        <button onClick={() => { localStorage.setItem(KEY, b.id); setDismissed(true); }}
          className="opacity-60 text-lg" aria-label="Dismiss">✕</button>
      </div>
      {b.button?.url && (
        <a href={b.button.url} target="_blank" rel="noreferrer"
          className="block w-full text-center py-2.5 rounded-full bg-sunset-50 text-sunset-900 text-xs font-semibold">
          {b.button.label || "Open"}
        </a>
      )}
      {b.poll && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold">{b.poll.question}</p>
          {b.poll.options.map((opt, i) => {
            const count = poll.counts[i] || 0;
            const pct = poll.total ? Math.round((count / poll.total) * 100) : 0;
            const mine = poll.myVote === i;
            return (
              <button key={i} disabled={!user}
                onClick={() => user && votePoll(b.id, user.uid, i)}
                className={`w-full text-left text-[11px] px-3 py-2 rounded-xl relative overflow-hidden ring-1 ${mine ? "ring-sunset-50" : "ring-white/10"} bg-white/5`}>
                <div className="absolute inset-y-0 left-0 bg-white/15" style={{ width: `${pct}%` }} />
                <span className="relative flex justify-between gap-2">
                  <span>{mine ? "✓ " : ""}{opt}</span>
                  <span className="opacity-70 tabular-nums">{pct}% · {count}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}