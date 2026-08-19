import type { NotifKind } from "./notifications-store";
import type { NotificationSchedule, UserSettings } from "./settings";

function minutesInTimezone(timeZone: string, now = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
    const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
    return hour * 60 + minute;
  } catch {
    return now.getHours() * 60 + now.getMinutes();
  }
}

function parseTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

function insideWindow(schedule: NotificationSchedule, timezone: string, now = new Date()) {
  if (!schedule.enabled) return true;
  const current = minutesInTimezone(timezone, now);
  const start = parseTime(schedule.start);
  const end = parseTime(schedule.end);
  if (start === end) return true;
  return start < end ? current >= start && current < end : current >= start || current < end;
}

export function notificationEnabled(kind: NotifKind, settings: UserSettings, now = new Date()) {
  const enabled = kind === "dm-share" || kind === "dm-message" ? settings.notifs.dmShares
    : kind === "story-react" ? settings.notifs.storyReactions
    : kind === "story-replay" ? settings.notifs.storyReplays
    : kind === "like" ? settings.notifs.likes
    : kind === "comment" ? settings.notifs.comments
    : kind === "follow" ? settings.notifs.follows
    : kind === "admin" ? settings.notifs.broadcasts
    : true;
  if (!enabled) return false;
  if (settings.quietHours.enabled && insideWindow(settings.quietHours, settings.timezone, now)) return false;
  const window = kind === "dm-share" || kind === "dm-message" ? settings.notificationWindows.dms
    : kind === "story-replay" ? settings.notificationWindows.replays
    : kind === "story-react" ? settings.notificationWindows.storyReactions
    : null;
  return !window || insideWindow(window, settings.timezone, now);
}