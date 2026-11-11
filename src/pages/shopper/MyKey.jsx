import { useEffect, useState } from "react";
import { Button, Json, PageHeader, Panel } from "../../components/ui.jsx";
import { forgetKey, publicJwk } from "../../signing.js";
import { forgetUser } from "../Shopper.jsx";

export function MyKey({ user, keyPair }) {
  const [jwk, setJwk] = useState(null);
  useEffect(() => {
    publicJwk(keyPair).then(setJwk);
  }, [keyPair]);

  async function startOver() {
    if (!window.confirm("Delete this key and start as a new shopper? Your old orders stay, but this browser can't sign for them again.")) return;
    await forgetKey();
    forgetUser();
    window.location.hash = "#/shopper";
    window.location.reload();
  }

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="My key" title="Your signing key">
        The private half stays in this browser and can't be copied out. MeantIt only has the public half below, which is
        how it knows a slip really came from you.
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Who you are">
          <dl className="grid grid-cols-[110px_1fr] gap-y-3 text-sm">
            <dt className="label pt-0.5">Name</dt>
            <dd>{user.name}</dd>
            <dt className="label pt-0.5">Shopper ID</dt>
            <dd className="font-mono text-xs text-dim">{user.id}</dd>
            <dt className="label pt-0.5">Algorithm</dt>
            <dd className="font-mono text-xs text-dim">ES256 · P-256 · non-extractable</dd>
          </dl>
        </Panel>
        <Panel title="Start over">
          <p className="text-sm text-dim">
            Try the demo as a different shopper. This deletes the key from this browser for good.
          </p>
          <Button variant="bad" className="mt-4" onClick={startOver}>
            Delete key and start over
          </Button>
        </Panel>
      </div>
      <Panel title="Public key (JWK)">
        <Json value={jwk || "…"} />
      </Panel>
    </div>
  );
}
