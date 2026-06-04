import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { get, ref } from "firebase/database";
import { ChevronLeft, Search as SearchIcon, Hash, User as UserIcon, Mic } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { BottomNav } from "@/components/BottomNav";
import { db, VOICE_ROOT } from "@/lib/firebase";
import { listenTrendingTags } from "@/lib/hashtags";

type SearchParams = { q?: string };

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({ q: typeof s.q === "string" ? s.q : "" }),
  head: () => ({ meta: [{ title: "Search — Heartable" }] }),
  component: SearchPage,
});

type UserHit = { uid: string; name: string; photo?: string | null };
type PostHit = { id: string; name: string; caption?: string; text?: string; type?: string };

function SearchPage() {
  const { q: initialQ } = Route.useSearch();
  const navigate = useNavigate();
  const [q, setQ] = useState(initialQ || "");
  const [users, setUsers] = useState<UserHit[]>([]);
  const [posts, setPosts] = useState<PostHit[]>([]);
  const [tags, setTags] = useState<{ tag: string; count: number }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => listenTrendingTags(setTags), []);

  // Push q to URL when it changes
  useEffect(() => {
    const t = setTimeout(() => navigate({ to: "/search", search: { q }, replace: true }), 200);
    return () => clearTimeout(t);
  }, [q, navigate]);

  const mode = useMemo(() => {
    if (q.startsWith("#")) return "tag" as const;
    if (q.startsWith("@")) return "user" as const;
    return "all" as const;
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    const term = q.trim().replace(/^[@#]/, "").toLowerCase();
    if (!term) { setUsers([]); setPosts([]); return; }
    setBusy(true);
    (async () => {
      const [uSnap, pSnap] = await Promise.all([
        get(ref(db, VOICE_ROOT)),
        mode === "user" ? Promise.resolve(null as any) : get(ref(db, "feed")),
      ]);
      if (cancelled) return;
      const u: UserHit[] = [];
      uSnap.forEach((c: any) => {
        const p = c.child("profile").val() as any;
        if (!p?.name) return;
        if (String(p.name).toLowerCase().includes(term)) {
          u.push({ uid: c.key!, name: p.name, photo: p.photo || null });
        }
      });
      setUsers(u.slice(0, 30));
      if (mode !== "user" && pSnap) {
        const ps: PostHit[] = [];
        pSnap.forEach((c: any) => {
          const v = c.val() as any;
          const hay = `${v?.caption || ""} ${v?.text || ""}`.toLowerCase();
          if (hay.includes(term)) ps.push({ id: c.key!, name: v?.name || "", caption: v?.caption, text: v?.text, type: v?.type });
        });
        setPosts(ps.slice(0, 40));
      } else {
        setPosts([]);
      }
      setBusy(false);
    })().catch(() => setBusy(false));
    return () => { cancelled = true; };
  }, [q, mode]);

  return (
    <MobileShell>
      <div className="px-4 pt-4 pb-32">
        <div className="flex items-center gap-2 mb-3">
          <Link to="/home" className="size-9 rounded-full bg-black/5 grid place-items-center"><ChevronLeft className="size-4" /></Link>
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 opacity-50" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search users, #tags, posts…"
              className="w-full h-10 pl-9 pr-3 rounded-full bg-black/5 outline-none text-sm"
            />
          </div>
        </div>

        {!q.trim() && (
          <div className="space-y-4">
            <p className="text-[10px] uppercase tracking-[0.25em] opacity-50">Trending tags</p>
            <div className="flex flex-wrap gap-2">
              {tags.length === 0 && <p className="text-xs opacity-50">No trending tags yet.</p>}
              {tags.map((t) => (
                <Link key={t.tag} to="/tag/$tag" params={{ tag: t.tag }} className="px-3 py-1.5 rounded-full bg-sunset-100 text-sunset-700 text-xs font-medium flex items-center gap-1">
                  <Hash className="size-3" />{t.tag}<span className="opacity-50 ml-1">{t.count}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {q.trim() && (
          <div className="space-y-5">
            {mode === "tag" && (
              <Link to="/tag/$tag" params={{ tag: q.trim().replace(/^#/, "").toLowerCase() }} className="block p-3 rounded-2xl bg-sunset-100 text-sunset-700 text-sm font-medium">
                Go to <Hash className="inline size-3" />{q.trim().replace(/^#/, "")}
              </Link>
            )}
            <section>
              <p className="text-[10px] uppercase tracking-[0.25em] opacity-50 mb-2 flex items-center gap-1"><UserIcon className="size-3" />People ({users.length})</p>
              <div className="space-y-1">
                {users.length === 0 && !busy && <p className="text-xs opacity-50">No users.</p>}
                {users.map((u) => (
                  <Link key={u.uid} to="/dm/$uid" params={{ uid: u.uid }} className="flex items-center gap-3 p-2 rounded-xl hover:bg-black/5">
                    <div className="size-9 rounded-full bg-sunset-200 grid place-items-center overflow-hidden">
                      {u.photo ? <img src={u.photo} className="w-full h-full object-cover" alt="" /> : <span className="text-xs font-semibold">{u.name.slice(0, 1).toUpperCase()}</span>}
                    </div>
                    <span className="text-sm font-medium">{u.name}</span>
                  </Link>
                ))}
              </div>
            </section>
            {mode !== "user" && (
              <section>
                <p className="text-[10px] uppercase tracking-[0.25em] opacity-50 mb-2 flex items-center gap-1"><Mic className="size-3" />Posts ({posts.length})</p>
                <div className="space-y-1">
                  {posts.length === 0 && !busy && <p className="text-xs opacity-50">No posts.</p>}
                  {posts.map((p) => (
                    <Link key={p.id} to="/p/$id" params={{ id: p.id }} className="block p-2 rounded-xl hover:bg-black/5">
                      <p className="text-xs opacity-60">{p.name} {p.type === "shayari" ? "· shayari" : "· voice"}</p>
                      <p className="text-sm line-clamp-2">{p.caption || p.text || "(no text)"}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </MobileShell>
  );
}