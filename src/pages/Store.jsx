import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Card, money } from "../components/ui.jsx";

export default function Store({ productId }) {
  return productId ? <ProductPage productId={productId} /> : <ProductGrid />;
}

function ProductGrid() {
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    api("/store/products").then(setProducts).catch((err) => setError(err.message));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">PayMart</h1>
        <p className="text-slate-500">A demo marketplace. Shopping agents buy here; one listing hides a trap for them.</p>
      </div>
      {error && <p className="text-red-700">{error}</p>}
      {!products && !error && <p className="text-slate-500">Loading products…</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products?.map((p) => (
          <a key={p.id} href={`#/store/${p.id}`} className="block">
            <Card className="h-full transition hover:ring-indigo-300">
              <p className="text-xs uppercase tracking-wide text-slate-400">{p.attributes.category}</p>
              <p className="mt-1 font-semibold">{p.name}</p>
              <p className="text-slate-700">{money(p.price)}</p>
              <p className="mt-2 text-sm text-slate-500">
                {p.seller.name} · ships in {p.delivery_days} days
              </p>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}

function ProductPage({ productId }) {
  const [product, setProduct] = useState(null);
  const [agentView, setAgentView] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    setProduct(null);
    api(`/store/products/${productId}`).then(setProduct).catch((err) => setError(err.message));
  }, [productId]);

  if (error) return <p className="text-red-700">{error}</p>;
  if (!product) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <a href="#/store" className="text-sm text-indigo-700">← All products</a>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {agentView ? "What an AI agent reads: every word on the page, hidden ones included." : "What a person sees."}
        </p>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={agentView} onChange={(e) => setAgentView(e.target.checked)} />
          Show what the agent saw
        </label>
      </div>
      <Card>
        {/* page_html comes from our own backend, with all product text HTML-escaped there. */}
        <div
          className={`product-page ${agentView ? "agent-view" : ""}`}
          dangerouslySetInnerHTML={{ __html: product.page_html }}
        />
      </Card>
      {agentView && (
        <p className="text-sm text-slate-500">
          Red text is hidden from people with CSS. A scraping agent still reads it. MeantIt finds it at checkout.
        </p>
      )}
    </div>
  );
}
