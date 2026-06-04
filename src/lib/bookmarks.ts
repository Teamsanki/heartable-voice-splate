import { get, onValue, ref, remove, set } from "firebase/database";
import { db } from "./firebase";

/** Toggle bookmark on a post for the current user. Returns new state. */
export async function toggleBookmark(uid: string, postId: string) {
  const r = ref(db, `bookmarks/${uid}/${postId}`);
  const s = await get(r);
  if (s.exists()) { await remove(r); return false; }
  await set(r, Date.now());
  return true;
}

export function listenBookmarked(uid: string, postId: string, cb: (b: boolean) => void) {
  return onValue(ref(db, `bookmarks/${uid}/${postId}`), (s) => cb(s.exists()));
}

export function listenMyBookmarks(uid: string, cb: (ids: string[]) => void) {
  return onValue(ref(db, `bookmarks/${uid}`), (snap) => {
    const out: { id: string; at: number }[] = [];
    snap.forEach((c) => { out.push({ id: c.key!, at: Number(c.val()) || 0 }); });
    cb(out.sort((a, b) => b.at - a.at).map((x) => x.id));
  });
}