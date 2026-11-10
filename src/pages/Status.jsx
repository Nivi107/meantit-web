import { useEffect, useState } from "react";
import { API_URL, getHealth } from "../api.js";
import { Card } from "../components/ui.jsx";

const LABELS = {
  paypal_paymart: "PayPal (PayMart)",
  paypal_fund: "PayPal (Fund)",
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
    <Card className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-semibold">System status</h1>
      {!health && !error && <p className="text-slate-500">Connecting to the backend…</p>}
      {error && (
        <p className="text-red-600">
          Backend not reachable at {API_URL}: {error}
        </p>
      )}
      {health && (
        <ul className="space-y-1">
          {Object.entries(health.configured).map(([key, ok]) => (
            <li key={key} className="flex justify-between">
              <span>{LABELS[key] ?? key}</span>
              <span className={ok ? "text-green-700" : "text-slate-400"}>{ok ? "configured" : "not set"}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
