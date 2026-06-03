import { createFileRoute } from "@tanstack/react-router";

/** POST /api/public/notify-email — sends a transactional email via Resend. */
export const Route = createFileRoute("/api/public/notify-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.RESEND_API_KEY;
        if (!key) return new Response("RESEND_API_KEY missing", { status: 500 });

        let body: any;
        try { body = await request.json(); } catch { return new Response("Bad JSON", { status: 400 }); }

        const { to, kind, fromName, text, link } = body || {};
        if (!to || typeof to !== "string" || !to.includes("@")) {
          return new Response("Bad recipient", { status: 400 });
        }
        const safe = (s: any) => String(s || "").slice(0, 500);
        const subject = kind === "broadcast"
          ? `📣 ${safe(fromName) || "Heartable"}`
          : `${safe(fromName) || "Someone"} ${safe(text) || "interacted with you"}`;

        const html = `
<!doctype html><html><body style="margin:0;padding:0;background:#fff8f0;font-family:'Helvetica Neue',Arial,sans-serif;color:#3a2418">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px">
    <h1 style="font-family:Georgia,serif;font-style:italic;font-weight:400;font-size:28px;color:#a04a1a;margin:0 0 8px">Heartable</h1>
    <p style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;opacity:.6;margin:0 0 24px">Voices of the Soul</p>
    <div style="background:#ffffff;border-radius:16px;padding:24px;border:1px solid #f0d9c0">
      <p style="margin:0 0 8px;font-size:14px;color:#666">New activity:</p>
      <p style="margin:0;font-size:18px;color:#3a2418"><b>${safe(fromName)}</b> ${safe(text)}</p>
      ${link ? `<a href="${safe(link)}" style="display:inline-block;margin-top:20px;background:#c95828;color:#fff;text-decoration:none;padding:10px 20px;border-radius:999px;font-weight:600;font-size:13px">Open in Heartable</a>` : ""}
    </div>
    <p style="font-size:11px;color:#999;margin-top:24px;text-align:center">You're receiving this because of activity in your Heartable account.<br/>Manage notifications in Settings → Privacy.</p>
  </div>
</body></html>`.trim();

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            from: "Heartable <onboarding@resend.dev>",
            to: [to],
            subject,
            html,
          }),
        });
        if (!res.ok) {
          const t = await res.text();
          console.error("resend fail", res.status, t);
          return new Response(`Resend ${res.status}: ${t}`, { status: 502 });
        }
        return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
      },
      OPTIONS: async () => new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }),
    },
  },
});