import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LoginCard } from "@/components/LoginCard";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Login — Heartable" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, guestExpired } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !guestExpired) navigate({ to: "/home" });
  }, [user, guestExpired, navigate]);

  return (
    <div className="min-h-screen bg-sunset-50 flex flex-col items-center justify-center p-6">
      <div className="text-center mb-8">
        <h1 className="font-serif italic text-5xl">Heartable</h1>
        <p className="text-[10px] tracking-[0.3em] uppercase opacity-60 mt-1">
          Voices of the Soul
        </p>
      </div>
      <LoginCard onDone={() => navigate({ to: "/home" })} />
      {guestExpired && (
        <p className="mt-4 text-xs text-red-700 bg-red-50 px-4 py-2 rounded-full">
          Guest 7 din pure ho gaye — ab login zaroori hai.
        </p>
      )}
    </div>
  );
}
