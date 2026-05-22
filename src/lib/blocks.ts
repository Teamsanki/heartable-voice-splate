import { onValue, ref, remove, set } from "firebase/database";
import { db, VOICE_ROOT } from "./firebase";

/** uid blocks targetUid. */
export async function blockUser(uid: string, targetUid: string) {
  await set(ref(db, `${VOICE_ROOT}/${uid}/blocks/${targetUid}`), Date.now());
}
export async function unblockUser(uid: string, targetUid: string) {
  await remove(ref(db, `${VOICE_ROOT}/${uid}/blocks/${targetUid}`));
}

/** Set of uids that the current user has blocked. */
export function listenMyBlocks(uid: string, cb: (set: Set<string>) => void) {
  return onValue(ref(db, `${VOICE_ROOT}/${uid}/blocks`), (snap) => {
    const s = new Set<string>();
    snap.forEach((c) => { s.add(c.key!); });
    cb(s);
  });
}

/** Was I blocked by targetUid? */
export function listenBlockedByMe(myUid: string, targetUid: string, cb: (blocked: boolean) => void) {
  return onValue(ref(db, `${VOICE_ROOT}/${targetUid}/blocks/${myUid}`), (s) => cb(s.exists()));
}

/** Returns true if either side has blocked the other. Async one-shot. */
import { get } from "firebase/database";
export async function isMutuallyBlocked(a: string, b: string) {
  const [s1, s2] = await Promise.all([
    get(ref(db, `${VOICE_ROOT}/${a}/blocks/${b}`)),
    get(ref(db, `${VOICE_ROOT}/${b}/blocks/${a}`)),
  ]);
  return s1.exists() || s2.exists();
}