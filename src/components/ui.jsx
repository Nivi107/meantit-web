export const money = (cents, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format((cents ?? 0) / 100);

// A card with a tab-like title bar, like a panel in a security console.
export function Panel({ title, right, children, className = "", bodyClassName = "p-5" }) {
  return (
    <section className={`rounded-xl border border-line bg-panel ${className}`}>
      {(title || right) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
          <h2 className="label !text-dim">{title}</h2>
          {right}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function Button({ children, variant = "primary", className = "", ...props }) {
  const styles = {
    primary: "bg-pass text-navy hover:bg-[#00b87c] disabled:bg-pass/30 disabled:text-navy/60",
    secondary: "border border-line2 text-dim hover:border-pass hover:text-ink disabled:opacity-40",
    good: "bg-pass text-navy hover:bg-[#00b87c] disabled:opacity-40",
    bad: "border border-block/50 text-block hover:bg-block/10 disabled:opacity-40",
  };
  return (
    <button
      className={`rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// Colour carries meaning only: green passed, amber waiting, red stopped, blue information.
export const TONES = {
  pass: "text-pass bg-pass/10 border-pass/25",
  hold: "text-hold bg-hold/10 border-hold/25",
  block: "text-block bg-block/10 border-block/25",
  info: "text-info bg-info/10 border-info/25",
  admin: "text-admin bg-admin/10 border-admin/25",
  quiet: "text-dim bg-white/[0.03] border-line2",
};

export function Tag({ tone = "quiet", children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] leading-none font-semibold ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

const DECISIONS = {
  ALLOW: { label: "Approved", tone: "pass", icon: "✓" },
  HOLD: { label: "Held for you", tone: "hold", icon: "◷" },
  BLOCK: { label: "Blocked", tone: "block", icon: "✕" },
  PENDING: { label: "Checking", tone: "info", icon: "…" },
};

// Once the shopper answers a hold, the badge shows the answer; the order still records that MeantIt held it.
const ANSWERS = {
  APPROVED: { label: ["You approved", "Shopper approved"], tone: "pass", icon: "✓" },
  REJECTED: { label: ["You rejected", "Shopper rejected"], tone: "quiet", icon: "✕" },
  EXPIRED: { label: ["Hold expired", "Hold expired"], tone: "quiet", icon: "◷" },
};

// short: the marketplace's wording ("Held", "Shopper approved"); the shopper sees "Held for you", "You approved".
export function DecisionBadge({ decision, resolution, short = false }) {
  const answer = decision === "HOLD" && ANSWERS[resolution];
  const d = answer ? { ...answer, label: answer.label[short ? 1 : 0] } : DECISIONS[decision] || DECISIONS.PENDING;
  const label = short && decision === "HOLD" && !answer ? "Held" : d.label;
  return (
    <Tag tone={d.tone}>
      <span aria-hidden>{d.icon}</span>
      {label}
    </Tag>
  );
}

const PAYMENTS = {
  CAPTURED: "Paid",
  AUTHORIZED: "Money on hold, not charged",
  VOIDED: "Hold released, not charged",
  REFUNDED: "Refunded",
  NONE: "PayPal never touched",
  CREATED: "Starting…",
  FAILED: "PayPal hold failed",
};

export function PaymentStatus({ status }) {
  return (
    <span className="font-mono text-[11px] text-dim">
      <span className="text-ghost">PAYPAL · </span>
      {PAYMENTS[status] || status}
    </span>
  );
}

export function Collapsible({ title, children }) {
  return (
    <details className="group rounded-xl border border-line bg-panel2">
      <summary className="flex cursor-pointer select-none items-center gap-2 px-4 py-2.5 text-xs font-medium text-dim hover:text-ink">
        <span className="transition group-open:rotate-90">›</span>
        {title}
      </summary>
      <div className="space-y-2 px-4 pb-4">{children}</div>
    </details>
  );
}

export function Json({ value }) {
  return (
    <pre className="mt-2 max-h-80 overflow-auto rounded-xl border border-line bg-navy p-3 font-mono text-[11px] leading-relaxed text-dim">
      {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
    </pre>
  );
}

// "01 / Ask your agent" style heading at the top of each page.
export function PageHeader({ eyebrow, title, children, right }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && <p className="label mb-3">{eyebrow}</p>}
        <h1 className="text-[1.9rem] font-semibold leading-tight tracking-tight text-ink">{title}</h1>
        {children && <p className="mt-2 text-[15px] leading-relaxed text-dim">{children}</p>}
      </div>
      {right}
    </div>
  );
}

const TEXT = { pass: "text-pass", hold: "text-hold", block: "text-block", info: "text-info", admin: "text-admin" };

// Big mono numbers in a row, split by thin lines.
export function StatBar({ stats }) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-panel2 sm:grid-cols-3 lg:grid-flow-col lg:auto-cols-fr lg:grid-cols-none">
      {stats.map((s) => (
        <div key={s.label} className="border-b border-r border-line px-5 py-5 last:border-r-0 lg:border-b-0">
          <p className="label">{s.label}</p>
          <p className={`mt-2 font-mono text-2xl font-semibold tabular-nums sm:text-[1.7rem] ${TEXT[s.tone] || "text-ink"}`}>
            {s.value}
          </p>
          {s.note && <p className="mt-1 text-xs text-dim">{s.note}</p>}
        </div>
      ))}
    </div>
  );
}

export function Loading({ children = "Loading…" }) {
  return <p className="text-xs font-medium text-ghost">{children}</p>;
}

export function ErrorNote({ children }) {
  return <p className="rounded-xl border border-block/30 bg-block/10 px-3 py-2 text-sm text-block">{children}</p>;
}
