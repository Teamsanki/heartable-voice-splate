import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { BottomNav } from "@/components/BottomNav";
import { ChevronLeft, Heart } from "lucide-react";

export const Route = createFileRoute("/guidelines")({
  head: () => ({
    meta: [
      { title: "Community Guidelines — Heartable" },
      { name: "description", content: "How we expect everyone — users, creators, and admins — to behave on Heartable." },
    ],
  }),
  component: GuidelinesPage,
});

function GuidelinesPage() {
  const navigate = useNavigate();
  return (
    <MobileShell className="p-5 gap-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate({ to: "/settings" })} className="size-9 rounded-full bg-sunset-100 grid place-items-center">
          <ChevronLeft className="size-4" />
        </button>
        <div>
          <h1 className="font-serif italic text-2xl flex items-center gap-2"><Heart className="size-5 text-rose-500" /> Community Guidelines</h1>
          <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1">Applies to everyone — users, creators, admins.</p>
        </div>
      </div>

      <div className="space-y-4 text-sm leading-relaxed pb-10">
        <Card title="🤝 Respect every voice">
          Heartable is a voice-first space. Treat other users the way you would want to be treated. Hate speech, harassment, slurs, bullying, threats, or attacks based on caste, religion, gender, sexuality, disability or nationality are not allowed.
        </Card>

        <Card title="🔒 Privacy is sacred">
          Do not share anyone else's personal information (real name, phone number, home address, school, workplace, screenshots of private chats) without consent. Doxxing leads to an immediate ban.
        </Card>

        <Card title="🎙️ Be authentic, be original">
          Share your own voice and your own shayari. Reposting someone else's voice without credit, mass-spamming, fake engagement, follow-for-follow rings, or bot-driven inflation will be penalised.
        </Card>

        <Card title="🚫 No NSFW, violent, or harmful content">
          No sexual content involving minors, ever. No explicit nudity. No glorification of self-harm, suicide, eating disorders, or drug abuse. No content promoting terrorism, extremism, or organised crime.
        </Card>

        <Card title="💬 DMs are friends-only by design">
          Direct messages only open when both users follow each other. Do not pressure anyone to follow you back. Unsolicited explicit DMs are reportable.
        </Card>

        <Card title="🚩 Reporting & moderation">
          See something that breaks these rules? Tap the 3-dot menu on any post / story / chat → <b>Report</b>. Admins review reports and may issue warnings, remove content, or ban accounts. Repeated violations escalate to permanent bans.
        </Card>

        <Card title="🛡️ Admin & Founder responsibilities">
          Admins must act respectfully, transparently, and only within their assigned role. Admins are forbidden from accessing user DMs, abusing ban tools, or doxxing users. Misuse of admin powers will result in removal of admin status by the Founder.
        </Card>

        <Card title="🏆 Rewards & milestones">
          Weekly milestones and giveaways are run honestly. Manipulating likes, follows, or comments to win rewards disqualifies you and may result in a ban.
        </Card>

        <Card title="⚠️ Enforcement">
          Violations may result in:
          <ul className="list-disc pl-5 mt-1">
            <li>A formal warning (you receive a notification).</li>
            <li>Content removal.</li>
            <li>Temporary suspension.</li>
            <li>Permanent ban with no refund of rewards/points.</li>
          </ul>
        </Card>

        <p className="text-xs opacity-60 text-center pt-4">By using Heartable you agree to follow these guidelines and our <a href="/privacy" className="underline">Privacy Policy</a>.</p>
      </div>

      <BottomNav />
    </MobileShell>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl p-4 ring-1 ring-foreground/5">
      <h2 className="font-serif italic text-lg mb-2">{title}</h2>
      <div className="opacity-90">{children}</div>
    </section>
  );
}