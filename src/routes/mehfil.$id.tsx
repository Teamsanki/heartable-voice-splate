import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { onValue, ref, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Recorder } from "@/components/Recorder";
import { VoicePlayer } from "@/components/VoicePlayer";
import { postMehfil } from "@/lib/voice-api";
import type { VoiceFilter } from "@/lib/audio-filters";

export const Route = createFileRoute("/mehfil/$id")({
  head: () => ({ meta: [{ title: "Mehfil Circle — Heartable" }] }),
  component: MehfilCircle,
});

type Msg = {
  id: string;
  uid: string;
  name: string;
  photo?: string | null;
  url: string;
  filter: VoiceFilter;
  durationSec: number;
  createdAt: number;
};

function MehfilCircle() {
  const { id } = Route.useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("Mehfil");
  const [members, setMembers] = useState<string[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsub = onValue(ref(db, `mehfil/${id}`), (snap) => {
      const v = snap.val();
      if (!v) return;
      setName(v.name || "Mehfil");
      setMembers(Object.keys(v.members || {}));
      const list: Msg[] = [];
      Object.entries(v.messages || {}).forEach(([k, m]: any) => {
        list.push({ id: k, ...m });
      });
      setMsgs(list.sort((a, b) => b.createdAt - a.createdAt));
    });
    return () => unsub();
  }, [id]);

  // auto-join
  useEffect(() => {
    if (user) set(ref(db, `mehfil/${id}/members/${user.uid}`), true);
  }, [user, id]);

  if (!user || !profile) {
    return <div className="min-h-screen grid place-items-center">Login first</div>;
  }

  return (
    <div className="min-h-screen bg-sunset-50 text-sunset-900">
      <div className="max-w-[460px] mx-auto min-h-screen flex flex-col p-6 gap-5 pb-32">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate({ to: "/mehfil" })} className="text-sm opacity-60">
            ← Back
          </button>
          <p className="text-[10px] opacity-50 uppercase tracking-widest">
            {members.length} members
          </p>
        </div>

        <h1 className="font-serif italic text-4xl">{name}</h1>

        {/* circle of avatars */}
        <div className="relative h-48 w-48 mx-auto">
          {members.slice(0, 8).map((m, i) => {
            const angle = (i / Math.min(members.length, 8)) * 2 * Math.PI;
            const r = 80;
            const x = Math.cos(angle) * r + 96 - 18;
            const y = Math.sin(angle) * r + 96 - 18;
            return (
              <div
                key={m}
                className="absolute size-9 rounded-full bg-sunset-200 ring-2 ring-sunset-50 grid place-items-center text-[10px] font-semibold"
                style={{ left: x, top: y }}
              >
                {m.slice(0, 2).toUpperCase()}
              </div>
            );
          })}
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="size-16 rounded-full bg-sunset-600/15 grid place-items-center">
              <span className="text-2xl">🎙️</span>
            </div>
          </div>
        </div>

        <Recorder
          busy={busy}
          submitLabel="Send to Mehfil"
          onSubmit={async (blob, filter, durationSec) => {
            setBusy(true);
            try {
              await postMehfil({
                circleId: id,
                uid: user.uid,
                name: profile.name,
                photo: profile.photo,
                blob,
                filter,
                durationSec,
              });
            } finally {
              setBusy(false);
            }
          }}
        />

        <div className="space-y-3 mt-4">
          {msgs.length === 0 && (
            <p className="text-center text-sm opacity-50 py-6">Koi awaaz nahi yahan.</p>
          )}
          {msgs.map((m) => (
            <div key={m.id} className="bg-white rounded-2xl p-4 ring-1 ring-foreground/5 space-y-2">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-full bg-sunset-200 grid place-items-center text-[10px] font-semibold overflow-hidden">
                  {m.photo ? <img src={m.photo} className="w-full h-full object-cover" /> : m.name.slice(0, 1)}
                </div>
                <span className="text-xs font-semibold">{m.name}</span>
                <span className="text-[10px] opacity-50">{m.filter}</span>
              </div>
              <VoicePlayer url={m.url} filter={m.filter} durationSec={m.durationSec} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
