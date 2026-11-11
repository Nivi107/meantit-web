// The shopper's signing key lives in this browser only. The private half is created
// non-extractable, so no script (ours included) can read it out; it can only sign.
// The key is kept in IndexedDB so it survives reloads.

const DB_NAME = "meantit";
const STORE = "keys";
const KEY_ID = "user";
let memoryKey = null; // used when IndexedDB isn't available (some private windows)

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idb(mode, action) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = action(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadKey() {
  try {
    return (await idb("readonly", (store) => store.get(KEY_ID))) || memoryKey;
  } catch {
    return memoryKey;
  }
}

export async function createKey() {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]);
  memoryKey = pair;
  try {
    await idb("readwrite", (store) => store.put(pair, KEY_ID));
  } catch {
    // kept in memory for this tab only
  }
  return pair;
}

// Start over as a new shopper: the old key is deleted and can never sign again.
export async function forgetKey() {
  memoryKey = null;
  try {
    await idb("readwrite", (store) => store.delete(KEY_ID));
  } catch {
    // nothing stored
  }
}

export async function publicJwk(pair) {
  const { kty, crv, x, y } = await crypto.subtle.exportKey("jwk", pair.publicKey);
  return { kty, crv, x, y };
}

// ---- JWTs (ES256), the same format the Python backend signs and checks ----

function b64url(bytes) {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const encodeJson = (value) => b64url(new TextEncoder().encode(JSON.stringify(value)));

export async function signJwt(claims, pair) {
  const input = `${encodeJson({ alg: "ES256", typ: "JWT" })}.${encodeJson(claims)}`;
  // WebCrypto returns r||s (64 bytes), which is exactly what JWS ES256 wants.
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    pair.privateKey,
    new TextEncoder().encode(input),
  );
  return `${input}.${b64url(new Uint8Array(signature))}`;
}

export function readJwt(token) {
  const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(atob(part), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

// ---- the two slips the shopper signs (mirrors app/slips.py) ----

const THREE_DAYS = 3 * 86400;

export function shoppingSlip(agentKey, request, marketplace) {
  const iat = Math.floor(Date.now() / 1000);
  return {
    vct: "mandate.checkout.open.1",
    iat,
    exp: iat + THREE_DAYS,
    cnf: { jwk: agentKey },
    constraints: [
      { type: "checkout.allowed_merchants", allowed: [marketplace] },
      { type: "meantit.intent.1", request, locale: navigator.language || "en-US" },
    ],
  };
}

export function moneySlip(agentKey, maxCents, currency = "USD") {
  const iat = Math.floor(Date.now() / 1000);
  return {
    vct: "mandate.payment.open.1",
    iat,
    exp: iat + THREE_DAYS,
    cnf: { jwk: agentKey },
    constraints: [{ type: "payment.amount_range", currency, min: 0, max: maxCents }],
  };
}
