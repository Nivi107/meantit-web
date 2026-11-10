import { AgGridReact } from "ag-grid-react";
import { CLAIM_STATUS, ClaimBadge, ClaimDetails } from "../components/Claim.jsx";
import { Card, money } from "../components/ui.jsx";
import { shortDate, theme, usePolling } from "../grid.js";

const KINDS = { reserve: "Opening reserve", contribution: "1% contribution", reimbursement: "Reimbursement to PayMart" };

const LEDGER_COLUMNS = [
  { field: "created_at", headerName: "When", width: 150, valueFormatter: (p) => shortDate(p.value), sort: "desc" },
  { field: "kind", headerName: "What", width: 210, valueFormatter: (p) => KINDS[p.value] || p.value },
  {
    field: "amount",
    headerName: "Amount",
    width: 120,
    type: "rightAligned",
    filter: "agNumberColumnFilter",
    valueGetter: (p) => p.data.amount / 100,
    valueFormatter: (p) => (p.value > 0 ? "+" : "") + money(p.value * 100),
    cellClass: (p) => (p.value < 0 ? "text-red-700" : "text-emerald-700"),
  },
  { field: "order_id", headerName: "Order", width: 150, cellClass: "font-mono text-[12px]" },
  { field: "claim_id", headerName: "Claim", width: 150, cellClass: "font-mono text-[12px]" },
  { field: "paypal_ref", headerName: "PayPal ID", flex: 1, minWidth: 160, cellClass: "font-mono text-[12px]" },
  { field: "note", headerName: "Note", flex: 1, minWidth: 200 },
];

const CLAIM_COLUMNS = [
  { field: "created_at", headerName: "Filed", width: 150, valueFormatter: (p) => shortDate(p.value), sort: "desc" },
  {
    field: "status",
    headerName: "Status",
    width: 260,
    cellRenderer: (p) => <ClaimBadge status={p.value} />,
    getQuickFilterText: (p) => CLAIM_STATUS[p.value]?.label,
  },
  {
    colId: "verdict",
    headerName: "Judge",
    width: 170,
    valueGetter: (p) => (p.data.verdict ? `${p.data.verdict.verdict} ${Math.round(p.data.verdict.confidence * 100)}%` : "—"),
  },
  { field: "reviewed_by", headerName: "Decided by", width: 120 },
  { field: "text", headerName: "Shopper said", flex: 2, minWidth: 260, tooltip: true },
  {
    field: "reimbursed",
    headerName: "Fund paid",
    width: 120,
    type: "rightAligned",
    valueFormatter: (p) => (p.value == null ? "" : money(p.value)),
  },
  { field: "payout_status", headerName: "Payout", width: 120 },
  { field: "order_id", headerName: "Order", width: 150, cellClass: "font-mono text-[12px]" },
];

export default function Admin() {
  const [fund, fundError, reloadFund] = usePolling("/fund");
  const [claims, claimsError, reloadClaims] = usePolling("/claims");
  const queue = (claims || []).filter((c) => c.status === "IN_REVIEW");
  const reload = () => (reloadFund(), reloadClaims());
  const error = fundError || claimsError;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">MeantIt admin · Protection Fund</h1>
        <p className="text-slate-500">
          1% of every captured guarded order goes into the fund. When the guard approved an order that turns out to be
          the agent's mistake, the fund repays the marketplace's costs through PayPal Payouts.
        </p>
      </div>
      {error && <Card className="text-red-700">Couldn't load: {error}</Card>}

      {fund && claims && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Fund balance", value: money(fund.balance), note: "sandbox reserve + contributions − payouts" },
            { label: "Money in", value: money(fund.money_in), note: `${Math.round(fund.contribution_rate * 100)}% of captured orders` },
            { label: "Paid to marketplaces", value: money(fund.money_out), note: `${claims.filter((c) => c.reimbursed).length} claims` },
            { label: "Waiting for a person", value: queue.length, note: "judge unsure or claim looks off" },
          ].map((t) => (
            <Card key={t.label} className="!p-4">
              <p className="text-xs text-slate-500">{t.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{t.value}</p>
              <p className="text-xs text-slate-400">{t.note}</p>
            </Card>
          ))}
        </div>
      )}

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Review queue</h2>
        {queue.length === 0 && <p className="text-sm text-slate-500">Nothing waiting. Uncertain claims show up here.</p>}
        {queue.map((claim) => (
          <ClaimDetails key={claim.id} claim={claim} audience="admin" onChange={reload} />
        ))}
      </Card>

      <Card className="space-y-3 !p-3 sm:!p-5">
        <h2 className="text-lg font-semibold">All claims</h2>
        <div style={{ height: 320 }}>
          <AgGridReact
            theme={theme}
            rowData={claims || []}
            columnDefs={CLAIM_COLUMNS}
            defaultColDef={{ filter: true, resizable: true, sortable: true }}
            getRowId={(p) => p.data.id}
            loading={!claims && !error}
            overlayNoRowsTemplate="No claims yet. A shopper files one from an approved order."
            tooltipShowDelay={300}
          />
        </div>
      </Card>

      <Card className="space-y-3 !p-3 sm:!p-5">
        <h2 className="text-lg font-semibold">Fund ledger</h2>
        <p className="text-sm text-slate-500">Every movement in and out. Nothing is edited; a correction is a new line.</p>
        <div style={{ height: 380 }}>
          <AgGridReact
            theme={theme}
            rowData={fund?.ledger || []}
            columnDefs={LEDGER_COLUMNS}
            defaultColDef={{ filter: true, resizable: true, sortable: true }}
            getRowId={(p) => p.data.ref}
            loading={!fund && !error}
            pagination
            paginationPageSize={20}
            paginationPageSizeSelector={[20, 50, 100]}
          />
        </div>
      </Card>
    </div>
  );
}
