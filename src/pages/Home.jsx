import { useEffect, useState } from "react";
import { api } from "../api.js";
import { money } from "../components/ui.jsx";

const OUTCOMES = [
  {
    tone: "pass",
    verdict: "Captured",
    agent: "A careful agent",
    text: "Buys the right shoe and ignores the note hidden on another page.",
    money: "PayPal captures the payment.",
  },
  {
    tone: "hold",
    verdict: "Held for you",
    agent: "A careless agent",
    text: "Buys the cheapest shoe in your size without reading. It isn't made for running.",
    money: "The money stays held until you say yes or no.",
  },
  {
    tone: "block",
    verdict: "Voided",
    agent: "A tricked agent",
    text: "Obeys a hidden “note for AI assistants” and buys a shoe from the wrong seller.",
    money: "The hold is released. You're never charged.",
  },
];

const TONE = {
  pass: { text: "text-pass", ring: "border-pass/30", glow: "from-pass/15", dot: "bg-pass" },
  hold: { text: "text-hold", ring: "border-hold/30", glow: "from-hold/15", dot: "bg-hold" },
  block: { text: "text-block", ring: "border-block/30", glow: "from-block/15", dot: "bg-block" },
  info: { text: "text-info", ring: "border-info/30", glow: "from-info/15", dot: "bg-info" },
};

// Where the shopper's money is at each moment.
const JOURNEY = [
  ["You sign", "Your browser signs what you want and the most your agent may spend."],
  ["The agent shops", "Any agent, any page, including pages written to trick it."],
  ["PayPal holds", "At checkout the money is authorized, not captured."],
  ["MeantIt checks", "Signatures, limit, meaning and hidden instructions, against what you signed."],
  ["Capture, ask or void", "Only an order you meant is ever charged."],
];

const VIEWS = [
  ["#/shopper", "Shopper", "Sign a request, send an agent, answer held orders, report a problem.", "bg-pass"],
  ["#/store", "PayMart", "The demo marketplace. One listing hides a trap for agents.", "bg-dim"],
  ["#/dashboard", "Merchant", "Every agent order with its reasons, and evidence you can verify.", "bg-info"],
  ["#/admin", "MeantIt admin", "The Protection Fund, the review queue and the ledger.", "bg-admin"],
];

const DECISION = { ALLOW: ["Captured", "pass"], HOLD: ["Held", "hold"], BLOCK: ["Voided", "block"] };

export default function Home() {
  const [orders, setOrders] = useState(null);
  useEffect(() => {
    api("/dashboard/orders").then(setOrders).catch(() => setOrders([]));
  }, []);

  return (
    <>
      <section className="mx-auto max-w-[1100px] px-4 pb-16 pt-16 text-center sm:px-8 sm:pt-24">
        <p className="mx-auto w-fit rounded-full border border-line2 bg-panel/60 px-4 py-1.5 text-xs font-medium text-dim">
          A checkout guard for AI shopping agents · on PayPal
        </p>
        <h1 className="mx-auto mt-8 max-w-3xl text-[clamp(2.3rem,5.5vw,4.2rem)] font-bold leading-[1.05] tracking-[-0.035em] text-white">
          Your agent bought it.{" "}
          <span className="bg-gradient-to-r from-pass via-info to-admin bg-clip-text text-transparent">Did you mean it?</span>
        </h1>
        <p className="mx-auto mt-7 max-w-2xl text-[17px] leading-relaxed text-dim">
          AI agents get things wrong, and the pages they read can trick them. MeantIt sits at checkout: PayPal holds the
          money while MeantIt compares the cart with what you actually signed. Then the payment is captured, held for
          you, or voided before a cent moves.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <a href="#/shopper" className="rounded-full bg-pass px-7 py-3 text-sm font-semibold text-navy transition hover:bg-[#00b87c]">
            Run the demo
          </a>
          <a href="#/dashboard" className="rounded-full border border-line2 px-7 py-3 text-sm font-semibold text-dim transition hover:border-ink hover:text-ink">
            Merchant console
          </a>
        </div>
        <Comparison />
      </section>

      <section className="mx-auto max-w-[1100px] px-4 py-16 sm:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-pass">One request, three agents</p>
          <h2 className="mt-3 text-[clamp(1.7rem,3vw,2.4rem)] font-semibold leading-tight tracking-[-0.025em]">
            “Running shoes for flat feet, size US 9, under $150, delivered within a week.”
          </h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {OUTCOMES.map((o) => (
            <div key={o.verdict} className={`relative overflow-hidden rounded-2xl border ${TONE[o.tone].ring} bg-panel/80 p-6`}>
              <div className={`pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b ${TONE[o.tone].glow} to-transparent`} />
              <p className={`relative text-2xl font-bold tracking-tight ${TONE[o.tone].text}`}>{o.verdict}</p>
              <p className="relative mt-4 text-sm font-semibold text-ink">{o.agent}</p>
              <p className="relative mt-1 text-sm leading-relaxed text-dim">{o.text}</p>
              <p className="relative mt-5 border-t border-line pt-4 text-sm text-ink">{o.money}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-info/30 bg-panel/80 p-6 sm:flex-row sm:items-center">
          <span className="shrink-0 rounded-full bg-info/15 px-3 py-1 text-sm font-semibold text-info">And if MeantIt is wrong?</span>
          <p className="text-sm leading-relaxed text-dim">
            News after checkout shows an approved shoe wasn't what the shopper meant. PayMart refunds the shopper, the
            claim judge confirms the agent's mistake, and the MeantIt Protection Fund repays PayMart through PayPal
            Payouts.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1100px] px-4 py-16 sm:px-8">
        <p className="text-sm font-semibold text-pass">How it works</p>
        <h2 className="mt-3 max-w-2xl text-[clamp(1.7rem,3vw,2.4rem)] font-semibold leading-tight tracking-[-0.025em]">
          The money waits while MeantIt checks the order.
        </h2>
        <ol className="relative mt-12 grid gap-8 md:grid-cols-5 md:gap-4">
          <span className="absolute left-[11px] top-[11px] hidden h-px w-[calc(100%-22px)] bg-gradient-to-r from-pass via-info to-admin md:block" />
          {JOURNEY.map(([title, text], i) => (
            <li key={title} className="relative flex gap-4 md:block">
              <span className="relative z-10 mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-line2 bg-navy text-[11px] font-semibold text-ink md:mt-0">
                {i + 1}
              </span>
              <span className="md:mt-5 md:block">
                <span className="block font-semibold text-ink">{title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-dim">{text}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-12 text-sm text-ghost">
          Built on AP2-style signed mandates, PayPal authorize then capture or void, and Claude for meaning and hidden
          instructions.
        </p>
      </section>

      <section className="mx-auto grid max-w-[1100px] gap-6 px-4 py-16 sm:px-8 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="text-sm font-semibold text-pass">Try every side</p>
          <h2 className="mt-3 text-[clamp(1.7rem,3vw,2.4rem)] font-semibold leading-tight tracking-[-0.025em]">
            Four views of the same order.
          </h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {VIEWS.map(([href, title, text, dot]) => (
              <a key={href} href={href} className="group rounded-2xl border border-line bg-panel/80 p-5 transition hover:border-line2 hover:bg-panel2">
                <p className="flex items-center gap-2 font-semibold text-ink">
                  <span className={`h-2 w-2 rounded-full ${dot}`} /> {title}
                  <span className="ml-auto text-ghost transition group-hover:translate-x-0.5 group-hover:text-ink">→</span>
                </p>
                <p className="mt-2 text-sm leading-relaxed text-dim">{text}</p>
              </a>
            ))}
          </div>
        </div>
        <Recent orders={orders} />
      </section>
    </>
  );
}

// What the shopper signed next to what the agent bought, and MeantIt's answer: the whole idea in one picture.
function Comparison() {
  return (
    <div className="mx-auto mt-16 max-w-4xl rounded-[28px] border border-line2 bg-panel/70 p-3 text-left shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]">
      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-2xl bg-panel2 p-5">
          <p className="text-xs font-semibold text-ghost">You signed</p>
          <p className="mt-2 text-[15px] leading-relaxed text-ink">“Running shoes for flat feet, size US 9, under $150”</p>
          <p className="mt-3 text-xs text-dim">Only at PayMart · up to $150.00</p>
        </div>
        <div className="flex items-center justify-center text-ghost">
          <span className="rounded-full border border-line2 px-3 py-1 text-xs">vs</span>
        </div>
        <div className="rounded-2xl bg-panel2 p-5">
          <p className="text-xs font-semibold text-ghost">The agent bought</p>
          <p className="mt-2 text-[15px] leading-relaxed text-ink">StableRun Pro, US 9 · $145.00</p>
          <p className="mt-3 text-xs text-dim">From SuperDeals Outlet · “not designed for flat feet”</p>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-block/30 bg-block/[0.07] p-5 sm:flex-row sm:items-center">
        <span className="w-fit shrink-0 rounded-full bg-block px-3 py-1 text-sm font-bold text-navy">✕ Voided</span>
        <p className="text-sm leading-relaxed text-ink">
          A hidden note on a product page told the agent to buy this, and the shoe doesn't fit what you asked for.
          <span className="text-dim"> PayPal released the hold, so you were never charged.</span>
        </p>
      </div>
    </div>
  );
}

// The latest real decisions in this sandbox, with a one-line tally.
function Recent({ orders }) {
  const rows = (orders || []).slice(0, 6);
  const never = (orders || []).filter((o) => o.payment_status === "VOIDED" || o.decision === "BLOCK").length;
  return (
    <div className="rounded-2xl border border-line bg-panel/80 p-6">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-ink">Latest decisions in the sandbox</p>
        <span className="flex items-center gap-2 text-xs text-pass">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-pass" /> Real orders
        </span>
      </div>
      {orders && orders.length > 0 && (
        <p className="mt-1 text-sm text-dim">
          {orders.length} checked so far · {never} never charged
        </p>
      )}
      <div className="mt-5 space-y-2">
        {!orders && <p className="text-sm text-ghost">Connecting to MeantIt…</p>}
        {orders && !rows.length && <p className="text-sm text-ghost">No orders yet. Run the demo and they appear here.</p>}
        {rows.map((o) => {
          const [label, tone] = DECISION[o.decision] || ["Checking", "info"];
          return (
            <a
              key={o.id}
              href={`#/dashboard/orders/${o.id}`}
              className="flex items-center gap-3 rounded-xl border border-line bg-navy/40 px-4 py-3 text-sm transition hover:border-line2"
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${TONE[tone].dot}`} />
              <span className="min-w-0 flex-1 truncate text-ink">{o.items.map((it) => it.title).join(", ") || "—"}</span>
              <span className="font-mono text-xs text-dim">{money(o.total)}</span>
              <span className={`w-16 text-right text-xs font-semibold ${TONE[tone].text}`}>{label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
