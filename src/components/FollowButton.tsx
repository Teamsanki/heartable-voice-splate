import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { follow, listenFollowing, unfollow } from "@/lib/social";

export function FollowButton({
  targetUid,
  size = "sm",
}: {
  targetUid: string;
  size?: "sm" | "lg";
}) {
  const { user, isGuest } = useAuth();
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || user.uid === targetUid) return;
    return listenFollowing(user.uid, targetUid, setFollowing);
  }, [user, targetUid]);

  if (!user || user.uid === targetUid) return null;

  const onClick = async () => {
    if (isGuest) {
      alert("Follow karne ke liye account banaa le (Profile → Link with Google).");
      return;
    }
    setBusy(true);
    try {
      if (following) await unfollow(user.uid, targetUid);
      else await follow(user.uid, targetUid);
    } finally {
      setBusy(false);
    }
  };

  const base =
    size === "lg"
      ? "px-4 py-1.5 text-xs"
      : "px-3 py-1 text-[10px]";

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`${base} rounded-full font-semibold uppercase tracking-widest transition active:scale-95 disabled:opacity-50 ${
        following
          ? "bg-transparent ring-1 ring-sunset-900/20 text-sunset-900/70"
          : "bg-sunset-900 text-sunset-50"
      } ${isGuest ? "opacity-60" : ""}`}
      aria-label={following ? "Unfollow" : "Follow"}
    >
      {isGuest ? "🔒 Follow" : following ? "Following" : "Follow"}
    </button>
  );
}