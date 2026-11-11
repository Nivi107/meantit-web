import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Button, Tag, money } from "./ui.jsx";

export const CLAIM_STATUS = {
  WITH_PAYMART: { label: "Sent to PayMart", tone: "info" },
  STORE_RETURN: { label: "PayMart accepted: send it back", tone: "info" },
  STORE_REFUNDED: { label: "Refunded by PayMart", tone: "pass" },
  STORE_DECLINED: { label: "PayMart declined", tone: "quiet" },
  SENT_TO_FUND: { label: "Sent to MeantIt · waiting", tone: "info" },
  NOT_COVERED: { label: "Fund: not covered", tone: "quiet" },
  IN_REVIEW: { label: "Fund: a person is checking", tone: "hold" },
  DECLINED: { label: "Fund: declined", tone: "quiet" },
  APPROVED: { label: "Fund approved: send it back", tone: "info" },
  REFUNDED: { label: "Refunded", tone: "pass" },
  REIMBURSED: { label: "Refunded · PayMart repaid", tone: "pass" },
};

// Where PayMart can still take it back or say no: before the fund, or after the fund said no.
export const STORE_CAN_DECIDE = ["WITH_PAYMART", "NOT_COVERED", "DECLINED"];
const WAITING_FOR_RETURN = ["APPROVED", "STORE_RETURN"];

// The claim's road: shopper → PayMart → (Protection Fund) → refund. Each step is done, now, skipped or no.
function progress(status) {
  const fundNo = status === "NOT_COVERED" || status === "DECLINED";
  const table = {
    WITH_PAYMART: ["done", "now", "", ""],
    STORE_RETURN: ["done", "done", "skip", "now"],
    STORE_REFUNDED: ["done", "done", "skip", "done"],
    STORE_DECLINED: ["done", "no", "skip", "skip"],
    SENT_TO_FUND: ["done", "done", "now", ""],
    IN_REVIEW: ["done", "done", "now", ""],
    APPROVED: ["done", "done", "done", "now"],
    REFUNDED: ["done", "done", "done", "done"],
    REIMBURSED: ["done", "done", "done", "done"],
  };
  return fundNo ? ["done", "now", "no", ""] : table[status] || ["done", "", "", ""];
}

const STEP_NAMES = ["Reported", "PayMart", "Protection Fund", "Refund"];
const STEP_STYLE = {
  done: "border-pass text-pass",
  now: "border-info text-info",
  no: "border-block/60 text-block",
  skip: "border-line text-ghost line-through",
  "": "border-line text-ghost",
};

function ClaimProgress({ status }) {
  return (
    <ol className="grid grid-cols-4 gap-1">
      {progress(status).map((state, i) => (
        <li key={i} className={`border-t-2 pt-2 text-xs font-medium ${STEP_STYLE[state]}`}>
          {STEP_NAMES[i]}
          {state === "now" && <span className="ml-1 animate-pulse">●</span>}
        </li>
      ))}
    </ol>
  );
}

const VERDICTS = {
  AGENT_ERROR: "Agent mistake",
  CHANGED_MIND: "Changed mind",
  NOT_RECEIVED: "Not received (PayPal handles it)",
  SUSPICIOUS: "Suspicious",
};

const LOSSES = { return_shipping: "Return shipping", paypal_fee: "PayPal fee not returned", unsellable_item: "Item can't be resold" };

// Two ready-made problems for the demo: one the fund covers, one that's just a normal return.
const EXAMPLES = [
  "I have flat feet and these give me no support at all. The midsole is soft and flat, nothing like the listing. I can't run in them.",
  "I found the same shoes $20 cheaper at another shop. Nothing is wrong with them, I just want my money back instead.",
];

export function ClaimBadge({ status }) {
  const s = CLAIM_STATUS[status] || { label: status, tone: "quiet" };
  return <Tag tone={s.tone}>{s.label}</Tag>;
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
      <button
        className="w-full rounded-xl border border-dashed border-line2 px-4 py-3 text-left text-sm text-dim transition hover:border-info hover:text-ink"
        onClick={() => setOpen(true)}
      >
        Something wrong with what arrived? <span className="text-info">Report a problem to PayMart →</span>
      </button>
    );
  }
  return (
    <div className="space-y-3 rounded-xl border border-info/30 bg-info/[0.04] p-5">
      <p className="label !text-info">Report a problem · goes to PayMart</p>
      <p className="text-sm text-dim">
        PayMart reads it first and can take it back under its return policy. If they think your agent got it wrong on
        an order MeantIt approved, they send it to the MeantIt Protection Fund, which checks it against what you signed.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="field"
        placeholder="Tell us what arrived and what's wrong with it"
      />
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="label self-center">Try</span>
        {EXAMPLES.map((example, i) => (
          <button
            key={i}
            onClick={() => setText(example)}
            className="rounded-md border border-line2 px-2 py-1 text-left font-mono text-[11px] text-dim hover:border-info hover:text-ink"
          >
            {i === 0 ? "No support for flat feet" : "Found it cheaper"}
          </button>
        ))}
      </div>
      <Button onClick={send} disabled={busy || text.trim().length < 10}>
        {busy ? "Sending…" : "Send to PayMart"}
      </Button>
      {error && <p className="text-sm text-block">{error}</p>}
    </div>
  );
}

// audience: shopper, marketplace or admin. Each sees the same facts and only its own buttons.
export function ClaimDetails({ claim: given, audience, onChange }) {
  // The newest copy we know of: the parent's list can lag behind an answer this card already has.
  const [latest, setLatest] = useState(null);
  const claim = latest?.id === given.id && latest.updated_at > given.updated_at ? latest : given;
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [resellable, setResellable] = useState(true);
  const [note, setNote] = useState("");

  const decide = (action) => act(action, `/claims/${claim.id}/merchant`, { action, note });

  // MeantIt decides a handed-over claim on its own side; check back until it has.
  useEffect(() => {
    if (claim.status !== "SENT_TO_FUND") return;
    const t = setInterval(async () => {
      const answer = await api(`/claims/${claim.id}`).catch(() => null);
      if (answer && answer.status !== "SENT_TO_FUND") (setLatest(answer), onChange?.(answer));
    }, 2000);
    return () => clearInterval(t);
  }, [claim.id, claim.status]);

  async function act(name, path, body) {
    setBusy(name);
    setError(null);
    try {
      const answer = await api(path, { method: "POST", body });
      setLatest(answer);
      onChange?.(answer);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  const verdict = claim.verdict;
  const losses = claim.losses || {};
  return (
    <div className="space-y-4 rounded-xl border border-line bg-panel2 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <p className="label">Claim</p>
          <ClaimBadge status={claim.status} />
        </div>
        <span className="font-mono text-[11px] text-ghost">{claim.id}</span>
      </div>
      <ClaimProgress status={claim.status} />
      <p className="text-sm text-ink">
        <span className="text-dim">{audience === "shopper" ? "You said" : "The shopper said"}: </span>“{claim.text}”
      </p>
      <p className="border-l-2 border-line2 pl-3 text-sm text-dim">
        {audience !== "shopper" && <span className="text-ghost">Told the shopper: </span>}
        {claim.status_reason}
      </p>

      {/* The judge's reasoning is MeantIt's own record; PayMart and the shopper see only the outcome above. */}
      {audience === "admin" && verdict && (
        <div className="rounded-xl border border-line bg-navy/50 p-4 text-sm">
          <p className="font-mono text-[11px]">
            <span className="text-ghost">CLAIM JUDGE · {claim.judge_model} · </span>
            <span className="font-semibold text-ink">{VERDICTS[verdict.verdict] || verdict.verdict}</span>
            <span className="text-dim"> · {Math.round(verdict.confidence * 100)}% sure</span>
            {claim.reviewed_by === "admin" && <span className="text-admin"> · then decided by a person</span>}
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-dim">
            {verdict.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          {verdict.new_information && (
            <p className="mt-3 text-dim">
              <span className="text-ghost">Known now, not at checkout: </span>
              <span className="font-mono text-[11px] text-ink">“{verdict.new_information}”</span>
            </p>
          )}
        </div>
      )}

      {claim.reimbursed != null && (
        <div className="text-sm">
          <p className="label">The Protection Fund repaid PayMart · PayPal Payouts</p>
          <ul className="mt-1">
            {Object.entries(losses)
              .filter(([, cents]) => cents)
              .map(([kind, cents]) => (
                <li key={kind} className="flex max-w-sm justify-between py-0.5 text-dim">
                  <span>{LOSSES[kind] || kind}</span>
                  <span className="font-mono tabular-nums">{money(cents)}</span>
                </li>
              ))}
            <li className="mt-1 flex max-w-sm justify-between border-t border-line pt-1 font-medium text-pass">
              <span>Paid</span>
              <span className="font-mono tabular-nums">{money(claim.reimbursed)}</span>
            </li>
          </ul>
          <p className="mt-2 font-mono text-[11px] text-ghost">
            Payout {claim.payout_batch_id} · {claim.payout_status} · refund {claim.refund_id}
          </p>
        </div>
      )}

      {audience === "marketplace" && STORE_CAN_DECIDE.includes(claim.status) && (
        <div className="space-y-3 rounded-xl border border-info/30 bg-info/[0.05] p-4">
          <p className="text-sm text-ink">
            {claim.status === "WITH_PAYMART"
              ? "Your call. Take it back under your own policy, say no, or, if the agent got it wrong on an order MeantIt approved, send it to the Protection Fund."
              : "The fund won't cover it. You can still take it back under your own policy, or say no."}
          </p>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note to the shopper (optional)" className="field" />
          <div className="flex flex-wrap gap-2">
            {claim.status === "WITH_PAYMART" && (
              <Button disabled={!!busy} onClick={() => decide("send_to_fund")}>
                {busy === "send_to_fund" ? "Sending to MeantIt…" : "Send to Protection Fund"}
              </Button>
            )}
            <Button variant="secondary" disabled={!!busy} onClick={() => decide("accept_return")}>
              {busy === "accept_return" ? "Accepting…" : "Accept return · our policy"}
            </Button>
            <Button variant="bad" disabled={!!busy} onClick={() => decide("decline")}>
              {busy === "decline" ? "Declining…" : "Decline"}
            </Button>
          </div>
        </div>
      )}

      {audience === "marketplace" && (WAITING_FOR_RETURN.includes(claim.status) || claim.status === "REFUNDED") && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-info/30 bg-info/[0.05] p-4">
          {claim.status === "APPROVED" && (
            <label className="flex items-center gap-2 text-sm text-dim">
              <input type="checkbox" checked={!resellable} onChange={(e) => setResellable(!e.target.checked)} />
              Can't be resold
            </label>
          )}
          <Button disabled={!!busy} onClick={() => act("return", `/claims/${claim.id}/return-received`, { resellable })}>
            {busy
              ? claim.status === "STORE_RETURN"
                ? "Refunding…"
                : "Refunding and reimbursing…"
              : WAITING_FOR_RETURN.includes(claim.status)
                ? "Return received: refund the shopper"
                : "Retry the fund's payout"}
          </Button>
        </div>
      )}

      {audience !== "admin" && claim.status === "SENT_TO_FUND" && (
        <p className="flex items-center gap-2 text-sm text-dim">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-info" /> MeantIt is checking it. Its answer appears
          here.
        </p>
      )}

      {audience === "admin" && ["IN_REVIEW", "SENT_TO_FUND"].includes(claim.status) && (
        <div className="space-y-3 rounded-xl border border-admin/30 bg-admin/[0.05] p-4">
          {claim.status === "SENT_TO_FUND" && (
            <p className="text-sm text-dim">The claim judge is still reading this. If it doesn't answer, decide it yourself.</p>
          )}
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for the record (optional)" className="field" />
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
      {error && <p className="text-sm text-block">{error}</p>}
    </div>
  );
}
