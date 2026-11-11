import { useEffect, useState } from "react";
import { API_URL, getHealth } from "../api.js";
import { Page } from "../components/Shell.jsx";
import { ErrorNote, Loading, PageHeader, Panel } from "../components/ui.jsx";

const LABELS = {
  paypal_paymart: "PayPal (PayMart)",
  paypal_fund: "PayPal (Protection Fund)",
  paypal_webhooks: "PayPal webhooks",
  signing_keys: "Signing keys",
  database: "Database",
  anthropic: "Claude API",
};

export default function Status() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getHealth().then(setHealth).catch((err) => setError(err.message));
  }, []);

  return (
    <Page className="max-w-2xl">
      <div className="space-y-8">
        <PageHeader eyebrow="System / Status" title="Is everything connected?">
          The free server sleeps when idle, so the first check can take up to a minute.
        </PageHeader>
        <Panel title="Backend" right={<span className="font-mono text-[10px] text-ghost">{API_URL}</span>} bodyClassName="">
          {!health && !error && (
            <div className="p-5">
              <Loading>Connecting to the backend…</Loading>
            </div>
          )}
          {error && (
            <div className="p-5">
              <ErrorNote>Backend not reachable: {error}</ErrorNote>
            </div>
          )}
          {health && (
            <ul className="divide-y divide-line">
              {Object.entries(health.configured).map(([key, ok]) => (
                <li key={key} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span className="text-ink">{LABELS[key] ?? key}</span>
                  <span className={`flex items-center gap-2 text-xs font-medium ${ok ? "text-pass" : "text-ghost"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-pass" : "bg-ghost"}`} />
                    {ok ? "Configured" : "Not set"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </Page>
  );
}
