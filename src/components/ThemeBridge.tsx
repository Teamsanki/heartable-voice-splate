import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { applyTheme, listenSettings, listenSiteConfig } from "@/lib/settings";
import { listenMyBan } from "@/lib/reports";
import { useNavigate, useLocation } from "@tanstack/react-router";

/** Applies theme, site config (title/favicon) and global ban check. */
export function ThemeBridge() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Default light on first paint (design palette is warm/light)
  useEffect(() => { applyTheme("light"); }, []);

  // Site config — title + favicon
  useEffect(() => {
    return listenSiteConfig((c) => {
      try {
        if (typeof document === "undefined") return;
        document.title = c.name + " — " + c.tagline;
        if (c.favicon) {
          let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
          if (!link) {
            link = document.createElement("link");
            link.rel = "icon";
            document.head.appendChild(link);
          }
          link.href = c.favicon;
        }
      } catch {}
    });
  }, []);

  // User settings → theme
  useEffect(() => {
    if (!user) return;
    return listenSettings(user.uid, (s) => applyTheme(s.theme));
  }, [user]);

  // Ban check → redirect
  useEffect(() => {
    if (!user) return;
    return listenMyBan(user.uid, (ban) => {
      if (ban && pathname !== "/banned") navigate({ to: "/banned" as any });
    });
  }, [user, navigate, pathname]);

  return null;
}