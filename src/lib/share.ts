import { onValue, push, ref, runTransaction, set } from "firebase/database";
import { db, VOICE_ROOT } from "./firebase";

const DAY = 24 * 60 * 60 * 1000;

/** Firebase rejects `undefined` values — strip them from previews. */
export function cleanPreview<T extends Record<string, any>>(p: T): Record<string, any> {
  const out: Record<string, any> = {};
  Object.entries(p || {}).forEach(([k, v]) => {
    if (v !== undefined) out[k] = v;
  });
  return out;
}

export type PostPreview = {
  name: string;
  text?: string;
  caption?: string;
  bgCss?: string;
  fgColor?: string;
  fontId?: string;
  type?: string;
  url?: string;
  filter?: string;
  durationSec?: number;
};

/* ---------- share analytics ---------- */

export type ShareChannel = "dm" | "story" | "link";
export type ShareStats = { dm: number; story: number; link: number; replays: number };

export async function bumpShareStat(uid: string, postId: string, channel: ShareChannel) {
  await runTransaction(
    ref(db, `shareStats/${uid}/${postId}/${channel}`),
    (n: any) => (n || 0) + 1,
  );
  const event = push(ref(db, `shareEvents/${uid}/${postId}`));
  await set(event, { channel, createdAt: Date.now() });
}

export async function recordReplay(ownerUid: string, postId: string | undefined, storyId: string, viewerUid: string) {
  if (postId) {
    await runTransaction(ref(db, `shareStats/${ownerUid}/${postId}/replays`), (n: any) => (n || 0) + 1);
    const event = push(ref(db, `shareEvents/${ownerUid}/${postId}`));
    await set(event, { channel: "replay", storyId, viewerUid, createdAt: Date.now() });
  }
}

/** Live counts of how a post was shared + how often the shared story was replayed. */
export function listenShareStats(uid: string, postId: string, cb: (s: ShareStats) => void) {
  const stats: ShareStats = { dm: 0, story: 0, link: 0, replays: 0 };
  const emit = () => cb({ ...stats });

  const u1 = onValue(ref(db, `shareStats/${uid}/${postId}`), (snap) => {
    const v = snap.val() || {};
    stats.dm = Number(v.dm || 0);
    stats.story = Number(v.story || 0);
    stats.link = Number(v.link || 0);
    emit();
  });

  const u2 = onValue(ref(db, `${VOICE_ROOT}/${uid}/stories`), (snap) => {
    let replays = 0;
    snap.forEach((s) => {
      const v = s.val();
      if (v?.kind === "post" && v?.postId === postId) replays += Object.keys(v.replays || {}).length;
    });
    stats.replays = replays;
    emit();
  });

  return () => { u1(); u2(); };
}

/** Instagram-style "Add post to your story". */
export async function sharePostToStory(opts: {
  uid: string;
  name: string;
  photo?: string | null;
  postId: string;
  preview: PostPreview;
}) {
  const node = push(ref(db, `${VOICE_ROOT}/${opts.uid}/stories`));
  await set(node, {
    uid: opts.uid,
    name: opts.name,
    photo: opts.photo || null,
    kind: "post",
    postId: opts.postId,
    postPreview: cleanPreview(opts.preview),
    url: opts.preview.url || "",
    filter: opts.preview.filter || "none",
    durationSec: Math.max(6, Math.round(opts.preview.durationSec || 0)),
    createdAt: Date.now(),
    expiresAt: Date.now() + DAY,
    replays: {},
    reactions: {},
  });
  return node.key!;
}
