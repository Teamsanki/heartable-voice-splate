import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { onValue, ref, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Recorder } from "@/components/Recorder";
import { VoicePlayer } from "@/components/VoicePlayer";
import { postSnap } from "@/lib/voice-api";
import { blockUser, isMutuallyBlocked } from "@/lib/blocks";
import { areFriends } from "@/lib/social";
import { submitReport } from "@/lib/reports";
import {
  clearChatForMe, listenChatMuted, listenClearedAt, listenTyping,
  markThreadRead, sendTextDM, setChatMuted, setTyping, type DMMessage,
} from "@/lib/dm";
import { Bell, BellOff, Send, Trash2 } from "lucide-react";
import type { VoiceFilter } from "@/lib/audio-filters";

export const Route = createFileRoute("/dm/$uid")({
  head: () => ({ meta: [{ title: "Voice Note — Heartable" }] }),
  component: DMThread,
});

type Snap = DMMessage;

function DMThread() {
  const { uid: peerUid } = Route.useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [peerName, setPeerName] = useState("Friend");
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [peerTyping, setPeerTyping] = useState(false);
  const [muted, setMuted] = useState(false);
  const [clearedAt, setClearedAt] = useState(0);
  const typingTimer = useRef<any>(null);
  const [gate, setGate] = useState<"loading" | "ok" | "blocked" | "not-friends">("loading");

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
      if (!friends) { setGate("not-friends"); return; }
      setGate("ok");
    })().catch(() => setGate("not-friends"));
  }, [user, peerUid]);

  useEffect(() => {
    if (!user) return;
    const u1 = listenTyping(user.uid, peerUid, setPeerTyping);
    const u2 = listenChatMuted(user.uid, peerUid, setMuted);
    const u3 = listenClearedAt(user.uid, peerUid, setClearedAt);
    return () => { u1(); u2(); u3(); };
  }, [user, peerUid]);

  useEffect(() => {
    if (!threadId || !user) return;
    const unsub = onValue(ref(db, `dm/${threadId}/messages`), (snap) => {
      const out: Snap[] = [];
      const now = Date.now();
      snap.forEach((m) => {
        const v = m.val();
        const kind: string = v.kind || "voice";
        if (v.createdAt <= clearedAt) return;
        if (kind === "voice") {
          if ((v.expiresAt || 0) < now) return;
          if (v.listened && v.to === user.uid) return;
        }
        out.push({ id: m.key!, kind, ...v });
      });
      setSnaps(out.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)));
    });
    return () => unsub();
  }, [threadId, user, clearedAt]);

  // Read receipts — mark peer's messages as read while the thread is open
  useEffect(() => {
    if (!user || gate !== "ok") return;
    markThreadRead(user.uid, peerUid).catch(() => {});
  }, [user, peerUid, gate, snaps.length]);

  const onType = (v: string) => {
    setText(v);
    if (!user) return;
    setTyping(user.uid, peerUid, true).catch(() => {});
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(user.uid, peerUid, false).catch(() => {}), 2500);
  };

  const sendText = async () => {
    if (!user || !profile || !text.trim()) return;
    const t = text;
    setText("");
    await sendTextDM(user.uid, profile.name, peerUid, t);
    setTyping(user.uid, peerUid, false).catch(() => {});
  };

  const markListened = async (id: string, toMe: boolean) => {
    if (!toMe || !threadId) return;
    await update(ref(db, `dm/${threadId}/messages/${id}`), { listened: true });
  };

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-background text-foreground grid place-items-center p-6 text-center">
        <div className="max-w-xs">
          <p className="font-serif italic text-3xl">Chat locked</p>
          <p className="text-sm text-muted-foreground mt-2">
            {user && !profile
              ? "We couldn't load your profile yet. Retry after a moment — your chat will open right away."
              : "You need to be signed in to open this chat. Sign in and we'll bring you straight back here."}
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={() => (user && !profile ? window.location.reload() : navigate({ to: "/login" }))}
              className="px-4 py-2.5 rounded-full bg-sunset-600 text-white text-sm font-semibold"
            >
              {user && !profile ? "Retry" : "Sign in"}
            </button>
            <button onClick={() => navigate({ to: "/dm" })} className="text-sm text-muted-foreground underline">
              Back to Chats
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gate === "loading") {
    return (
      <div className="min-h-screen bg-background text-muted-foreground grid place-items-center text-sm">
        Opening chat…
      </div>
    );
  }

  if (gate === "blocked" || gate === "not-friends") {
    return (
      <div className="min-h-screen bg-background text-foreground grid place-items-center p-6 text-center">
        <div className="max-w-xs">
          <p className="text-2xl font-serif italic">{gate === "blocked" ? "Chat unavailable" : "Private chat"}</p>
          <p className="text-sm text-muted-foreground mt-2">
            {gate === "blocked" ? "This conversation is blocked. If permissions changed, retry to reload access." : "You can message only after you both follow each other. Follow back, then retry here."}
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={() => setGate("loading")}
              className="px-4 py-2.5 rounded-full bg-sunset-600 text-white text-sm font-semibold"
            >
              Retry
            </button>
            <button onClick={() => navigate({ to: "/dm" })} className="text-sm text-muted-foreground underline">
              Back to Chats
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="w-full sm:max-w-[480px] mx-auto min-h-[100dvh] flex flex-col p-6 gap-4 pb-32">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate({ to: "/dm" })} className="text-sm opacity-60">
            ← Back
          </button>
          <div className="flex items-center gap-2">
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
            className="text-[11px] px-3 py-1 rounded-full bg-red-500/15 text-red-600"
          >🚩 Report</button>
          <button
            onClick={async () => {
              if (!confirm(`Block ${peerName}?`)) return;
              await blockUser(user.uid, peerUid);
              navigate({ to: "/dm" });
            }}
            className="text-[11px] px-3 py-1 rounded-full bg-foreground/10"
          >Block</button>
          <button
            onClick={() => setChatMuted(user.uid, peerUid, !muted)}
            aria-label={muted ? "Unmute chat" : "Mute chat"}
            className="size-8 rounded-full bg-foreground/5 grid place-items-center"
          >{muted ? <BellOff className="size-4" /> : <Bell className="size-4" />}</button>
          <button
            onClick={async () => {
              if (!confirm("Delete this chat for you?")) return;
              await clearChatForMe(user.uid, peerUid);
            }}
            aria-label="Delete chat"
            className="size-8 rounded-full bg-foreground/5 grid place-items-center"
          ><Trash2 className="size-4" /></button>
          </div>
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
            const bubble = `rounded-2xl p-3.5 ring-1 ring-foreground/5 ${fromMe ? "bg-sunset-200 ml-8" : "bg-card mr-8"}`;
            if (s.kind === "text") {
              return (
                <div key={s.id} className={bubble}>
                  <p className="text-sm whitespace-pre-wrap break-words">{s.text}</p>
                  <p className="text-[10px] opacity-50 mt-1 text-right">
                    {fromMe ? (s.read ? "Seen" : "Sent") : ""}
                  </p>
                </div>
              );
            }
            if (s.kind === "post") {
              const pv = s.postPreview || ({} as any);
              return (
                <div key={s.id} className={bubble}>
                  <p className="text-[10px] opacity-50 mb-2">{fromMe ? "You shared a post" : `${s.name} shared a post`}</p>
                  <Link
                    to="/p/$id"
                    params={{ id: s.postId! }}
                    className="relative block rounded-xl overflow-hidden"
                    style={{ background: pv.bgCss || "linear-gradient(135deg,#0a0a0a,#1a1a1a)", color: pv.fgColor || "#fff8ee" }}
                  >
                    <div className="p-4 min-h-[110px] grid place-items-center text-center">
                      <p className="text-sm line-clamp-4">{pv.text || pv.caption || "🎙️ Voice post"}</p>
                    </div>
                    {pv.url && (
                      <span className="absolute bottom-2 left-2 text-[10px] px-2 py-1 rounded-full bg-black/45 text-white">
                        🎧 Voice reel{pv.durationSec ? ` · ${Math.round(pv.durationSec)}s` : ""}
                      </span>
                    )}
                  </Link>
                  {pv.url && (
                    <div className="mt-2 rounded-xl bg-foreground/5 px-2">
                      <VoicePlayer
                        url={pv.url}
                        filter={(pv.filter || "none") as VoiceFilter}
                        durationSec={pv.durationSec || 0}
                        compact
                      />
                    </div>
                  )}
                  {s.text && <p className="text-sm mt-2">{s.text}</p>}
                  <p className="text-[10px] opacity-50 mt-1 text-right">{fromMe ? (s.read ? "Seen" : "Sent") : ""}</p>
                </div>
              );
            }
            if (s.kind === "story-reaction" || s.kind === "story-reply") {
              return (
                <div key={s.id} className={bubble}>
                  <p className="text-[10px] opacity-50 mb-1">Replied to a story</p>
                  {s.emoji && <p className="text-3xl">{s.emoji}</p>}
                  {s.text && <p className="text-sm whitespace-pre-wrap">{s.text}</p>}
                  <p className="text-[10px] opacity-50 mt-1 text-right">{fromMe ? (s.read ? "Seen" : "Sent") : ""}</p>
                </div>
              );
            }
            return (
              <div key={s.id} className={bubble}>
                <p className="text-[10px] opacity-50 mb-2">
                  {fromMe ? "You" : s.name} · {s.filter} · disappears once heard
                </p>
                <VoicePlayer
                  url={s.url!}
                  filter={s.filter as VoiceFilter}
                  durationSec={s.durationSec || 0}
                  onPlayComplete={() => markListened(s.id, !fromMe)}
                />
              </div>
            );
          })}
          {peerTyping && (
            <p className="text-[11px] opacity-60 pl-1">{peerName} is typing…</p>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-3 bg-background/90 backdrop-blur border-t border-foreground/10">
          <div className="w-full sm:max-w-[480px] mx-auto flex gap-2">
            <input
              value={text}
              onChange={(e) => onType(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") sendText(); }}
              placeholder="Message…"
              className="flex-1 px-4 py-3 rounded-full bg-foreground/5 text-sm outline-none"
            />
            <button
              onClick={sendText}
              disabled={!text.trim()}
              aria-label="Send"
              className="size-11 rounded-full bg-sunset-600 text-white grid place-items-center disabled:opacity-40"
            ><Send className="size-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
