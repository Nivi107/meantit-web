import { useEffect, useState } from "react";
import { getHealth } from "../api.js";

const NAV = [
  ["shopper", "Shopper"],
  ["store", "PayMart"],
  ["dashboard", "Merchant"],
  ["admin", "Admin"],
];

export function Logo({ className = "h-[22px] w-[22px]" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M12 2 4 5v6c0 5 3.4 9.3 8 11 4.6-1.7 8-6 8-11V5l-8-3Z" stroke="#00d68f" strokeWidth="1.6" />
      <path d="m8.5 12 2.5 2.5 4.5-5" stroke="#00d68f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Green when every part of the backend is set up; amber while the free server wakes or if something is missing.
function useHealth() {
  const [state, setState] = useState("waking");
  useEffect(() => {
    getHealth()
      .then((h) => setState(Object.values(h.configured).every(Boolean) ? "ok" : "partial"))
      .catch(() => setState("down"));
  }, []);
  return state;
}

const HEALTH = {
  ok: ["Sandbox online", "text-pass", "bg-pass live-dot"],
  partial: ["Guard partly set up", "text-hold", "bg-hold"],
  waking: ["Waking the server", "text-hold", "bg-hold animate-pulse"],
  down: ["Backend unreachable", "text-block", "bg-block"],
};

export function Header({ page }) {
  const [text, color, dot] = HEALTH[useHealth()];
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-navy/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-4 px-4 sm:px-8">
        <a href="#/" className="flex shrink-0 items-center gap-2.5 text-[15px] font-bold tracking-tight">
          <Logo />
          <span className="hidden min-[420px]:inline">MeantIt</span>
        </a>
        <span
          title={text}
          className={`hidden items-center gap-2 rounded-full border border-line px-3 py-1 text-xs font-medium lg:flex ${color}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
          {text}
        </span>
        <nav className="ml-auto flex items-center gap-1 rounded-full border border-line bg-panel/70 p-1">
          {NAV.map(([key, label]) => (
            <a
              key={key}
              href={`#/${key}`}
              className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition sm:px-4 ${
                page === key ? "bg-white/[0.09] text-ink" : "text-dim hover:text-ink"
              }`}
            >
              {label}
            </a>
          ))}
        </nav>
        <a
          href="#/shopper"
          className="hidden rounded-full bg-pass px-5 py-2 text-[13px] font-semibold text-navy transition hover:bg-[#00b87c] md:block"
        >
          Run the demo
        </a>
      </div>
    </header>
  );
}

const AREA_TONES = {
  pass: "text-pass border-pass/30",
  info: "text-info border-info/30",
  admin: "text-admin border-admin/30",
  quiet: "text-dim border-line2",
};
const TAB_ACTIVE = {
  pass: "text-pass border-pass",
  info: "text-info border-info",
  admin: "text-admin border-admin",
  quiet: "text-ink border-ink",
};

// The second bar: which console you're in, and its tabs. Each console has its own colour.
export function AreaNav({ name, who, tone, tabs, active, right }) {
  return (
    <div className="border-b border-line bg-panel/80">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-6 px-4 sm:px-8">
        <div className="flex items-center gap-3 py-3">
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${AREA_TONES[tone]}`}>
            {name}
          </span>
          {who && <span className="hidden text-xs text-ghost sm:inline">{who}</span>}
        </div>
        <nav className="-mb-px flex overflow-x-auto">
          {tabs.map(([key, label, href, count]) => (
            <a
              key={key}
              href={href}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-[13px] font-medium transition ${
                active === key ? TAB_ACTIVE[tone] : "border-transparent text-dim hover:text-ink"
              }`}
            >
              {label}
              {count > 0 && (
                <span className="rounded-full bg-hold px-1.5 text-[10px] font-semibold leading-4 text-navy">{count}</span>
              )}
            </a>
          ))}
        </nav>
        {right && <div className="ml-auto py-2">{right}</div>}
      </div>
    </div>
  );
}

export function Page({ children, className = "" }) {
  return <main className={`mx-auto max-w-[1240px] px-4 py-10 sm:px-8 ${className}`}>{children}</main>;
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-4 py-8 sm:px-8">
        <div className="flex items-center gap-2.5 text-xs text-dim">
          <Logo className="h-4 w-4" />
          MeantIt · checkout guard for AI shopping agents
        </div>
        <p className="text-xs text-ghost">
          PayPal sandbox · Claude · AP2 mandates · built for the PayPal AI Hackathon
        </p>
      </div>
    </footer>
  );
}
