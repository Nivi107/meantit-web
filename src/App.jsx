import { Suspense, lazy } from "react";
import { useRoute } from "./router.js";
import { Footer, Header, Page } from "./components/Shell.jsx";
import { Loading } from "./components/ui.jsx";
import Home from "./pages/Home.jsx";
import Shopper from "./pages/Shopper.jsx";
import Store from "./pages/Store.jsx";

// AG Grid is big; only load it when someone opens the merchant or admin console.
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Admin = lazy(() => import("./pages/Admin.jsx"));

export default function App() {
  const [page, ...rest] = useRoute();

  let content;
  if (page === "shopper") content = <Shopper route={rest} />;
  else if (page === "store") content = <Store productId={rest[0]} />;
  else if (page === "dashboard") content = <Dashboard route={rest} />;
  else if (page === "admin") content = <Admin route={rest} />;
  else content = <Home />;

  return (
    <div className="min-h-screen">
      <Header page={page} />
      <Suspense
        fallback={
          <Page>
            <Loading>Loading the console…</Loading>
          </Page>
        }
      >
        {content}
      </Suspense>
      <Footer />
    </div>
  );
}
