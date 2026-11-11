import { useState } from "react";
import { api } from "../api.js";
import { Button, Collapsible, DecisionBadge, Json, PaymentStatus, money } from "./ui.jsx";

const VERDICTS = {
  met: { label: "fits", icon: "✓", className: "text-pass" },
  not_met: { label: "doesn't fit", icon: "✕", className: "text-block" },
  unclear: { label: "not sure", icon: "?", className: "text-hold" },
};

// Most serious first: the codes that BLOCK, then the ones that HOLD.
const SEVERITY = ["MANDATE_INVALID", "LIMIT_EXCEEDED", "AGENT_MANIPULATED", "INTENT_MISMATCH", "INJECTION_SUSPECTED"];
const rank = (code) => (SEVERITY.includes(code) ? SEVERITY.indexOf(code) : SEVERITY.length);

// The same card serves the shopper and the marketplace; only the wording changes.
const WORDS = {
  shopper: {
    ALLOW: "MeantIt checked the order against what you asked for and found no problems, so PayPal charged you.",
    HOLD: "Something doesn't look like what you meant. Your money is held but not charged until you decide.",
    BLOCK: "MeantIt stopped this order. The hold on your money was released; you weren't charged.",
    asked: "You asked for",
    fits: "Does it fit what you asked?",
    APPROVED: "You approved it.",
    REJECTED: "You cancelled it.",
    FAILED: "PayPal didn't answer, so this order went no further. You weren't charged; ask your agent to try again.",
  },
  marketplace: {
    ALLOW: "MeantIt found no problems, so the payment was captured. This sale was protected at checkout.",
    HOLD: "MeantIt wasn't sure the shopper meant this. The money is held on PayPal until the shopper answers.",
    BLOCK: "MeantIt stopped this order and released the hold. No charge, so no refund or dispute later.",
    asked: "The shopper asked for",
    fits: "Does it fit what they asked?",
    APPROVED: "The shopper approved it, so the payment was captured.",
    REJECTED: "The shopper said no, so the hold was released.",
    FAILED: "PayPal didn't answer, so this order went no further. Nothing was captured.",
  },
};

export default function OrderCard({ order, userId, onChange, audience = "shopper", footer }) {
  const words = WORDS[audience];
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const waiting = order.decision === "HOLD" && order.payment_status === "AUTHORIZED" && !order.resolution;

  async function answer(action) {
    setBusy(action);
    setError(null);
    try {
      onChange?.(await api(`/orders/${order.id}/${action}`, { method: "POST", userId }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  const problems = order.findings
    .filter((f) => order.reasons.includes(f.message))
    .sort((a, b) => rank(a.code) - rank(b.code));
  const manipulated = problems.some((f) => f.code === "AGENT_MANIPULATED");
  const info = order.findings.filter((f) => !order.reasons.includes(f.message));

  const tone = { ALLOW: "border-l-pass", HOLD: "border-l-hold", BLOCK: "border-l-block" }[order.decision] || "border-l-info";
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-panel2 px-5 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <DecisionBadge decision={order.decision} resolution={order.resolution} short={audience === "marketplace"} />
          <PaymentStatus status={order.payment_status} />
        </div>
        <span className="font-mono text-[11px] text-ghost">{order.id}</span>
      </div>

      <div className="space-y-6 p-5">
        <p className={`border-l-2 pl-4 text-[15px] leading-relaxed text-ink ${tone}`}>
          {words[order.payment_status === "FAILED" ? "FAILED" : order.decision]}
        </p>

        <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
          <div className="bg-panel2 p-4">
            <p className="label">{words.asked}</p>
            <p className="mt-2 text-ink">“{order.intent}”</p>
          </div>
          <div className="bg-panel2 p-4">
            <p className="label">The agent's cart</p>
            {order.items.map((item) => (
              <p key={item.sku} className="mt-2 text-ink">
                {item.qty}× {item.title} <span className="font-mono text-sm text-dim">{money(item.unit_price)}</span>
              </p>
            ))}
            <p className="mt-1 text-xs text-dim">
              from {order.seller.name} · total <span className="font-mono">{money(order.total, order.currency)}</span>
              {order.delivery_estimate && ` · arrives ${order.delivery_estimate}`}
            </p>
          </div>
        </div>

        {problems.length > 0 && (
          <div className="space-y-2">
            <p className="label">Why</p>
            {problems.map((f, i) => (
              <Finding key={i} finding={f} serious={order.decision === "BLOCK"} showQuote={!(manipulated && f.code === "INJECTION_SUSPECTED")} />
            ))}
          </div>
        )}

        {order.meaning.length > 0 && (
          <div>
            <p className="label mb-2">{words.fits}</p>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {order.meaning.map((row, i) => (
                <li key={i} className="grid gap-x-4 gap-y-1 px-4 py-3 text-sm sm:grid-cols-[110px_1fr]">
                  <span className={`text-xs font-semibold ${VERDICTS[row.verdict]?.className}`}>
                    {VERDICTS[row.verdict]?.icon} {VERDICTS[row.verdict]?.label}
                  </span>
                  <span>
                    <span className="text-ink">{row.text}</span>
                    {row.evidence_quote && (
                      <span className="mt-0.5 block font-mono text-[11px] text-dim">“{row.evidence_quote}”</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {info.length > 0 && (
          <div className="space-y-2">
            {info.map((f, i) => (
              <Finding key={i} finding={f} quiet />
            ))}
          </div>
        )}

        {waiting && audience === "marketplace" && (
          <p className="rounded-xl border border-hold/30 bg-hold/[0.06] p-4 text-sm text-hold">
            Waiting for the shopper. If they don't answer by {new Date(order.hold_expires_at).toLocaleString()}, the hold
            is released automatically.
          </p>
        )}
        {waiting && audience === "shopper" && (
          <div className="rounded-xl border border-hold/40 bg-hold/[0.06] p-5">
            <p className="text-lg font-medium text-hold">Did you mean this?</p>
            <p className="mt-1 text-sm text-dim">
              Your money is held, not charged. If you don't answer by {new Date(order.hold_expires_at).toLocaleString()},
              the hold is released.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="good" disabled={!!busy} onClick={() => answer("approve")}>
                {busy === "approve" ? "Charging…" : "Yes, buy it"}
              </Button>
              <Button variant="bad" disabled={!!busy} onClick={() => answer("reject")}>
                {busy === "reject" ? "Releasing…" : "No, cancel"}
              </Button>
            </div>
            {error && <p className="mt-2 text-sm text-block">{error}</p>}
          </div>
        )}
        {order.resolution && (
          <p className="font-mono text-xs text-dim">
            <span className="text-ghost">ANSWER · </span>
            {{ ...words, EXPIRED: "Nobody answered in 24 hours, so the hold was released." }[order.resolution]}
          </p>
        )}

        {footer}

        <Collapsible title="Signed Check record and PayPal IDs">
          <p className="text-sm text-dim">
            MeantIt signs every decision. The record holds the decision, the reasons and a hash of each signed piece.
          </p>
          <Json value={{ paypal: order.paypal, check_record: order.check_record }} />
        </Collapsible>
      </div>
    </section>
  );
}

function Finding({ finding, quiet, serious, showQuote = true }) {
  const quote = showQuote && finding.evidence?.quote;
  const hidden = finding.check === "injection";
  const style = quiet
    ? "border-line bg-panel2 text-dim"
    : serious
      ? "border-block/30 bg-block/[0.07] text-ink"
      : "border-hold/30 bg-hold/[0.06] text-ink";
  return (
    <div className={`rounded-xl border p-4 text-sm ${style}`}>
      <p className="font-medium">{finding.message}</p>
      {quote && (
        <p className="mt-2 text-dim">
          {hidden ? "Hidden text on the product page: " : "Evidence: "}
          <span className={`font-mono text-[11px] ${hidden ? "text-block" : "text-ink"}`}>“{quote}”</span>
        </p>
      )}
    </div>
  );
}
