import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { get, ref, update } from "firebase/database";
import { db, VOICE_ROOT } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { VoicePlayer } from "@/components/VoicePlayer";
import type { VoiceFilter } from "@/lib/audio-filters";

export const Route = createFileRoute("/story/$id")({
  validateSearch: (s: Record<string, unknown>) => ({ uid: String(s.uid || "") }),
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
  const { uid } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [story, setStory] = useState<Story | null>(null);
  const [played, setPlayed] = useState(false);
  const [replayed, setReplayed] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
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
