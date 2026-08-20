import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { get, onValue, ref } from "firebase/database";
import { db, VOICE_ROOT } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { BottomNav } from "@/components/BottomNav";
import { GuestLock } from "@/components/GuestLock";
import { listenFriends } from "@/lib/social";
import { listenThreadUnread } from "@/lib/dm";
import { listenCircles, type Circle } from "@/lib/circles";
import { BetaBadge } from "@/components/BetaBadge";
import { MobileShell } from "@/components/MobileShell";
import { CircleUserRound, MessageCircle, Plus, Search } from "lucide-react";

export const Route = createFileRoute("/dm")({
  head: () => ({ meta: [{ title: "Chats & Circles — Heartable" }, { name: "description", content: "Private chats and voice circles on Heartable." }, { property: "og:title", content: "Chats & Circles — Heartable" }, { property: "og:description", content: "Private chats and voice circles on Heartable." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: DMList,
});

type Person = { uid: string; name: string; photo?: string | null; email?: string | null; lastMsg?: string; lastMsgAt?: number; kinds?: string[] };
type Filter = "all" | "unread" | "posts" | "stories";

function DMList() {
  const { user, isGuest } = useAuth();
  const [tab, setTab] = useState<"chats" | "circles">("chats");
  const [friends, setFriends] = useState<Person[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [unreads, setUnreads] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!user) return;
    return listenFriends(user.uid, async (people) => {
      const rows = await Promise.all(people.map(async (person) => {
        const summary = await get(ref(db, `inboxes/${user.uid}/${person.uid}`));
        const value = summary.val() || {};
        const messages = await get(ref(db, `dm/${[user.uid, person.uid].sort().join("_")}/messages`));
        const kinds: string[] = [];
        messages.forEach((message) => { const kind = String(message.child("kind").val() || "voice"); if (!kinds.includes(kind)) kinds.push(kind); });
        return { ...person, lastMsg: value.text || "Tap to start the conversation", lastMsgAt: value.createdAt || 0, kinds };
      }));
      setFriends(rows.sort((a, b) => Number(b.lastMsgAt || 0) - Number(a.lastMsgAt || 0)));
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return listenCircles(user.uid, setCircles);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const offs = friends.map((friend) => listenThreadUnread(user.uid, friend.uid, (count) => setUnreads((current) => ({ ...current, [friend.uid]: count }))));
    return () => offs.forEach((off) => off());
  }, [user, friends.map((friend) => friend.uid).join(",")]);

  if (isGuest) return <GuestLock feature="Chats and Circles" />;
  if (!user) return <div className="min-h-screen grid place-items-center">Sign in to open Chats.</div>;

  const needle = query.trim().toLowerCase();
  const filteredFriends = friends.filter((person) => {
    if (needle && !`${person.name} ${person.lastMsg || ""}`.toLowerCase().includes(needle)) return false;
    if (filter === "unread") return Number(unreads[person.uid] || 0) > 0;
    if (filter === "posts") return person.kinds?.includes("post");
    if (filter === "stories") return person.kinds?.some((kind) => kind.startsWith("story-"));
    return true;
  });
  const filteredCircles = circles.filter((circle) => !needle || `${circle.name} ${circle.description} ${circle.handle}`.toLowerCase().includes(needle));

  return <MobileShell className="p-5 gap-4">
    <header className="flex items-center justify-between">
      <div><p className="text-[10px] uppercase tracking-[0.25em] opacity-60 inline-flex items-center gap-1.5">Heartable <BetaBadge /></p><h1 className="font-serif italic text-3xl">Chats</h1></div>
      <Link to={tab === "circles" ? "/mehfil" : "/search"} aria-label={tab === "circles" ? "Create circle" : "Find friends"} className="size-11 rounded-full bg-sunset-600 text-primary-foreground grid place-items-center"><Plus className="size-5" /></Link>
    </header>
    <div className="grid grid-cols-2 bg-muted p-1 rounded-lg">
      <button onClick={() => setTab("chats")} className={`py-2 rounded-md text-sm font-semibold ${tab === "chats" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>Chats</button>
      <button onClick={() => setTab("circles")} className={`py-2 rounded-md text-sm font-semibold ${tab === "circles" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>Circles</button>
    </div>
    <div className="relative"><Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tab === "chats" ? "Search conversations or messages" : "Search circles or @handles"} className="w-full pl-9 pr-4 py-3 rounded-lg bg-card border border-input text-sm outline-none" /></div>
    {tab === "chats" && <>
      <div className="flex gap-2 overflow-x-auto pb-1">{(["all", "unread", "posts", "stories"] as Filter[]).map((item) => <button key={item} onClick={() => setFilter(item)} className={`px-3 py-1.5 rounded-full text-xs capitalize border ${filter === item ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>{item}</button>)}</div>
      <div className="space-y-2">{filteredFriends.map((person) => <Link key={person.uid} to="/dm/$uid" params={{ uid: person.uid }} className="flex items-center gap-3 bg-card rounded-lg p-3 border border-border"><Avatar person={person} /><div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{person.name}</p><p className="text-xs text-muted-foreground truncate">{person.lastMsg}</p></div>{unreads[person.uid] > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] grid place-items-center">{unreads[person.uid]}</span>}</Link>)}{filteredFriends.length === 0 && <Empty icon={<MessageCircle />} title="No matching chats" text="Mutual followers appear here. Try another search or filter." />}</div>
    </>}
    {tab === "circles" && <div className="space-y-2">{filteredCircles.map((circle) => <Link key={circle.id} to="/mehfil/$id" params={{ id: circle.id }} search={{ invite: "" }} className="flex items-center gap-3 bg-card rounded-lg p-3 border border-border"><div className="size-11 rounded-full bg-accent grid place-items-center"><CircleUserRound className="size-5" /></div><div className="flex-1 min-w-0"><p className="font-semibold text-sm truncate">{circle.name}</p><p className="text-xs text-muted-foreground truncate">@{circle.handle} · {Object.keys(circle.members || {}).length} members</p></div><span className="text-[10px] uppercase text-muted-foreground">{circle.visibility}</span></Link>)}{filteredCircles.length === 0 && <Empty icon={<CircleUserRound />} title="No circles found" text="Create a public or private circle from the + button." />}</div>}
    <BottomNav />
  </MobileShell>;
}

function Avatar({ person }: { person: Person }) { return <div className="size-11 rounded-full bg-accent grid place-items-center overflow-hidden font-semibold">{person.photo ? <img src={person.photo} alt="" className="size-full object-cover" /> : person.name.slice(0, 1).toUpperCase()}</div>; }
function Empty({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="text-center py-12 px-6 text-muted-foreground"><div className="size-10 mx-auto opacity-40">{icon}</div><p className="text-sm font-semibold text-foreground mt-3">{title}</p><p className="text-xs mt-1">{text}</p></div>; }