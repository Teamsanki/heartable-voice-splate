import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { limitToLast, onValue, orderByChild, query, ref } from "firebase/database";
import { Heart, MessageCircle, Share2, Play, Pause, ChevronLeft } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { listenLiked, recordShare, toggleLike } from "@/lib/social";
import { FollowButton } from "@/components/FollowButton";
import { CommentSheet } from "@/components/CommentSheet";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { listenMyBlocks } from "@/lib/blocks";
import type { VoiceFilter } from "@/lib/audio-filters";

type Item = {
  id: string;
  uid: string;
  name: string;
  photo?: string | null;
  url: string;
  filter?: VoiceFilter;
  caption?: string;
  category?: string;
  durationSec: number;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  createdAt: number;
};

export const Route = createFileRoute("/trending")({
  head: () => ({
    meta: [
      { title: "Trending Awaaz — Heartable" },
      { name: "description", content: "Trending voice shayaris, songs aur stories ek-ke-baad-ek." },
    ],
  }),
  component: Trending,
});

function Trending() {
  const [items, setItems] = useState<Item[]>([]);
  const { user } = useAuth();
  const [blocks, setBlocks] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    return listenMyBlocks(user.uid, setBlocks);
  }, [user]);

  useEffect(() => {
    const q = query(ref(db, "feed"), orderByChild("createdAt"), limitToLast(50));
    const unsub = onValue(q, (snap) => {
      const arr: Item[] = [];
      snap.forEach((c) => { arr.push({ id: c.key!, ...(c.val() as any) }); });
      // simple trending = recency + likes
      arr.sort((a, b) => {
        const sa = (a.likeCount || 0) * 5 + (a.createdAt || 0) / 1e9;
        const sb = (b.likeCount || 0) * 5 + (b.createdAt || 0) / 1e9;
        return sb - sa;
      });
      setItems(arr);
    });
    return () => unsub();
  }, []);

  const visible = items.filter((it) => !blocks.has(it.uid));

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden">
      <Link
        to="/home"
        className="absolute top-4 left-4 z-20 size-10 rounded-full bg-white/10 backdrop-blur grid place-items-center"
        style={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
        aria-label="Back"
      >
        <ChevronLeft className="size-5" />
      </Link>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 text-xs font-semibold uppercase tracking-[0.25em] opacity-80"
        style={{ top: "calc(env(safe-area-inset-top) + 18px)" }}>
        Trending
      </div>

      <div
        className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory no-scrollbar"
        style={{ scrollbarWidth: "none" }}
      >
        {visible.length === 0 && (
          <div className="h-[100dvh] grid place-items-center">
            <p className="opacity-60 text-sm">Abhi koi awaaz nahi. Pehli tu bhej!</p>
          </div>
        )}
        {visible.map((it, idx) => (
          <TrendingCard key={it.id} item={it} index={idx} />
        ))}
      </div>
    </div>
  );
}

function TrendingCard({ item, index }: { item: Item; index: number }) {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    return listenLiked(item.id, user.uid, setLiked);
  }, [user, item.id]);

  // Auto play / pause based on visibility
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const a = audioRef.current;
          if (!a) continue;
          if (e.intersectionRatio > 0.7) {
            a.currentTime = 0;
            a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
          } else {
            a.pause();
            setPlaying(false);
          }
        }
      },
      { threshold: [0, 0.7, 1] },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const onTogglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().then(() => setPlaying(true)).catch(() => {});
    else { a.pause(); setPlaying(false); }
  };

  const onLike = async () => {
    if (!user) return;
    await toggleLike(item.id, user.uid);
  };

  const onShare = async () => {
    const url = `${location.origin}/p/${item.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${item.name} on Heartable`, text: item.caption || "Sun ye awaaz", url });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Link copy!");
      }
      await recordShare(item.id, user?.uid);
    } catch {}
  };

  // Gradient seed from id so each card looks distinct
  const seed = (index * 137) % 360;
  const bg = `linear-gradient(160deg, hsl(${seed} 60% 22%), hsl(${(seed + 60) % 360} 70% 14%) 60%, #0a0a0a)`;

  return (
    <section
      ref={containerRef}
      className="h-[100dvh] w-full snap-start relative grid place-items-center"
      style={{ background: bg }}
    >
      <audio
        ref={audioRef}
        src={item.url}
        preload="metadata"
        loop
        playsInline
        onTimeUpdate={(e) => {
          const t = e.currentTarget;
          setProgress(t.duration ? t.currentTime / t.duration : 0);
        }}
      />

      {/* Big play button (tap to toggle) */}
      <button
        onClick={onTogglePlay}
        className="absolute inset-0 grid place-items-center"
        aria-label={playing ? "Pause" : "Play"}
      >
        <div className={`size-24 rounded-full bg-white/10 backdrop-blur-md grid place-items-center transition ${playing ? "opacity-0" : "opacity-100"}`}>
          {playing ? <Pause className="size-10" /> : <Play className="size-10 ml-1" />}
        </div>
      </button>

      {/* Caption & meta — bottom left */}
      <div className="absolute left-4 right-20 bottom-24 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <Link
            to="/p/$id"
            params={{ id: item.id }}
            className="flex items-center gap-2"
          >
            <div className="size-10 rounded-full bg-white/15 grid place-items-center overflow-hidden ring-2 ring-white/40">
              {item.photo ? (
                <img src={item.photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-semibold">{item.name.slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold flex items-center gap-1">
                @{item.name}
                <VerifiedBadge uid={item.uid} size={12} />
              </p>
              <p className="text-[10px] opacity-70 flex items-center gap-1.5">
                <span>{item.category || "voice"} · {Math.round(item.durationSec)}s</span>
                {item.filter && item.filter !== "None" && (
                  <span className="px-1.5 py-0.5 rounded-full bg-white/15 text-[9px] font-semibold uppercase tracking-wider">
                    ✨ {item.filter}
                  </span>
                )}
              </p>
            </div>
          </Link>
          <div className="ml-2 pointer-events-auto">
            <FollowButton targetUid={item.uid} />
          </div>
        </div>
        {item.caption && (
          <p className="text-base font-serif italic leading-snug mt-3 max-w-[80%]">
            {item.caption}
          </p>
        )}
      </div>

      {/* Right action rail */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-10">
        <ActionBtn
          label={String(item.likeCount || 0)}
          icon={<Heart className={`size-7 ${liked ? "fill-rose-500 text-rose-500" : ""}`} />}
          onClick={onLike}
        />
        <ActionBtn
          label={String(item.commentCount || 0)}
          icon={<MessageCircle className="size-7" />}
          onClick={() => setCommentOpen(true)}
        />
        <ActionBtn
          label={String(item.shareCount || 0)}
          icon={<Share2 className="size-7" />}
          onClick={onShare}
        />
      </div>

      {/* Progress bar */}
      <div className="absolute left-0 right-0 bottom-0 h-1 bg-white/10">
        <div
          className="h-full bg-white/80 transition-[width]"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {commentOpen && (
        <CommentSheet postId={item.id} onClose={() => setCommentOpen(false)} />
      )}
    </section>
  );
}

function ActionBtn({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 active:scale-90 transition"
    >
      <div className="size-12 rounded-full bg-white/10 backdrop-blur grid place-items-center">
        {icon}
      </div>
      <span className="text-[11px] font-semibold tabular-nums">{label}</span>
    </button>
  );
}