import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { BarChart3, ChevronLeft, MessageCircle, Repeat2, SendHorizontal } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth-context";
import { listenCreatorAnalytics, type CreatorPostAnalytics } from "@/lib/creator-analytics";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [
    { title: "Creator Analytics — Heartable" },
    { name: "description", content: "Track private sends, story shares, and replays for your Heartable posts." },
    { property: "og:title", content: "Creator Analytics — Heartable" },
    { property: "og:description", content: "Track private sends, story shares, and replays for your Heartable posts." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: CreatorAnalyticsPage,
});

function CreatorAnalyticsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<CreatorPostAnalytics[]>([]);
  const [days, setDays] = useState(30);
  useEffect(() => user ? listenCreatorAnalytics(user.uid, setRows) : undefined, [user]);
  const visible = useMemo(() => rows.filter((row) => row.createdAt >= Date.now() - days * 86400000), [rows, days]);
  const totals = visible.reduce((sum, row) => ({ dm: sum.dm + row.dm, story: sum.story + row.story, replays: sum.replays + row.replays }), { dm: 0, story: 0, replays: 0 });
  if (!user) return <div className="min-h-screen grid place-items-center text-sm">Sign in to view analytics.</div>;
  return <MobileShell className="p-5 gap-5">
    <header className="flex items-center gap-3">
      <Link to="/profile" aria-label="Back to profile" className="size-9 rounded-full bg-sunset-100 grid place-items-center"><ChevronLeft /></Link>
      <div><p className="text-[10px] uppercase opacity-50">Creator tools</p><h1 className="font-serif italic text-3xl">Analytics</h1></div>
    </header>
    <div className="flex rounded-xl bg-muted p-1">
      {[7, 30, 90].map((value) => <button key={value} onClick={() => setDays(value)} className={`flex-1 py-2 rounded-lg text-xs font-semibold ${days === value ? "bg-card shadow-sm" : "text-muted-foreground"}`}>{value} days</button>)}
    </div>
    <section className="grid grid-cols-3 gap-2">
      <Metric icon={<MessageCircle />} value={totals.dm} label="DM sends" />
      <Metric icon={<SendHorizontal />} value={totals.story} label="Stories" />
      <Metric icon={<Repeat2 />} value={totals.replays} label="Replays" />
    </section>
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase opacity-50">Per post</h2>
      {visible.length === 0 && <div className="py-10 text-center text-sm text-muted-foreground"><BarChart3 className="mx-auto mb-2 opacity-40" />No activity in this range.</div>}
      {visible.map((row) => <Link key={row.postId} to="/p/$id" params={{ id: row.postId }} className="block bg-card rounded-xl p-3 ring-1 ring-border">
        <p className="text-sm font-medium truncate">{row.caption}</p>
        <p className="mt-2 text-xs text-muted-foreground">{row.dm} DM · {row.story} stories · {row.replays} replays</p>
      </Link>)}
    </section>
    <BottomNav />
  </MobileShell>;
}

function Metric({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return <div className="bg-card rounded-xl p-3 ring-1 ring-border text-center"><span className="mx-auto block w-fit opacity-50">{icon}</span><p className="font-serif italic text-2xl">{value}</p><p className="text-[10px] text-muted-foreground">{label}</p></div>;
}