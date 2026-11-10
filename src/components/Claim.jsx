import { useState } from "react";
import { api } from "../api.js";
import { Button, money } from "./ui.jsx";

export const CLAIM_STATUS = {
  NOT_COVERED: { label: "Not covered", className: "bg-slate-100 text-slate-700 ring-slate-300" },
  IN_REVIEW: { label: "A person is checking", className: "bg-amber-100 text-amber-900 ring-amber-300" },
  DECLINED: { label: "Declined", className: "bg-slate-100 text-slate-700 ring-slate-300" },
  APPROVED: { label: "Approved: send it back", className: "bg-indigo-100 text-indigo-800 ring-indigo-300" },
  REFUNDED: { label: "Refunded", className: "bg-emerald-100 text-emerald-800 ring-emerald-300" },
  REIMBURSED: { label: "Refunded · PayMart repaid", className: "bg-emerald-100 text-emerald-800 ring-emerald-300" },
};

const VERDICTS = {
  AGENT_ERROR: "Agent mistake",
  CHANGED_MIND: "Changed mind",
  NOT_RECEIVED: "Not received (PayPal handles it)",
  SUSPICIOUS: "Suspicious",
};

const LOSSES = { return_shipping: "Return shipping", paypal_fee: "PayPal fee not returned", unsellable_item: "Item can't be resold" };

// Two ready-made claims for the demo: one the fund covers, one it doesn't.
const EXAMPLES = [
  "I have flat feet and these give me no support at all. The midsole is soft and flat, nothing like the listing. I can't run in them.",
  "I found the same shoes $20 cheaper at another shop. Nothing is wrong with them, I just want my money back instead.",
];

export function ClaimBadge({ status }) {
  const s = CLAIM_STATUS[status] || { label: status, className: "bg-slate-100 text-slate-700 ring-slate-300" };
  return <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ring-1 ${s.className}`}>{s.label}</span>;
}

// What the shopper sees under a paid order: a form, or how their claim is going.
export function ClaimBox({ order, claim, userId, onChange }) {
  if (claim) return <ClaimDetails claim={claim} audience="shopper" onChange={onChange} />;
  if (order.payment_status !== "CAPTURED") return null;
  return <ClaimForm order={order} userId={userId} onFiled={onChange} />;
}

function ClaimForm({ order, userId, onFiled }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      onFiled?.(await api(`/orders/${order.id}/claims`, { method: "POST", body: { text }, userId }));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="text-sm font-medium text-indigo-700 hover:underline" onClick={() => setOpen(true)}>
        Something wrong with what arrived? File a claim
      </button>
    );
  }
  return (
    <div className="space-y-2 rounded-lg p-4 ring-1 ring-slate-200">
      <h3 className="font-semibold">What's wrong?</h3>
      <p className="text-sm text-slate-500">
        MeantIt approved this order, so if your agent got it wrong, the Protection Fund stands behind it. A judge
        compares your claim with what you signed before the purchase.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="w-full rounded-lg p-2 text-sm ring-1 ring-slate-300 focus:outline-none focus:ring-indigo-500"
        placeholder="Tell us what arrived and what's wrong with it"
      />
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="text-slate-500">Try:</span>
        {EXAMPLES.map((example, i) => (
          <button key={i} onClick={() => setText(example)} className="rounded bg-slate-100 px-2 py-1 text-left hover:bg-slate-200">
            {i === 0 ? "No support for flat feet" : "Found it cheaper"}
          </button>
        ))}
      </div>
      <Button onClick={send} disabled={busy || text.trim().length < 10}>
        {busy ? "The judge is reading your claim…" : "Send claim"}
      </Button>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}

// audience: shopper, marketplace or admin. Each sees the same facts and only its own buttons.
export function ClaimDetails({ claim, audience, onChange }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [resellable, setResellable] = useState(true);
  const [note, setNote] = useState("");

  async function act(name, path, body) {
    setBusy(name);
    setError(null);
    try {
      onChange?.(await api(path, { method: "POST", body }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  const verdict = claim.verdict;
  const losses = claim.losses || {};
  return (
    <div className="space-y-3 rounded-lg p-4 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Claim</h3>
          <ClaimBadge status={claim.status} />
        </div>
        <span className="text-xs text-slate-400">{claim.id}</span>
      </div>
      <p className="text-sm">
        <span className="text-slate-500">{audience === "shopper" ? "You said" : "The shopper said"}: </span>“{claim.text}”
      </p>
      <p className="text-sm text-slate-700">
        {audience !== "shopper" && <span className="text-slate-500">Told the shopper: </span>}
        {claim.status_reason}
      </p>

      {verdict && (
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <p>
            <span className="text-slate-500">Claim judge ({claim.judge_model}): </span>
            <span className="font-medium">{VERDICTS[verdict.verdict] || verdict.verdict}</span>
            <span className="text-slate-500"> · {Math.round(verdict.confidence * 100)}% sure</span>
            {claim.reviewed_by === "admin" && <span className="text-slate-500"> · then decided by a person</span>}
          </p>
          <ul className="mt-1 list-disc pl-5 text-slate-700">
            {verdict.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          {verdict.new_information && (
            <p className="mt-2">
              <span className="text-slate-500">Known now, not at checkout: </span>
              <span className="font-mono text-xs">“{verdict.new_information}”</span>
            </p>
          )}
        </div>
      )}

      {claim.reimbursed != null && (
        <div className="text-sm">
          <p className="text-slate-500">The Protection Fund repaid PayMart through PayPal Payouts:</p>
          <ul className="mt-1">
            {Object.entries(losses)
              .filter(([, cents]) => cents)
              .map(([kind, cents]) => (
                <li key={kind} className="flex max-w-sm justify-between">
                  <span>{LOSSES[kind] || kind}</span>
                  <span className="tabular-nums">{money(cents)}</span>
                </li>
              ))}
            <li className="flex max-w-sm justify-between border-t border-slate-200 font-medium">
              <span>Paid</span>
              <span className="tabular-nums">{money(claim.reimbursed)}</span>
            </li>
          </ul>
          <p className="mt-1 text-xs text-slate-400">
            Payout {claim.payout_batch_id} · {claim.payout_status} · refund {claim.refund_id}
          </p>
        </div>
      )}

      {audience === "marketplace" && (claim.status === "APPROVED" || claim.status === "REFUNDED") && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-indigo-50 p-3">
          {claim.status === "APPROVED" && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!resellable} onChange={(e) => setResellable(!e.target.checked)} />
              Can't be resold
            </label>
          )}
          <Button disabled={!!busy} onClick={() => act("return", `/claims/${claim.id}/return-received`, { resellable })}>
            {busy
              ? "Refunding and reimbursing…"
              : claim.status === "APPROVED"
                ? "Return received: refund the shopper"
                : "Retry the fund's payout"}
          </Button>
        </div>
      )}

      {audience === "admin" && claim.status === "IN_REVIEW" && (
        <div className="space-y-2 rounded-lg bg-amber-50 p-3">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="w-full rounded-lg px-3 py-1.5 text-sm ring-1 ring-amber-300 focus:outline-none"
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="good" disabled={!!busy} onClick={() => act("yes", `/claims/${claim.id}/review`, { approve: true, note })}>
              Agent mistake: approve
            </Button>
            <Button variant="bad" disabled={!!busy} onClick={() => act("no", `/claims/${claim.id}/review`, { approve: false, note })}>
              Not covered: decline
            </Button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
