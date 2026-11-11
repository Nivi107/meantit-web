# MeantIt Web

A checkout guard for orders placed by AI shopping agents. PayPal holds the money while MeantIt checks that the cart is what the user meant and that the agent wasn't tricked. Good orders are captured, doubtful ones go back to the user, and bad ones are voided before any money moves.

This repo is the React web app. The API, and the full explanation of how MeantIt works, the PayPal APIs
and the AI it uses, is in [meantit](https://github.com/Nivi107/meantit).

Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/).

**Live demo:** https://meantit-web.onrender.com. Click **Run the demo**. The free server can take about a
minute to wake on the first visit.

## What's in it

| Page | For | What it shows |
|---|---|---|
| Home | Everyone | What MeantIt does and the latest real decisions in the sandbox |
| Shopper | The person | Create a signing key, sign a request, send one of three demo agents, answer held orders, report a problem |
| PayMart | The marketplace's storefront | The catalogue; **Show what the agent saw** reveals text hidden from people |
| Merchant | PayMart's staff | Every agent order in **AG Grid** with filters, reasons and CSV export; the evidence with **Verify signatures**; claims |
| Admin | MeantIt | The Protection Fund balance and ledger, all claims with the judge's reasoning, the review queue |

The shopper's signing key is made with WebCrypto and never leaves the browser. **Verify signatures**
re-checks every signature and hash in the browser with the public keys, so nobody has to trust the API's word.

Built with React, Vite, Tailwind CSS and AG Grid Community.

## Run it locally

You need Node.js 18.18+ (20+ recommended) and the backend running at http://localhost:8000.

```bash
npm install
npm run dev
```

Open http://localhost:5173. The header says **Sandbox online** when the backend is reachable and fully set up.

To use a backend somewhere else, copy `.env.example` to `.env` and set `VITE_API_URL`.

## Deploy

`render.yaml` is a Render Blueprint for a free static site. During setup, set `VITE_API_URL` to the backend's host, e.g. `meantit-api.onrender.com`.

## License

MIT
