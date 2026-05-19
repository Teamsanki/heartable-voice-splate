import { Link, useLocation } from "@tanstack/react-router";
import { Home, Search, Mic, MessageCircle, User } from "lucide-react";

export function BottomNav() {
  const { pathname } = useLocation();
  const isActive = (p: string) => pathname === p;

  const Item = ({ to, icon: Icon, label }: any) => (
    <Link
      to={to}
      aria-label={label}
      className={`size-10 rounded-full flex items-center justify-center transition ${
        isActive(to) ? "bg-white/15 text-sunset-50" : "text-sunset-50/60 hover:text-sunset-50"
      }`}
    >
      <Icon className="size-4" />
    </Link>
  );

  return (
    <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[min(92vw,380px)] bg-sunset-900 rounded-full p-2 flex items-center justify-between ring-1 ring-white/10 shadow-2xl z-50">
      <Item to="/home" icon={Home} label="Home" />
      <Item to="/mehfil" icon={Search} label="Mehfil" />
      <Link
        to="/record"
        aria-label="Record"
        className="size-12 rounded-full bg-sunset-600 flex items-center justify-center text-white shadow-lg shadow-sunset-600/30 ring-2 ring-sunset-50/10 -my-1.5 hover:scale-105 transition"
      >
        <Mic className="size-5" />
      </Link>
      <Item to="/dm" icon={MessageCircle} label="Messages" />
      <Item to="/profile" icon={User} label="Profile" />
    </nav>
  );
}
