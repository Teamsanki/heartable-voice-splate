import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Splash } from "@/components/Splash";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Heartable — Voices of the Soul" },
      {
        name: "description",
        content:
          "Voice-first social app for shayari, voice snaps and Mehfil circles. Record, share, react.",
      },
      { property: "og:title", content: "Heartable — Voices of the Soul" },
      { property: "og:description", content: "Voice-first social app for shayari, voice snaps and Mehfil circles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: SplashGate,
});

function SplashGate() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done && !loading) {
      navigate({ to: user ? "/home" : "/login" });
    }
  }, [done, loading, user, navigate]);

  return <Splash onDone={() => setDone(true)} />;
}
