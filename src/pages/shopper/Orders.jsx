import { useEffect, useState } from "react";
import { api } from "../../api.js";
import { ClaimBadge, ClaimBox } from "../../components/Claim.jsx";
import OrderCard from "../../components/OrderCard.jsx";
import { DecisionBadge, ErrorNote, Loading, PageHeader, Panel, PaymentStatus, money } from "../../components/ui.jsx";
import { waitingForYou } from "../Shopper.jsx";

export function OrderList({ orders, claims }) {
  if (!orders) return <Loading>Loading your orders…</Loading>;
  const claimFor = Object.fromEntries(claims.map((c) => [c.order_id, c]));
  const waiting = orders.filter(waitingForYou);
  const rest = orders.filter((o) => !waitingForYou(o));

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Orders & claims" title="Everything your agent bought">
        Open an order to see why MeantIt decided what it did. If an approved order turns out wrong, file a claim there.
      </PageHeader>
      {!orders.length && (
        <Panel>
          <p className="text-dim">
            No orders yet. <a href="#/shopper" className="link">Give your agent a task →</a>
          </p>
        </Panel>
      )}
      {waiting.length > 0 && (
        <Panel title={<span className="text-hold">Waiting for your answer · {waiting.length}</span>} className="!border-hold/30" bodyClassName="">
          <Rows orders={waiting} claimFor={claimFor} />
        </Panel>
      )}
      {rest.length > 0 && (
        <Panel title={`All orders · ${rest.length}`} bodyClassName="">
          <Rows orders={rest} claimFor={claimFor} />
        </Panel>
      )}
    </div>
  );
}

function Rows({ orders, claimFor }) {
  return (
    <ul className="divide-y divide-line">
      {orders.map((order) => (
        <li key={order.id}>
          <a
            href={`#/shopper/orders/${order.id}`}
            className="grid items-center gap-x-4 gap-y-1 px-5 py-3.5 transition hover:bg-white/[0.02] sm:grid-cols-[130px_1fr_100px_auto_20px]"
          >
            <span>
              <DecisionBadge decision={order.decision} resolution={order.resolution} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-ink">{order.items.map((i) => i.title).join(", ") || "—"}</span>
              <span className="block truncate text-xs text-ghost">
                {new Date(order.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} ·{" "}
                <PaymentStatus status={order.payment_status} />
              </span>
            </span>
            <span className="font-mono text-sm tabular-nums text-ink sm:text-right">{money(order.total, order.currency || "USD")}</span>
            <span>{claimFor[order.id] && <ClaimBadge status={claimFor[order.id].status} />}</span>
            <span className="hidden text-ghost sm:block">›</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function OrderView({ orderId, user, orders, claims, onChange }) {
  const [order, setOrder] = useState(() => orders?.find((o) => o.id === orderId) || null);
  const [error, setError] = useState(null);
  useEffect(() => {
    const known = orders?.find((o) => o.id === orderId);
    if (known) setOrder(known);
    else api(`/orders/${orderId}`).then(setOrder).catch((err) => setError(err.message));
  }, [orderId, orders]);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!order) return <Loading />;
  const claim = claims.find((c) => c.order_id === orderId);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <a href="#/shopper/orders" className="text-xs font-medium text-dim hover:text-ink">
        ← All orders
      </a>
      <OrderCard
        order={order}
        userId={user.id}
        onChange={(o) => (setOrder(o), onChange())}
        footer={<ClaimBox order={order} claim={claim} userId={user.id} onChange={onChange} />}
      />
    </div>
  );
}
