import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { listenLatestBroadcast } from "@/lib/social";
import { onValue, ref } from "firebase/database";
import { db, VOICE_ROOT } from "@/lib/firebase";
import { shouldRemindStreakBreak } from "@/lib/streak";
import { pushNotif } from "@/lib/notifications-store";
import {
  markBroadcastNotified,
  maybeNotifyStreakBreak,
  requestNotificationPermission,
  showNotification,
  wasBroadcastNotified,
} from "@/lib/notifications";

/**
 * Mounted once at the root. After first user gesture, asks for Notification
 * permission, then fires browser notifications for:
 *   - new admin broadcasts
 *   - daily streak break reminders
 */
export function NotificationsBridge() {
  const { user } = useAuth();
  const askedRef = useRef(false);

  // Request permission on the first user gesture (browsers require it).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (askedRef.current) return;
    const handler = () => {
      if (askedRef.current) return;
      askedRef.current = true;
      requestNotificationPermission().catch(() => {});
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
    };
    window.addEventListener("pointerdown", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
    };
  }, []);

  // Broadcasts → browser notification + in-app feed
  useEffect(() => {
    return listenLatestBroadcast((latest) => {
      if (!latest) return;
      if (wasBroadcastNotified(latest.id)) return;
      showNotification(`📣 ${latest.title}`, latest.body, `bc-${latest.id}`);
      markBroadcastNotified(latest.id);
      // Fan-out into this user's own notification feed (self-write, RLS-safe).
      if (user?.uid) {
        pushNotif(user.uid, {
          kind: "admin",
          fromName: "Heartable",
          text: `${latest.title} — ${latest.body}`,
        }).catch(() => {});
      }
    });
  }, [user]);

  // Streak → daily nudge
  useEffect(() => {
    if (!user) return;
    const r = ref(db, `${VOICE_ROOT}/${user.uid}/streak`);
    const unsub = onValue(r, (snap) => {
      const v = snap.val();
      if (v && shouldRemindStreakBreak(v.lastDate)) {
        maybeNotifyStreakBreak(v.count || 0);
      }
    });
    return () => unsub();
  }, [user]);

  return null;
}