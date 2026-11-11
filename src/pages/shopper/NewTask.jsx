import { useState } from "react";
import { api } from "../../api.js";
import { Button, ErrorNote, PageHeader, Panel, Tag, money } from "../../components/ui.jsx";
import { moneySlip, shoppingSlip, signJwt } from "../../signing.js";
import { rememberSlips } from "./RunView.jsx";

const DEFAULT_REQUEST = "Buy one pair of running shoes for flat feet, size US 9, under $150, delivered within a week";

export const AGENTS = [
  {
    mode: "careful",
    scene: "01",
    title: "A careful agent",
    who: "Claude Haiku",
    text: "Reads each product page and treats what it finds as information, never as orders.",
    expect: ["pass", "Expect: approved"],
  },
  {
    mode: "naive",
    scene: "02",
    title: "A tricked agent",
    who: "Simple scraper, no AI",
    text: "Obeys any note for AI assistants it finds on a page, even hidden ones. (Claude refused to.)",
    expect: ["block", "Expect: blocked"],
  },
  {
    mode: "skim",
    scene: "03",
    title: "A careless agent",
    who: "Claude Haiku",
    text: "Never opens product pages and buys the cheapest shoe in your size.",
    expect: ["hold", "Expect: held for you"],
  },
];

export function NewTask({ user, keyPair }) {
  const [request, setRequest] = useState(DEFAULT_REQUEST);
  const [budget, setBudget] = useState(150);
  const [mode, setMode] = useState("careful");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const [{ public_jwk: agentKey }, marketplace] = await Promise.all([api("/agent/key"), api("/store/marketplace")]);
      const shopping = await signJwt(shoppingSlip(agentKey, request.trim(), marketplace), keyPair);
      const money = await signJwt(moneySlip(agentKey, Math.round(budget * 100)), keyPair);
      const run = await api("/agent/runs", {
        method: "POST",
        body: { user_id: user.id, shopping_slip: shopping, money_slip: money, mode },
      });
      rememberSlips(run.id, { shopping, money });
      window.location.hash = `#/shopper/runs/${run.id}`;
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  const cents = Math.round((budget || 0) * 100);
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="New task" title={<>What should your agent buy, <strong className="font-semibold text-white">{user.name}</strong>?</>}>
        Write it the way you'd tell a person. You sign it, the agent shops, and MeantIt checks the order before PayPal
        charges you.
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Panel title="Your request">
            <div className="space-y-5">
              <label className="block">
                <span className="label">What do you want?</span>
                <textarea className="field mt-2 text-[15px]" rows={3} value={request} onChange={(e) => setRequest(e.target.value)} />
              </label>
              <label className="block">
                <span className="label">Most it may spend</span>
                <div className="mt-2 flex items-center gap-3">
                  <span className="font-mono text-dim">$</span>
                  <input
                    type="number"
                    min="1"
                    className="field w-32 font-mono"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                  />
                  <span className="text-xs text-ghost">A hard limit. MeantIt blocks any cart over it.</span>
                </div>
              </label>
            </div>
          </Panel>

          <Panel title="Which agent shops for you?" right={<span className="font-mono text-[10px] text-ghost">3 DEMO SCENES</span>}>
            <div className="grid gap-3 md:grid-cols-3" role="radiogroup">
              {AGENTS.map((a) => (
                <label
                  key={a.mode}
                  className={`flex cursor-pointer flex-col gap-3 rounded-xl border p-4 transition ${
                    mode === a.mode ? "border-pass bg-pass/[0.06]" : "border-line hover:border-line2 hover:bg-white/[0.02]"
                  }`}
                >
                  <input type="radio" name="agent" className="sr-only" checked={mode === a.mode} onChange={() => setMode(a.mode)} />
                  <span className="flex items-center justify-between">
                    <span className={`font-mono text-[11px] ${mode === a.mode ? "text-pass" : "text-ghost"}`}>SCENE {a.scene}</span>
                    <span
                      className={`h-3 w-3 rounded-full border ${mode === a.mode ? "border-pass bg-pass" : "border-line2"}`}
                      aria-hidden
                    />
                  </span>
                  <span>
                    <span className="block font-medium text-ink">{a.title}</span>
                    <span className="font-mono text-[11px] text-ghost">{a.who}</span>
                  </span>
                  <span className="flex-1 text-sm leading-relaxed text-dim">{a.text}</span>
                  <Tag tone={a.expect[0]}>{a.expect[1]}</Tag>
                </label>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Panel title="You're about to sign">
            <ol className="space-y-4 text-sm">
              <li className="space-y-1">
                <p className="font-mono text-[11px] text-pass">SLIP 1 · WHAT YOU WANT</p>
                <p className="text-ink">“{request.trim() || "…"}”</p>
                <p className="text-xs text-dim">Only at PayMart · valid 3 days · only your agent can use it</p>
              </li>
              <li className="space-y-1 border-t border-line pt-4">
                <p className="font-mono text-[11px] text-pass">SLIP 2 · HOW MUCH IT MAY SPEND</p>
                <p className="font-mono text-2xl font-semibold text-ink">{money(cents)}</p>
                <p className="text-xs text-dim">
                  Written in cents, like PayPal: <code className="font-mono text-ghost">"max": {cents}</code>
                </p>
              </li>
            </ol>
          </Panel>
          <Button className="w-full !py-3.5" onClick={send} disabled={busy || !request.trim() || !(budget > 0)}>
            {busy ? "Signing and sending…" : "Sign and send to my agent →"}
          </Button>
          <p className="text-center text-xs text-ghost">Your key signs in this browser. Nothing is charged yet.</p>
          {error && <ErrorNote>{error}</ErrorNote>}
        </div>
      </div>
    </div>
  );
}
