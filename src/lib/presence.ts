import { onDisconnect, onValue, ref, serverTimestamp, set } from "firebase/database";
import { db, VOICE_ROOT } from "./firebase";

/**
 * Mark a user as online while the tab is open. Respects the user's
 * "online activity" setting — if it's off, presence is cleared.
 */
export function startPresence(uid: string, shareOnline: boolean) {
  const r = ref(db, `${VOICE_ROOT}/${uid}/presence`);
  if (!shareOnline) {
    set(r, { online: false, lastSeen: serverTimestamp() }).catch(() => {});
    return () => {};
  }
  set(r, { online: true, lastSeen: serverTimestamp() }).catch(() => {});
  onDisconnect(r).set({ online: false, lastSeen: serverTimestamp() }).catch(() => {});

  const handler = () => {
    set(r, { online: !document.hidden, lastSeen: serverTimestamp() }).catch(() => {});
  };
  document.addEventListener("visibilitychange", handler);
  const beat = setInterval(() => set(r, { online: !document.hidden, lastSeen: serverTimestamp() }).catch(() => {}), 60_000);
  return () => {
    document.removeEventListener("visibilitychange", handler);
    clearInterval(beat);
    set(r, { online: false, lastSeen: serverTimestamp() }).catch(() => {});
  };
}

export function listenPresence(uid: string, cb: (p: { online: boolean; lastSeen?: number }) => void) {
  return onValue(ref(db, `${VOICE_ROOT}/${uid}/presence`), (s) => {
    const v = s.val() || {};
    cb({ online: !!v.online, lastSeen: v.lastSeen });
  });
}