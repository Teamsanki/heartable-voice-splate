import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { onValue, ref, runTransaction, update } from "firebase/database";
import { db, VOICE_ROOT } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { VoicePlayer } from "@/components/VoicePlayer";
import type { VoiceFilter } from "@/lib/audio-filters";
import { toast } from "sonner";
import { Recorder } from "@/components/Recorder";
import { postSnap } from "@/lib/voice-api";
import { sendStoryReactionDM } from "@/lib/dm";
import { blockUser } from "@/lib/blocks";
import { submitReport } from "@/lib/reports";
import { pushNotif } from "@/lib/notifications-store";
import { recordReplay } from "@/lib/share";
import { DEFAULT_SETTINGS, listenSettings } from "@/lib/settings";
import { Eye, Flag, Mic, Send, UserX } from "lucide-react";

export const Route = createFileRoute("/story/$id")({
  validateSearch: (s: Record<string, unknown>) => ({
    uid: String(s.uid || ""),
    q: typeof s.q === "string" ? s.q : "",
  }),
  head: () => ({ meta: [{ title: "Voice Story — Heartable" }] }),
  component: StoryPage,
});

type Story = {
  kind?: "voice" | "post";
  postId?: string;
  postOwnerUid?: string;
  postPreview?: {
    name?: string; text?: string; caption?: string; bgCss?: string; fgColor?: string;
    url?: string; filter?: string; durationSec?: number; type?: string;
  } | null;
  url: string;
  filter: VoiceFilter;
  name: string;
  photo?: string | null;
  durationSec: number;
  expiresAt: number;
  replays?: Record<string, number>;
  reactions?: Record<string, string>;
  viewers?: Record<string, { count: number; firstSeenAt: number; lastSeenAt: number; name: string; photo?: string | null }>;
};

function StoryPage() {
  const { id } = Route.useParams();
  const { uid, q } = Route.useSearch();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [story, setStory] = useState<Story | null>(null);
  const [played, setPlayed] = useState(false);
  const [replayed, setReplayed] = useState(false);
  const [expired, setExpired] = useState(false);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reply, setReply] = useState("");
  const [voiceReply, setVoiceReply] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [allowAutoplay, setAllowAutoplay] = useState(true);
  const [viewerPrivacy, setViewerPrivacy] = useState<"full" | "recent" | "totals">("full");

  // Parse queue "id1:uid1,id2:uid2"
  const queue: { id: string; uid: string }[] = (q || "").split(",").filter(Boolean).map((s: string) => {
    const [sid, suid] = s.split(":");
    return { id: sid, uid: suid };
  });
  const idx = queue.findIndex((s) => s.id === id);
  const next = idx >= 0 && idx < queue.length - 1 ? queue[idx + 1] : null;
  const prev = idx > 0 ? queue[idx - 1] : null;

  useEffect(() => {
    setStory(null); setPlayed(false); setReplayed(false); setExpired(false); setProgress(0);
    const off = onValue(ref(db, `${VOICE_ROOT}/${uid}/stories/${id}`), (snap) => {
      const v = snap.val();
      if (!v) {
        setExpired(true);
        return;
      }
      if (v.expiresAt < Date.now()) {
        setExpired(true);
        return;
      }
      setStory(v);
    });
    return () => off();
  }, [id, uid]);

  useEffect(() => {
    if (!user || !story) return;
    return listenSettings(user.uid, (settings) => {
      const connection = navigator as Navigator & { connection?: { type?: string } };
      setAllowAutoplay(settings.playback.autoplay && (!settings.playback.wifiOnly || connection.connection?.type === "wifi"));
      setViewerPrivacy(settings.storyViewerPrivacy);
    });
  }, [user]);

  useEffect(() => {
    if (!user || !profile || user.uid === uid) return;
    const viewerRef = ref(db, `${VOICE_ROOT}/${uid}/stories/${id}/viewers/${user.uid}`);
    runTransaction(viewerRef, (current) => ({
      count: Number(current?.count || 0) + 1,
      firstSeenAt: Number(current?.firstSeenAt || Date.now()),
      lastSeenAt: Date.now(),
      name: profile.name,
      photo: profile.photo || null,
    })).then((result) => {
      const count = Number(result.snapshot.val()?.count || 1);
      if (count > 1) pushNotif(uid, { kind: "story-replay", fromUid: user.uid, fromName: profile.name, storyId: id, text: `rewatched your story · ${count} views` }).catch(() => {});
    }).catch(() => {});
  }, [user, profile, uid, id]);

  // Auto progress bar based on durationSec (min 5s)
  useEffect(() => {
    if (!story) return;
    if (paused) return;
    const totalMs = Math.max(5, story.durationSec || 5) * 1000;
    const start = Date.now() - progress * totalMs;
    const t = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / totalMs);
      setProgress(p);
      if (p >= 1) {
        clearInterval(t);
        if (next) navigate({ to: "/story/$id", params: { id: next.id }, search: { uid: next.uid, q: q || "" } });
        else navigate({ to: "/home" });
      }
    }, 50);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story, next, navigate, q, paused]);

  const react = async (emoji: string) => {
    if (!user || !profile || user.uid === uid) return;
    await update(ref(db, `${VOICE_ROOT}/${uid}/stories/${id}/reactions`), {
      [user.uid]: emoji,
    });
    await sendStoryReactionDM({ fromUid: user.uid, fromName: profile.name, toUid: uid, storyId: id, emoji });
    toast.success("Reaction sent in Chats");
  };

  const sendReply = async () => {
    if (!user || !profile || !reply.trim() || user.uid === uid) return;
    await sendStoryReactionDM({ fromUid: user.uid, fromName: profile.name, toUid: uid, storyId: id, text: reply });
    setReply(""); toast.success("Reply sent in Chats");
  };

  const onComplete = async () => {
    if (!user || !story) return;
    if (!played) {
      setPlayed(true);
      await update(ref(db, `${VOICE_ROOT}/${uid}/stories/${id}/replays`), {
        [user.uid]: 1,
      });
    } else if (!replayed) {
      setReplayed(true);
      await recordReplay(story.postOwnerUid || uid, story.postId, id, user.uid);
    }
  };

  if (expired) {
    return (
      <div className="min-h-screen grid place-items-center bg-sunset-900 text-sunset-50 p-6 text-center">
        <div>
          <p className="font-serif italic text-3xl mb-2">Pal beet gaya</p>
          <p className="text-sm opacity-60 mb-6">Ye story expire ho chuki hai.</p>
          <button onClick={() => navigate({ to: "/home" })} className="underline">
            Wapas home
          </button>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen grid place-items-center bg-sunset-900 text-sunset-50">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sunset-700 to-sunset-900 text-sunset-50 p-6 flex flex-col">
      {/* Progress bars (segmented if queue) */}
      <div className="flex gap-1 mb-3">
        {(queue.length ? queue : [{ id, uid }]).map((s: { id: string; uid: string }, i: number) => {
          const filled = idx >= 0 && i < idx ? 1 : i === idx ? progress : 0;
          return (
            <div key={s.id} className="flex-1 h-0.5 bg-white/20 rounded overflow-hidden">
              <div className="h-full bg-white" style={{ width: `${filled * 100}%` }} />
            </div>
          );
        })}
      </div>

      {/* Tap zones for prev/next */}
      {prev && (
        <button
          aria-label="Previous"
          onClick={() => navigate({ to: "/story/$id", params: { id: prev.id }, search: { uid: prev.uid, q: q || "" } })}
          className="absolute left-0 top-0 h-full w-1/4 z-0"
        />
      )}
      {next && (
        <button
          aria-label="Next"
          onClick={() => navigate({ to: "/story/$id", params: { id: next.id }, search: { uid: next.uid, q: q || "" } })}
          className="absolute right-0 top-0 h-full w-1/4 z-0"
        />
      )}

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-sunset-200 grid place-items-center text-sunset-900 font-semibold overflow-hidden">
            {story.photo ? (
              <img src={story.photo} className="w-full h-full object-cover" />
            ) : (
              story.name.slice(0, 1).toUpperCase()
            )}
          </div>
          <div>
            <p className="font-semibold">{story.name}</p>
            <p className="text-[10px] opacity-60 uppercase tracking-widest">
              {story.filter}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user?.uid !== uid && <>
            <button aria-label="Report story" onClick={async () => { const reason = prompt("Why are you reporting this story?"); if (!reason || !user || !profile) return; await submitReport({ kind: "story", targetId: id, targetUid: uid, reporterUid: user.uid, reporterName: profile.name, reason }); toast.success("Report submitted"); }} className="size-9 rounded-full bg-white/10 grid place-items-center"><Flag className="size-4" /></button>
            <button aria-label="Block creator" onClick={async () => { if (!user || !confirm(`Block ${story.name}?`)) return; await blockUser(user.uid, uid); navigate({ to: "/home" }); }} className="size-9 rounded-full bg-white/10 grid place-items-center"><UserX className="size-4" /></button>
          </>}
          <button onClick={() => navigate({ to: "/home" })} className="text-2xl opacity-60">✕</button>
        </div>
      </div>

      <div className="flex-1 grid place-items-center">
        {story.kind === "post" ? (
          <div
            className="w-full max-w-sm rounded-3xl overflow-hidden"
            style={{
              background: story.postPreview?.bgCss || "linear-gradient(135deg,#0a0a0a,#1a1a1a)",
              color: story.postPreview?.fgColor || "#fff8ee",
            }}
          >
            <button
              onClick={() => story.postId && navigate({ to: "/p/$id", params: { id: story.postId } })}
              className="w-full text-left"
            >
              <div className="p-8 min-h-[240px] grid place-items-center text-center">
                <p className="text-2xl whitespace-pre-wrap break-words">
                  {story.postPreview?.text || story.postPreview?.caption || "🎙️ Voice post"}
                </p>
              </div>
            </button>
            {(story.postPreview?.url || story.url) && (
              <div className="px-4 pb-4">
                <VoicePlayer
                  url={(story.postPreview?.url || story.url) as string}
                  filter={(story.postPreview?.filter || story.filter || "none") as VoiceFilter}
                  durationSec={story.postPreview?.durationSec || story.durationSec || 0}
                  onPlayComplete={onComplete}
                   autoPlay={!paused && allowAutoplay}
                />
              </div>
            )}
            <button
              onClick={() => story.postId && navigate({ to: "/p/$id", params: { id: story.postId } })}
              className="w-full text-[11px] px-4 py-3 bg-black/25 text-left"
            >
              Tap to open post
            </button>
          </div>
        ) : (
        <div className="bg-white/10 backdrop-blur rounded-3xl p-8 w-full max-w-sm">
          <VoicePlayer
            url={story.url}
            filter={story.filter}
            durationSec={story.durationSec}
            onPlayComplete={onComplete}
             autoPlay={!paused && allowAutoplay}
          />
          {played && !replayed && (
            <p className="text-[10px] mt-4 text-center opacity-60">Replay 1x available</p>
          )}
          {replayed && (
            <p className="text-[10px] mt-4 text-center opacity-60">No more replays</p>
          )}
        </div>
        )}
      </div>

      <div className="flex justify-center gap-3 pb-6">
        <button
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "Resume story" : "Pause story"}
          className="px-4 h-12 rounded-full bg-white/10 hover:bg-white/20 text-sm font-semibold transition"
        >
          {paused ? "▶ Resume" : "⏸ Pause"}
        </button>
        {["❤️", "🔥", "😢", "🥹"].map((e) => (
          <button
            key={e}
            onClick={() => react(e)}
            className="size-12 rounded-full bg-white/10 hover:bg-white/20 text-2xl transition"
          >
            {e}
          </button>
        ))}
      </div>
      {user?.uid === uid ? (
        <div className="pb-4">
          <button onClick={() => setShowViewers((value) => !value)} className="mx-auto flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-sm"><Eye className="size-4" /> {Object.keys(story.viewers || {}).length} viewers · {Object.values(story.viewers || {}).reduce((sum, viewer) => sum + viewer.count, 0)} views</button>
          {showViewers && viewerPrivacy !== "totals" && <div className="mt-2 max-h-40 overflow-y-auto rounded-xl bg-black/20 p-2 space-y-1">{Object.entries(story.viewers || {}).sort(([, a], [, b]) => b.lastSeenAt - a.lastSeenAt).slice(0, viewerPrivacy === "recent" ? 5 : undefined).map(([viewerUid, viewer]) => <div key={viewerUid} className="flex items-center justify-between text-xs p-2"><span>{viewer.name}</span><span>{viewer.count > 1 ? `Rewatched ${viewer.count - 1}×` : "Viewed"}</span></div>)}</div>}
          {showViewers && viewerPrivacy === "totals" && <p className="mt-2 text-center text-xs opacity-70">Viewer names are hidden by your privacy setting.</p>}
        </div>
      ) : user && profile ? (
        <div className="pb-4 flex gap-2">
          <input value={reply} onChange={(event) => setReply(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") sendReply(); }} placeholder="Reply to story…" className="flex-1 rounded-full bg-white/10 px-4 text-sm placeholder:text-white/60 outline-none" />
          <button onClick={() => setVoiceReply((value) => !value)} aria-label="Voice reaction" className="size-11 rounded-full bg-white/10 grid place-items-center"><Mic /></button>
          <button onClick={sendReply} aria-label="Send reply" className="size-11 rounded-full bg-white/15 grid place-items-center"><Send /></button>
        </div>
      ) : null}
      {voiceReply && user && profile && user.uid !== uid && <div className="pb-5"><Recorder submitLabel="Send voice reaction" busy={false} onSubmit={async (blob, filter, durationSec) => { await postSnap({ uid: user.uid, name: profile.name, toUid: uid, blob, filter, durationSec }); setVoiceReply(false); toast.success("Voice reaction sent in Chats"); }} /></div>}
    </div>
  );
}
