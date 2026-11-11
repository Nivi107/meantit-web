import { useEffect, useState } from "react";
import { api } from "../api.js";
import { AreaNav, Page } from "../components/Shell.jsx";
import { Button, Loading } from "../components/ui.jsx";
import { createKey, loadKey, publicJwk } from "../signing.js";
import { MyKey } from "./shopper/MyKey.jsx";
import { NewTask } from "./shopper/NewTask.jsx";
import { OrderList, OrderView } from "./shopper/Orders.jsx";
import { RunView } from "./shopper/RunView.jsx";

const USER_STORAGE = "meantit.user";

function savedUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_STORAGE));
  } catch {
    return null;
  }
}

export function forgetUser() {
  try {
    localStorage.removeItem(USER_STORAGE);
  } catch {
    // nothing stored
  }
}

export const waitingForYou = (o) => o.decision === "HOLD" && o.payment_status === "AUTHORIZED" && !o.resolution;

// The shopper's side: one tab to give the agent a task, one to watch it, one for orders and claims.
export default function Shopper({ route }) {
  const [user, setUser] = useState(savedUser);
  const [key, setKey] = useState(undefined); // undefined: still loading
  const [orders, setOrders] = useState(null);
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

  const refresh = () => {
    if (!user) return;
    const who = encodeURIComponent(user.id);
    api(`/orders?user_id=${who}`).then(setOrders).catch(() => setOrders((o) => o || []));
    api(`/claims?user_id=${who}`).then(setClaims).catch(() => {});
  };
  useEffect(refresh, [user]);

  const [tab, id] = route;
  const ready = key !== undefined;
  const signedIn = ready && user && key;
  const active = tab === "runs" ? "runs" : tab === "orders" ? "orders" : tab === "key" ? "key" : "new";
  const tabs = [
    ["new", "New task", "#/shopper"],
    ...(tab === "runs" ? [["runs", "Agent run", `#/shopper/runs/${id}`]] : []),
    ["orders", "Orders & claims", "#/shopper/orders", (orders || []).filter(waitingForYou).length],
    ["key", "My key", "#/shopper/key"],
  ];

  let content;
  if (!ready) content = <Loading />;
  else if (!signedIn) content = <Setup onDone={(u, k) => (setUser(u), setKey(k))} />;
  else if (tab === "runs") content = <RunView runId={id} user={user} onOrder={refresh} />;
  else if (tab === "orders" && id)
    content = <OrderView orderId={id} user={user} orders={orders} claims={claims} onChange={refresh} />;
  else if (tab === "orders") content = <OrderList orders={orders} claims={claims} />;
  else if (tab === "key") content = <MyKey user={user} keyPair={key} />;
  else content = <NewTask user={user} keyPair={key} />;

  return (
    <>
      <AreaNav
        name="Shopper"
        who={signedIn ? `Signed in as ${user.name} · key on this device` : "Set up your key to start"}
        tone="pass"
        tabs={signedIn ? tabs : []}
        active={active}
      />
      <Page>{content}</Page>
    </>
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
    <div className="mx-auto grid max-w-4xl gap-0 overflow-hidden rounded-xl border border-line md:grid-cols-2">
      <div className="space-y-5 bg-panel p-8">
        <p className="label">
          <span className="text-pass">Step 0</span> · Your signing key
        </p>
        <h1 className="text-3xl font-light leading-tight tracking-tight">
          Give your agent a <strong className="font-semibold text-white">permission slip</strong>, not your wallet.
        </h1>
        <p className="text-[15px] leading-relaxed text-dim">
          Your browser makes a signing key that never leaves this device. With it you sign two slips for your agent:
          what you want, and how much it may spend. MeantIt checks every order against them before PayPal charges you.
        </p>
        <label className="block">
          <span className="label">Your name</span>
          <input className="field mt-2" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <Button onClick={start} disabled={busy || !name.trim()}>
          {busy ? "Creating key…" : "Create my key"}
        </Button>
        {error && <p className="text-sm text-block">{error}</p>}
      </div>
      <div className="space-y-4 border-t border-line bg-panel2 p-8 text-sm leading-relaxed text-dim md:border-l md:border-t-0">
        <p className="label">What happens</p>
        {[
          ["01", "A P-256 key pair is created in this browser. The private half can't be copied out, even by us."],
          ["02", "Only the public half goes to MeantIt, so it can check your signature later."],
          ["03", "PayPal: the demo uses one saved sandbox account for everyone, so there's no PayPal login."],
        ].map(([n, text]) => (
          <p key={n} className="flex gap-3 border-t border-line pt-4">
            <span className="text-pass">{n}</span>
            <span>{text}</span>
          </p>
        ))}
      </div>
    </div>
  );
}
