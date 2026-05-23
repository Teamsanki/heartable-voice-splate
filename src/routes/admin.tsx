import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db, VOICE_ROOT, ADMIN_EMAIL } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { MobileShell } from "@/components/MobileShell";
import { BottomNav } from "@/components/BottomNav";
import {
  listenAllTickets,
  listenTicketMsgs,
  resolveTicket,
  sendBroadcast,
  sendTicketMsg,
  setAdminPresence,
  type Ticket,
} from "@/lib/social";
import { listenReports, setReportStatus, banUser, warnUser, type Report } from "@/lib/reports";
import { listenSiteConfig, saveSiteConfig, type SiteConfig } from "@/lib/settings";
import { deletePost } from "@/lib/social";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Heartable" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"stats" | "broadcast" | "tickets" | "reports" | "site">("stats");
  const [reports, setReports] = useState<Report[]>([]);
  const [site, setSite] = useState<SiteConfig>({ name: "Heartable", tagline: "Voices of the Soul", favicon: null });
  const [users, setUsers] = useState(0);
  const [voices, setVoices] = useState(0);
  const [guests, setGuests] = useState(0);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [activeMsgs, setActiveMsgs] = useState<any[]>([]);
  const [reply, setReply] = useState("");

  const [bTitle, setBTitle] = useState("");
  const [bBody, setBBody] = useState("");
  const [bBusy, setBBusy] = useState(false);

  const isAdmin = user?.email === ADMIN_EMAIL;

  // mark presence
  useEffect(() => {
    if (!isAdmin) return;
    setAdminPresence(true);
    const onHide = () => setAdminPresence(false);
    const onShow = () => setAdminPresence(true);
    window.addEventListener("beforeunload", onHide);
    document.addEventListener("visibilitychange", () =>
      document.hidden ? onHide() : onShow(),
    );
    return () => {
      onHide();
      window.removeEventListener("beforeunload", onHide);
    };
  }, [isAdmin]);

  // stats
  useEffect(() => {
    if (!isAdmin) return;
    const u1 = onValue(ref(db, VOICE_ROOT), (snap) => {
      let u = 0, g = 0;
      snap.forEach((c) => {
        u++;
        const p = c.child("profile").val();
        if (p?.isGuest) g++;
      });
      setUsers(u); setGuests(g);
    });
    const u2 = onValue(ref(db, "feed"), (snap) => setVoices(snap.size));
    const u3 = listenAllTickets(setTickets);
    const u4 = listenReports(setReports);
    const u5 = listenSiteConfig(setSite);
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, [isAdmin]);

  useEffect(() => {
    if (!activeTicket) { setActiveMsgs([]); return; }
    return listenTicketMsgs(activeTicket.id, setActiveMsgs);
  }, [activeTicket]);

  if (loading) return <div className="min-h-[100dvh] grid place-items-center">Loading…</div>;
  if (!isAdmin) {
    return (
      <div className="min-h-[100dvh] grid place-items-center p-6 text-center">
        <div>
          <p className="font-serif italic text-2xl mb-2">Access denied</p>
          <p className="text-sm opacity-60 mb-4">Ye panel sirf admin ke liye.</p>
          <button onClick={() => navigate({ to: "/home" })} className="underline">Home</button>
        </div>
      </div>
    );
  }

  const broadcast = async () => {
    if (!bTitle.trim() || !bBody.trim()) return;
    setBBusy(true);
    try {
      await sendBroadcast(bTitle.trim(), bBody.trim(), user!.uid);
      setBTitle(""); setBBody("");
      alert("Broadcast sent!");
    } finally { setBBusy(false); }
  };

  const sendReply = async () => {
    if (!activeTicket || !reply.trim()) return;
    await sendTicketMsg(activeTicket.id, "admin", reply.trim());
    setReply("");
  };

  return (
    <MobileShell className="p-5 gap-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.25em] opacity-60">Admin Panel</p>
        <h1 className="font-serif italic text-3xl">Heartable HQ</h1>
      </div>

      <div className="flex bg-sunset-100 rounded-full p-1 text-[11px] font-medium overflow-x-auto no-scrollbar">
        {(["stats", "broadcast", "tickets", "reports", "site"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 whitespace-nowrap px-3 py-1.5 rounded-full ${
              tab === t ? "bg-sunset-900 text-sunset-50" : "text-sunset-900/70"
            }`}
          >
            {t === "stats" ? "Stats"
              : t === "broadcast" ? "Broadcast"
              : t === "tickets" ? `Tickets · ${tickets.filter(x => x.status === "open").length}`
              : t === "reports" ? `Reports · ${reports.filter(r => r.status === "open").length}`
              : "Site"}
          </button>
        ))}
      </div>

      {tab === "stats" && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { l: "Users", v: users },
            { l: "Guests", v: guests },
            { l: "Voices", v: voices },
          ].map((s) => (
            <div key={s.l} className="bg-white rounded-2xl p-4 ring-1 ring-foreground/5 text-center">
              <p className="font-serif italic text-3xl">{s.v}</p>
              <p className="text-[10px] uppercase tracking-widest opacity-60 mt-1">{s.l}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "broadcast" && (
        <div className="space-y-3 bg-white rounded-2xl p-4 ring-1 ring-foreground/5">
          <input
            value={bTitle}
            onChange={(e) => setBTitle(e.target.value)}
            placeholder="Title (e.g. Naya update aaya)"
            maxLength={80}
            className="w-full px-4 py-2.5 rounded-xl bg-sunset-50 ring-1 ring-foreground/10 text-sm outline-none"
          />
          <textarea
            value={bBody}
            onChange={(e) => setBBody(e.target.value)}
            placeholder="Message body…"
            maxLength={300}
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl bg-sunset-50 ring-1 ring-foreground/10 text-sm outline-none resize-none"
          />
          <button
            onClick={broadcast}
            disabled={bBusy || !bTitle.trim() || !bBody.trim()}
            className="w-full py-3 rounded-full bg-sunset-900 text-sunset-50 text-sm font-semibold disabled:opacity-50"
          >
            📣 Send to all users
          </button>
        </div>
      )}

      {tab === "tickets" && (
        <div className="space-y-2">
          {activeTicket ? (
            <div className="bg-white rounded-2xl ring-1 ring-foreground/5 flex flex-col h-[60vh]">
              <div className="p-3 border-b border-foreground/5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold">{activeTicket.name}</p>
                  <p className="text-[10px] opacity-50">#{activeTicket.id.slice(0, 6)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => { await resolveTicket(activeTicket.id); setActiveTicket(null); }}
                    className="text-[11px] px-3 py-1 rounded-full bg-sunset-100"
                  >
                    Resolve
                  </button>
                  <button onClick={() => setActiveTicket(null)} className="text-lg opacity-50">✕</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {activeMsgs.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm ${
                      m.from === "admin"
                        ? "ml-auto bg-sunset-600 text-white"
                        : "mr-auto bg-sunset-100"
                    }`}
                  >
                    {m.text}
                  </div>
                ))}
              </div>
              <div className="p-2 border-t border-foreground/5 flex gap-2">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendReply()}
                  placeholder="Reply…"
                  className="flex-1 px-3 py-2 rounded-full bg-sunset-50 ring-1 ring-foreground/10 text-sm outline-none"
                />
                <button onClick={sendReply} className="px-4 rounded-full bg-sunset-600 text-white text-sm font-semibold">
                  Send
                </button>
              </div>
            </div>
          ) : (
            tickets.length === 0 ? (
              <p className="text-center text-sm opacity-50 py-10">Koi ticket nahi.</p>
            ) : tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTicket(t)}
                className="w-full bg-white rounded-2xl p-3 ring-1 ring-foreground/5 flex items-center justify-between text-left"
              >
                <div>
                  <p className="text-xs font-semibold">{t.name}</p>
                  <p className="text-[10px] opacity-50 truncate max-w-[200px]">{t.lastMsg || "—"}</p>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest ${
                  t.status === "open" ? "bg-sunset-600 text-white" : "bg-sunset-100"
                }`}>
                  {t.status}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      <BottomNav />
      {tab === "reports" && (
        <div className="space-y-2">
          {reports.length === 0 && (
            <p className="text-center text-sm opacity-50 py-10">Koi report nahi.</p>
          )}
          {reports.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl p-3 ring-1 ring-foreground/5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold">{r.kind.toUpperCase()} · {r.reporterName}</p>
                  <p className="text-[10px] opacity-50">{new Date(r.createdAt).toLocaleString()}</p>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase ${r.status === "open" ? "bg-red-100 text-red-700" : "bg-sunset-100"}`}>{r.status}</span>
              </div>
              <p className="text-sm">{r.reason}</p>
              {r.link && <Link to={r.link as any} className="text-[11px] underline opacity-70">Open target</Link>}
              <div className="flex gap-2 flex-wrap pt-1">
                {r.kind === "post" && (
                  <button onClick={async () => { await deletePost(r.targetId); await setReportStatus(r.id, "actioned"); }}
                    className="text-[11px] px-3 py-1 rounded-full bg-red-600 text-white">Delete post</button>
                )}
                {r.targetUid && (
                  <>
                    <button onClick={async () => {
                      const reason = prompt("Warning message?") || "Please follow community guidelines.";
                      await warnUser(r.targetUid!, reason, user!.uid);
                      await setReportStatus(r.id, "actioned");
                    }}
                      className="text-[11px] px-3 py-1 rounded-full bg-amber-500 text-white">Warn</button>
                    <button onClick={async () => {
                      const reason = prompt("Ban reason?") || "Policy violation";
                      if (!confirm("Ban this user?")) return;
                      await banUser(r.targetUid!, reason, user!.uid);
                      await setReportStatus(r.id, "actioned");
                    }}
                      className="text-[11px] px-3 py-1 rounded-full bg-black text-white">Ban</button>
                  </>
                )}
                <button onClick={() => setReportStatus(r.id, "dismissed")}
                  className="text-[11px] px-3 py-1 rounded-full bg-sunset-100">Dismiss</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "site" && (
        <div className="space-y-3 bg-white rounded-2xl p-4 ring-1 ring-foreground/5">
          <div>
            <label className="text-[10px] uppercase tracking-widest opacity-60">Site name</label>
            <input value={site.name} onChange={(e) => setSite({ ...site, name: e.target.value })}
              className="w-full mt-1 px-4 py-2.5 rounded-xl bg-sunset-50 ring-1 ring-foreground/10 text-sm outline-none" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest opacity-60">Tagline</label>
            <input value={site.tagline} onChange={(e) => setSite({ ...site, tagline: e.target.value })}
              className="w-full mt-1 px-4 py-2.5 rounded-xl bg-sunset-50 ring-1 ring-foreground/10 text-sm outline-none" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest opacity-60">Favicon URL</label>
            <input value={site.favicon || ""} onChange={(e) => setSite({ ...site, favicon: e.target.value || null })}
              placeholder="https://…/favicon.png"
              className="w-full mt-1 px-4 py-2.5 rounded-xl bg-sunset-50 ring-1 ring-foreground/10 text-sm outline-none" />
          </div>
          <button onClick={async () => { await saveSiteConfig(site); alert("Saved!"); }}
            className="w-full py-3 rounded-full bg-sunset-900 text-sunset-50 text-sm font-semibold">Save site config</button>
        </div>
      )}

    </MobileShell>
  );
}