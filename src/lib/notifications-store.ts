import { onValue, push, ref, set, update, get } from "firebase/database";
import { db, VOICE_ROOT } from "./firebase";

export type NotifKind = "like" | "comment" | "follow" | "story-react" | "story-replay" | "dm-share" | "dm-message" | "admin" | "warning";
export type Notif = {
  id: string;
  kind: NotifKind;
  fromUid?: string;
  fromName?: string;
  postId?: string;
  peerUid?: string;
  storyId?: string;
  text?: string;
  read?: boolean;
  createdAt: number;
};

export async function pushNotif(toUid: string, n: Omit<Notif, "id" | "createdAt" | "read">) {
  if (!toUid) return;
  
  // Check recipient preferences
  const settingsRef = ref(db, `${VOICE_ROOT}/${toUid}/settings/notifs`);
  const settingsSnap = await get(settingsRef);
  const prefs = settingsSnap.val();
  
  if (prefs) {
    if (n.kind === "like" && prefs.likes === false) return;
    if (n.kind === "comment" && prefs.comments === false) return;
    if (n.kind === "follow" && prefs.follows === false) return;
    if (n.kind === "admin" && prefs.broadcasts === false) return;
  }

  const node = push(ref(db, `${VOICE_ROOT}/${toUid}/notifications`));
  await set(node, { ...n, read: false, createdAt: Date.now() });
}

export function listenNotifs(uid: string, cb: (n: Notif[]) => void) {
  return onValue(ref(db, `${VOICE_ROOT}/${uid}/notifications`), (snap) => {
    const out: Notif[] = [];
    snap.forEach((c) => { out.push({ id: c.key!, ...(c.val() as any) }); });
    cb(out.sort((a, b) => b.createdAt - a.createdAt).slice(0, 100));
  });
}

export async function markAllRead(uid: string) {
  const r = ref(db, `${VOICE_ROOT}/${uid}/notifications`);
  const snap = await get(r);
  const patch: Record<string, any> = {};
  snap.forEach((c) => { patch[`${c.key}/read`] = true; });
  if (Object.keys(patch).length) await update(r, patch);
}
