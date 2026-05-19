import { Link } from "@tanstack/react-router";
import { BottomNav } from "./BottomNav";

export function GuestLock({ feature }: { feature: string }) {
  return (
    <div className="min-h-screen bg-sunset-50 text-sunset-900">
      <div className="max-w-[460px] mx-auto min-h-screen flex flex-col items-center justify-center p-8 text-center gap-4 pb-32">
        <div className="size-20 rounded-full bg-sunset-900 text-sunset-50 grid place-items-center text-3xl">🔒</div>
        <h1 className="font-serif italic text-3xl">{feature} locked</h1>
        <p className="text-sm opacity-70 max-w-xs">
          Guest mode me sirf Feed milta hai (4 voice/day). Account banaa le — {feature}, streaks, sab unlock ho jaayega.
        </p>
        <Link
          to="/profile"
          className="mt-2 px-6 py-3 rounded-full bg-sunset-600 text-white text-sm font-semibold"
        >
          Upgrade account
        </Link>
        <BottomNav />
      </div>
    </div>
  );
}
