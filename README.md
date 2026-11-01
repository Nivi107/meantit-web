# MeantIt Web

A checkout guard for orders placed by AI shopping agents. PayPal holds the money while MeantIt checks that the cart is what the user meant and that the agent wasn't tricked. Good orders are captured, doubtful ones go back to the user, and bad ones are voided before any money moves.

This repo is the React web app. The API is in the `meantit` repo.

Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/).

> **Work in progress.** This README will grow as the project does.

## Run it locally

You need Node.js 18.18+ (20+ recommended) and the backend running at http://localhost:8000.

```bash
npm install
npm run dev
```

Open http://localhost:5173. It should say **Backend OK**.

To use a backend somewhere else, copy `.env.example` to `.env` and set `VITE_API_URL`.

## Deploy

`render.yaml` is a Render Blueprint for a free static site. During setup, set `VITE_API_URL` to the backend's host, e.g. `meantit-api.onrender.com`.

## License

MIT
