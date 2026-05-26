# 🏠 Renters Billing — `renters-billing`

A small free web app that replaces a paper-based monthly billing process for a property in the Philippines with **3 renters** and **1 non-renter** sub-metered for electricity (and water for the renters). Built so the on-site user (Nelvi) can record meter readings and generate bills, and the remote owner (his father) can view everything from his Android phone.

> **Status:** scaffolding stage. See [`PLAN.md`](./PLAN.md) for current task progress.

---

## What it does

- 📊 **Calculate bills** — `(current − previous reading) × rate`, plus rent for renters
- 🧾 **Generate receipts** — clean, mobile-friendly bills you can screenshot and send via Messenger
- 💰 **Track payments** — mark each bill paid / unpaid
- 📚 **Keep history** — every reading and every bill stored in Supabase Postgres
- 🔐 **Private** — password-protected; only Nelvi and his father have accounts

## What it does NOT do (by design)

- ❌ No partial payments, no late fees, no automated reminders
- ❌ No automated backup (export CSV from Supabase Studio when desired)
- ❌ No multi-property / multi-landlord support
- ❌ No public signup

See [`docs/SPEC.md`](./docs/SPEC.md) for the full specification.

---

## Tech stack

| Concern | Choice |
| --- | --- |
| Frontend | React 19 + Vite + TypeScript (strict) |
| Styling | Tailwind CSS |
| Routing | React Router v6 |
| Data layer | `@supabase/supabase-js` + TanStack Query |
| Backend | Supabase (Postgres + Auth + Row Level Security) |
| Receipt → image | `html2canvas` |
| Tests | Vitest + React Testing Library |
| Lint / format | ESLint + Prettier |
| Hosting | GitHub Pages (deployed by GitHub Actions on push to `main`) |

**Cost:** ₱0/month (Supabase + GitHub Pages free tiers).

---

## Setup (developer)

> Detailed setup is added as the project progresses. This will become a one-page guide once Task 11 lands.

```bash
# Clone and install
git clone https://github.com/<username>/renters-billing.git
cd renters-billing
npm install

# Configure Supabase
cp .env.example .env.local
# edit .env.local — fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# Run dev server
npm run dev
# → http://localhost:5173

# Quality gates (run before committing)
npm run lint
npm run typecheck
npm run test
npm run build
```

## Quick start (father — once the app is live)

> Filled in during Task 11 with screenshots.

---

## Project conventions

- Specs and plans live under version control: [`docs/SPEC.md`](./docs/SPEC.md), [`PLAN.md`](./PLAN.md).
- AI agents working on this repo follow [`AGENTS.md`](./AGENTS.md).
- Methodology drawn from the user's `aiagents-workflow` Obsidian vault.

## License

Private project — not licensed for redistribution.
