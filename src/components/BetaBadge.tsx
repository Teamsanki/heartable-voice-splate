import { useEffect, useState } from "react";
import { listenBeta } from "@/lib/beta";

export function BetaBadge({ className = "" }: { className?: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => listenBeta(setOn), []);
  if (!on) return null;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-widest bg-gradient-to-r from-fuchsia-500 to-indigo-600 text-white ${className}`}>
      Beta
    </span>
  );
}