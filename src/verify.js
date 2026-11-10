// Re-checks an order's evidence in the browser, with WebCrypto and the published keys.
// Nothing here trusts the backend's word: every signature and every hash is recomputed.

import { readJwt } from "./signing.js";

const fromB64url = (text) =>
  Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

function b64url(bytes) {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function verifyJwt(token, jwk) {
  if (!token || !jwk) return false;
  const [header, payload, signature] = token.split(".");
  if (JSON.parse(new TextDecoder().decode(fromB64url(header))).alg !== "ES256") return false;
  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x: jwk.x, y: jwk.y },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    fromB64url(signature),
    new TextEncoder().encode(`${header}.${payload}`),
  );
}

// SHA-256, base64url without padding: how the pieces point at each other (app/slips.py hash_of).
export async function hashOf(token) {
  return b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))));
}

const safeRead = (token) => {
  try {
    return readJwt(token);
  } catch {
    return {};
  }
};

// Returns one row per check: { label, ok, detail }.
export async function checkEvidence(proof, keys) {
  const { pieces, check_record: record } = proof;
  const shopping = safeRead(pieces.shopping_slip);
  const finalOk = safeRead(pieces.final_ok);
  const recordClaims = safeRead(record);
  const agentKey = shopping.cnf?.jwk;
  const cartIssuer = safeRead(pieces.cart).iss;
  const marketplaceKey = keys.marketplaces[cartIssuer]?.public_jwk;

  const rows = [];
  const check = async (label, detail, test) => {
    let ok = false;
    try {
      ok = await test();
    } catch {
      ok = false;
    }
    rows.push({ label, detail, ok });
  };

  await check("Shopping slip signed by the shopper", "with the key the shopper's browser registered", () =>
    verifyJwt(pieces.shopping_slip, proof.shopper.public_jwk),
  );
  await check("Money slip signed by the shopper", "same key", () =>
    verifyJwt(pieces.money_slip, proof.shopper.public_jwk),
  );
  await check("Cart signed by the marketplace", `${keys.marketplaces[cartIssuer]?.name || cartIssuer}'s published key`, () =>
    verifyJwt(pieces.cart, marketplaceKey),
  );
  await check("Final OK signed by the shopper's chosen agent", "the agent key named inside the shopping slip", () =>
    verifyJwt(pieces.final_ok, agentKey),
  );
  await check("Final OK points at this exact cart", "SHA-256 of the cart", async () =>
    finalOk.checkout_hash === (await hashOf(pieces.cart)),
  );
  await check("Final OK points at this shopping slip", "SHA-256 of the shopping slip", async () =>
    finalOk.sd_hash === (await hashOf(pieces.shopping_slip)),
  );
  await check("Check record signed by MeantIt", "MeantIt's published key", () =>
    verifyJwt(record, keys.meantit.public_jwk),
  );
  await check("Check record covers all four pieces", "a SHA-256 for each piece, recomputed here", async () => {
    const hashes = recordClaims.input_hashes || {};
    for (const [kind, token] of Object.entries(pieces)) {
      if (!token || hashes[kind] !== (await hashOf(token))) return false;
    }
    return true;
  });
  await check("Decision shown matches the signed one", `signed: ${recordClaims.decision || "none"}`, async () =>
    recordClaims.decision === proof.decision,
  );
  return rows;
}
