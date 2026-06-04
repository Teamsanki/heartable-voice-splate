import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bookmark, ChevronLeft } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { BottomNav } from "@/components/BottomNav";
import { FeedCard, type FeedItem } from "@/components/FeedCard";
import { useAuth } from "@/lib/auth-context";
import { listenMyBookmarks } from "@/lib/bookmarks";
import { fetchPostById } from "@/lib/hashtags";

export const Route = createFileRoute("/bookmarks")({
  head: () => ({ meta: [{ title: "Saved — Heartable" }] }),
  component: BookmarksPage,
});

function BookmarksPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    return listenMyBookmarks(user.uid, async (ids) => {
      setLoading(true);
      const posts = await Promise.all(ids.slice(0, 100).map(fetchPostById));
      setItems(posts.filter(Boolean) as FeedItem[]);
      setLoading(false);
    });
  }, [user]);

  if (!user) {
    return (
      <MobileShell>
        <div className="p-6 text-center pt-24">
          <Link to="/login" className="underline">Login to see your saved posts</Link>
        </div>
        <BottomNav />
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <div className="px-4 pt-4 pb-32">
        <div className="flex items-center gap-2 mb-4">
          <Link to="/profile" className="size-9 rounded-full bg-black/5 grid place-items-center"><ChevronLeft className="size-4" /></Link>
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] opacity-50">Library</p>
            <h1 className="font-serif italic text-2xl flex items-center gap-2"><Bookmark className="size-5" />Saved</h1>
          </div>
          <span className="ml-auto text-xs opacity-60 tabular-nums">{items.length}</span>
        </div>
        {loading && items.length === 0 ? (
          <p className="text-sm opacity-50 text-center py-12">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm opacity-50 text-center py-12">Abhi kuch save nahi kiya. Post pe bookmark icon dabaa.</p>
        ) : (
          <div className="space-y-3">{items.map((it) => <FeedCard key={it.id} item={it} />)}</div>
        )}
      </div>
      <BottomNav />
    </MobileShell>
  );
}