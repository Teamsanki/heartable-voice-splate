import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { onValue, ref, get } from "firebase/database";
import { db, VOICE_ROOT } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { BottomNav } from "@/components/BottomNav";
import { GuestLock } from "@/components/GuestLock";
import { listenFriends } from "@/lib/social";
import { listenPresence } from "@/lib/presence";
import { Plus, Search, MessageCircle } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { UserBadges } from "@/components/UserBadges";

export const Route = createFileRoute("/dm")({
  head: () => ({ meta: [{ title: "Chats — Heartable" }] }),
  component: DMList,
});

type Person = { uid: string; name: string; photo?: string | null; email?: string | null; online?: boolean; lastMsg?: string; lastMsgAt?: number };

function DMList() {
  const { user, isGuest } = useAuth();
  const [friends, setFriends] = useState<Person[]>([]);
  const [allUsers, setAllUsers] = useState<Person[]>([]);
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = listenFriends(user.uid, async (ids) => {
      const list = await Promise.all(ids.map(async (uid) => {
        const ps = await get(ref(db, `${VOICE_ROOT}/${uid}/profile`));
        const p = ps.val() || {};
        const tid = [user.uid, uid].sort().join("_");
        const lastSnap = await get(ref(db, `dm/${tid}/messages`));
        let lastMsgAt = 0; let lastMsg = "";
        lastSnap.forEach((m) => { const v = m.val(); if ((v.createdAt || 0) > lastMsgAt) { lastMsgAt = v.createdAt; lastMsg = "🎙️ Voice note"; } });
        return { uid, name: p.name || "Friend", photo: p.photo || null, email: p.email || null, lastMsg, lastMsgAt };
      }));
      setFriends(list.sort((a, b) => (b.lastMsgAt || 0) - (a.lastMsgAt || 0)));
    });
    return () => unsub();
  }, [user]);

  // For the "Start new chat" + drawer — show only people you follow (any direction)
  useEffect(() => {
    if (!user || !showAdd) return;
    const unsub = onValue(ref(db, VOICE_ROOT), (snap) => {
      const out: Person[] = [];
      snap.forEach((u) => {
        if (u.key === user.uid) return;
        const p = u.child("profile");
        if (p.exists()) {
          out.push({
            uid: u.key!,
            name: p.child("name").val() || "Friend",
            photo: p.child("photo").val() || null,
            email: p.child("email").val() || null,
          });
        }
      });
      setAllUsers(out);
    });
    return () => unsub();
  }, [user, showAdd]);

  if (isGuest) return <GuestLock feature="Messages" />;

  const ql = q.trim().toLowerCase();
  const filteredFriends = ql ? friends.filter((p) => p.name.toLowerCase().includes(ql)) : friends;

  return (
    <MobileShell className="p-5 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] opacity-60">Heartable</p>
          <h1 className="font-serif italic text-3xl">Chats</h1>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          aria-label="New chat"
          className="size-11 rounded-full bg-gradient-to-br from-sunset-600 to-sunset-900 text-white grid place-items-center shadow-lg shadow-sunset-600/30 active:scale-95 transition"
        >
          <Plus className="size-5" />
        </button>
      </div>

      <div className="relative">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search friends"
          className="w-full pl-9 pr-4 py-2.5 rounded-full bg-white ring-1 ring-foreground/10 text-sm outline-none"
        />
      </div>

      <div className="space-y-2 mt-1">
        {filteredFriends.length === 0 && (
          <div className="text-center py-12 px-6">
            <MessageCircle className="size-10 mx-auto opacity-30" />
            <p className="text-sm font-semibold mt-3">No conversations yet</p>
            <p className="text-xs opacity-60 mt-1">Chats unlock only when both of you follow each other. Tap the <b>+</b> button to find a friend.</p>
          </div>
        )}
        {filteredFriends.map((p) => <FriendRow key={p.uid} p={p} />)}
      </div>

      {showAdd && (
        <AddChatDrawer
          users={allUsers.filter((u) => !friends.some((f) => f.uid === u.uid))}
          onClose={() => setShowAdd(false)}
        />
      )}

      <BottomNav />
    </MobileShell>
  );
}

function FriendRow({ p }: { p: Person }) {
  const [online, setOnline] = useState(false);
  useEffect(() => listenPresence(p.uid, (pr) => setOnline(pr.online)), [p.uid]);
  return (
    <Link
      to="/dm/$uid"
      params={{ uid: p.uid }}
      className="flex items-center gap-3 bg-white rounded-2xl p-3 ring-1 ring-foreground/5 active:scale-[0.99] transition"
    >
      <div className="relative">
        <div className="size-12 rounded-full bg-sunset-200 grid place-items-center font-semibold overflow-hidden">
          {p.photo ? <img src={p.photo} className="w-full h-full object-cover" /> : p.name.slice(0, 1).toUpperCase()}
        </div>
        {online && <span className="absolute bottom-0 right-0 size-3 bg-emerald-500 rounded-full ring-2 ring-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold flex items-center gap-1 truncate">
          {p.name}
          <UserBadges uid={p.uid} email={p.email} size={11} />
        </p>
        <p className="text-[11px] opacity-50 truncate">{p.lastMsg || (online ? "Online" : "Tap to send a voice note")}</p>
      </div>
      <span className="text-sunset-600 text-lg">→</span>
    </Link>
  );
}

function AddChatDrawer({ users, onClose }: { users: Person[]; onClose: () => void }) {
  const [q, setQ] = useState("");
  const ql = q.trim().toLowerCase();
  const list = ql ? users.filter((u) => u.name.toLowerCase().includes(ql) || (u.email || "").toLowerCase().includes(ql)) : users;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full sm:max-w-[420px] bg-white rounded-3xl overflow-hidden max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-black/5 flex items-center justify-between">
          <h2 className="font-serif italic text-2xl">New chat</h2>
          <button onClick={onClose} className="text-sm opacity-60">Close</button>
        </div>
        <div className="p-3 border-b border-black/5">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email"
              className="w-full pl-9 pr-4 py-2.5 rounded-full bg-black/5 text-sm outline-none" />
          </div>
        </div>
        <div className="overflow-y-auto p-2 space-y-1">
          {list.length === 0 && <p className="text-center text-xs opacity-50 py-8">No matches. You can only chat with mutual followers.</p>}
          {list.map((u) => (
            <Link key={u.uid} to="/dm/$uid" params={{ uid: u.uid }} onClick={onClose}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-black/5">
              <div className="size-9 rounded-full bg-sunset-200 grid place-items-center text-xs font-semibold overflow-hidden">
                {u.photo ? <img src={u.photo} className="w-full h-full object-cover" /> : u.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate flex items-center gap-1">{u.name} <UserBadges uid={u.uid} email={u.email} size={10} /></p>
                <p className="text-[10px] opacity-50 truncate">{u.email || "Tap to open chat"}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
