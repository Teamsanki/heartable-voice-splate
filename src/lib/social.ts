import {
  get,
  onValue,
  push,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set,
  update,
} from "firebase/database";
import { db, VOICE_ROOT } from "./firebase";

/** Toggle like on a feed post. Returns new state. */
export async function toggleLike(postId: string, uid: string) {
  const likeRef = ref(db, `feed/${postId}/likes/${uid}`);
  const snap = await get(likeRef);
  const liked = snap.exists();
  if (liked) {
    await remove(likeRef);
    await runTransaction(ref(db, `feed/${postId}/likeCount`), (n) =>
      Math.max(0, (n || 0) - 1),
    );
    return false;
  }
  await set(likeRef, true);
  await runTransaction(ref(db, `feed/${postId}/likeCount`), (n) => (n || 0) + 1);
  // bump owner stats
  const ownerSnap = await get(ref(db, `feed/${postId}/uid`));
  const owner = ownerSnap.val();
  if (owner)
    await runTransaction(
      ref(db, `userStats/${owner}/totalLikes`),
      (n) => (n || 0) + 1,
    );
  return true;
}

export function listenLiked(postId: string, uid: string, cb: (liked: boolean) => void) {
  return onValue(ref(db, `feed/${postId}/likes/${uid}`), (s) => cb(s.exists()));
}

export async function addComment(
  postId: string,
  uid: string,
  name: string,
  text: string,
) {
  const node = push(ref(db, `comments/${postId}`));
  await set(node, { uid, name, text: text.slice(0, 300), createdAt: Date.now() });
  await runTransaction(ref(db, `feed/${postId}/commentCount`), (n) => (n || 0) + 1);
  return node.key!;
}

export function listenComments(
  postId: string,
  cb: (
    items: { id: string; uid: string; name: string; text: string; createdAt: number }[],
  ) => void,
) {
  return onValue(ref(db, `comments/${postId}`), (snap) => {
    const out: any[] = [];
    snap.forEach((c) => out.push({ id: c.key!, ...(c.val() as any) }));
    cb(out.sort((a, b) => a.createdAt - b.createdAt));
  });
}

export async function recordShare(postId: string, sharerUid?: string) {
  await runTransaction(ref(db, `feed/${postId}/shareCount`), (n) => (n || 0) + 1);
  if (sharerUid)
    await runTransaction(
      ref(db, `userStats/${sharerUid}/totalShares`),
      (n) => (n || 0) + 1,
    );
}

export async function follow(followerUid: string, followeeUid: string) {
  if (followerUid === followeeUid) return;
  await update(ref(db), {
    [`follows/${followerUid}/${followeeUid}`]: true,
    [`followers/${followeeUid}/${followerUid}`]: true,
  });
  await runTransaction(
    ref(db, `userStats/${followerUid}/following`),
    (n) => (n || 0) + 1,
  );
  await runTransaction(
    ref(db, `userStats/${followeeUid}/followers`),
    (n) => (n || 0) + 1,
  );
}

export async function unfollow(followerUid: string, followeeUid: string) {
  await update(ref(db), {
    [`follows/${followerUid}/${followeeUid}`]: null,
    [`followers/${followeeUid}/${followerUid}`]: null,
  });
  await runTransaction(
    ref(db, `userStats/${followerUid}/following`),
    (n) => Math.max(0, (n || 0) - 1),
  );
  await runTransaction(
    ref(db, `userStats/${followeeUid}/followers`),
    (n) => Math.max(0, (n || 0) - 1),
  );
}

export function listenFollowing(
  followerUid: string,
  followeeUid: string,
  cb: (following: boolean) => void,
) {
  return onValue(ref(db, `follows/${followerUid}/${followeeUid}`), (s) =>
    cb(s.exists()),
  );
}

export type UserStats = {
  followers: number;
  following: number;
  totalLikes: number;
  totalShares: number;
};

export function listenUserStats(uid: string, cb: (s: UserStats) => void) {
  return onValue(ref(db, `userStats/${uid}`), (snap) => {
    const v = (snap.val() as Partial<UserStats>) || {};
    cb({
      followers: v.followers || 0,
      following: v.following || 0,
      totalLikes: v.totalLikes || 0,
      totalShares: v.totalShares || 0,
    });
  });
}

export function listenUserPosts(
  uid: string,
  cb: (posts: { id: string; caption: string; createdAt: number; durationSec: number }[]) => void,
) {
  return onValue(ref(db, "feed"), (snap) => {
    const out: any[] = [];
    snap.forEach((c) => {
      const v = c.val();
      if (v?.uid === uid)
        out.push({
          id: c.key!,
          caption: v.caption || "",
          createdAt: v.createdAt || 0,
          durationSec: v.durationSec || 0,
        });
    });
    cb(out.sort((a, b) => b.createdAt - a.createdAt));
  });
}

/* ---------------- Admin / Support / Broadcast ---------------- */

export type Broadcast = {
  id: string;
  title: string;
  body: string;
  createdAt: number;
};

export async function sendBroadcast(title: string, body: string, byUid: string) {
  const node = push(ref(db, "broadcasts"));
  await set(node, { title, body, createdAt: Date.now(), sentBy: byUid });
  return node.key!;
}

export function listenLatestBroadcast(cb: (b: Broadcast | null) => void) {
  return onValue(ref(db, "broadcasts"), (snap) => {
    let latest: Broadcast | null = null;
    snap.forEach((c) => {
      const v = c.val();
      if (!latest || v.createdAt > latest.createdAt)
        latest = { id: c.key!, ...v } as Broadcast;
    });
    cb(latest);
  });
}

export function listenAdminPresence(cb: (online: boolean) => void) {
  return onValue(ref(db, "admin/presence/online"), (s) => cb(!!s.val()));
}

export async function setAdminPresence(online: boolean) {
  await set(ref(db, "admin/presence"), {
    online,
    lastSeen: serverTimestamp(),
  });
}

export type Ticket = {
  id: string;
  uid: string;
  name: string;
  status: "open" | "resolved";
  createdAt: number;
  lastMsgAt: number;
  lastMsg?: string;
};

export async function ensureTicket(uid: string, name: string) {
  // 1 ticket per user (latest open)
  const snap = await get(ref(db, "tickets"));
  let existing: string | null = null;
  snap.forEach((c) => {
    const v = c.val();
    if (v.uid === uid && v.status === "open") existing = c.key!;
  });
  if (existing) return existing;
  const node = push(ref(db, "tickets"));
  await set(node, {
    uid,
    name,
    status: "open",
    createdAt: Date.now(),
    lastMsgAt: Date.now(),
  });
  return node.key!;
}

export async function sendTicketMsg(
  ticketId: string,
  from: "user" | "admin",
  text: string,
) {
  const m = push(ref(db, `tickets/${ticketId}/messages`));
  await set(m, { from, text: text.slice(0, 1000), createdAt: Date.now() });
  await update(ref(db, `tickets/${ticketId}`), {
    lastMsgAt: Date.now(),
    lastMsg: text.slice(0, 80),
  });
}

export function listenTicketMsgs(
  ticketId: string,
  cb: (msgs: { id: string; from: string; text: string; createdAt: number }[]) => void,
) {
  return onValue(ref(db, `tickets/${ticketId}/messages`), (snap) => {
    const out: any[] = [];
    snap.forEach((c) => out.push({ id: c.key!, ...(c.val() as any) }));
    cb(out.sort((a, b) => a.createdAt - b.createdAt));
  });
}

export function listenAllTickets(cb: (t: Ticket[]) => void) {
  return onValue(ref(db, "tickets"), (snap) => {
    const out: Ticket[] = [];
    snap.forEach((c) => out.push({ id: c.key!, ...(c.val() as any) }));
    cb(out.sort((a, b) => b.lastMsgAt - a.lastMsgAt));
  });
}

export async function resolveTicket(ticketId: string) {
  await update(ref(db, `tickets/${ticketId}`), { status: "resolved" });
}