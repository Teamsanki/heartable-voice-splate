import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createCircle, normalizeCircleHandle, type CircleVisibility } from "@/lib/circles";
import { MobileShell } from "@/components/MobileShell";
import { ChevronLeft, Globe2, LockKeyhole } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/mehfil")({ head: () => ({ meta: [{ title: "Create Circle — Heartable" }, { name: "description", content: "Create a public or private Heartable circle." }, { property: "og:title", content: "Create Circle — Heartable" }, { property: "og:description", content: "Create a public or private Heartable circle." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: CreateCirclePage });

function CreateCirclePage() {
  const { user, isGuest } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(""); const [description, setDescription] = useState(""); const [link, setLink] = useState(""); const [handle, setHandle] = useState(""); const [visibility, setVisibility] = useState<CircleVisibility>("public"); const [busy, setBusy] = useState(false);
  if (!user || isGuest) return <div className="min-h-screen grid place-items-center p-6 text-center">Sign in with a full account to create a Circle.</div>;
  const submit = async () => { if (!name.trim() || !description.trim()) return toast.error("Name and description are required."); setBusy(true); try { const id = await createCircle(user.uid, { name, description, link, handle, visibility }); toast.success("Circle created"); navigate({ to: "/mehfil/$id", params: { id }, search: { invite: "" } }); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not create circle."); } finally { setBusy(false); } };
  return <MobileShell className="p-5 gap-5"><header className="flex items-center gap-3"><button onClick={() => navigate({ to: "/dm" })} className="size-9 rounded-full bg-muted grid place-items-center"><ChevronLeft className="size-4" /></button><div><h1 className="font-serif italic text-2xl">Create Circle</h1><p className="text-xs text-muted-foreground">A Telegram-style community inside Chats</p></div></header>
    <Field label="Circle name"><input value={name} onChange={(event) => setName(event.target.value)} maxLength={48} placeholder="Late-night Shayari" /></Field>
    <Field label="Description"><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={240} placeholder="What is this circle about?" rows={3} /></Field>
    <Field label="Public handle"><div className="flex items-center rounded-lg border border-input bg-card px-3"><span className="text-muted-foreground text-sm">heartable.app/c/</span><input value={handle} onChange={(event) => setHandle(normalizeCircleHandle(event.target.value))} placeholder="shayari_club" className="border-0 px-1" /></div><p className="text-[11px] text-muted-foreground mt-1">4–24 letters, numbers, or underscores. Handles are unique.</p></Field>
    <Field label="External link (optional)"><input value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://…" /></Field>
    <div className="grid grid-cols-2 gap-2">{(["public", "private"] as CircleVisibility[]).map((value) => <button key={value} onClick={() => setVisibility(value)} className={`p-3 rounded-lg border text-left ${visibility === value ? "border-primary bg-primary/10" : "border-border bg-card"}`}>{value === "public" ? <Globe2 className="size-5" /> : <LockKeyhole className="size-5" />}<p className="text-sm font-semibold mt-2 capitalize">{value}</p><p className="text-[11px] text-muted-foreground">{value === "public" ? "Discoverable and open to join" : "Invite link required"}</p></button>)}</div>
    <button onClick={submit} disabled={busy || !name.trim() || handle.length < 4} className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50">{busy ? "Creating…" : "Create Circle"}</button>
  </MobileShell>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-semibold space-y-1.5">{label}<div className="[&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-input [&_input]:bg-card [&_input]:px-3 [&_input]:py-3 [&_input]:text-sm [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-input [&_textarea]:bg-card [&_textarea]:px-3 [&_textarea]:py-3 [&_textarea]:text-sm">{children}</div></label>; }