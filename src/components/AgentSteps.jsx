const ICONS = { search: "🔍", read: "📄", add: "🛒", empty: "🗑️", submit: "📦", say: "💬", error: "⚠️" };

function describe(step) {
  const input = step.input || {};
  switch (step.kind) {
    case "search":
      return <>Searched for “{input.query}”: {step.text}</>;
    case "read":
      return (
        <>
          Read the page for{" "}
          <a className="text-indigo-700 underline" href={`#/store/${input.product_id}`}>{step.text}</a>
        </>
      );
    case "add":
      return <>Added {input.qty}× {step.text}{input.size_us ? ` (US ${input.size_us})` : ""} to the cart</>;
    case "submit":
      return <>Sent the cart to PayMart's checkout</>;
    case "error":
      return <>Tool said no: {step.text}</>;
    default:
      return <span className="italic">{step.text}</span>;
  }
}

export default function AgentSteps({ steps, running }) {
  return (
    <ol className="space-y-2">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3 text-sm">
          <span className="w-6 shrink-0 text-center">{ICONS[step.kind] || "•"}</span>
          <span className={step.kind === "say" ? "text-slate-600" : "text-slate-900"}>{describe(step)}</span>
        </li>
      ))}
      {running && (
        <li className="flex gap-3 text-sm text-slate-500">
          <span className="w-6 shrink-0 animate-pulse text-center">⋯</span>
          <span>working…</span>
        </li>
      )}
    </ol>
  );
}
