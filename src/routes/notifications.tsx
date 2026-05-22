import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { MobileShell } from "@/components/MobileShell";
import { BottomNav } from "@/components/BottomNav";
import { listenNotifs, markAllRead, type Notif } from "@/lib/notifications-store";
import { ChevronLeft, Heart, MessageCircle, UserPlus, Bell, Sparkles } from "lucide-react";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Heartable" }] }),
  component: NotifPage,
});

function NotifPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notif[]>([]);

  useEffect(() => {
    if (!user) return;
    return listenNotifs(user.uid, setItems);
  }, [user]);

  useEffect(() => { if (user) markAllRead(user.uid).catch(() => {}); }, [user]);

  if (!user) return <div className="min-h-screen grid place-items-center">Login first</div>;

  return (
    <MobileShell className="p-5 gap-3">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate({ to: "/home" })} className="size-9 rounded-full bg-sunset-100 grid place-items-center">
          <ChevronLeft className="size-4" />
        </button>
        <h1 className="font-serif italic text-2xl">Notifications</h1>
      </div>

      {items.length === 0 && (
        <p className="text-center text-sm opacity-50 py-12">Abhi koi notification nahi.</p>
      )}

      <div className="space-y-2">
        {items.map((n) => (
          <NotifRow key={n.id} n={n} />
        ))}
      </div>

      <BottomNav />
    </MobileShell>
  );
}

function NotifRow({ n }: { n: Notif }) {
  const icon =
    n.kind === "like" ? <Heart className="size-4 text-rose-500" /> :
    n.kind === "comment" ? <MessageCircle className="size-4 text-sunset-600" /> :
    n.kind === "follow" ? <UserPlus className="size-4 text-sunset-600" /> :
    n.kind === "story-react" ? <Sparkles className="size-4 text-amber-500" /> :
    n.kind === "warning" ? <Bell className="size-4 text-red-600" /> :
    <Bell className="size-4 text-sunset-600" />;

  const body = (
    <div className={`flex items-center gap-3 px-3 py-3 bg-white rounded-xl ring-1 ring-foreground/5 ${n.read ? "opacity-70" : ""}`}>
      <div className="size-9 rounded-full bg-sunset-100 grid place-items-center">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-tight"><b>{n.fromName || "Heartable"}</b> {n.text || ""}</p>
        <p className="text-[10px] opacity-50 mt-0.5">{timeAgo(n.createdAt)}</p>
      </div>
    </div>
  );

  if (n.postId) return <Link to="/p/$id" params={{ id: n.postId }}>{body}</Link>;
  return body;
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}