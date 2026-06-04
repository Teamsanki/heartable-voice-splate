import { get, onValue, push, ref, runTransaction, serverTimestamp, set, update } from "firebase/database";
import { db, VOICE_ROOT } from "./firebase";
import { pushNotif } from "./notifications-store";

/* ---------------- Polls ---------------- */

export type PostPoll = {
  question: string;
  options: string[]; // 2..4
};

export async function votePostPoll(postId: string, uid: string, optionIndex: number) {
  await set(ref(db, `pollVotes/${postId}/${uid}`), optionIndex);
}

export function listenPostPoll(
  postId: string,
  uid: string | undefined,
  cb: (r: { counts: Record<number, number>; myVote: number | null; total: number }) => void,
) {
  return onValue(ref(db, `pollVotes/${postId}`), (snap) => {
    const counts: Record<number, number> = {};
    let total = 0;
    let myVote: number | null = null;
    snap.forEach((c) => {
      const v = c.val() as number;
      counts[v] = (counts[v] || 0) + 1;
      total++;
      if (uid && c.key === uid) myVote = v;
    });
    cb({ counts, myVote, total });
  });
}

/* ---------------- Views (unique per uid) ---------------- */

export async function recordView(postId: string, uid: string) {
  const r = ref(db, `feed/${postId}/views/${uid}`);
  const s = await get(r);
  if (s.exists()) return;
  await set(r, Date.now());
  await runTransaction(ref(db, `feed/${postId}/viewCount`), (n: any) => (n || 0) + 1);
}

/* ---------------- Repost ---------------- */

export async function repost(originalPostId: string, byUid: string, byName: string, byPhoto?: string | null) {
  const orig = await get(ref(db, `feed/${originalPostId}`));
  const v = orig.val();
  if (!v) throw new Error("Post not found");
  const node = push(ref(db, "feed"));
  await set(node, {
    uid: byUid,
    name: byName,
    photo: byPhoto || null,
    type: v.type || "voice",
    text: v.text || "",
    fontId: v.fontId || null,
    bgCss: v.bgCss || null,
    fgColor: v.fgColor || null,
    url: v.url || "",
    filter: v.filter || "none",
    caption: v.caption || "",
    category: v.category || "other",
    durationSec: v.durationSec || 0,
    repostOf: originalPostId,
    repostUid: v.uid,
    repostName: v.name,
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    createdAt: serverTimestamp(),
  });
  await runTransaction(ref(db, `feed/${originalPostId}/repostCount`), (n: any) => (n || 0) + 1);
  if (v.uid && v.uid !== byUid) {
    await pushNotif(v.uid, {
      kind: "like",
      fromUid: byUid,
      fromName: byName,
      postId: originalPostId,
      text: "reposted your voice",
    });
  }
  return node.key!;
}
