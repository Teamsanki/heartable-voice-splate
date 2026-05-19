import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Recorder } from "@/components/Recorder";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth-context";
import { postFeed, postStory } from "@/lib/voice-api";
import type { VoiceFilter } from "@/lib/audio-filters";

export const Route = createFileRoute("/record")({
  head: () => ({ meta: [{ title: "Record — Heartable" }] }),
  component: RecordPage,
});

function RecordPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"feed" | "story">("feed");
  const [busy, setBusy] = useState(false);
  const [caption, setCaption] = useState("");

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
    <div className="min-h-screen bg-sunset-50 text-sunset-900">
      <div className="max-w-[460px] mx-auto min-h-screen flex flex-col p-6 gap-5">
        <h1 className="font-serif italic text-3xl">Record</h1>

        <div className="flex bg-sunset-100 rounded-full p-1 text-xs font-medium">
          {(["feed", "story"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-1.5 rounded-full transition ${
                mode === m ? "bg-sunset-900 text-sunset-50" : "text-sunset-900/70"
              }`}
            >
              {m === "feed" ? "Mehfil Feed" : "24h Story"}
            </button>
          ))}
        </div>

        {mode === "feed" && (
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Optional caption / shayari…"
            maxLength={200}
            className="w-full px-4 py-3 rounded-2xl bg-white ring-1 ring-foreground/10 text-sm outline-none focus:ring-sunset-600"
          />
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
      </div>
    </div>
  );
}
