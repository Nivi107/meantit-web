import { Suspense, lazy } from "react";
import { useRoute } from "./router.js";
import { Card } from "./components/ui.jsx";
import Home from "./pages/Home.jsx";
import Shopper from "./pages/Shopper.jsx";
import Status from "./pages/Status.jsx";
import Store from "./pages/Store.jsx";

// AG Grid is big; only load it when someone opens the dashboard.
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Admin = lazy(() => import("./pages/Admin.jsx"));

const NAV = [
  ["shopper", "Shop with an agent"],
  ["store", "PayMart"],
  ["dashboard", "Dashboard"],
  ["admin", "Admin"],
  ["status", "Status"],
];

export default function App() {
  const [page, arg] = useRoute();

  let content;
  if (page === "shopper") content = <Shopper />;
  else if (page === "store") content = <Store productId={arg} />;
  else if (page === "status") content = <Status />;
  else if (page === "admin")
    content = (
      <Suspense fallback={<Card>Loading the admin page…</Card>}>
        <Admin />
      </Suspense>
    );
  else if (page === "dashboard") content = (
      <Suspense fallback={<Card>Loading the dashboard…</Card>}>
        <Dashboard orderId={arg} />
      </Suspense>
    );
  else content = <Home />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <a href="#/" className="text-lg font-bold text-indigo-700">
            MeantIt
          </a>
          {NAV.map(([key, label]) => (
            <a
              key={key}
              href={`#/${key}`}
              className={`text-sm ${page === key ? "font-semibold text-slate-900" : "text-slate-500 hover:text-slate-800"}`}
            >
              {label}
            </a>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{content}</main>
    </div>
  );
}
