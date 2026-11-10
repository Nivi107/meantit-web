import { Card } from "../components/ui.jsx";

const PLACES = [
  {
    href: "#/shopper",
    title: "Shop with an agent",
    text: "Sign a permission slip, send an agent shopping, and see what MeantIt decides before PayPal charges you.",
  },
  {
    href: "#/store",
    title: "Browse PayMart",
    text: "The demo marketplace. Open StableRun Pro and switch on “Show what the agent saw”.",
  },
  {
    href: "#/dashboard",
    title: "Marketplace dashboard",
    text: "Every agent order PayMart received, with the evidence behind each decision.",
  },
];

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="max-w-2xl space-y-3">
        <h1 className="text-3xl font-semibold">Did you mean to buy that?</h1>
        <p className="text-lg text-slate-600">
          AI agents can shop for you, but they get things wrong and can be tricked. MeantIt sits at checkout: PayPal holds
          the money, MeantIt checks the order against what you actually asked for, then it's charged, blocked, or
          held for you to decide.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {PLACES.map((p) => (
          <a key={p.href} href={p.href}>
            <Card className="h-full transition hover:ring-indigo-300">
              <p className="font-semibold text-indigo-700">{p.title} →</p>
              <p className="mt-2 text-sm text-slate-600">{p.text}</p>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}
