import { useEffect, useState } from "react";
import { listenUserStats } from "@/lib/social";
import { getTier, TIER_COLOR, TIER_LABEL, type VerifiedTier } from "@/lib/verified";

export function VerifiedBadge({ uid, size = 14 }: { uid: string; size?: number }) {
  const [tier, setTier] = useState<VerifiedTier>(null);
  useEffect(() => {
    return listenUserStats(uid, (s) => setTier(getTier(s.followers || 0, s.totalLikes || 0)));
  }, [uid]);
  if (!tier) return null;
  return (
    <span title={TIER_LABEL[tier]} className="inline-flex items-center" style={{ color: TIER_COLOR[tier] }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 1l2.7 2.5 3.6-.4 1.5 3.3 3.3 1.5-.4 3.6L24 12l-2.5 2.7.4 3.6-3.3 1.5-1.5 3.3-3.6-.4L12 24l-2.7-2.5-3.6.4-1.5-3.3L1 17.1l.4-3.6L1 12l2.5-2.7L3 5.7l3.3-1.5L7.8 1l3.6.4L12 1z" />
        <path d="M10.5 15.5l-3-3 1.4-1.4 1.6 1.6 4.6-4.6 1.4 1.4-6 6z" fill="#fff" />
      </svg>
    </span>
  );
}