import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { MobileShell } from "@/components/MobileShell";
import { BottomNav } from "@/components/BottomNav";
import {
  ensureTicket,
  listenAdminPresence,
  listenTicketMsgs,
  sendTicketMsg,
} from "@/lib/social";

export const Route = createFileRoute("/support")({
  head: () => ({ meta: [{ title: "Support — Heartable" }] }),
  component: SupportPage,
});

function SupportPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [adminOnline, setAdminOnline] = useState(false);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !profile) return;
    ensureTicket(user.uid, profile.name).then(setTicketId);
    return listenAdminPresence(setAdminOnline);
  }, [user, profile]);

  useEffect(() => {
    if (!ticketId) return;
    return listenTicketMsgs(ticketId, (m) => {
      setMsgs(m);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });
  }, [ticketId]);

  if (!user) {
    return (
      <div className="min-h-[100dvh] grid place-items-center">
        <button onClick={() => navigate({ to: "/login" })} className="underline">
          Login first
        </button>
      </div>
    );
  }

  const send = async () => {
    if (!ticketId || !text.trim()) return;
    setBusy(true);
    try {
      await sendTicketMsg(ticketId, "user", text.trim());
      setText("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <MobileShell className="p-0">
      <header className="px-5 pt-6 pb-4 border-b border-foreground/5">
        <button onClick={() => navigate({ to: "/profile" })} className="text-xs opacity-60">
          ← Back
        </button>
        <h1 className="font-serif italic text-2xl mt-1">Help / Support</h1>
        <p className="text-[11px] mt-1 flex items-center gap-1.5">
          <span
            className={`size-2 rounded-full ${adminOnline ? "bg-green-500" : "bg-amber-500"}`}
          />
          {adminOnline ? "Admin online — turant jawab milega" : "Admin offline — ticket queue me hai"}
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
        {msgs.length === 0 && (
          <p className="text-center text-xs opacity-50 py-10">
            Apni problem likh — admin reply karega.
          </p>
        )}
        {msgs.map((m) => (
          <div
            key={m.id}
            className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
              m.from === "user"
                ? "ml-auto bg-sunset-600 text-white rounded-br-md"
                : "mr-auto bg-card ring-1 ring-foreground/5 rounded-bl-md"
            }`}
          >
            {m.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div
        className="border-t border-foreground/5 p-3 flex gap-2 bg-sunset-50"
        style={{ paddingBottom: "calc(96px + env(safe-area-inset-bottom))" }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Apna message…"
          maxLength={1000}
          className="flex-1 px-4 py-2.5 rounded-full bg-card ring-1 ring-foreground/10 text-sm outline-none focus:ring-sunset-600"
        />
        <button
          onClick={send}
          disabled={busy || !text.trim()}
          className="px-5 rounded-full bg-sunset-600 text-white text-sm font-semibold disabled:opacity-50"
        >
          Send
        </button>
      </div>
      <BottomNav />
    </MobileShell>
  );
}