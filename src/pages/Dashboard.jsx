import { useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { api } from "../api.js";
import { ClaimDetails, STORE_CAN_DECIDE } from "../components/Claim.jsx";
import OrderCard from "../components/OrderCard.jsx";
import { AreaNav, Page } from "../components/Shell.jsx";
import { Button, DecisionBadge, ErrorNote, Loading, PageHeader, Panel, StatBar, money } from "../components/ui.jsx";
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
const REASON_TONE = {
  MANDATE_INVALID: "border-block/40 text-block",
  LIMIT_EXCEEDED: "border-block/40 text-block",
  AGENT_MANIPULATED: "border-block/40 text-block",
  INJECTION_SUSPECTED: "border-hold/40 text-hold",
  INTENT_MISMATCH: "border-hold/40 text-hold",
  INTENT_UNCLEAR: "border-hold/40 text-hold",
};
const reasonText = (codes) => codes.map((c) => `${REASONS[c] || c} ${c}`).join(" ");

const waiting = (o) => o.decision === "HOLD" && o.payment_status === "AUTHORIZED" && !o.resolution;
const stopped = (o) => o.payment_status === "VOIDED" || (o.decision === "BLOCK" && o.payment_status === "NONE");
const injected = (o) => o.reason_codes.some((c) => c === "AGENT_MANIPULATED" || c === "INJECTION_SUSPECTED");

function DecisionCell({ data }) {
  return (
    <span className="flex h-full items-center">
      <DecisionBadge decision={data.decision} resolution={data.resolution} short />
    </span>
  );
}

function ReasonsCell({ value }) {
  if (!value?.length) return <span className="text-ghost">none</span>;
  return (
    <span className="flex flex-wrap gap-1 py-2 leading-none">
      {value.map((code) => (
        <span key={code} title={code} className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${REASON_TONE[code] || "border-line2 text-dim"}`}>
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
  {
    colId: "decision",
    headerName: "Decision",
    width: 165,
    // Includes the shopper's answer, so the cell redraws when a held order is approved or rejected
    valueGetter: (p) => [p.data.decision, p.data.resolution].filter(Boolean).join(" · "),
    cellRenderer: DecisionCell,
  },
  {
    field: "reason_codes",
    headerName: "Why",
    width: 330,
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
  { field: "id", headerName: "Order", width: 150, cellClass: "font-mono text-[12px] text-dim" },
];

// Claims PayMart has to act on: decide, take the item back, or retry the fund's payout.
const needsAction = (c) =>
  STORE_CAN_DECIDE.includes(c.status) ||
  c.status === "APPROVED" ||
  c.status === "STORE_RETURN" ||
  (c.status === "REFUNDED" && c.payout_status !== "SUCCESS");

// PayMart's side: every agent order MeantIt checked, the evidence, and claims to process.
export default function Dashboard({ route }) {
  const [orders, error] = usePolling("/dashboard/orders"); // held orders change when the shopper answers
  const [claims, , reloadClaims] = usePolling("/claims");
  let [tab, id] = route;
  if (tab?.startsWith("ord_")) [tab, id] = ["orders", tab]; // old links: #/dashboard/{order}

  let content;
  if (error) content = <ErrorNote>Couldn't load orders: {error}</ErrorNote>;
  else if (tab === "claims") content = <Claims claims={claims} reload={reloadClaims} />;
  else if (tab === "orders" && id) content = <OrderPage orderId={id} orders={orders} claims={claims} reloadClaims={reloadClaims} />;
  else content = <Orders orders={orders} />;

  return (
    <>
      <AreaNav
        name="Merchant console"
        who="PayMart · signed in as the marketplace"
        tone="info"
        active={tab === "claims" ? "claims" : "orders"}
        tabs={[
          ["orders", "Agent orders", "#/dashboard"],
          ["claims", "Claims", "#/dashboard/claims", (claims || []).filter(needsAction).length],
        ]}
      />
      <Page>{content}</Page>
    </>
  );
}

function Orders({ orders }) {
  const [decision, setDecision] = useState("ALL");
  const [search, setSearch] = useState("");
  const grid = useRef(null);
  const rows = useMemo(
    () => (orders || []).filter((o) => decision === "ALL" || o.decision === decision),
    [orders, decision],
  );

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={<><span className="text-info">PayMart</span> / Agent orders</>} title="Every order an AI agent placed, and why MeantIt decided">
        Approved orders were captured; blocked ones were voided before any charge. Click a row for the evidence.
      </PageHeader>
      {orders ? <Tiles orders={orders} /> : <Loading>Loading orders…</Loading>}

      <Panel
        bodyClassName="p-0"
        title={
          <div className="flex rounded-xl border border-line2" role="group" aria-label="Decision">
            {FILTERS.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setDecision(key)}
                className={`border-r border-line2 px-3 py-1.5 text-xs font-medium last:border-r-0 ${
                  decision === key ? "bg-info/15 text-info" : "text-dim hover:text-ink"
                }`}
              >
                {label}
                {orders && key !== "ALL" && <span className="ml-1.5 text-ghost">{orders.filter((o) => o.decision === key).length}</span>}
              </button>
            ))}
          </div>
        }
        right={
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search words, products, reasons…"
              className="field !w-auto min-w-0 flex-1 !py-1.5 sm:max-w-xs"
            />
            <Button
              variant="secondary"
              className="!py-2"
              onClick={() => grid.current?.api.exportDataAsCsv({ fileName: "paymart-agent-orders.csv" })}
            >
              Export CSV
            </Button>
          </div>
        }
      >
        <div style={{ height: 560 }}>
          <AgGridReact
            ref={grid}
            theme={theme}
            rowData={rows}
            columnDefs={COLUMNS}
            defaultColDef={{ filter: true, resizable: true, sortable: true }}
            getRowId={(p) => p.data.id}
            quickFilterText={search}
            loading={!orders}
            overlayNoRowsTemplate="No agent orders yet. Place one from the Shopper tab."
            rowStyle={{ cursor: "pointer" }}
            onRowClicked={(e) => (window.location.hash = `#/dashboard/orders/${e.data.id}`)}
            pagination
            paginationPageSize={20}
            paginationPageSizeSelector={[20, 50, 100]}
            tooltipShowDelay={300}
          />
        </div>
      </Panel>
    </div>
  );
}

function Tiles({ orders }) {
  const captured = orders.filter((o) => o.payment_status === "CAPTURED");
  const stoppedOrders = orders.filter(stopped);
  const sum = (list) => list.reduce((total, o) => total + (o.total || 0), 0);
  return (
    <StatBar
      stats={[
        { label: "Orders checked", value: orders.length, note: "by MeantIt at checkout" },
        { label: "Captured", value: money(sum(captured)), note: `${captured.length} orders`, tone: "pass" },
        { label: "Stopped, never charged", value: money(sum(stoppedOrders)), note: `${stoppedOrders.length} orders · no refunds or disputes`, tone: "block" },
        { label: "Waiting for shopper", value: orders.filter(waiting).length, note: "money on hold", tone: "hold" },
        { label: "Hidden instructions", value: orders.filter(injected).length, note: "pages that talked to agents", tone: "block" },
      ]}
    />
  );
}

function OrderPage({ orderId, orders, claims, reloadClaims }) {
  if (!orders) return <Loading>Loading the order…</Loading>;
  const order = orders.find((o) => o.id === orderId);
  const claim = claims?.find((c) => c.order_id === orderId);
  return (
    <div className="space-y-6">
      <a href="#/dashboard" className="text-xs font-medium text-dim hover:text-ink">
        ← All agent orders
      </a>
      {!order ? (
        <Panel>No order {orderId} in the last 200.</Panel>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <OrderCard order={order} audience="marketplace" />
          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <Evidence orderId={order.id} />
            {claim && <ClaimDetails claim={claim} audience="marketplace" onChange={reloadClaims} />}
          </div>
        </div>
      )}
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
    <Panel title="Evidence" bodyClassName="">
      <div className="space-y-4 p-5">
        <p className="text-sm text-dim">
          Re-check every signature and hash here in your browser, using only the published public keys. No need to trust
          MeantIt's word.
        </p>
        <Button variant={rows ? "secondary" : "primary"} onClick={run} disabled={busy}>
          {busy ? "Checking…" : rows ? "Check again" : "Verify signatures"}
        </Button>
        {error && <ErrorNote>{error}</ErrorNote>}
        {rows && (
          <p className={`font-mono text-xs font-semibold ${allOk ? "text-pass" : "text-block"}`}>
            {allOk
              ? "✓ EVERYTHING CHECKS OUT. Nobody changed the order or the decision after signing."
              : "✕ SOME CHECKS FAILED. See which below."}
          </p>
        )}
      </div>
      {rows && (
        <ul className="border-t border-line font-mono text-[11px]">
          {rows.map((r) => (
            <li key={r.label} className="grid grid-cols-[48px_1fr] gap-2 border-b border-line px-5 py-2.5 last:border-b-0">
              <span className={`font-semibold ${r.ok ? "text-pass" : "text-block"}`}>{r.ok ? "PASS" : "FAIL"}</span>
              <span>
                <span className="font-sans text-[13px] text-ink">{r.label}</span>
                <span className="block break-all text-ghost">{r.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Claims({ claims, reload }) {
  if (!claims) return <Loading>Loading claims…</Loading>;
  const todo = claims.filter(needsAction);
  const done = claims.filter((c) => !needsAction(c));
  const show = (claim) => (
    <div key={claim.id} className="space-y-2">
      <a href={`#/dashboard/orders/${claim.order_id}`} className="flex flex-wrap items-center gap-x-3 text-sm text-dim hover:text-ink">
        <span className="text-ink">{claim.items.map((i) => i.title).join(", ")}</span>
        <span className="font-mono">{money(claim.order_total)}</span>
        <span className="font-mono text-[11px] text-ghost">{claim.order_id} ›</span>
      </a>
      <ClaimDetails claim={claim} audience="marketplace" onChange={reload} />
    </div>
  );
  return (
    <div className="space-y-8">
      <PageHeader eyebrow={<><span className="text-info">PayMart</span> / Claims</>} title="Problems shoppers reported to you">
        Every report comes to you first. Take it back under your own policy, say no, or send it to the MeantIt
        Protection Fund when the agent got it wrong on an order MeantIt approved. Then the fund repays your costs
        through PayPal Payouts.
      </PageHeader>
      <Panel title={<span className={todo.length ? "text-hold" : ""}>Needs your action · {todo.length}</span>}>
        {todo.length ? <div className="space-y-6">{todo.map(show)}</div> : <p className="text-sm text-dim">Nothing to do. New reports from shoppers show up here.</p>}
      </Panel>
      {done.length > 0 && (
        <Panel title={`Other claims · ${done.length}`}>
          <div className="space-y-6">{done.map(show)}</div>
        </Panel>
      )}
    </div>
  );
}
