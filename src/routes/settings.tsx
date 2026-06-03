import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db, VOICE_ROOT } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { MobileShell } from "@/components/MobileShell";
import { BottomNav } from "@/components/BottomNav";
import { listenSettings, saveSettings, type Theme } from "@/lib/settings";
import { listenMyBlocks, unblockUser } from "@/lib/blocks";
import { ChevronLeft, Moon, Sun, Bell, HelpCircle, LogOut, FileText, UserX, BookOpen } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Heartable" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<Theme>("dark");
  const [online, setOnline] = useState(true);
  const [blocks, setBlocks] = useState<Set<string>>(new Set());
  const [blockNames, setBlockNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    const u1 = listenSettings(user.uid, (s) => { setTheme(s.theme); setOnline(s.onlineActivity); });
    const u2 = listenMyBlocks(user.uid, setBlocks);
    return () => { u1(); u2(); };
  }, [user]);

  useEffect(() => {
    blocks.forEach((uid) => {
      if (blockNames[uid]) return;
      onValue(ref(db, `${VOICE_ROOT}/${uid}/profile/name`), (s) => {
        setBlockNames((p) => ({ ...p, [uid]: s.val() || "User" }));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

  if (!user) return <div className="min-h-screen grid place-items-center">Login first</div>;

  const setT = (t: Theme) => { setTheme(t); saveSettings(user.uid, { theme: t }); };
  const setO = (v: boolean) => { setOnline(v); saveSettings(user.uid, { onlineActivity: v }); };

  return (
    <MobileShell className="p-5 gap-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate({ to: "/profile" })} className="size-9 rounded-full bg-sunset-100 grid place-items-center">
          <ChevronLeft className="size-4" />
        </button>
        <h1 className="font-serif italic text-2xl">Settings</h1>
      </div>

      <Section title="Appearance">
        <div className="grid grid-cols-3 gap-2">
          {(["dark", "light", "system"] as Theme[]).map((t) => (
            <button key={t} onClick={() => setT(t)}
              className={`py-2.5 rounded-xl text-xs font-medium ring-1 ${theme === t ? "bg-sunset-900 text-sunset-50 ring-sunset-900" : "bg-white ring-foreground/10"}`}>
              {t === "dark" ? <Moon className="size-4 inline mr-1" /> : t === "light" ? <Sun className="size-4 inline mr-1" /> : "💻"} {t}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Privacy">
        <Row icon={<Bell className="size-4" />} label="Online activity"
          right={<Toggle on={online} onChange={setO} />} />
      </Section>

      <Section title={`Blocked (${blocks.size})`}>
        {blocks.size === 0 ? (
          <p className="text-xs opacity-50 px-2 py-1">Koi blocked nahi.</p>
        ) : (
          <div className="space-y-1">
            {Array.from(blocks).map((uid) => (
              <div key={uid} className="flex items-center justify-between px-3 py-2 bg-white rounded-xl ring-1 ring-foreground/5">
                <div className="flex items-center gap-2">
                  <UserX className="size-4 opacity-60" />
                  <span className="text-sm">{blockNames[uid] || "User"}</span>
                </div>
                <button onClick={() => unblockUser(user.uid, uid)} className="text-[11px] font-semibold uppercase tracking-widest opacity-70">Unblock</button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Support">
        <LinkRow to="/support" icon={<HelpCircle className="size-4" />} label="Help & Support" />
        <LinkRow to="/notifications" icon={<Bell className="size-4" />} label="Notifications" />
        <LinkRow to="/guidelines" icon={<BookOpen className="size-4" />} label="Community Guidelines" />
        <LinkRow to="/privacy" icon={<FileText className="size-4" />} label="Privacy Policy" />
      </Section>

      <button onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
        className="mt-2 w-full py-3 rounded-full bg-sunset-100 text-sunset-900 text-sm font-medium flex items-center justify-center gap-2">
        <LogOut className="size-4" /> Sign out
      </button>

      <BottomNav />
    </MobileShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-[10px] uppercase tracking-[0.25em] opacity-50 px-1">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
function Row({ icon, label, right }: { icon: React.ReactNode; label: string; right: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 py-3 bg-white rounded-xl ring-1 ring-foreground/5">
      <div className="flex items-center gap-3"><span className="opacity-60">{icon}</span><span className="text-sm">{label}</span></div>
      {right}
    </div>
  );
}
function LinkRow({ to, icon, label }: { to: any; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 px-3 py-3 bg-white rounded-xl ring-1 ring-foreground/5">
      <span className="opacity-60">{icon}</span><span className="text-sm">{label}</span>
    </Link>
  );
}
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)}
      className={`w-10 h-6 rounded-full p-0.5 transition ${on ? "bg-sunset-600" : "bg-foreground/15"}`}>
      <div className={`size-5 rounded-full bg-white transition ${on ? "translate-x-4" : ""}`} />
    </button>
  );
}