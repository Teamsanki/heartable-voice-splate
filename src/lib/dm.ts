import { get, onValue, push, ref, remove, serverTimestamp, set, update } from "firebase/database";
import { db, VOICE_ROOT } from "./firebase";
import { cleanPreview } from "./share";

export function threadId(a: string, b: string) {
  return [a, b].sort().join("_");
}

export type DMKind = "voice" | "text" | "post";

export type DMMessage = {
  id: string;
  uid: string;
  name?: string;
  to: string;
  kind: DMKind;
  text?: string;
  url?: string;
  filter?: any;
  durationSec?: number;
  postId?: string;
  postPreview?: { name: string; text?: string; bgCss?: string; fgColor?: string; type?: string } | null;
  listened?: boolean;
  read?: boolean;
  createdAt: number;
  expiresAt?: number;
};

/* ---------- send ---------- */

export async function sendTextDM(fromUid: string, fromName: string, toUid: string, text: string) {
  const t = text.trim().slice(0, 1000);
  if (!t) return;
  const node = push(ref(db, `dm/${threadId(fromUid, toUid)}/messages`));
  await set(node, {
    uid: fromUid, name: fromName, to: toUid, kind: "text",
    text: t, read: false, createdAt: Date.now(),
  });
  return node.key!;
}

export async function sendPostDM(
  fromUid: string,
  fromName: string,
  toUid: string,
  postId: string,
  preview: DMMessage["postPreview"],
  note?: string,
) {
  const node = push(ref(db, `dm/${threadId(fromUid, toUid)}/messages`));
  await set(node, {
    uid: fromUid, name: fromName, to: toUid, kind: "post",
    postId, postPreview: preview ? cleanPreview(preview) : null,
    text: (note || "").slice(0, 200),
    read: false, createdAt: Date.now(),
  });
  return node.key!;
}

/* ---------- read receipts ---------- */

export async function markThreadRead(myUid: string, peerUid: string) {
  const tid = threadId(myUid, peerUid);
  const snap = await get(ref(db, `dm/${tid}/messages`));
  const patch: Record<string, any> = {};
  snap.forEach((m) => {
    const v = m.val();
    if (v?.to === myUid && !v.read) patch[`${m.key}/read`] = true;
  });
  if (Object.keys(patch).length) await update(ref(db, `dm/${tid}/messages`), patch);
}

/* ---------- typing indicator ---------- */

export async function setTyping(myUid: string, peerUid: string, typing: boolean) {
  const r = ref(db, `dm/${threadId(myUid, peerUid)}/typing/${myUid}`);
  if (typing) await set(r, Date.now());
  else await remove(r);
}

export function listenTyping(myUid: string, peerUid: string, cb: (typing: boolean) => void) {
  return onValue(ref(db, `dm/${threadId(myUid, peerUid)}/typing/${peerUid}`), (s) => {
    const ts = s.val() as number | null;
    cb(!!ts && Date.now() - ts < 8000);
  });
}

/* ---------- mute / clear ---------- */

export async function setChatMuted(myUid: string, peerUid: string, muted: boolean) {
  const r = ref(db, `${VOICE_ROOT}/${myUid}/dmMuted/${peerUid}`);
  if (muted) await set(r, true); else await remove(r);
}

export function listenChatMuted(myUid: string, peerUid: string, cb: (m: boolean) => void) {
  return onValue(ref(db, `${VOICE_ROOT}/${myUid}/dmMuted/${peerUid}`), (s) => cb(!!s.val()));
}

/** "Delete chat" for me only — hides everything older than now. */
export async function clearChatForMe(myUid: string, peerUid: string) {
  await set(ref(db, `${VOICE_ROOT}/${myUid}/dmCleared/${peerUid}`), Date.now());
}

export function listenClearedAt(myUid: string, peerUid: string, cb: (ts: number) => void) {
  return onValue(ref(db, `${VOICE_ROOT}/${myUid}/dmCleared/${peerUid}`), (s) => cb(Number(s.val() || 0)));
}

/* ---------- unread ---------- */

export function listenThreadUnread(myUid: string, peerUid: string, cb: (n: number) => void) {
  return onValue(ref(db, `dm/${threadId(myUid, peerUid)}/messages`), (snap) => {
    let n = 0;
    snap.forEach((m) => {
      const v = m.val();
      if (v?.to === myUid && !v.read) n++;
    });
    cb(n);
  });
}
