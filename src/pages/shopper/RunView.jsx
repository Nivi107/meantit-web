import { useEffect, useRef, useState } from "react";
import { api } from "../../api.js";
import AgentSteps from "../../components/AgentSteps.jsx";
import OrderCard from "../../components/OrderCard.jsx";
import { Collapsible, ErrorNote, Json, Loading, PageHeader, Panel, Tag, money } from "../../components/ui.jsx";
import { readJwt } from "../../signing.js";
import { AGENTS } from "./NewTask.jsx";

// The slips signed for a run, so its page can show them. This tab only; the order's evidence has them too.
const slipsKey = (runId) => `meantit.slips.${runId}`;

export function rememberSlips(runId, slips) {
  try {
    sessionStorage.setItem(slipsKey(runId), JSON.stringify(slips));
  } catch {
    // not shown later, that's all
  }
}

function recallSlips(runId) {
  try {
    return JSON.parse(sessionStorage.getItem(slipsKey(runId)));
  } catch {
    return null;
  }
}

export function RunView({ runId, user, onOrder }) {
  const [run, setRun] = useState(null);
  const [error, setError] = useState(null);
  const timer = useRef(null);
  // A run started in this tab plays out step by step; an old one opens finished.
  const [fresh] = useState(() => recallSlips(runId) !== null);
  const slips = recallSlips(runId);

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const latest = await api(`/agent/runs/${runId}`);
        if (!alive) return;
        setRun(latest);
        if (latest.status === "running") timer.current = setTimeout(poll, 1000);
        else onOrder?.();
      } catch (err) {
        if (alive) setError(err.message);
      }
    }
    poll();
    return () => {
      alive = false;
      clearTimeout(timer.current);
    };
  }, [runId]);

  const all = run?.steps || [];
  const revealed = useRevealed(all, fresh);
  const stillShowing = revealed.length < all.length;
  const running = run?.status === "running";
  const agent = AGENTS.find((a) => a.mode === run?.mode);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!run) return <Loading>Connecting to your agent…</Loading>;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Agent run · ${runId}`}
        title={<>“{run.request}”</>}
        right={
          <div className="flex flex-wrap gap-2">
            {agent && <Tag tone="info">Scene {agent.scene} · {agent.title}</Tag>}
            {run.replayed && <Tag>Replay of a saved run</Tag>}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Panel
          title="Agent activity"
          right={
            running || stillShowing ? (
              <span className="flex items-center gap-2 text-xs font-medium text-info">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-info" /> Live
              </span>
            ) : (
              <span className="text-xs font-medium text-ghost">{all.length} steps</span>
            )
          }
          bodyClassName=""
          className="lg:self-start"
        >
          <AgentSteps steps={revealed} running={running || stillShowing} />
        </Panel>

        <div className="space-y-4">
          {stillShowing || (running && !run.order) ? (
            <Waiting checking={all.at(-1)?.kind === "submit" && !stillShowing} />
          ) : run.order ? (
            <OrderCard order={run.order} userId={user.id} onChange={(o) => (setRun({ ...run, order: o }), onOrder?.())} />
          ) : (
            <Panel title="MeantIt decision">
              <p className={run.status === "failed" ? "text-block" : "text-hold"}>{run.error || "The run ended without an order."}</p>
              <a href="#/shopper" className="link mt-3 inline-block text-sm">
                Try another task →
              </a>
            </Panel>
          )}
          {!stillShowing && run.order && (
            <div className="flex flex-wrap gap-4 text-sm">
              <a href={`#/shopper/orders/${run.order.id}`} className="link">
                Open in your orders (claims live there) →
              </a>
              <a href="#/shopper" className="text-dim hover:text-ink">
                New task
              </a>
            </div>
          )}
          <SignedSlips slips={slips} />
        </div>
      </div>
    </div>
  );
}

function Waiting({ checking }) {
  return (
    <Panel title="MeantIt decision">
      <div className="flex items-center gap-4 py-6">
        <span className={`h-2.5 w-2.5 animate-pulse rounded-full ${checking ? "bg-info" : "bg-ghost"}`} />
        <div>
          <p className="text-ink">{checking ? "MeantIt is checking the order…" : "Waiting for the agent to check out…"}</p>
          <p className="text-sm text-dim">
            {checking
              ? "PayPal is holding the money meanwhile. Nothing is charged until the check passes."
              : "Nothing has been held or charged yet."}
          </p>
        </div>
      </div>
    </Panel>
  );
}

function SignedSlips({ slips }) {
  if (!slips) return null;
  const moneySlip = readJwt(slips.money);
  const max = moneySlip.constraints.find((c) => c.type === "payment.amount_range")?.max;
  return (
    <Collapsible title="What you signed">
      <p className="text-sm text-dim">
        Both slips name your agent's key, so only that agent can use them. Amounts are in cents, like PayPal's:{" "}
        <code className="font-mono text-ghost">"max": {max}</code> means up to {money(max)}.
      </p>
      <Json value={{ shopping_slip: readJwt(slips.shopping), money_slip: moneySlip }} />
    </Collapsible>
  );
}

// Show steps one by one, so a saved run that arrives all at once still reads like an agent working.
function useRevealed(steps, animate) {
  const [count, setCount] = useState(animate ? 0 : Infinity);
  useEffect(() => {
    if (count >= steps.length) return;
    const t = setTimeout(() => setCount((c) => c + 1), 450);
    return () => clearTimeout(t);
  }, [count, steps.length]);
  return steps.slice(0, count);
}
