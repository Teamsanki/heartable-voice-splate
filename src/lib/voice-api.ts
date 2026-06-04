import { push, ref as dbRef, serverTimestamp, set } from "firebase/database";
import { get, runTransaction } from "firebase/database";
import { db, VOICE_ROOT, GUEST_DAILY_VOICE_LIMIT } from "./firebase";
import { supabase } from "@/integrations/supabase/client";
import { bumpStreak } from "./streak";
import { indexPostHashtags } from "./hashtags";
import type { VoiceFilter } from "./audio-filters";

const DAY = 24 * 60 * 60 * 1000;

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function getGuestQuota(uid: string) {
  const k = todayKey();
  const snap = await get(dbRef(db, `${VOICE_ROOT}/${uid}/quota/${k}`));
  const used = (snap.val() as number) || 0;
  return { used, limit: GUEST_DAILY_VOICE_LIMIT, remaining: Math.max(0, GUEST_DAILY_VOICE_LIMIT - used) };
}

export async function consumeGuestQuota(uid: string) {
  const k = todayKey();
  const r = dbRef(db, `${VOICE_ROOT}/${uid}/quota/${k}`);
  const res = await runTransaction(r, (cur) => {
    const n = (cur as number) || 0;
    if (n >= GUEST_DAILY_VOICE_LIMIT) return; // abort
    return n + 1;
  });
  if (!res.committed) {
    throw new Error(`Guest limit khatm — aaj ke ${GUEST_DAILY_VOICE_LIMIT} voice use ho gaye. Account banaa le.`);
  }
}

async function uploadBlob(uid: string, blob: Blob, kind: string) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  // Strip codec params (e.g. "audio/webm;codecs=opus") so Supabase accepts it.
  const ct = (blob.type || "audio/webm").split(";")[0] || "audio/webm";
  const ext = ct.includes("mp4") ? "m4a" : ct.includes("ogg") ? "ogg" : "webm";
  const path = `${uid}/${kind}/${id}.${ext}`;
  const { error } = await supabase.storage
    .from("voice")
    .upload(path, blob, { contentType: ct, upsert: false });
  if (error) throw new Error(`Upload fail: ${error.message}`);
  const { data } = supabase.storage.from("voice").getPublicUrl(path);
  return { id, url: data.publicUrl, path };
}

export async function postFeed(opts: {
  uid: string;
  name: string;
  photo?: string | null;
  blob: Blob;
  filter: VoiceFilter;
  caption?: string;
  durationSec: number;
  category?: "song" | "shayari" | "story" | "other";
}) {
  const { url } = await uploadBlob(opts.uid, opts.blob, "feed");
  const node = push(dbRef(db, "feed"));
  await set(node, {
    uid: opts.uid,
    name: opts.name,
    photo: opts.photo || null,
    url,
    filter: opts.filter,
    caption: opts.caption || "",
    category: opts.category || "other",
    durationSec: opts.durationSec,
    plays: 0,
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    createdAt: serverTimestamp(),
  });
  await bumpStreak(opts.uid);
  if (opts.caption) {
    indexPostHashtags(node.key!, opts.caption, Date.now()).catch(() => {});
  }
  return node.key!;
}

export async function postStory(opts: {
  uid: string;
  name: string;
  photo?: string | null;
  blob: Blob;
  filter: VoiceFilter;
  durationSec: number;
}) {
  const { url } = await uploadBlob(opts.uid, opts.blob, "stories");
  const node = push(dbRef(db, `${VOICE_ROOT}/${opts.uid}/stories`));
  await set(node, {
    uid: opts.uid,
    name: opts.name,
    photo: opts.photo || null,
    url,
    filter: opts.filter,
    durationSec: opts.durationSec,
    createdAt: Date.now(),
    expiresAt: Date.now() + DAY,
    replays: {},
    reactions: {},
  });
  await bumpStreak(opts.uid);
  return node.key!;
}

export async function postSnap(opts: {
  uid: string;
  name: string;
  toUid: string;
  blob: Blob;
  filter: VoiceFilter;
  durationSec: number;
}) {
  const { url } = await uploadBlob(opts.uid, opts.blob, "snaps");
  const node = push(dbRef(db, `dm/${[opts.uid, opts.toUid].sort().join("_")}/messages`));
  await set(node, {
    uid: opts.uid,
    name: opts.name,
    to: opts.toUid,
    url,
    filter: opts.filter,
    durationSec: opts.durationSec,
    listened: false,
    createdAt: Date.now(),
    expiresAt: Date.now() + DAY,
  });
  await bumpStreak(opts.uid);
  return node.key!;
}

export async function postMehfil(opts: {
  circleId: string;
  uid: string;
  name: string;
  photo?: string | null;
  blob: Blob;
  filter: VoiceFilter;
  durationSec: number;
}) {
  const { url } = await uploadBlob(opts.uid, opts.blob, `mehfil-${opts.circleId}`);
  const node = push(dbRef(db, `mehfil/${opts.circleId}/messages`));
  await set(node, {
    uid: opts.uid,
    name: opts.name,
    photo: opts.photo || null,
    url,
    filter: opts.filter,
    durationSec: opts.durationSec,
    createdAt: Date.now(),
  });
  await bumpStreak(opts.uid);
  return node.key!;
}

/** Upload any image blob/file (avatar, chat photo) to Supabase voice bucket. */
export async function uploadImage(uid: string, file: Blob, kind: string) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ct = (file.type || "image/jpeg").split(";")[0];
  const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
  const path = `${uid}/${kind}/${id}.${ext}`;
  const { error } = await supabase.storage.from("voice").upload(path, file, { contentType: ct, upsert: true });
  if (error) throw new Error(`Image upload fail: ${error.message}`);
  const { data } = supabase.storage.from("voice").getPublicUrl(path);
  return data.publicUrl;
}

/** Send a chat text/voice/image message between friends. */
export async function postChat(opts: {
  uid: string;
  toUid: string;
  text?: string;
  imageUrl?: string;
  voiceUrl?: string;
  durationSec?: number;
}) {
  const tid = [opts.uid, opts.toUid].sort().join("_");
  const node = push(dbRef(db, `chat/${tid}/messages`));
  await set(node, {
    uid: opts.uid,
    to: opts.toUid,
    text: opts.text || null,
    imageUrl: opts.imageUrl || null,
    voiceUrl: opts.voiceUrl || null,
    durationSec: opts.durationSec || 0,
    createdAt: Date.now(),
  });
  return node.key!;
}

export async function uploadChatVoice(uid: string, blob: Blob) {
  return uploadBlob(uid, blob, "chat");
}
