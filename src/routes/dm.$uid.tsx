import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { onValue, ref, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Recorder } from "@/components/Recorder";
import { VoicePlayer } from "@/components/VoicePlayer";
import { postSnap } from "@/lib/voice-api";
import { areFriends } from "@/lib/social";
import { isMutuallyBlocked } from "@/lib/blocks";
import { submitReport } from "@/lib/reports";
import type { VoiceFilter } from "@/lib/audio-filters";

export const Route = createFileRoute("/dm/$uid")({
  head: () => ({ meta: [{ title: "Voice Note — Heartable" }] }),
  component: DMThread,
});

type Snap = {
  id: string;
  uid: string;
  name: string;
  to: string;
  url: string;
  filter: VoiceFilter;
  durationSec: number;
  listened: boolean;
  createdAt: number;
  expiresAt: number;
};

function DMThread() {
  const { uid: peerUid } = Route.useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [peerName, setPeerName] = useState("Friend");
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [busy, setBusy] = useState(false);
  const [gate, setGate] = useState<"loading" | "ok" | "not-friends" | "blocked">("loading");

  const threadId = user ? [user.uid, peerUid].sort().join("_") : null;

  useEffect(() => {
    onValue(ref(db, `voice/${peerUid}/profile/name`), (s) => {
      if (s.val()) setPeerName(s.val());
    });
  }, [peerUid]);

  useEffect(() => {
    if (!user) return;
    if (user.uid === peerUid) { setGate("ok"); return; }
    (async () => {
      const blocked = await isMutuallyBlocked(user.uid, peerUid);
      if (blocked) { setGate("blocked"); return; }
      const friends = await areFriends(user.uid, peerUid);
      setGate(friends ? "ok" : "not-friends");
    })();
  }, [user, peerUid]);

  useEffect(() => {
    if (!threadId || !user) return;
    const unsub = onValue(ref(db, `dm/${threadId}/messages`), (snap) => {
      const out: Snap[] = [];
      const now = Date.now();
      snap.forEach((m) => {
        const v = m.val();
        if (v.expiresAt < now) return;
        // hide listened snaps that were sent TO me
        if (v.listened && v.to === user.uid) return;
        out.push({ id: m.key!, ...v });
      });
      setSnaps(out.sort((a, b) => b.createdAt - a.createdAt));
    });
    return () => unsub();
  }, [threadId, user]);

  const markListened = async (id: string, toMe: boolean) => {
    if (!toMe || !threadId) return;
    await update(ref(db, `dm/${threadId}/messages/${id}`), { listened: true });
  };

  if (!user || !profile) {
    return <div className="min-h-screen grid place-items-center">Login first</div>;
  }

  if (gate === "blocked") {
    return <div className="min-h-screen grid place-items-center p-6 text-center">
      <div><p className="text-2xl font-serif italic">Heartable User</p>
        <p className="text-sm opacity-60 mt-2">This chat is not available.</p>
        <button onClick={() => navigate({ to: "/dm" })} className="mt-4 underline text-sm">Back</button>
      </div>
    </div>;
  }
  if (gate === "not-friends") {
    return <div className="min-h-screen grid place-items-center p-6 text-center">
      <div className="max-w-sm">
        <p className="text-4xl">🔒</p>
        <p className="font-serif italic text-2xl mt-2">Friends only</p>
        <p className="text-sm opacity-60 mt-2">You and this user must follow each other to chat.</p>
        <button onClick={() => navigate({ to: "/dm" })} className="mt-4 underline text-sm">Back to messages</button>
      </div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-sunset-50 text-sunset-900">
      <div className="w-full sm:max-w-[480px] mx-auto min-h-[100dvh] flex flex-col p-6 gap-4 pb-32">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate({ to: "/dm" })} className="text-sm opacity-60">
            ← Back
          </button>
          <button
            onClick={async () => {
              const reason = prompt("Report this user/chat? Please tell us why:");
              if (!reason) return;
              await submitReport({
                kind: "chat",
                targetId: threadId || peerUid,
                targetUid: peerUid,
                reporterUid: user.uid,
                reporterName: profile.name,
                reason: reason.slice(0, 200),
              });
              alert("Report submitted.");
            }}
            className="text-[11px] px-3 py-1 rounded-full bg-red-100 text-red-700"
          >🚩 Report</button>
        </div>
        <h1 className="font-serif italic text-3xl">{peerName}</h1>

        <Recorder
          busy={busy}
          submitLabel="Send voice"
          onSubmit={async (blob, filter, durationSec) => {
            setBusy(true);
            try {
              await postSnap({
                uid: user.uid,
                name: profile.name,
                toUid: peerUid,
                blob,
                filter,
                durationSec,
              });
            } finally {
              setBusy(false);
            }
          }}
        />

        <div className="space-y-3 mt-2">
          {snaps.length === 0 && (
            <p className="text-center text-sm opacity-50 py-6">
              Send the first voice note.
            </p>
          )}
          {snaps.map((s) => {
            const fromMe = s.uid === user.uid;
            return (
              <div
                key={s.id}
                className={`rounded-2xl p-4 ring-1 ring-foreground/5 ${
                  fromMe ? "bg-sunset-200 ml-8" : "bg-white mr-8"
                }`}
              >
                <p className="text-[10px] opacity-50 mb-2">
                  {fromMe ? "You" : s.name} · {s.filter} · disappears once heard
                </p>
                <VoicePlayer
                  url={s.url}
                  filter={s.filter}
                  durationSec={s.durationSec}
                  onPlayComplete={() => markListened(s.id, !fromMe)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
