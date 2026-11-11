import { useEffect, useState } from "react";
import { api } from "../api.js";
import { AreaNav, Page } from "../components/Shell.jsx";
import { ErrorNote, Loading, PageHeader, money } from "../components/ui.jsx";

// PayMart is a stand-in for any marketplace an agent shops on. It isn't part of MeantIt.
export default function Store({ productId }) {
  return (
    <>
      <AreaNav
        name="PayMart"
        who="Demo marketplace · agents shop here"
        tone="quiet"
        active={productId ? "product" : "all"}
        tabs={[["all", "All products", "#/store"], ...(productId ? [["product", "Product page", `#/store/${productId}`]] : [])]}
      />
      <Page>{productId ? <ProductPage productId={productId} /> : <ProductGrid />}</Page>
    </>
  );
}

function ProductGrid() {
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    api("/store/products").then(setProducts).catch((err) => setError(err.message));
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={<><span className="text-dim">PayMart</span> / Catalogue</>} title="What the agents can buy">
        Running shoes, insoles and socks from three sellers. One listing, StableRun Pro, hides a note written for AI
        agents. Open it and switch on “Show what the agent saw”.
      </PageHeader>
      {error && <ErrorNote>{error}</ErrorNote>}
      {!products && !error && <Loading>Loading products…</Loading>}
      <div className="grid overflow-hidden rounded-xl border border-line sm:grid-cols-2 lg:grid-cols-3">
        {products?.map((p) => (
          <a
            key={p.id}
            href={`#/store/${p.id}`}
            className="group flex flex-col border-b border-r border-line bg-panel p-6 transition hover:bg-panel2"
          >
            <p className="label">{p.attributes.category}</p>
            <p className="mt-3 text-lg font-medium text-ink">{p.name}</p>
            <p className="mt-1 font-mono text-xl font-semibold text-ink">{money(p.price)}</p>
            <p className="mt-4 flex-1 text-sm text-dim">
              {p.seller.name} · ships in {p.delivery_days} days
            </p>
            <p className="mt-5 font-mono text-[11px] text-ghost transition group-hover:text-ink">VIEW PAGE →</p>
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

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!product) return <Loading />;

  return (
    <div className="space-y-6">
      <a href="#/store" className="text-xs font-medium text-dim hover:text-ink">
        ← All products
      </a>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-panel2 px-5 py-3">
        <p className="text-xs font-medium text-dim">
          {agentView ? (
            <span className="text-block">Agent view · every word on the page, hidden ones included</span>
          ) : (
            "Person view · what a shopper sees"
          )}
        </p>
        <button
          role="switch"
          aria-checked={agentView}
          onClick={() => setAgentView(!agentView)}
          className="flex items-center gap-3 text-xs font-medium text-ink"
        >
          Show what the agent saw
          <span className={`relative h-5 w-9 rounded-full transition ${agentView ? "bg-block" : "bg-line2"}`}>
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-ink transition-all ${agentView ? "left-[18px]" : "left-0.5"}`} />
          </span>
        </button>
      </div>
      <div className="rounded-xl border border-line bg-panel p-8">
        {/* page_html comes from our own backend, with all product text HTML-escaped there. */}
        <div
          className={`product-page ${agentView ? "agent-view" : ""}`}
          dangerouslySetInnerHTML={{ __html: product.page_html }}
        />
      </div>
      {agentView && (
        <p className="text-sm text-dim">
          Red text is hidden from people with CSS. A scraping agent still reads it. MeantIt finds it at checkout.
        </p>
      )}
    </div>
  );
}
