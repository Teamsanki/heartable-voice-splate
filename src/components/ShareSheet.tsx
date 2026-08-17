import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { get, ref } from "firebase/database";
import { X, Search, Link2, PlusCircle, Send, Check, MessageCircle } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { db, VOICE_ROOT } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { recordShare } from "@/lib/social";
import { sendPostDM } from "@/lib/dm";
import { sharePostToStory, type PostPreview } from "@/lib/share";

type Friend = { uid: string; name: string; photo?: string | null };

export function ShareSheet({
  postId,
  preview,
  onClose,
}: {
  postId: string;
  preview: PostPreview;
  onClose: () => void;
}) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [q, setQ] = useState("");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [storyDone, setStoryDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const ok = (msg: string) => { setStatus({ kind: "ok", msg }); toast.success(msg); };
  const fail = (msg: string) => { setStatus({ kind: "err", msg }); toast.error(msg); };

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 3500);
    return () => clearTimeout(t);
  }, [status]);

  useEffect(() => {
    if (!user) { setLoadingPeople(false); return; }
    let cancelled = false;
    setLoadingPeople(true);
    get(ref(db, VOICE_ROOT))
      .then((snap) => {
        if (cancelled) return;
        const people: Friend[] = [];
        snap.forEach((child) => {
          if (child.key === user.uid) return;
          const p = child.child("profile").val() || {};
          if (p.name) people.push({ uid: child.key || "", name: p.name, photo: p.photo || null });
        });
        setFriends(people.sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch((error) => {
        if (!cancelled) fail(error?.message || "Could not load people.");
      })
      .finally(() => { if (!cancelled) setLoadingPeople(false); });
    return () => { cancelled = true; };
  }, [user]);

  const url = typeof location !== "undefined" ? `${location.origin}/p/${postId}` : "";
  const ql = q.trim().toLowerCase();
  const list = useMemo(
    () => (ql ? friends.filter((f) => f.name.toLowerCase().includes(ql)) : friends),
    [friends, ql],
  );

  const sendTo = async (f: Friend) => {
    if (sent.has(f.uid)) return;
    if (!user || !profile) {
      fail("Sign in to send this post in Chats.");
      return;
    }
    setBusy(true);
    try {
      await sendPostDM(user.uid, profile.name, f.uid, postId, preview, note);
      try { await recordShare(postId, user.uid); } catch { /* count only */ }
      setSent((s) => new Set(s).add(f.uid));
      ok(`Sent to ${f.name}`);
    } catch (e: any) {
      console.error("share dm failed", e);
      fail(e?.message || "Could not send. Try again.");
    } finally { setBusy(false); }
  };

  const toStory = async () => {
    if (!user || !profile) {
      fail("Sign in to add this post to your story.");
      return;
    }
    if (storyDone) return;
    setBusy(true);
    try {
      await sharePostToStory({ uid: user.uid, name: profile.name, photo: profile.photo, postId, preview });
      try { await recordShare(postId, user.uid); } catch { /* count only */ }
      setStoryDone(true);
      ok("Added to your story — visible for 24h");
    } catch (e: any) {
      console.error("share story failed", e);
      fail(e?.message || "Could not add to story.");
    } finally { setBusy(false); }
  };

  const copyLink = async () => {
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement("textarea");
        input.value = url;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand("copy");
        input.remove();
        if (!copied) throw new Error("Copy unavailable");
      }
      ok("Link copied to clipboard");
      try { await recordShare(postId, user?.uid); } catch { /* count only */ }
    } catch {
      fail("Could not copy the link. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="w-full sm:max-w-[440px] bg-card text-card-foreground rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 flex items-center justify-between border-b border-foreground/10">
          <h2 className="font-serif italic text-2xl">Share</h2>
          <button onClick={onClose} aria-label="Close" className="size-9 rounded-full bg-foreground/5 grid place-items-center">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-4 grid grid-cols-2 gap-2">
          <button onClick={toStory} disabled={busy || storyDone}
            className="flex items-center gap-2 px-3 py-3 rounded-2xl ring-1 ring-foreground/10 text-sm disabled:opacity-60">
            {storyDone ? <Check className="size-4 text-emerald-500" /> : <PlusCircle className="size-4" />}
            {storyDone ? "Added to story" : "Add to your story"}
          </button>
          <button onClick={copyLink}
            className="flex items-center gap-2 px-3 py-3 rounded-2xl ring-1 ring-foreground/10 text-sm">
            <Link2 className="size-4" /> Copy / share link
          </button>
        </div>

        {status && (
          <div
            className={`mx-4 mb-2 rounded-xl px-3 py-2 text-xs font-medium ${
              status.kind === "ok"
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-red-500/15 text-red-600 dark:text-red-400"
            }`}
          >
            {status.msg}
          </div>
        )}

        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search friends"
              className="w-full pl-9 pr-4 py-2.5 rounded-full bg-foreground/5 text-sm outline-none" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {loadingPeople && <p className="text-center text-xs text-muted-foreground py-8">Loading people…</p>}
          {!loadingPeople && list.length === 0 && (
            <div className="text-center py-8 space-y-2">
              <p className="text-xs opacity-50">
                No people found yet.
              </p>
              <button
                onClick={() => { onClose(); navigate({ to: "/dm" }); }}
                className="text-xs font-semibold text-sunset-600 underline"
              >
                Open Chats to find people
              </button>
            </div>
          )}
          {list.map((f) => (
            <div key={f.uid} className="flex items-center gap-3 p-2 rounded-xl">
              <div className="size-10 rounded-full bg-sunset-200 grid place-items-center text-xs font-semibold overflow-hidden">
                {f.photo ? <img src={f.photo} alt="" className="w-full h-full object-cover" /> : f.name.slice(0, 1).toUpperCase()}
              </div>
              <button
                onClick={() => { onClose(); navigate({ to: "/dm/$uid", params: { uid: f.uid } }); }}
                className="flex-1 text-left text-sm font-medium truncate hover:underline"
              >
                {f.name}
              </button>
              <button
                onClick={() => { onClose(); navigate({ to: "/dm/$uid", params: { uid: f.uid } }); }}
                aria-label={`Open chat with ${f.name}`}
                className="size-8 rounded-full bg-foreground/5 grid place-items-center"
              >
                <MessageCircle className="size-4" />
              </button>
              <button onClick={() => sendTo(f)} disabled={busy || sent.has(f.uid)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 ${sent.has(f.uid) ? "bg-foreground/10 opacity-70" : "bg-sunset-600 text-white"}`}>
                {sent.has(f.uid) ? <><Check className="size-3" /> Sent</> : <><Send className="size-3" /> Send</>}
              </button>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-foreground/10">
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200}
            placeholder="Write a message…"
            className="w-full px-4 py-2.5 rounded-full bg-foreground/5 text-sm outline-none" />
        </div>
      </div>
    </div>
  );
}
