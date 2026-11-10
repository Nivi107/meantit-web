import { useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { api } from "../api.js";
import { ClaimDetails } from "../components/Claim.jsx";
import OrderCard from "../components/OrderCard.jsx";
import { Button, Card, DecisionBadge, money } from "../components/ui.jsx";
import { theme, usePolling } from "../grid.js";
import { checkEvidence } from "../verify.js";

const PAYPAL = {
  CAPTURED: "Captured",
  AUTHORIZED: "On hold",
  VOIDED: "Hold released",
  REFUNDED: "Refunded",
  NONE: "Never held",
  CREATED: "Starting",
  FAILED: "Hold failed",
};

const ANSWERS = { APPROVED: "Approved", REJECTED: "Said no", EXPIRED: "No answer" };
const AGENTS = { careful: "Careful (Claude)", naive: "Tricked (scraper)", skim: "Careless (Claude)" };

const FILTERS = [
  ["ALL", "All"],
  ["ALLOW", "Approved"],
  ["HOLD", "Held"],
  ["BLOCK", "Blocked"],
];

const REASONS = {
  MANDATE_INVALID: "Bad signature",
  LIMIT_EXCEEDED: "Over limit",
  AGENT_MANIPULATED: "Agent manipulated",
  INJECTION_SUSPECTED: "Hidden instruction",
  INJECTION_IGNORED: "Hidden instruction ignored",
  INTENT_MISMATCH: "Not what they asked",
  INTENT_UNCLEAR: "Unclear fit",
  SELLER_RISK: "Seller risk",
  CHECK_UNAVAILABLE: "Check unavailable",
};
const reasonText = (codes) => codes.map((c) => `${REASONS[c] || c} ${c}`).join(" ");

const waiting = (o) => o.decision === "HOLD" && o.payment_status === "AUTHORIZED" && !o.resolution;
const stopped = (o) => o.payment_status === "VOIDED" || (o.decision === "BLOCK" && o.payment_status === "NONE");
const injected = (o) => o.reason_codes.some((c) => c === "AGENT_MANIPULATED" || c === "INJECTION_SUSPECTED");

function DecisionCell({ value }) {
  return <DecisionBadge decision={value} short />;
}

function ReasonsCell({ value }) {
  if (!value?.length) return <span className="text-slate-400">none</span>;
  return (
    <span className="flex flex-wrap gap-1 py-2 leading-none">
      {value.map((code) => (
        <span key={code} title={code} className="rounded bg-slate-100 px-1.5 py-1 text-xs text-slate-700">
          {REASONS[code] || code}
        </span>
      ))}
    </span>
  );
}

const COLUMNS = [
  {
    field: "created_at",
    headerName: "When",
    width: 150,
    sort: "desc",
    valueFormatter: (p) => new Date(p.value).toLocaleString([], { dateStyle: "short", timeStyle: "short" }),
    filter: "agDateColumnFilter",
    filterValueGetter: (p) => new Date(p.data.created_at),
  },
  { field: "decision", headerName: "Decision", width: 125, cellRenderer: DecisionCell },
  {
    field: "reason_codes",
    headerName: "Why",
    width: 230,
    cellRenderer: ReasonsCell,
    autoHeight: true,
    valueFormatter: (p) => p.value.join(" "),
    filterValueGetter: (p) => reasonText(p.data.reason_codes),
    getQuickFilterText: (p) => reasonText(p.data.reason_codes),
  },
  { field: "intent", headerName: "Shopper asked for", flex: 2, minWidth: 240, tooltip: true },
  {
    colId: "cart",
    headerName: "Agent's cart",
    flex: 1.4,
    minWidth: 200,
    valueGetter: (p) => p.data.items.map((i) => `${i.qty}× ${i.title}`).join(", "),
    tooltip: true,
  },
  { colId: "seller", headerName: "Seller", width: 160, valueGetter: (p) => p.data.seller.name },
  {
    field: "total",
    headerName: "Total",
    width: 110,
    type: "rightAligned",
    filter: "agNumberColumnFilter",
    valueGetter: (p) => (p.data.total ?? 0) / 100,
    valueFormatter: (p) => money(p.value * 100, p.data.currency),
  },
  { field: "payment_status", headerName: "PayPal", width: 130, valueFormatter: (p) => PAYPAL[p.value] || p.value },
  { field: "resolution", headerName: "Shopper's answer", width: 150,
    valueFormatter: (p) => ANSWERS[p.value] || (waiting(p.data) ? "Waiting" : "") },
  { field: "demo_agent", headerName: "Demo agent", width: 160, valueFormatter: (p) => AGENTS[p.value] || "Other" },
  { field: "id", headerName: "Order", width: 150, cellClass: "font-mono text-[12px]" },
];

export default function Dashboard({ orderId }) {
  const [orders, error] = usePolling("/dashboard/orders"); // held orders change when the shopper answers
  const [claims, , reloadClaims] = usePolling("/claims");
  const [decision, setDecision] = useState("ALL");
  const [search, setSearch] = useState("");
  const grid = useRef(null);

  const rows = useMemo(
    () => (orders || []).filter((o) => decision === "ALL" || o.decision === decision),
    [orders, decision],
  );
  const selected = orders?.find((o) => o.id === orderId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">PayMart · agent orders</h1>
        <p className="text-slate-500">
          Every order an AI agent placed, what MeantIt decided, and why. Click a row for the evidence.
        </p>
      </div>

      {error && <Card className="text-red-700">Couldn't load orders: {error}</Card>}
      {orders && <Tiles orders={orders} />}

      <Card className="space-y-3 !p-3 sm:!p-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg ring-1 ring-slate-300" role="group" aria-label="Decision">
            {FILTERS.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setDecision(key)}
                className={`px-3 py-1.5 text-sm first:rounded-l-lg last:rounded-r-lg ${
                  decision === key ? "bg-indigo-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {label}
                {orders && key !== "ALL" && ` ${orders.filter((o) => o.decision === key).length}`}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search words, products, reasons…"
            className="min-w-0 flex-1 rounded-lg px-3 py-1.5 text-sm ring-1 ring-slate-300 focus:outline-none focus:ring-indigo-500"
          />
          <Button
            variant="secondary"
            className="!py-1.5"
            onClick={() => grid.current?.api.exportDataAsCsv({ fileName: "paymart-agent-orders.csv" })}
          >
            Export CSV
          </Button>
        </div>
        <div style={{ height: 480 }}>
          <AgGridReact
            ref={grid}
            theme={theme}
            rowData={rows}
            columnDefs={COLUMNS}
            defaultColDef={{ filter: true, resizable: true, sortable: true }}
            getRowId={(p) => p.data.id}
            quickFilterText={search}
            loading={!orders && !error}
            overlayNoRowsTemplate="No agent orders yet. Place one from “Shop with an agent”."
            rowClassRules={{ "!bg-indigo-50": (p) => p.data.id === orderId }}
            onRowClicked={(e) => (window.location.hash = `#/dashboard/${e.data.id}`)}
            pagination
            paginationPageSize={20}
            paginationPageSizeSelector={[20, 50, 100]}
            tooltipShowDelay={300}
          />
        </div>
      </Card>

      {orderId && !selected && orders && <Card>No order {orderId} in the last 200.</Card>}
      {selected && <OrderDetail key={selected.id} order={selected} />}

      {claims?.length > 0 && (
        <Card className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Claims</h2>
            <p className="text-sm text-slate-500">
              When an approved order was the agent's mistake: take the item back, refund the shopper, and the
              MeantIt Protection Fund repays your costs.
            </p>
          </div>
          {claims.map((claim) => (
            <div key={claim.id} className="space-y-1">
              <a href={`#/dashboard/${claim.order_id}`} className="text-sm text-indigo-700 hover:underline">
                {claim.items.map((i) => i.title).join(", ")} · {money(claim.order_total)} · {claim.order_id}
              </a>
              <ClaimDetails claim={claim} audience="marketplace" onChange={reloadClaims} />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function Tiles({ orders }) {
  const captured = orders.filter((o) => o.payment_status === "CAPTURED");
  const stoppedOrders = orders.filter(stopped);
  const sum = (list) => list.reduce((total, o) => total + (o.total || 0), 0);
  const tiles = [
    { label: "Agent orders checked", value: orders.length },
    { label: "Captured", value: money(sum(captured)), note: `${captured.length} orders` },
    { label: "Stopped before any charge", value: money(sum(stoppedOrders)), note: `${stoppedOrders.length} orders, no refunds or disputes` },
    { label: "Waiting for the shopper", value: orders.filter(waiting).length, note: "money on hold" },
    { label: "Hidden instructions caught", value: orders.filter(injected).length, note: "pages that talked to agents" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((t) => (
        <Card key={t.label} className="!p-4">
          <p className="text-xs text-slate-500">{t.label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{t.value}</p>
          {t.note && <p className="text-xs text-slate-400">{t.note}</p>}
        </Card>
      ))}
    </div>
  );
}

function OrderDetail({ order }) {
  const ref = useRef(null);
  useEffect(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), []);
  return (
    <div ref={ref} className="scroll-mt-4">
      <OrderCard order={order} audience="marketplace" footer={<Evidence orderId={order.id} />} />
    </div>
  );
}

function Evidence({ orderId }) {
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const [proof, keys] = await Promise.all([api(`/orders/${orderId}/evidence`), api("/keys")]);
      setRows(await checkEvidence(proof, keys));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const allOk = rows?.every((r) => r.ok);
  return (
    <div className="rounded-lg p-4 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Evidence</h3>
          <p className="text-sm text-slate-500">
            Re-check every signature and hash here in your browser, using only the published public keys.
          </p>
        </div>
        <Button variant="secondary" onClick={run} disabled={busy}>
          {busy ? "Checking…" : rows ? "Check again" : "Verify signatures"}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      {rows && (
        <>
          <p className={`mt-3 text-sm font-medium ${allOk ? "text-emerald-700" : "text-red-700"}`}>
            {allOk
              ? "✓ Everything checks out. Nobody changed the order or the decision after signing."
              : "✗ Some checks failed. See which below."}
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {rows.map((r) => (
              <li key={r.label} className="flex gap-2">
                <span className={`w-14 shrink-0 font-medium ${r.ok ? "text-emerald-700" : "text-red-700"}`}>
                  {r.ok ? "✓ pass" : "✗ fail"}
                </span>
                <span>
                  {r.label} <span className="text-slate-500">· {r.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
