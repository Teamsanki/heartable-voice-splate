import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { onValue, ref, query, orderByChild, limitToLast, get } from "firebase/database";
import { db, VOICE_ROOT } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Recorder } from "@/components/Recorder";
import { VoicePlayer } from "@/components/VoicePlayer";
import { BottomNav } from "@/components/BottomNav";
import { postFeed, postStory } from "@/lib/voice-api";
import { shouldRemindStreakBreak, badgeFor } from "@/lib/streak";
import type { VoiceFilter } from "@/lib/audio-filters";

type FeedItem = {
  id: string;
  uid: string;
  name: string;
  photo?: string | null;
  url: string;
  filter: VoiceFilter;
  caption?: string;
  durationSec: number;
  plays: number;
  reactions: number;
  createdAt: number;
};

type StoryItem = {
  id: string;
  uid: string;
  name: string;
  photo?: string | null;
  url: string;
  filter: VoiceFilter;
  durationSec: number;
  expiresAt: number;
};

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [{ title: "Heartable — Home" }],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { user, profile, isGuest, guestExpired, signOut } = useAuth();
  const navigate = useNavigate();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [streak, setStreak] = useState<{ count: number; lastDate?: string; badge?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [showStreakWarn, setShowStreakWarn] = useState(false);
  const [mode, setMode] = useState<"feed" | "story">("feed");

  // Redirect if not signed in
  useEffect(() => {
    if (user === null) navigate({ to: "/login" });
    else if (guestExpired) {
      signOut().then(() => navigate({ to: "/login" }));
    }
  }, [user, guestExpired, navigate, signOut]);

  // Feed listener
  useEffect(() => {
    const q = query(ref(db, "feed"), orderByChild("createdAt"), limitToLast(50));
    const unsub = onValue(q, (snap) => {
      const items: FeedItem[] = [];
      snap.forEach((c) => {
        items.push({ id: c.key!, ...(c.val() as any) });
      });
      setFeed(items.reverse());
    });
    return () => unsub();
  }, []);

  // Stories listener — top-level voice/{uid}/stories aggregation
  useEffect(() => {
    const unsub = onValue(ref(db, VOICE_ROOT), (snap) => {
      const all: StoryItem[] = [];
      const now = Date.now();
      snap.forEach((userNode) => {
        const uid = userNode.key!;
        const profileNode = userNode.child("profile");
        const name = profileNode.child("name").val() || "Friend";
        const photo = profileNode.child("photo").val() || null;
        userNode.child("stories").forEach((s) => {
          const v = s.val();
          if (v && v.expiresAt > now) {
            all.push({
              id: s.key!,
              uid,
              name,
              photo,
              url: v.url,
              filter: v.filter,
              durationSec: v.durationSec || 0,
              expiresAt: v.expiresAt,
            });
          }
        });
      });
      setStories(all.sort((a, b) => b.expiresAt - a.expiresAt));
    });
    return () => unsub();
  }, []);

  // Streak
  useEffect(() => {
    if (!user) return;
    const r = ref(db, `${VOICE_ROOT}/${user.uid}/streak`);
    const unsub = onValue(r, (snap) => {
      const v = snap.val();
      setStreak(v);
      if (v && shouldRemindStreakBreak(v.lastDate)) setShowStreakWarn(true);
    });
    return () => unsub();
  }, [user]);

  const handleSubmit = async (blob: Blob, filter: VoiceFilter, durationSec: number) => {
    if (!user || !profile) return;
    setBusy(true);
    try {
      if (mode === "story") {
        await postStory({
          uid: user.uid,
          name: profile.name,
          photo: profile.photo,
          blob,
          filter,
          durationSec,
        });
      } else {
        await postFeed({
          uid: user.uid,
          name: profile.name,
          photo: profile.photo,
          blob,
          filter,
          durationSec,
        });
      }
    } catch (e: any) {
      alert(e?.message || "Upload fail");
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;

  const count = streak?.count || 0;
  const badge = streak?.badge || badgeFor(count);

  return (
    <div className="min-h-screen bg-sunset-50 text-sunset-900">
      <div className="max-w-[460px] mx-auto bg-sunset-50 min-h-screen border-x border-foreground/5 flex flex-col relative">
        <header className="pt-8 px-6 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-serif italic leading-none">Heartable</h1>
            <p className="text-[10px] tracking-[0.25em] uppercase opacity-60 mt-1.5">
              Voices of the Soul
            </p>
          </div>
          <Link
            to="/profile"
            className="size-10 rounded-full bg-sunset-900 text-sunset-50 grid place-items-center text-sm font-semibold"
          >
            {(profile?.name || "U").slice(0, 1).toUpperCase()}
          </Link>
        </header>

        {isGuest && (
          <div className="mx-6 mb-4 px-4 py-2.5 rounded-2xl bg-sunset-200/60 text-[11px] text-sunset-900 flex items-center justify-between gap-2">
            <span>Guest mode · 7 din valid</span>
            <Link to="/profile" className="font-semibold underline">
              Save your streaks
            </Link>
          </div>
        )}

        {showStreakWarn && (
          <div className="mx-6 mb-4 px-4 py-2.5 rounded-2xl bg-sunset-900 text-sunset-50 text-[11px] flex items-center justify-between">
            <span>🔥 Streak tootne wali hai — ek awaaz bhej de aaj!</span>
            <button onClick={() => setShowStreakWarn(false)} className="opacity-60">
              ✕
            </button>
          </div>
        )}

        {/* Stories */}
        <section className="py-3">
          <div className="flex gap-4 overflow-x-auto px-6 no-scrollbar">
            <button
              onClick={() => setMode("story")}
              className="flex-shrink-0 flex flex-col items-center gap-2"
            >
              <div className="size-16 rounded-full ring-1 ring-dashed ring-sunset-600 ring-offset-2 ring-offset-sunset-50 grid place-items-center bg-sunset-100">
                <span className="text-2xl text-sunset-600 font-serif leading-none">+</span>
              </div>
              <span className="text-[11px] font-medium opacity-60">Your story</span>
            </button>
            {stories.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-xs opacity-50 px-4">
                Pehli story tu daal!
              </div>
            )}
            {stories.map((s) => (
              <Link
                key={s.id}
                to="/story/$id"
                params={{ id: s.id }}
                search={{ uid: s.uid }}
                className="flex-shrink-0 flex flex-col items-center gap-2"
              >
                <div className="size-16 rounded-full p-[2px] ring-2 ring-sunset-600 ring-offset-2 ring-offset-sunset-50 bg-sunset-200 grid place-items-center">
                  {s.photo ? (
                    <img src={s.photo} alt={s.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-lg font-semibold text-sunset-900">
                      {s.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium truncate max-w-[60px]">
                  {s.name}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <main className="flex-1 px-6">
          {/* Mode toggle */}
          <div className="flex bg-sunset-100 rounded-full p-1 text-xs font-medium mb-4">
            {(["feed", "story"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-1.5 rounded-full transition ${
                  mode === m ? "bg-sunset-900 text-sunset-50" : "text-sunset-900/70"
                }`}
              >
                {m === "feed" ? "Post to Mehfil" : "24h Story"}
              </button>
            ))}
          </div>

          <Recorder onSubmit={handleSubmit} busy={busy} submitLabel="Share" />

          {/* Streak */}
          <div className="mt-8 flex items-center justify-between bg-sunset-900 text-sunset-50 rounded-2xl px-5 py-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] opacity-60">
                Awaaz Streak
              </p>
              <p className="font-serif text-2xl italic leading-none mt-1">
                {count} {count === 1 ? "day" : "days"} · {badge}
              </p>
            </div>
            <div className="size-12 rounded-full bg-sunset-600 grid place-items-center ring-2 ring-sunset-50/10">
              <span className="text-lg">🎙️</span>
            </div>
          </div>

          {/* Feed */}
          <div className="mt-10 space-y-6 pb-32">
            <div className="flex justify-between items-end">
              <h3 className="text-xl font-serif italic">Trending Mehfil</h3>
              <Link to="/mehfil" className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-50">
                Circles →
              </Link>
            </div>

            {feed.length === 0 && (
              <div className="text-center text-sm opacity-50 py-10">
                Abhi koi awaaz nahi — pehli tu bhej!
              </div>
            )}

            {feed.map((item) => (
              <article
                key={item.id}
                className="bg-white rounded-[22px] p-5 ring-1 ring-foreground/5 space-y-3"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <div className="size-7 rounded-full bg-sunset-200 grid place-items-center ring-1 ring-foreground/5 overflow-hidden">
                      {item.photo ? (
                        <img src={item.photo} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-semibold">
                          {item.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold">{item.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sunset-100 opacity-70">
                      {item.filter}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium opacity-40">
                    {timeAgo(item.createdAt)}
                  </span>
                </div>

                {item.caption && (
                  <p className="text-base font-serif leading-snug">{item.caption}</p>
                )}

                <VoicePlayer
                  url={item.url}
                  filter={item.filter}
                  durationSec={item.durationSec}
                />
              </article>
            ))}
          </div>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
