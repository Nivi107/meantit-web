import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import AgentSteps from "../components/AgentSteps.jsx";
import { ClaimBadge, ClaimBox } from "../components/Claim.jsx";
import OrderCard from "../components/OrderCard.jsx";
import { Button, Card, Collapsible, DecisionBadge, Json, money } from "../components/ui.jsx";
import { createKey, loadKey, moneySlip, publicJwk, readJwt, shoppingSlip, signJwt } from "../signing.js";

const USER_STORAGE = "meantit.user";
const DEFAULT_REQUEST = "Buy one pair of running shoes for flat feet, size US 9, under $150, delivered by Friday";

const AGENTS = [
  {
    mode: "careful",
    scene: "Scene 1",
    title: "A careful agent",
    who: "Claude Haiku",
    text: "Reads each product page and treats what it finds as information, never as orders.",
  },
  {
    mode: "naive",
    scene: "Scene 2",
    title: "A tricked agent",
    who: "Simple scraper, no AI",
    text: "Obeys any note for AI assistants it finds on a page, even hidden ones. (Claude refused to.)",
  },
  {
    mode: "skim",
    scene: "Scene 3",
    title: "A careless agent",
    who: "Claude Haiku",
    text: "Never opens product pages and buys the cheapest shoe in your size.",
  },
];

function savedUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_STORAGE));
  } catch {
    return null;
  }
}

export default function Shopper() {
  const [user, setUser] = useState(savedUser);
  const [key, setKey] = useState(undefined); // undefined: still loading
  const [orders, setOrders] = useState([]);
  const [claims, setClaims] = useState([]);

  useEffect(() => {
    loadKey().then((k) => setKey(k || null));
  }, []);

  // If the backend lost this user (fresh database), register the same public key again.
  useEffect(() => {
    if (!user || !key) return;
    api(`/users/${user.id}`).catch(async () => {
      await api(`/users/${user.id}/keys`, { method: "POST", body: { name: user.name, public_jwk: await publicJwk(key) } });
    });
  }, [user, key]);

  const refreshOrders = () => {
    if (!user) return;
    const who = encodeURIComponent(user.id);
    api(`/orders?user_id=${who}`).then(setOrders).catch(() => {});
    api(`/claims?user_id=${who}`).then(setClaims).catch(() => {});
  };
  useEffect(refreshOrders, [user]);

  if (key === undefined) return <p className="text-slate-500">Loading…</p>;
  if (!user || !key) return <Setup onDone={(u, k) => (setUser(u), setKey(k))} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Hi {user.name}</h1>
          <p className="text-slate-500">Tell your agent what you want. MeantIt checks the order before PayPal charges you.</p>
        </div>
        <p className="text-xs text-slate-400">Signing key on this device · PayPal sandbox account connected</p>
      </div>
      <AskAgent user={user} keyPair={key} onFinished={refreshOrders} />
      <Orders orders={orders} claims={claims} userId={user.id} onChange={refreshOrders} />
    </div>
  );
}

function Setup({ onDone }) {
  const [name, setName] = useState("Demo Shopper");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const pair = await createKey();
      const id = "shopper-" + crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
      await api(`/users/${id}/keys`, { method: "POST", body: { name, public_jwk: await publicJwk(pair) } });
      const user = { id, name };
      try {
        localStorage.setItem(USER_STORAGE, JSON.stringify(user));
      } catch {
        // this tab only
      }
      onDone(user, pair);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">Set up your agent's permission slip</h1>
      <p className="text-slate-600">
        Your browser makes a signing key that never leaves this device. You use it to sign two slips for your agent:
        <b> what you want</b> and <b>how much it may spend</b>. MeantIt checks every order against them.
      </p>
      <label className="block text-sm font-medium">
        Your name
        <input
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <Button onClick={start} disabled={busy || !name.trim()}>
        {busy ? "Creating key…" : "Create my key"}
      </Button>
      <p className="text-xs text-slate-500">
        PayPal: this demo uses one saved PayPal sandbox account for everyone, so there's no PayPal login.
      </p>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </Card>
  );
}

function AskAgent({ user, keyPair, onFinished }) {
  const [request, setRequest] = useState(DEFAULT_REQUEST);
  const [budget, setBudget] = useState(150);
  const [mode, setMode] = useState("careful");
  const [phase, setPhase] = useState("idle"); // idle, signing, running, done
  const [signed, setSigned] = useState(null);
  const [run, setRun] = useState(null);
  const [error, setError] = useState(null);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function send() {
    clearTimeout(timer.current);
    setError(null);
    setRun(null);
    setPhase("signing");
    try {
      const [{ public_jwk: agentKey }, marketplace] = await Promise.all([api("/agent/key"), api("/store/marketplace")]);
      const shopping = await signJwt(shoppingSlip(agentKey, request.trim(), marketplace), keyPair);
      const money = await signJwt(moneySlip(agentKey, Math.round(budget * 100)), keyPair);
      setSigned({ shopping, money });
      setPhase("running");
      const started = await api("/agent/runs", {
        method: "POST",
        body: { user_id: user.id, shopping_slip: shopping, money_slip: money, mode },
      });
      poll(started.id);
    } catch (err) {
      setError(err.message);
      setPhase("idle");
    }
  }

  async function poll(runId) {
    try {
      const latest = await api(`/agent/runs/${runId}`);
      setRun(latest);
      if (latest.status === "running") {
        timer.current = setTimeout(() => poll(runId), 1000);
      } else {
        setPhase("done");
        onFinished();
      }
    } catch (err) {
      setError(err.message);
      setPhase("done");
    }
  }

  const busy = phase === "signing" || phase === "running";
  const steps = useRevealed(run?.steps || []);
  const stillShowing = steps.length < (run?.steps?.length || 0);
  const lastKind = run?.steps?.at(-1)?.kind;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Ask your agent</h2>
        <label className="block text-sm font-medium">
          What do you want?
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            rows={3}
            value={request}
            onChange={(e) => setRequest(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium">
          Most it may spend (USD)
          <input
            type="number"
            min="1"
            className="mt-1 w-32 rounded-lg border border-slate-300 px-3 py-2"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
          />
        </label>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Which agent shops for you?</legend>
          {AGENTS.map((a) => (
            <label
              key={a.mode}
              className={`flex cursor-pointer gap-3 rounded-lg p-3 ring-1 ${
                mode === a.mode ? "bg-indigo-50 ring-indigo-400" : "ring-slate-200 hover:bg-slate-50"
              }`}
            >
              <input type="radio" name="agent" checked={mode === a.mode} onChange={() => setMode(a.mode)} />
              <span className="text-sm">
                <span className="font-medium">{a.title}</span>{" "}
                <span className="text-slate-400">
                  · {a.who} · {a.scene}
                </span>
                <span className="block text-slate-600">{a.text}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <Button onClick={send} disabled={busy || !request.trim() || !(budget > 0)}>
          {phase === "signing" ? "Signing…" : phase === "running" ? "Agent is shopping…" : "Sign and send to my agent"}
        </Button>
        {error && <p className="text-sm text-red-700">{error}</p>}
        {signed && (
          <Collapsible title="What you signed">
            <p className="text-sm text-slate-600">
              Both slips name your agent's key, so only that agent can use them. Your key signed them in this browser.
            </p>
            <Json value={{ shopping_slip: readJwt(signed.shopping), money_slip: readJwt(signed.money) }} />
          </Collapsible>
        )}
      </Card>

      <div className="space-y-4">
        {run || phase === "running" ? (
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your agent at work</h2>
              {run?.replayed && <span className="text-xs text-slate-400">replay of a saved run</span>}
            </div>
            <AgentSteps steps={steps} running={phase === "running" || stillShowing} />
            {phase === "running" && lastKind === "submit" && !stillShowing && (
              <p className="text-sm font-medium text-indigo-700">
                MeantIt is checking the order. PayPal is holding the money meanwhile…
              </p>
            )}
            {run?.error && !stillShowing && <p className="text-sm text-amber-800">{run.error}</p>}
          </Card>
        ) : (
          <Card className="text-sm text-slate-500">
            Your agent's steps and MeantIt's decision will show up here.
          </Card>
        )}
        {run?.order && !stillShowing && <OrderCard order={run.order} userId={user.id} onChange={(o) => (setRun({ ...run, order: o }), onFinished())} />}
      </div>
    </div>
  );
}

// Show steps one by one, so a saved run that arrives all at once still reads like an agent working.
function useRevealed(steps) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (steps.length < count) setCount(0);
  }, [steps.length]);
  useEffect(() => {
    if (count >= steps.length) return;
    const t = setTimeout(() => setCount((c) => c + 1), 450);
    return () => clearTimeout(t);
  }, [count, steps.length]);
  return steps.slice(0, count);
}

function Orders({ orders, claims, userId, onChange }) {
  const [open, setOpen] = useState(null);
  const claimFor = Object.fromEntries(claims.map((c) => [c.order_id, c]));
  if (!orders.length) return null;
  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold">Your orders</h2>
      <ul className="divide-y divide-slate-100">
        {orders.map((order) => (
          <li key={order.id} className="py-3">
            <button className="flex w-full flex-wrap items-center gap-3 text-left" onClick={() => setOpen(open === order.id ? null : order.id)}>
              <DecisionBadge decision={order.decision} />
              <span className="font-medium">{order.items.map((i) => i.title).join(", ") || "—"}</span>
              <span className="text-slate-500">{money(order.total, order.currency || "USD")}</span>
              {claimFor[order.id] && <ClaimBadge status={claimFor[order.id].status} />}
              <span className="ml-auto text-xs text-slate-400">{new Date(order.created_at).toLocaleString()}</span>
            </button>
            {open === order.id && (
              <div className="mt-3">
                <OrderCard
                  order={order}
                  userId={userId}
                  onChange={onChange}
                  footer={<ClaimBox order={order} claim={claimFor[order.id]} userId={userId} onChange={onChange} />}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
