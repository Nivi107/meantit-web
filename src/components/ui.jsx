export const money = (cents, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format((cents ?? 0) / 100);

export function Card({ children, className = "" }) {
  return <section className={`rounded-xl bg-white shadow-sm ring-1 ring-slate-200 p-5 ${className}`}>{children}</section>;
}

export function Button({ children, variant = "primary", className = "", ...props }) {
  const styles = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300",
    secondary: "bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50 disabled:text-slate-400",
    good: "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300",
    bad: "bg-white text-red-700 ring-1 ring-red-300 hover:bg-red-50 disabled:text-red-300",
  };
  return (
    <button className={`rounded-lg px-4 py-2 text-sm font-medium transition ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

const DECISIONS = {
  ALLOW: { label: "Approved", className: "bg-emerald-100 text-emerald-800 ring-emerald-300" },
  HOLD: { label: "Held for you", className: "bg-amber-100 text-amber-900 ring-amber-300" },
  BLOCK: { label: "Blocked", className: "bg-red-100 text-red-800 ring-red-300" },
  PENDING: { label: "Checking…", className: "bg-slate-100 text-slate-700 ring-slate-300" },
};

// short: the marketplace's wording ("Held"); the shopper sees "Held for you".
export function DecisionBadge({ decision, short = false }) {
  const d = DECISIONS[decision] || DECISIONS.PENDING;
  const label = short && decision === "HOLD" ? "Held" : d.label;
  return <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ring-1 ${d.className}`}>{label}</span>;
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
  return <span className="text-sm text-slate-600">PayPal: {PAYMENTS[status] || status}</span>;
}

export function Collapsible({ title, children }) {
  return (
    <details className="group rounded-lg bg-slate-50 ring-1 ring-slate-200">
      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-slate-700">{title}</summary>
      <div className="px-3 pb-3">{children}</div>
    </details>
  );
}

export function Json({ value }) {
  return (
    <pre className="mt-2 max-h-80 overflow-auto rounded bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">
      {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
    </pre>
  );
}
