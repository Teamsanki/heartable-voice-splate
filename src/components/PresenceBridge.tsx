import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { listenSettings } from "@/lib/settings";
import { startPresence } from "@/lib/presence";

/** Mounts a presence heartbeat for the signed-in user, gated by settings.onlineActivity. */
export function PresenceBridge() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    let stop: (() => void) | null = null;
    const unsubSettings = listenSettings(user.uid, (s) => {
      stop?.();
      stop = startPresence(user.uid, s.onlineActivity);
    });
    return () => { unsubSettings(); stop?.(); };
  }, [user]);
  return null;
}