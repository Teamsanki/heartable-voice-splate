import { useEffect, useState } from "react";
import { Heart, MessageCircle, Share2, Bookmark } from "lucide-react";
import { VoicePlayer } from "./VoicePlayer";
import { CommentSheet } from "./CommentSheet";
import { FollowButton } from "./FollowButton";
import { PostMenu } from "./PostMenu";
import { UserBadges } from "./UserBadges";
import { RichText } from "./RichText";
import { listenLiked, toggleLike, recordShare } from "@/lib/social";
import { listenBookmarked, toggleBookmark } from "@/lib/bookmarks";
import { useAuth } from "@/lib/auth-context";
import { shayariFontFamily, loadShayariFont } from "@/lib/shayari";
import type { VoiceFilter } from "@/lib/audio-filters";

export type FeedItem = {
  id: string;
  uid: string;
  name: string;
  photo?: string | null;
  url: string;
  filter: VoiceFilter;
  caption?: string;
  category?: string;
  durationSec: number;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  createdAt: number;
  type?: "voice" | "shayari";
  text?: string;
  fontId?: string;
  bgCss?: string;
  fgColor?: string;
};

export function FeedCard({ item }: { item: FeedItem }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    return listenLiked(item.id, user.uid, setLiked);
  }, [user, item.id]);

  useEffect(() => {
    if (!user) return;
    return listenBookmarked(user.uid, item.id, setSaved);
  }, [user, item.id]);

  useEffect(() => {
    if (item.type === "shayari" && item.fontId) loadShayariFont(item.fontId as any);
  }, [item.type, item.fontId]);

  const onLike = async () => {
    if (!user) return;
    await toggleLike(item.id, user.uid);
  };

  const onShare = async () => {
    const url = `${location.origin}/p/${item.id}`;
    const shareData = {
      title: `${item.name} on Heartable`,
      text: item.caption || "Sun ye awaaz",
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        alert("Link copy ho gaya!");
      }
      await recordShare(item.id, user?.uid);
    } catch {
      /* user cancelled */
    }
  };

  return (
    <>
      <article className="bg-white rounded-[22px] p-4 ring-1 ring-foreground/5 space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-sunset-200 grid place-items-center ring-1 ring-foreground/5 overflow-hidden">
              {item.photo ? (
                <img src={item.photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] font-semibold">
                  {item.name.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <div className="leading-tight">
              <p className="text-xs font-semibold flex items-center gap-1">
                {item.name}
                <UserBadges uid={item.uid} size={10} />
              </p>
              <p className="text-[10px] opacity-50">
                {item.type === "shayari" ? "✒️ shayari" : `${item.category || "voice"} · ${item.filter}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FollowButton targetUid={item.uid} />
            <span className="text-[10px] font-medium opacity-40">{timeAgo(item.createdAt)}</span>
            <PostMenu postId={item.id} authorUid={item.uid} />
          </div>
        </div>

        {item.caption && (
          <p className="text-base font-serif leading-snug">
            <RichText text={item.caption} />
          </p>
        )}

        {item.type === "shayari" ? (
          <div
            className="rounded-2xl aspect-[5/4] grid place-items-center p-6 text-center overflow-hidden"
            style={{ background: item.bgCss || "linear-gradient(135deg,#0a0a0a,#1a1a1a)", color: item.fgColor || "#fff8ee" }}
          >
            <p
              className="text-2xl whitespace-pre-wrap break-words"
              style={{ fontFamily: shayariFontFamily(item.fontId), lineHeight: 1.4 }}
            ><RichText text={item.text || ""} /></p>
          </div>
        ) : (
          <VoicePlayer url={item.url} filter={item.filter} durationSec={item.durationSec} />
        )}

        <div className="flex items-center gap-4 pt-1">
          <button
            onClick={onLike}
            className="flex items-center gap-1.5 text-xs font-medium active:scale-95 transition"
          >
            <Heart
              className={`size-5 ${liked ? "fill-sunset-600 text-sunset-600" : "text-sunset-900/70"}`}
            />
            <span className="tabular-nums">{item.likeCount || 0}</span>
          </button>
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 text-xs font-medium active:scale-95 transition"
          >
            <MessageCircle className="size-5 text-sunset-900/70" />
            <span className="tabular-nums">{item.commentCount || 0}</span>
          </button>
          <button
            onClick={onShare}
            className="flex items-center gap-1.5 text-xs font-medium ml-auto active:scale-95 transition"
          >
            <Share2 className="size-5 text-sunset-900/70" />
            <span className="tabular-nums">{item.shareCount || 0}</span>
          </button>
          <button
            onClick={() => user && toggleBookmark(user.uid, item.id)}
            aria-label="Bookmark"
            className="flex items-center active:scale-95 transition"
          >
            <Bookmark className={`size-5 ${saved ? "fill-sunset-600 text-sunset-600" : "text-sunset-900/70"}`} />
          </button>
        </div>
      </article>
      {open && <CommentSheet postId={item.id} onClose={() => setOpen(false)} />}
    </>
  );
}

function timeAgo(ts: number) {
  if (!ts) return "now";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}