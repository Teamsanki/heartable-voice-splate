import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { get, ref, update } from "firebase/database";
import { db, VOICE_ROOT } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { VoicePlayer } from "@/components/VoicePlayer";
import type { VoiceFilter } from "@/lib/audio-filters";

export const Route = createFileRoute("/story/$id")({
  validateSearch: (s: Record<string, unknown>) => ({
    uid: String(s.uid || ""),
    q: typeof s.q === "string" ? s.q : "",
  }),
  head: () => ({ meta: [{ title: "Voice Story — Heartable" }] }),
  component: StoryPage,
});

type Story = {
  url: string;
  filter: VoiceFilter;
  name: string;
  photo?: string | null;
  durationSec: number;
  expiresAt: number;
  replays?: Record<string, number>;
  reactions?: Record<string, string>;
};

function StoryPage() {
  const { id } = Route.useParams();
  const { uid, q } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [story, setStory] = useState<Story | null>(null);
  const [played, setPlayed] = useState(false);
  const [replayed, setReplayed] = useState(false);
  const [expired, setExpired] = useState(false);
  const [progress, setProgress] = useState(0);

  // Parse queue "id1:uid1,id2:uid2"
  const queue = (q || "").split(",").filter(Boolean).map((s) => {
    const [sid, suid] = s.split(":");
    return { id: sid, uid: suid };
  });
  const idx = queue.findIndex((s) => s.id === id);
  const next = idx >= 0 && idx < queue.length - 1 ? queue[idx + 1] : null;
  const prev = idx > 0 ? queue[idx - 1] : null;

  useEffect(() => {
    setStory(null); setPlayed(false); setReplayed(false); setExpired(false); setProgress(0);
    get(ref(db, `${VOICE_ROOT}/${uid}/stories/${id}`)).then((snap) => {
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
  }, [id, uid]);

  // Auto progress bar based on durationSec (min 5s)
  useEffect(() => {
    if (!story) return;
    const totalMs = Math.max(5, story.durationSec || 5) * 1000;
    const start = Date.now();
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
  }, [story, next, navigate, q]);

  const react = async (emoji: string) => {
    if (!user) return;
    await update(ref(db, `${VOICE_ROOT}/${uid}/stories/${id}/reactions`), {
      [user.uid]: emoji,
    });
  };

  const onComplete = async () => {
    if (!user) return;
    if (!played) {
      setPlayed(true);
      await update(ref(db, `${VOICE_ROOT}/${uid}/stories/${id}/replays`), {
        [user.uid]: 1,
      });
    } else if (!replayed) {
      setReplayed(true);
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
        {(queue.length ? queue : [{ id, uid }]).map((s, i) => {
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
        <button onClick={() => navigate({ to: "/home" })} className="text-2xl opacity-60">
          ✕
        </button>
      </div>

      <div className="flex-1 grid place-items-center">
        <div className="bg-white/10 backdrop-blur rounded-3xl p-8 w-full max-w-sm">
          <VoicePlayer
            url={story.url}
            filter={story.filter}
            durationSec={story.durationSec}
            onPlayComplete={onComplete}
          />
          {played && !replayed && (
            <p className="text-[10px] mt-4 text-center opacity-60">Replay 1x available</p>
          )}
          {replayed && (
            <p className="text-[10px] mt-4 text-center opacity-60">No more replays</p>
          )}
        </div>
      </div>

      <div className="flex justify-center gap-3 pb-6">
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
    </div>
  );
}
