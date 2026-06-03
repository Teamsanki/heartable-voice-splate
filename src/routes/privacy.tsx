import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { BottomNav } from "@/components/BottomNav";
import { ChevronLeft, Shield } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Heartable" },
      { name: "description", content: "How Heartable collects, uses, stores, and protects your data." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const navigate = useNavigate();
  return (
    <MobileShell className="p-5 gap-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate({ to: "/settings" })} className="size-9 rounded-full bg-sunset-100 grid place-items-center">
          <ChevronLeft className="size-4" />
        </button>
        <div>
          <h1 className="font-serif italic text-2xl flex items-center gap-2"><Shield className="size-5" /> Privacy Policy</h1>
          <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1">Last updated: June 2026</p>
        </div>
      </div>

      <div className="prose prose-sm max-w-none text-sm leading-relaxed space-y-5 pb-10">
        <Section title="1. Who we are">
          Heartable (“we”, “us”, “the app”) is a voice-first social product operated by the Heartable team. This policy explains how we collect, store, and process your personal data when you use the app.
        </Section>

        <Section title="2. Data we collect">
          <ul className="list-disc pl-5 space-y-1">
            <li><b>Account data</b> — your name, email address, profile photo, and the authentication identifier from Google or email/password sign-up.</li>
            <li><b>Content you create</b> — voice notes, shayari (text posts), stories, comments, likes, follows, direct messages, and reports you submit.</li>
            <li><b>Activity data</b> — streaks, login timestamps, last-seen presence (only if you enable “Online activity” in Settings), and which posts you have viewed or interacted with.</li>
            <li><b>Device data</b> — browser type, operating system, and approximate locale, used only for diagnostics and abuse prevention.</li>
          </ul>
        </Section>

        <Section title="3. Where your data lives">
          <ul className="list-disc pl-5 space-y-1">
            <li>All voice files (recordings, voice notes, story audio) are stored in encrypted cloud object storage operated by our infrastructure providers.</li>
            <li>All profile data, social graph (follows, blocks), notifications, comments, and chat metadata are stored in our managed Realtime Database.</li>
            <li>Backups are retained for up to 30 days for disaster recovery.</li>
          </ul>
        </Section>

        <Section title="4. How we use your data">
          <ul className="list-disc pl-5 space-y-1">
            <li>To deliver core functionality (feed, chats, stories, notifications).</li>
            <li>To send transactional emails about account activity (likes, comments, follows, broadcasts) when you have a registered email address.</li>
            <li>To run anti-abuse, ban and moderation systems based on reports.</li>
            <li>To compute streaks, milestones, rewards eligibility, and verified-tick tiers.</li>
          </ul>
          We do <b>not</b> sell your data, run third-party ad networks, or train external AI models on your private chats.
        </Section>

        <Section title="5. Direct messages & friends-only chat">
          Direct messages are restricted to mutual followers (“friends”). Voice DMs auto-expire 24 hours after they are sent or once the recipient has listened to them. Chat metadata is kept for moderation purposes.
        </Section>

        <Section title="6. Email notifications">
          When something happens that involves you (a like, comment, follow, share, broadcast, or admin warning), we may send you an email summary at the address linked to your account, delivered through Resend. You can opt out at any time via the “Online activity” and notification toggles in Settings.
        </Section>

        <Section title="7. Blocking, reporting and bans">
          You may block any user (Settings → Blocked) — they will no longer appear in your feed, trending, or chats. You may report any post, story, or user. Admins review reports and may issue warnings, content takedowns, or account bans, in accordance with our Community Guidelines.
        </Section>

        <Section title="8. Your rights">
          <ul className="list-disc pl-5 space-y-1">
            <li><b>Access & correction</b> — your name and photo are editable from Profile. Email us for any other corrections.</li>
            <li><b>Deletion</b> — open Settings → Help & Support and file a deletion ticket. We will erase your account, posts, and chats within 14 days.</li>
            <li><b>Portability</b> — request an export via a support ticket.</li>
            <li><b>Withdraw consent</b> — sign out at any time; uninstalling or signing out stops further data collection.</li>
          </ul>
        </Section>

        <Section title="9. Minors">
          Heartable is not directed to children under 13. If we learn that a child under 13 has provided personal data, we will delete the account.
        </Section>

        <Section title="10. Security">
          We use industry-standard transport encryption (HTTPS/TLS), authenticated database access, server-side validation, and row-level security policies. No system is perfectly secure; please use a strong unique password and never share your account.
        </Section>

        <Section title="11. Changes to this policy">
          We may update this policy. Material changes will be announced in-app via a broadcast and the “Last updated” date above will change.
        </Section>

        <Section title="12. Contact">
          Questions, takedown requests, or data subject requests: open a support ticket from Settings → Help & Support, or email <a href="mailto:schoudhary11256@gmail.com" className="underline">schoudhary11256@gmail.com</a>.
        </Section>
      </div>

      <BottomNav />
    </MobileShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-serif italic text-lg mb-1">{title}</h2>
      <div className="opacity-90">{children}</div>
    </section>
  );
}