import { useEffect, useRef, useState } from "react";
import { money } from "./ui.jsx";

const HEIGHT = 220;
const PAD = { top: 16, right: 16, bottom: 28, left: 64 };

// The fund's balance after each ledger line, evenly spaced, as a step line. Red dots are payouts to marketplaces.
export default function FundChart({ ledger }) {
  const box = useRef(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(box.current);
    return () => observer.disconnect();
  }, []);

  // The opening reserve comes first even if it was written after the first contributions.
  const lines = [...ledger].sort(
    (a, b) => (b.kind === "reserve") - (a.kind === "reserve") || new Date(a.created_at) - new Date(b.created_at),
  );
  let balance = 0;
  const points = lines.map((line, i) => ({ ...line, i, at: new Date(line.created_at), balance: (balance += line.amount) }));
  if (points.length < 2 || !width)
    return (
      <div ref={box} className="w-full py-10 text-center text-sm text-dim">
        {points.length < 2 && "Not enough history yet."}
      </div>
    );

  const top = Math.max(...points.map((p) => p.balance)) * 1.15;
  const x = (i) => PAD.left + (i / (points.length - 1)) * (width - PAD.left - PAD.right);
  const y = (v) => PAD.top + (1 - v / top) * (HEIGHT - PAD.top - PAD.bottom);

  let path = `M${x(0)},${y(points[0].balance)}`;
  for (const p of points.slice(1)) path += `H${x(p.i)}V${y(p.balance)}`;
  const area = `${path}V${y(0)}H${x(0)}Z`;
  const ticks = [0, top / 2, top].map((v) => Math.round(v / 100) * 100);

  function onMove(event) {
    const rect = box.current.getBoundingClientRect();
    const px = event.clientX - rect.left;
    let best = points[0];
    for (const p of points) if (Math.abs(x(p.i) - px) < Math.abs(x(best.i) - px)) best = p;
    setHover(best);
  }

  return (
    <div ref={box} className="relative w-full" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg width={width} height={HEIGHT} role="img" aria-label="Protection Fund balance after each ledger line">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.06)" />
            <text x={PAD.left - 10} y={y(v) + 4} textAnchor="end" className="fill-ghost font-mono text-[10px]">
              {money(v).replace(".00", "")}
            </text>
          </g>
        ))}
        <path d={area} fill="rgba(0,214,143,0.07)" />
        <path d={path} fill="none" stroke="#00d68f" strokeWidth="2" strokeLinejoin="round" />
        {points
          .filter((p) => p.kind === "reimbursement")
          .map((p) => (
            <circle key={p.ref} cx={x(p.i)} cy={y(p.balance)} r="4.5" fill="#ff4d6a" stroke="#0c1524" strokeWidth="2" />
          ))}
        {[points[0], points.at(-1)].map((p, i) => (
          <text
            key={i}
            x={x(p.i)}
            y={HEIGHT - 8}
            textAnchor={i ? "end" : "start"}
            className="fill-ghost font-mono text-[10px]"
          >
            {p.at.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </text>
        ))}
        {hover && (
          <>
            <line x1={x(hover.i)} x2={x(hover.i)} y1={PAD.top} y2={y(0)} stroke="rgba(255,255,255,0.2)" />
            <circle cx={x(hover.i)} cy={y(hover.balance)} r="5" fill="#0c1524" stroke="#e2eaf4" strokeWidth="2" />
          </>
        )}
      </svg>
      {hover && (
        <div
          className="pointer-events-none absolute top-2 z-10 w-56 rounded-xl border border-line2 bg-navy/95 p-3 text-xs shadow-lg"
          style={{ left: Math.min(Math.max(x(hover.i) - 112, 0), width - 224) }}
        >
          <p className="font-mono text-[10px] text-ghost">{hover.at.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p>
          <p className="mt-1 font-mono text-base font-semibold text-ink">{money(hover.balance)}</p>
          <p className="mt-1 text-dim">
            {hover.amount > 0 ? "+" : ""}
            {money(hover.amount)} · {hover.note || hover.kind}
          </p>
        </div>
      )}
    </div>
  );
}
