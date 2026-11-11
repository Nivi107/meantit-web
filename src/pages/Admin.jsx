import { AgGridReact } from "ag-grid-react";
import { useState } from "react";
import { CLAIM_STATUS, ClaimBadge, ClaimDetails } from "../components/Claim.jsx";
import FundChart from "../components/FundChart.jsx";
import { AreaNav, Page } from "../components/Shell.jsx";
import { ErrorNote, Loading, PageHeader, Panel, StatBar, money } from "../components/ui.jsx";
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
    cellClass: (p) => `font-mono ${p.value < 0 ? "text-block" : "text-pass"}`,
  },
  { field: "order_id", headerName: "Order", width: 150, cellClass: "font-mono text-[12px] text-dim" },
  { field: "claim_id", headerName: "Claim", width: 150, cellClass: "font-mono text-[12px] text-dim" },
  { field: "paypal_ref", headerName: "PayPal ID", flex: 1, minWidth: 160, cellClass: "font-mono text-[12px] text-dim" },
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
  { field: "order_id", headerName: "Order", width: 150, cellClass: "font-mono text-[12px] text-dim" },
];

// MeantIt's own side: the Protection Fund, claims a person must decide, and every movement of money.
export default function Admin({ route }) {
  const [fund, fundError, reloadFund] = usePolling("/fund");
  const [claims, claimsError, reloadClaims] = usePolling("/claims");
  const queue = (claims || []).filter((c) => c.status === "IN_REVIEW");
  const reload = () => (reloadFund(), reloadClaims());
  const error = fundError || claimsError;
  const tab = ["queue", "claims", "ledger"].includes(route[0]) ? route[0] : "overview";

  let content;
  if (error) content = <ErrorNote>Couldn't load: {error}</ErrorNote>;
  else if (!fund || !claims) content = <Loading>Loading the fund…</Loading>;
  else if (tab === "queue") content = <Queue queue={queue} reload={reload} />;
  else if (tab === "claims") content = <AllClaims claims={claims} reload={reload} />;
  else if (tab === "ledger") content = <Ledger fund={fund} />;
  else content = <Overview fund={fund} claims={claims} queue={queue} />;

  return (
    <>
      <AreaNav
        name="MeantIt admin"
        who="Protection Fund operator"
        tone="admin"
        active={tab}
        tabs={[
          ["overview", "Overview", "#/admin"],
          ["queue", "Review queue", "#/admin/queue", queue.length],
          ["claims", "All claims", "#/admin/claims"],
          ["ledger", "Fund ledger", "#/admin/ledger"],
        ]}
      />
      <Page>{content}</Page>
    </>
  );
}

function Overview({ fund, claims, queue }) {
  const paid = claims.filter((c) => c.reimbursed);
  const recent = [...fund.ledger].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6);
  return (
    <div className="space-y-8">
      <PageHeader eyebrow={<><span className="text-admin">Admin</span> / Protection Fund</>} title="The fund that stands behind every approval">
        {Math.round(fund.contribution_rate * 100)}% of every captured guarded order goes in. When MeantIt approved an order
        that turns out to be the agent's mistake, the fund repays the marketplace through PayPal Payouts.
      </PageHeader>
      <StatBar
        stats={[
          { label: "Fund balance", value: money(fund.balance), note: "reserve + contributions − payouts", tone: "admin" },
          { label: "Money in", value: money(fund.money_in), note: `${Math.round(fund.contribution_rate * 100)}% of captured orders`, tone: "pass" },
          { label: "Paid to marketplaces", value: money(fund.money_out), note: `${paid.length} claims reimbursed`, tone: "block" },
          { label: "Waiting for a person", value: queue.length, note: "judge unsure or claim looks off", tone: queue.length ? "hold" : undefined },
        ]}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
        <Panel
          title="Balance after each movement"
          right={
            <span className="flex items-center gap-2 font-mono text-[10px] text-ghost">
              <span className="h-2 w-2 rounded-full bg-block" /> PAYOUT TO A MARKETPLACE
            </span>
          }
        >
          <FundChart ledger={fund.ledger} />
        </Panel>
        <Panel title="Needs a person" right={<a href="#/admin/queue" className="font-mono text-[10px] text-admin hover:underline">OPEN QUEUE →</a>}>
          {queue.length ? (
            <ul className="space-y-3 text-sm">
              {queue.slice(0, 4).map((c) => (
                <li key={c.id} className="border-l-2 border-hold pl-3">
                  <p className="line-clamp-2 text-ink">“{c.text}”</p>
                  <p className="font-mono text-[11px] text-ghost">{c.items.map((i) => i.title).join(", ")} · {money(c.order_total)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-dim">Nothing waiting. Claims the judge isn't sure about land here.</p>
          )}
        </Panel>
      </div>
      <Panel title="Latest movements" right={<a href="#/admin/ledger" className="font-mono text-[10px] text-admin hover:underline">FULL LEDGER →</a>} bodyClassName="">
        <ul className="divide-y divide-line">
          {recent.map((line) => (
            <li key={line.ref} className="grid grid-cols-[1fr_auto] items-center gap-x-4 px-5 py-3 text-sm sm:grid-cols-[130px_200px_1fr_auto]">
              <span className="hidden font-mono text-[11px] text-ghost sm:block">{shortDate(line.created_at)}</span>
              <span className="text-ink">{KINDS[line.kind] || line.kind}</span>
              <span className="hidden truncate text-dim sm:block">{line.note}</span>
              <span className={`font-mono tabular-nums ${line.amount < 0 ? "text-block" : "text-pass"}`}>
                {line.amount > 0 ? "+" : ""}
                {money(line.amount)}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function Queue({ queue, reload }) {
  return (
    <div className="space-y-8">
      <PageHeader eyebrow={<><span className="text-admin">Admin</span> / Review queue</>} title="Claims a person has to decide">
        The judge wasn't sure enough, the claim looked suspicious, or the shopper claims often. Your decision is recorded
        next to the judge's.
      </PageHeader>
      {queue.length === 0 && (
        <Panel>
          <p className="text-sm text-dim">Nothing waiting. Uncertain claims show up here.</p>
        </Panel>
      )}
      <div className="space-y-6">
        {queue.map((claim) => (
          <div key={claim.id} className="space-y-2">
            <p className="flex flex-wrap gap-x-3 text-sm">
              <span className="text-ink">{claim.items.map((i) => i.title).join(", ")}</span>
              <span className="font-mono text-dim">{money(claim.order_total)}</span>
              <span className="font-mono text-[11px] text-ghost">{claim.order_id}</span>
            </p>
            <ClaimDetails claim={claim} audience="admin" onChange={reload} />
          </div>
        ))}
      </div>
    </div>
  );
}

function AllClaims({ claims, reload }) {
  const [openId, setOpenId] = useState(null);
  const open = claims.find((c) => c.id === openId);
  return (
    <div className="space-y-8">
      <PageHeader eyebrow={<><span className="text-admin">Admin</span> / All claims</>} title="Every claim, every verdict">
        Click a claim to read the judge's reasoning. Only MeantIt sees it; PayMart and the shopper see the outcome.
      </PageHeader>
      <Panel bodyClassName="p-0">
        <div style={{ height: 520 }}>
          <AgGridReact
            theme={theme}
            rowData={claims}
            columnDefs={CLAIM_COLUMNS}
            defaultColDef={{ filter: true, resizable: true, sortable: true }}
            getRowId={(p) => p.data.id}
            overlayNoRowsTemplate="No claims yet. A shopper files one from an approved order."
            tooltipShowDelay={300}
            rowClass="cursor-pointer"
            onRowClicked={(e) => setOpenId(e.data.id)}
          />
        </div>
      </Panel>
      {open && <ClaimDetails claim={open} audience="admin" onChange={reload} />}
    </div>
  );
}

function Ledger({ fund }) {
  return (
    <div className="space-y-8">
      <PageHeader eyebrow={<><span className="text-admin">Admin</span> / Fund ledger</>} title="Every movement in and out">
        Nothing is edited; a correction is a new line. Payouts carry their PayPal batch ID.
      </PageHeader>
      <Panel bodyClassName="p-0">
        <div style={{ height: 560 }}>
          <AgGridReact
            theme={theme}
            rowData={fund.ledger}
            columnDefs={LEDGER_COLUMNS}
            defaultColDef={{ filter: true, resizable: true, sortable: true }}
            getRowId={(p) => p.data.ref}
            pagination
            paginationPageSize={20}
            paginationPageSizeSelector={[20, 50, 100]}
          />
        </div>
      </Panel>
    </div>
  );
}
