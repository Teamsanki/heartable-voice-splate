/**
 * Browser Notification helpers (no FCM / VAPID needed).
 * Pure Web Notifications API — works for foreground tab.
 */

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) return "unsupported" as const;
  if (Notification.permission === "default") {
    try {
      return await Notification.requestPermission();
    } catch {
      return "denied" as NotificationPermission;
    }
  }
  return Notification.permission;
}

export function showNotification(title: string, body?: string, tag?: string) {
  if (!notificationsSupported()) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      tag,
      icon: "/favicon.svg",
    });
  } catch {
    /* some browsers (iOS Safari) throw */
  }
}

/** Stored to avoid double-firing notification for same broadcast id. */
const SEEN_KEY = "heartable.notif.broadcast.seen";
export function markBroadcastNotified(id: string) {
  try { localStorage.setItem(SEEN_KEY, id); } catch {}
}
export function wasBroadcastNotified(id: string) {
  try { return localStorage.getItem(SEEN_KEY) === id; } catch { return false; }
}

/** Daily streak nudge — fires at most once per day. */
const STREAK_KEY = "heartable.notif.streak.day";
export function maybeNotifyStreakBreak(count: number) {
  const today = new Date().toISOString().slice(0, 10);
  try {
    if (localStorage.getItem(STREAK_KEY) === today) return;
    showNotification(
      "🔥 Streak tootne wali hai!",
      `Aaj ${count} din ka streak hai — ek awaaz bhej de.`,
      "streak",
    );
    localStorage.setItem(STREAK_KEY, today);
  } catch {}
}