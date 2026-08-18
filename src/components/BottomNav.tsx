import { Link, useLocation } from "@tanstack/react-router";
import { Home, Flame, Mic, MessageCircle, User, Gift } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { isFounder } from "@/lib/roles";
import { listenFriends } from "@/lib/social";
import { listenThreadUnread } from "@/lib/dm";

export function BottomNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const isAdmin = isFounder(user?.email);
  const unread = useDMUnread(user?.uid);
  const isActive = (p: string) => pathname === p;

  const Item = ({ to, icon: Icon, label }: any) => (
    <Link
      to={to}
      aria-label={label}
      className={`size-9 rounded-full flex items-center justify-center transition ${
        isActive(to)
          ? "bg-white/15 text-sunset-50"
          : "text-sunset-50/60 hover:text-sunset-50"
      }`}
    >
      <Icon className="size-[18px]" />
    </Link>
  );

  return (
    <nav
      className="fixed left-1/2 -translate-x-1/2 w-[min(96vw,440px)] bg-sunset-900 rounded-full p-1.5 flex items-center justify-between ring-1 ring-white/10 shadow-2xl z-50"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
    >
      <Item to="/home" icon={Home} label="Home" />
      <Item to="/trending" icon={Flame} label="Trending" />
      <Link
        to="/record"
        aria-label="Record"
        className="size-12 rounded-full bg-gradient-to-br from-sunset-400 to-sunset-700 flex items-center justify-center text-white shadow-lg shadow-sunset-600/40 ring-2 ring-sunset-50/20 -my-2 hover:scale-105 active:scale-95 transition"
      >
        <Mic className="size-5" />
      </Link>
      <div className="relative">
        <Item to="/dm" icon={MessageCircle} label="Chats" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold grid place-items-center tabular-nums">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </div>
      <Item to="/rewards" icon={Gift} label="Rewards" />
      {isAdmin ? (
        <Link
          to="/admin"
          aria-label="Admin"
          className={`size-9 rounded-full flex items-center justify-center transition ${
            isActive("/admin")
              ? "bg-white/15 text-sunset-50"
              : "text-sunset-50/60 hover:text-sunset-50"
          }`}
        >
          <User className="size-[18px]" />
        </Link>
      ) : (
        <Item to="/profile" icon={User} label="Profile" />
      )}
    </nav>
  );
}

function useDMUnread(uid?: string) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!uid) return;
    const perThread: Record<string, () => void> = {};
    const off = listenFriends(uid, (friends) => {
      const ids = friends.map((friend) => friend.uid);
      for (const id of Object.keys(perThread)) {
        if (!ids.includes(id)) { perThread[id](); delete perThread[id]; }
      }
      for (const peer of ids) {
        if (perThread[peer]) continue;
        perThread[peer] = listenThreadUnread(uid, peer, (n) =>
          setCounts((c) => ({ ...c, [peer]: n })),
        );
      }
    });
    return () => { off(); Object.values(perThread).forEach((f) => f()); };
  }, [uid]);
  return Object.values(counts).reduce((a, b) => a + b, 0);
}
