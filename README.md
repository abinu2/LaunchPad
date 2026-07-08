# LaunchPad

AI-powered small business operations suite — five tools on one shared data graph, built for the Google Cloud + Financial Literacy hackathon track. **Hackathon-winning track submission.**

**Live demo:** https://launch-pad-flame.vercel.app

## What it does

LaunchPad gives a small business owner one dashboard instead of five disconnected tools:

- **Quote-to-Cash** — create and send quotes, get paid via Stripe, track payment status end-to-end
- **Receipt Scanner** — scan/upload receipts, auto-extract vendor/amount/category with AI, flag tax-deductible spend
- **Contract Vault** — upload contracts, get AI-generated health scores, obligation tracking, and counter-proposal drafts
- **Compliance Autopilot** — tracks licenses/permits by jurisdiction with 30/14/3-day renewal reminders
- **Growth Radar** — scans for grants, microloans, and SBA funding matched to your business profile; recommends pricing and expense changes; tracks growth milestones

Every tool reads and writes to the same business profile, so a compliance status change or a bank sync from Plaid can immediately affect funding eligibility or growth recommendations elsewhere in the app.

## Tech stack

- **Frontend:** Next.js (App Router), React Server Components
- **Auth:** Auth0
- **Database:** PostgreSQL + Prisma ORM
- **AI:** Groq (text), Google Gemini (vision/OCR), Vertex AI, Document AI
- **Banking:** Plaid
- **Payments:** Stripe
- **Web data:** Tiny Fish (live scraping of SBA.gov, Grants.gov, Kiva, Accion, etc., with AI-generated fallback)
- **Storage:** Vercel Blob
- **Deployment:** Vercel

## Architecture

Frontend (Next.js) -> API Routes (/api/data, /api/ai, /api/plaid, /api/documents, /api/webhooks) -> Service Layer (Auth0, Groq/Gemini/Vertex AI, Plaid, Stripe, Tiny Fish) -> PostgreSQL (Business, Contract, Quote, Receipt, ComplianceItem, FundingOpportunity, GrowthAction, BankTransaction)

Key flows:
- **Contract analysis:** upload -> OCR/text extraction -> Groq/Gemini analysis -> structured health score + obligations stored and displayed
- **Funding discovery:** business profile -> Tiny Fish web scrape (or AI-generated fallback) -> eligibility scoring -> ranked funding opportunities with pre-filled applications
- **Bank sync:** Plaid Link -> transaction sync -> categorization -> live cash balance feeding growth recommendations
- **Quote payment:** quote created -> sent to client's public page -> Stripe checkout -> webhook updates status

See ARCHITECTURE.md and GROWTH_FEATURES.md in this repo for full detail on data models and the Growth Radar scoring logic.

## Getting started

```
git clone https://github.com/abinu2/LaunchPad.git
cd LaunchPad/launchpad
cp .env.local.example .env.local
npm install
npx prisma generate
npm run dev
```

Optional: add a TINYFISH_API_KEY to enable live funding-opportunity scraping instead of the AI-generated fallback.
