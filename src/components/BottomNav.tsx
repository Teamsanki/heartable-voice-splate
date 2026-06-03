import { Link, useLocation } from "@tanstack/react-router";
import { Home, Flame, Mic, MessageCircle, User, Gift } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { isFounder } from "@/lib/roles";

export function BottomNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const isAdmin = isFounder(user?.email);
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
      <Item to="/dm" icon={MessageCircle} label="Chats" />
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
