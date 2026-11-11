const KINDS = {
  search: ["SEARCH", "text-info"],
  read: ["READ", "text-dim"],
  add: ["CART", "text-pass"],
  empty: ["CART", "text-dim"],
  submit: ["CHECKOUT", "text-pass"],
  say: ["AGENT", "text-ghost"],
  error: ["REFUSED", "text-hold"],
};

function describe(step) {
  const input = step.input || {};
  switch (step.kind) {
    case "search":
      return (
        <>
          “{input.query}” <span className="text-ghost">→ {step.text}</span>
          {input.max_price_usd != null && <span className="text-ghost"> · max ${input.max_price_usd}</span>}
        </>
      );
    case "read":
      return (
        <a className="link" href={`#/store/${input.product_id}`}>
          {step.text}
        </a>
      );
    case "add":
      return (
        <>
          Added {input.qty}× {step.text}
          {input.size_us ? ` (US ${input.size_us})` : ""}
        </>
      );
    case "submit":
      return <>Sent the cart to PayMart's checkout</>;
    case "error":
      return <>Tool said no: {step.text}</>;
    default:
      return <span className="italic text-dim">{step.text}</span>;
  }
}

// The agent's work as a log stream: time since start, kind, what happened.
export default function AgentSteps({ steps, running }) {
  const start = steps[0]?.at;
  return (
    <ol className="font-mono text-[12px]">
      {steps.map((step, i) => {
        const [kind, color] = KINDS[step.kind] || ["STEP", "text-dim"];
        return (
          <li key={i} className="row-in grid grid-cols-[52px_76px_1fr] gap-2 border-b border-line px-5 py-2.5 last:border-b-0">
            <span className="text-[11px] text-ghost">
              {start && step.at ? `+${(step.at - start).toFixed(1)}s` : `#${i + 1}`}
            </span>
            <span className={`text-[11px] font-semibold ${color}`}>{kind}</span>
            <span className="min-w-0 break-words font-sans text-[13px] text-ink">{describe(step)}</span>
          </li>
        );
      })}
      {running && (
        <li className="grid grid-cols-[52px_76px_1fr] gap-2 px-5 py-2.5 text-ghost">
          <span className="animate-pulse">···</span>
          <span />
          <span>working…</span>
        </li>
      )}
      {!steps.length && !running && <li className="px-5 py-4 text-ghost">No steps.</li>}
    </ol>
  );
}
