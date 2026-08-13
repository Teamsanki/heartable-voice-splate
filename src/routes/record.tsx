import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Recorder } from "@/components/Recorder";
import { BottomNav } from "@/components/BottomNav";
import { MobileShell } from "@/components/MobileShell";
import { useAuth } from "@/lib/auth-context";
import { postFeed, postStory } from "@/lib/voice-api";
import type { VoiceFilter } from "@/lib/audio-filters";

export const Route = createFileRoute("/record")({
  head: () => ({ meta: [{ title: "Record — Heartable" }] }),
  component: RecordPage,
});

function RecordPage() {
  const { user, profile, isGuest } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"feed" | "story">("feed");
  const [busy, setBusy] = useState(false);
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState<"song" | "shayari" | "story" | "other">("shayari");

  if (!user || !profile) {
    return (
      <div className="min-h-screen grid place-items-center">
        <button onClick={() => navigate({ to: "/login" })} className="underline">
          Login first
        </button>
      </div>
    );
  }

  return (
    <MobileShell className="p-5 gap-4">
        <h1 className="font-serif italic text-3xl">Record</h1>

        <div className="flex bg-sunset-100 rounded-full p-1 text-xs font-medium">
          {(["feed", "story"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                if (m === "story" && isGuest) {
                  alert("Stories sirf accounts ke liye.");
                  return;
                }
                setMode(m);
              }}
              className={`flex-1 py-1.5 rounded-full transition ${
                mode === m ? "bg-sunset-900 text-sunset-50" : "text-sunset-900/70"
              } ${m === "story" && isGuest ? "opacity-50" : ""}`}
            >
              {m === "feed" ? "Feed" : isGuest ? "24h 🔒" : "24h Story"}
            </button>
          ))}
        </div>

        {mode === "feed" && (
          <>
            <div className="flex gap-2 flex-wrap">
              {(["shayari", "song", "story", "other"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full ring-1 ${
                    category === c
                      ? "bg-sunset-900 text-sunset-50 ring-sunset-900"
                      : "bg-card text-sunset-900 ring-foreground/10"
                  }`}
                >
                  {c === "shayari" ? "📜 Shayari" : c === "song" ? "🎵 Song" : c === "story" ? "📖 Story" : "✨ Other"}
                </button>
              ))}
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Caption / shayari text…"
              maxLength={200}
              rows={2}
              className="w-full px-4 py-3 rounded-2xl bg-card ring-1 ring-foreground/10 text-sm outline-none focus:ring-sunset-600 resize-none"
            />
          </>
        )}

        <Recorder
          busy={busy}
          submitLabel="Share"
          onSubmit={async (blob, filter: VoiceFilter, durationSec) => {
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
                  caption,
                  durationSec,
                  category,
                });
              }
              navigate({ to: "/home" });
            } catch (e: any) {
              alert(e?.message || "Upload fail");
            } finally {
              setBusy(false);
            }
          }}
        />

        <BottomNav />
    </MobileShell>
  );
}
