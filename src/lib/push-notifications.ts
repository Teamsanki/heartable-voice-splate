import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { ref, remove, set } from "firebase/database";
import { app, db } from "./firebase";

export async function registerPushDevice(uid: string) {
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
  if (!vapidKey || !(await isSupported()) || !app) return { status: "pending-setup" as const };
  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: registration });
  if (!token) return { status: "permission-needed" as const };
  const tokenId = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)).then((hash) =>
    Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join(""));
  await set(ref(db, `pushTokens/${uid}/${tokenId}`), { token, createdAt: Date.now(), platform: navigator.userAgent.slice(0, 180) });
  return { status: "ready" as const, tokenId };
}

export async function unregisterPushDevice(uid: string, tokenId: string) {
  await remove(ref(db, `pushTokens/${uid}/${tokenId}`));
}

export async function listenForegroundPush(cb: (title: string, body: string) => void) {
  if (!(await isSupported()) || !app) return () => {};
  return onMessage(getMessaging(app), (payload) => cb(payload.notification?.title || "Heartable", payload.notification?.body || "New activity"));
}