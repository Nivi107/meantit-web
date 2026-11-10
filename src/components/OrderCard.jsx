import { useState } from "react";
import { api } from "../api.js";
import { Button, Card, Collapsible, DecisionBadge, Json, PaymentStatus, money } from "./ui.jsx";

const VERDICTS = {
  met: { label: "fits", className: "text-emerald-700" },
  not_met: { label: "doesn't fit", className: "text-red-700" },
  unclear: { label: "not sure", className: "text-amber-700" },
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
  },
  marketplace: {
    ALLOW: "MeantIt found no problems, so the payment was captured. This sale was protected at checkout.",
    HOLD: "MeantIt wasn't sure the shopper meant this. The money is held on PayPal until the shopper answers.",
    BLOCK: "MeantIt stopped this order and released the hold. No charge, so no refund or dispute later.",
    asked: "The shopper asked for",
    fits: "Does it fit what they asked?",
    APPROVED: "The shopper approved it, so the payment was captured.",
    REJECTED: "The shopper said no, so the hold was released.",
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

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <DecisionBadge decision={order.decision} short={audience === "marketplace"} />
          <PaymentStatus status={order.payment_status} />
        </div>
        <span className="text-xs text-slate-400">{order.id}</span>
      </div>

      <p className="text-slate-700">{words[order.decision]}</p>

      <div className="rounded-lg bg-slate-50 p-3 text-sm">
        <p className="text-slate-500">{words.asked}</p>
        <p className="font-medium">“{order.intent}”</p>
        <p className="mt-3 text-slate-500">The agent's cart</p>
        {order.items.map((item) => (
          <p key={item.sku} className="font-medium">
            {item.qty}× {item.title} · {money(item.unit_price)}{" "}
            <span className="font-normal text-slate-500">from {order.seller.name}</span>
          </p>
        ))}
        <p className="mt-1 text-slate-500">
          Total {money(order.total, order.currency)}
          {order.delivery_estimate && ` · arrives ${order.delivery_estimate}`}
        </p>
      </div>

      {problems.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold">Why</h3>
          {problems.map((f, i) => (
            <Finding key={i} finding={f} showQuote={!(manipulated && f.code === "INJECTION_SUSPECTED")} />
          ))}
        </div>
      )}

      {order.meaning.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold">{words.fits}</h3>
          <ul className="space-y-1 text-sm">
            {order.meaning.map((row, i) => (
              <li key={i} className="flex flex-wrap gap-x-2">
                <span className={`w-24 shrink-0 font-medium ${VERDICTS[row.verdict]?.className}`}>
                  {VERDICTS[row.verdict]?.label}
                </span>
                <span>{row.text}</span>
                {row.evidence_quote && <span className="text-slate-500">— “{row.evidence_quote}”</span>}
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
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Waiting for the shopper. If they don't answer by {new Date(order.hold_expires_at).toLocaleString()}, the hold is
          released automatically.
        </p>
      )}
      {waiting && audience === "shopper" && (
        <div className="rounded-lg bg-amber-50 p-4 ring-1 ring-amber-200">
          <p className="font-medium text-amber-900">Did you mean this?</p>
          <p className="text-sm text-amber-800">
            If you don't answer by {new Date(order.hold_expires_at).toLocaleString()}, the hold is released and you
            aren't charged.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="good" disabled={!!busy} onClick={() => answer("approve")}>
              {busy === "approve" ? "Charging…" : "Yes, buy it"}
            </Button>
            <Button variant="bad" disabled={!!busy} onClick={() => answer("reject")}>
              {busy === "reject" ? "Releasing…" : "No, cancel"}
            </Button>
          </div>
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        </div>
      )}
      {order.resolution && (
        <p className="text-sm text-slate-600">
          {{ ...words, EXPIRED: "Nobody answered in 24 hours, so the hold was released." }[order.resolution]}
        </p>
      )}

      {footer}

      <Collapsible title="Signed Check record and PayPal IDs">
        <p className="text-sm text-slate-600">
          MeantIt signs every decision. The record holds the decision, the reasons and a hash of each signed piece.
        </p>
        <Json value={{ paypal: order.paypal, check_record: order.check_record }} />
      </Collapsible>
    </Card>
  );
}

function Finding({ finding, quiet, showQuote = true }) {
  const quote = showQuote && finding.evidence?.quote;
  const hidden = finding.check === "injection";
  return (
    <div className={`rounded-lg p-3 text-sm ${quiet ? "bg-slate-50 text-slate-600" : "bg-red-50 text-red-900"}`}>
      <p className="font-medium">{finding.message}</p>
      {quote && (
        <p className="mt-1">
          {hidden ? "Hidden text on the product page: " : "Evidence: "}
          <span className="font-mono text-xs">“{quote}”</span>
        </p>
      )}
    </div>
  );
}
