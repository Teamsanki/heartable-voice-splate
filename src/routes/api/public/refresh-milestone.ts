import { createFileRoute } from "@tanstack/react-router";

/**
 * POST /api/public/refresh-milestone
 * Generates a new weekly milestone using OpenRouter (free model) and writes
 * it into Firebase RTDB at /rewards/current. Idempotent per-week.
 * Called by pg_cron every Sunday 23:55, or manually by admins.
 */
export const Route = createFileRoute("/api/public/refresh-milestone")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const orKey = process.env.OPENROUTER_API_KEY;
        if (!orKey) return new Response("OPENROUTER_API_KEY missing", { status: 500 });

        // Firebase REST write (no admin SDK in worker runtime).
        const dbUrl = "https://heartable-voice-default-rtdb.firebaseio.com";

        let trigger = "cron";
        try {
          const body = await request.json().catch(() => ({}));
          trigger = body.trigger || "cron";
        } catch {}

        const prompt = `You design weekly engagement milestones for "Heartable" — a voice-first social app where users record voice notes, share shayari (poetry), build streaks, follow friends, and react with hearts.

Return ONLY a strict JSON object with this exact shape:
{
  "giftPool": "<short line like '₹500 split across 10 random winners' — keep it INR ₹50-₹500 total>",
  "tasks": [
    { "title": "<short, 3-6 words, energetic Hinglish-leaning English>", "description": "<one sentence explaining the goal>", "target": <integer 1-50>, "metric": "<one of: posts, likes, follows, comments, shares, streak>", "rewardLabel": "<short string like 'Bronze Tick' or '₹50 voucher'>" }
  ]
}

Generate exactly 4 tasks, mixing easy & hard. Make them feel fresh — different from a generic 'post 3 voices'. Reward labels can include gift cards (₹), badges, or shoutouts. No markdown, no explanation, JSON only.`;

        const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${orKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://voice-vibe-spark.lovable.app",
            "X-Title": "Heartable",
          },
          body: JSON.stringify({
            model: "google/gemini-2.0-flash-exp:free",
            messages: [
              { role: "system", content: "You are a creative social-app engagement designer. Output STRICT JSON only." },
              { role: "user", content: prompt },
            ],
            temperature: 0.85,
            response_format: { type: "json_object" },
          }),
        });

        if (!orRes.ok) {
          const t = await orRes.text();
          return new Response(`OpenRouter ${orRes.status}: ${t}`, { status: 502 });
        }

        const json: any = await orRes.json();
        const content = json?.choices?.[0]?.message?.content || "{}";
        let parsed: any;
        try { parsed = JSON.parse(content); }
        catch { parsed = { giftPool: "Surprise gift", tasks: [] }; }

        const tasks = (parsed.tasks || []).slice(0, 6).map((t: any, i: number) => ({
          id: `t${i + 1}`,
          title: String(t.title || `Task ${i + 1}`).slice(0, 80),
          description: String(t.description || "").slice(0, 200),
          target: Math.max(1, Math.min(100, Number(t.target) || 5)),
          metric: ["posts", "likes", "follows", "comments", "shares", "streak"].includes(t.metric) ? t.metric : "posts",
          rewardLabel: String(t.rewardLabel || "Surprise").slice(0, 60),
        }));

        // Compute Monday-of-this-week ts (server-side, UTC-ish — close enough).
        const now = new Date();
        const day = now.getUTCDay();
        const diff = (day + 6) % 7; // days since Monday
        const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
        const weekOf = monday.getTime();
        const id = `w-${monday.toISOString().slice(0, 10)}`;

        const milestone = {
          id,
          weekOf,
          tasks,
          createdAt: Date.now(),
          createdBy: trigger,
          giftPool: String(parsed.giftPool || "Surprise weekly gift").slice(0, 160),
        };

        // Write to Firebase RTDB via REST.
        await fetch(`${dbUrl}/rewards/current.json`, {
          method: "PUT",
          body: JSON.stringify(milestone),
        });
        await fetch(`${dbUrl}/rewards/history/${id}.json`, {
          method: "PUT",
          body: JSON.stringify(milestone),
        });

        return new Response(JSON.stringify({ ok: true, milestone }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});