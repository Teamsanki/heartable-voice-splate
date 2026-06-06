import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "@/lib/firebase";
import { FeedCard, type FeedItem } from "@/components/FeedCard";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/p/$id")({
  head: () => ({ meta: [{ title: "Voice — Heartable" }] }),
  component: SharedPost,
});

function SharedPost() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [post, setPost] = useState<FeedItem | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const unsub = onValue(ref(db, `feed/${id}`), (snap) => {
      const v = snap.val();
      if (!v) { setNotFound(true); return; }
      setPost({ id, ...v });
    });
    return () => unsub();
  }, [id]);

  return (
    <div className="min-h-[100dvh] bg-sunset-50 p-5">
      <div className="w-full sm:max-w-[480px] mx-auto space-y-5">
        <Link to="/home" className="font-serif italic text-2xl inline-flex items-center gap-2">Heartable <BetaBadge /></Link>
        {notFound ? (
          <p className="text-center opacity-60 py-12">Voice not found.</p>
        ) : !post ? (
          <p className="text-center opacity-60 py-12">Loading…</p>
        ) : (
          <FeedCard item={post} />
        )}
        {!user && (
          <Link
            to="/login"
            className="block w-full py-3 rounded-full bg-sunset-600 text-white text-sm font-semibold text-center"
          >
            Join Heartable
          </Link>
        )}
      </div>
    </div>
  );
}