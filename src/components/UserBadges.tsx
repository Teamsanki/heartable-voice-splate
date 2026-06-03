import { useEffect, useState } from "react";
import { isFounder, listenIsAdmin, type AdminEntry } from "@/lib/roles";
import { VerifiedBadge } from "./VerifiedBadge";

/**
 * Renders Founder / Admin / Verified tier badges next to a user's name.
 * Pass the user's email if known to detect founder.
 */
export function UserBadges({ uid, email, size = 12 }: { uid: string; email?: string | null; size?: number }) {
  const [admin, setAdmin] = useState<AdminEntry | null>(null);
  useEffect(() => listenIsAdmin(uid, setAdmin), [uid]);

  const founder = isFounder(email);

  return (
    <span className="inline-flex items-center gap-1 align-middle">
      {founder && <FounderTag size={size} />}
      {!founder && admin && <AdminTag size={size} />}
      <VerifiedBadge uid={uid} size={size + 2} />
    </span>
  );
}

function FounderTag({ size }: { size: number }) {
  return (
    <span
      title="Founder"
      className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white"
      style={{ fontSize: Math.max(8, size - 3) }}
    >
      <svg width={size - 2} height={size - 2} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M5 16L3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5zm0 2h14v2H5v-2z" />
      </svg>
      Founder
    </span>
  );
}

function AdminTag({ size }: { size: number }) {
  return (
    <span
      title="Admin"
      className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-sunset-900 text-sunset-50"
      style={{ fontSize: Math.max(8, size - 3) }}
    >
      <svg width={size - 2} height={size - 2} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6l8-4z" />
      </svg>
      Admin
    </span>
  );
}