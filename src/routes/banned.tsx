import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db, VOICE_ROOT } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/banned")({
  head: () => ({ meta: [{ title: "Account banned" }] }),
  component: BannedPage,
});

function BannedPage() {
  const { user, signOut } = useAuth();
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (!user) return;
    return onValue(ref(db, `${VOICE_ROOT}/${user.uid}/ban`), (s) => setReason(s.val()?.reason || "Policy violation"));
  }, [user]);
  return (
    <div className="min-h-screen grid place-items-center bg-sunset-900 text-sunset-50 p-6 text-center">
      <div className="max-w-sm space-y-3">
        <div className="text-6xl">⛔</div>
        <h1 className="font-serif italic text-3xl">Account banned</h1>
        <p className="text-sm opacity-70">Reason: {reason}</p>
        <p className="text-xs opacity-50">Appeal ke liye support contact karo.</p>
        <button onClick={signOut} className="mt-4 px-5 py-2 rounded-full bg-sunset-50 text-sunset-900 text-sm font-semibold">Sign out</button>
      </div>
    </div>
  );
}