import { onValue, ref, set, update } from "firebase/database";
import { db, VOICE_ROOT } from "./firebase";

export type Theme = "dark" | "light" | "system";
export type NotificationSchedule = { enabled: boolean; start: string; end: string };
export type StoryViewerPrivacy = "full" | "recent" | "totals";
export type UserSettings = {
  theme: Theme;
  onlineActivity: boolean;
  timezone: string;
  notifs: {
    likes: boolean;
    comments: boolean;
    follows: boolean;
    broadcasts: boolean;
    dmShares: boolean;
    storyReactions: boolean;
    storyReplays: boolean;
  };
  playback: {
    autoplay: boolean;
    wifiOnly: boolean;
  };
  quietHours: NotificationSchedule;
  notificationWindows: {
    dms: NotificationSchedule;
    replays: NotificationSchedule;
    storyReactions: NotificationSchedule;
  };
  storyViewerPrivacy: StoryViewerPrivacy;
};

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "light",
  onlineActivity: true,
  timezone: "Asia/Kolkata",
  notifs: {
    likes: true,
    comments: true,
    follows: true,
    broadcasts: true,
    dmShares: true,
    storyReactions: true,
    storyReplays: true,
  },
  playback: { autoplay: true, wifiOnly: false },
  quietHours: { enabled: false, start: "22:00", end: "08:00" },
  notificationWindows: {
    dms: { enabled: false, start: "08:00", end: "22:00" },
    replays: { enabled: false, start: "09:00", end: "21:00" },
    storyReactions: { enabled: false, start: "08:00", end: "22:00" },
  },
  storyViewerPrivacy: "full",
};

export function listenSettings(uid: string, cb: (s: UserSettings) => void) {
  return onValue(ref(db, `${VOICE_ROOT}/${uid}/settings`), (snap) => {
    const v = (snap.val() as Partial<UserSettings>) || {};
    cb({
      ...DEFAULT_SETTINGS,
      ...v,
      theme: (v.theme as Theme) || DEFAULT_SETTINGS.theme,
      onlineActivity: v.onlineActivity ?? DEFAULT_SETTINGS.onlineActivity,
      timezone: v.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_SETTINGS.timezone,
      notifs: { ...DEFAULT_SETTINGS.notifs, ...(v.notifs || {}) },
      playback: { ...DEFAULT_SETTINGS.playback, ...(v.playback || {}) },
      quietHours: { ...DEFAULT_SETTINGS.quietHours, ...(v.quietHours || {}) },
      notificationWindows: {
        dms: { ...DEFAULT_SETTINGS.notificationWindows.dms, ...(v.notificationWindows?.dms || {}) },
        replays: { ...DEFAULT_SETTINGS.notificationWindows.replays, ...(v.notificationWindows?.replays || {}) },
        storyReactions: { ...DEFAULT_SETTINGS.notificationWindows.storyReactions, ...(v.notificationWindows?.storyReactions || {}) },
      },
      storyViewerPrivacy: v.storyViewerPrivacy || DEFAULT_SETTINGS.storyViewerPrivacy,
    });
  });
}

export async function saveSettings(uid: string, patch: Partial<UserSettings>) {
  await update(ref(db, `${VOICE_ROOT}/${uid}/settings`), patch);
}

export type SiteConfig = {
  name: string;
  tagline: string;
  favicon?: string | null;
};
const SITE_DEFAULTS: SiteConfig = {
  name: "Heartable",
  tagline: "Voices of the Soul",
  favicon: null,
};

export function listenSiteConfig(cb: (c: SiteConfig) => void) {
  return onValue(ref(db, "siteConfig"), (snap) => {
    const v = (snap.val() as Partial<SiteConfig>) || {};
    cb({ ...SITE_DEFAULTS, ...v });
  });
}

export async function saveSiteConfig(c: Partial<SiteConfig>) {
  await set(ref(db, "siteConfig"), { ...SITE_DEFAULTS, ...c });
}

/** Apply a theme to <html>. */
export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const resolve = () => {
    if (theme === "dark") return true;
    if (theme === "light") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
  };
  root.classList.toggle("dark", resolve());
}