import { push, ref as dbRef, serverTimestamp, set } from "firebase/database";
import { getDownloadURL, ref as sRef, uploadBytes } from "firebase/storage";
import { db, storage, VOICE_ROOT } from "./firebase";
import { bumpStreak } from "./streak";
import type { VoiceFilter } from "./audio-filters";

const DAY = 24 * 60 * 60 * 1000;

async function uploadBlob(uid: string, blob: Blob, kind: string) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `${VOICE_ROOT}/${uid}/${kind}/${id}.webm`;
  const r = sRef(storage, path);
  await uploadBytes(r, blob, { contentType: blob.type || "audio/webm" });
  const url = await getDownloadURL(r);
  return { id, url, path };
}

export async function postFeed(opts: {
  uid: string;
  name: string;
  photo?: string | null;
  blob: Blob;
  filter: VoiceFilter;
  caption?: string;
  durationSec: number;
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
    durationSec: opts.durationSec,
    plays: 0,
    reactions: 0,
    createdAt: serverTimestamp(),
  });
  await bumpStreak(opts.uid);
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
