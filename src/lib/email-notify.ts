/**
 * Fire-and-forget email notification helper. Calls our public API which
 * uses Resend to send a templated email. Failures are logged only — the
 * in-app notification is the source of truth.
 */
export type EmailKind = "like" | "comment" | "follow" | "share" | "broadcast" | "admin";

export async function sendEmailNotify(opts: {
  to: string;
  kind: EmailKind;
  fromName: string;
  text: string;
  link?: string;
}) {
  if (!opts.to) return;
  try {
    await fetch("/api/public/notify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
      keepalive: true,
    });
  } catch (e) {
    console.warn("email notify fail", e);
  }
}