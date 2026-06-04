import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Hash } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { BottomNav } from "@/components/BottomNav";
import { FeedCard, type FeedItem } from "@/components/FeedCard";
import { fetchPostById, listenPostsForTag } from "@/lib/hashtags";

export const Route = createFileRoute("/tag/$tag")({
  head: ({ params }) => ({
    meta: [
      { title: `#${params.tag} — Heartable` },
      { name: "description", content: `Posts tagged with #${params.tag} on Heartable.` },
    ],
  }),
  component: TagPage,
});

function TagPage() {
  const { tag } = Route.useParams();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return listenPostsForTag(tag, async (ids) => {
      setLoading(true);
      const posts = await Promise.all(ids.slice(0, 80).map(fetchPostById));
      setItems(posts.filter(Boolean) as FeedItem[]);
      setLoading(false);
    });
  }, [tag]);

  return (
    <MobileShell>
      <div className="px-4 pt-4 pb-32">
        <div className="flex items-center gap-2 mb-4">
          <Link to="/home" className="size-9 rounded-full bg-black/5 grid place-items-center"><ChevronLeft className="size-4" /></Link>
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] opacity-50">Hashtag</p>
            <h1 className="font-serif italic text-2xl flex items-center gap-1"><Hash className="size-5" />{tag}</h1>
          </div>
          <span className="ml-auto text-xs opacity-60 tabular-nums">{items.length}</span>
        </div>
        {loading && items.length === 0 ? (
          <p className="text-sm opacity-50 text-center py-12">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm opacity-50 text-center py-12">Koi post nahi mila is tag pe.</p>
        ) : (
          <div className="space-y-3">{items.map((it) => <FeedCard key={it.id} item={it} />)}</div>
        )}
      </div>
      <BottomNav />
    </MobileShell>
  );
}