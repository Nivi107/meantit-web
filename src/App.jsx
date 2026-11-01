import { useEffect, useState } from "react";
import { API_URL, getHealth } from "./api.js";

const LABELS = {
  paypal_paymart: "PayPal (PayMart)",
  paypal_fund: "PayPal (Fund)",
  paypal_webhooks: "PayPal webhooks",
  database: "Database",
  anthropic: "Claude API",
};

export default function App() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getHealth().then(setHealth).catch((err) => setError(err.message));
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">MeantIt</h1>
          <p className="text-slate-500">Checkout guard for AI agent orders</p>
        </div>

        {!health && !error && (
          <p className="text-slate-500">
            Connecting to the backend… (the free server can take up to a minute to wake up)
          </p>
        )}

        {error && (
          <p className="text-red-600">
            Backend not reachable at {API_URL}: {error}
          </p>
        )}

        {health && (
          <>
            <p className="text-green-700 font-medium">Backend OK</p>
            <ul className="space-y-1">
              {Object.entries(health.configured).map(([key, ok]) => (
                <li key={key} className="flex justify-between">
                  <span>{LABELS[key] ?? key}</span>
                  <span className={ok ? "text-green-700" : "text-slate-400"}>
                    {ok ? "configured" : "not set"}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
