import { createFileRoute } from "@tanstack/react-router";
import { BetaBadge } from "@/components/BetaBadge";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth-context";
import { listenCurrentMilestone, listenGiveaways, enterGiveaway, type WeeklyMilestone } from "@/lib/rewards";
import { listenUserStats, type UserStats } from "@/lib/social";
import { Gift, Trophy, Sparkles, Clock } from "lucide-react";

export const Route = createFileRoute("/rewards")({
  head: () => ({ meta: [{ title: "Rewards — Heartable" }] }),
  component: RewardsPage,
});

function RewardsPage() {
  const { user, profile } = useAuth();
  const [m, setM] = useState<WeeklyMilestone | null>(null);
  const [stats, setStats] = useState<UserStats>({ followers: 0, following: 0, totalLikes: 0, totalShares: 0 });
  const [giveaways, setGiveaways] = useState<any[]>([]);

  useEffect(() => listenCurrentMilestone(setM), []);
  useEffect(() => listenGiveaways(setGiveaways), []);
  useEffect(() => { if (user) return listenUserStats(user.uid, setStats); }, [user]);

  const progressFor = (metric: string, target: number) => {
    const value =
      metric === "likes" ? stats.totalLikes :
      metric === "follows" ? stats.followers :
      metric === "shares" ? stats.totalShares :
      0;
    return Math.min(1, value / Math.max(1, target));
  };

  return (
    <MobileShell className="p-5 gap-5">
      <header>
        <p className="text-[10px] uppercase tracking-[0.25em] opacity-60 inline-flex items-center gap-1.5">Heartable Rewards <BetaBadge /></p>
        <h1 className="font-serif italic text-3xl flex items-center gap-2">Weekly Drops <Gift className="size-6 text-sunset-600" /></h1>
        <p className="text-sm opacity-70 mt-1">Complete the week's milestones. Random gifts drop every Sunday at midnight.</p>
      </header>

      {!m ? (
        <div className="bg-white rounded-2xl p-6 ring-1 ring-foreground/5 text-center">
          <Sparkles className="size-8 mx-auto text-sunset-600 mb-2" />
          <p className="font-serif italic text-xl">This week's drop is being prepared…</p>
          <p className="text-xs opacity-60 mt-1">Check back soon!</p>
        </div>
      ) : (
        <>
          <div className="bg-gradient-to-br from-sunset-700 to-sunset-900 text-sunset-50 rounded-3xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest opacity-70">Gift Pool</p>
                <p className="font-serif italic text-2xl">{m.giftPool}</p>
              </div>
              <Trophy className="size-8" />
            </div>
            <div className="flex items-center gap-2 text-[11px] opacity-80">
              <Clock className="size-3" /> Resets next Sunday at midnight
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-[10px] uppercase tracking-widest opacity-60">Your Tasks</h2>
            {m.tasks.map((t) => {
              const prog = progressFor(t.metric, t.target);
              const done = prog >= 1;
              return (
                <div key={t.id} className="bg-white rounded-2xl p-4 ring-1 ring-foreground/5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{t.title}</p>
                      <p className="text-xs opacity-60 mt-0.5">{t.description}</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-sunset-100 px-2 py-1 rounded-full whitespace-nowrap">{t.rewardLabel}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-sunset-100 rounded-full overflow-hidden">
                      <div className={`h-full ${done ? "bg-emerald-500" : "bg-sunset-600"} transition-all`} style={{ width: `${Math.round(prog * 100)}%` }} />
                    </div>
                    <span className="text-[11px] font-semibold tabular-nums opacity-70">{Math.round(prog * 100)}%</span>
                  </div>
                </div>
              );
            })}
          </section>
        </>
      )}

      <section className="space-y-3 pt-2">
        <h2 className="text-[10px] uppercase tracking-widest opacity-60">Giveaways</h2>
        {giveaways.length === 0 && (
          <p className="text-xs opacity-50 text-center py-4">No active giveaways. Stay tuned!</p>
        )}
        {giveaways.map((g) => {
          const entered = !!(g.entries && user && g.entries[user.uid]);
          const ended = g.endsAt && g.endsAt < Date.now();
          return (
            <div key={g.id} className="bg-white rounded-2xl p-4 ring-1 ring-foreground/5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm">{g.title}</p>
                <span className="text-[10px] uppercase tracking-widest bg-sunset-900 text-sunset-50 px-2 py-0.5 rounded-full">{g.prize}</span>
              </div>
              <p className="text-xs opacity-70">{g.description}</p>
              {g.winner ? (
                <p className="text-xs text-emerald-700 font-semibold">🏆 Winner: {g.winner.name}</p>
              ) : ended ? (
                <p className="text-xs opacity-60">Ended — picking winner soon</p>
              ) : (
                <button
                  disabled={!user || entered}
                  onClick={() => user && profile && enterGiveaway(g.id, user.uid, profile.name)}
                  className="w-full py-2 rounded-full bg-sunset-900 text-sunset-50 text-xs font-semibold disabled:opacity-50"
                >
                  {entered ? "Entered ✓" : "Enter Giveaway"}
                </button>
              )}
            </div>
          );
        })}
      </section>

      <BottomNav />
    </MobileShell>
  );
}