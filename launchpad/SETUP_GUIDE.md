# Launchpad Setup Guide

This guide walks you through setting up all the connectors and services needed for Launchpad to work fully.

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in the required values:

```bash
cp .env.local.example .env.local
```

### Required Services

#### 1. Database (PostgreSQL)
- **Provider**: Prisma Cloud or self-hosted PostgreSQL
- **Setup**: Create a PostgreSQL database and set `DATABASE_URL`
- **Example**: `postgresql://user:password@host:5432/launchpad?sslmode=require`

#### 2. Auth0 (Authentication)
- **Website**: https://auth0.com
- **Setup**:
  1. Create an Auth0 account
  2. Create a new application (Regular Web Application)
  3. Set Allowed Callback URLs to `https://your-domain/api/auth/callback`
  4. Copy `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`
  5. Generate `AUTH0_SECRET` (use `openssl rand -hex 32`)

#### 3. Groq API (Fast AI Text Analysis)
- **Website**: https://console.groq.com
- **Setup**:
  1. Sign up for free
  2. Create an API key
  3. Set `GROQ_API_KEY` in `.env.local`
- **Used for**: Contract analysis, receipt analysis, opportunity scanning

#### 4. Gemini API (Vision/OCR)
- **Website**: https://ai.google.dev
- **Setup**:
  1. Create a Google Cloud project
  2. Enable Gemini API
  3. Create an API key
  4. Set `GEMINI_API_KEY` in `.env.local`
- **Used for**: Image receipts, scanned contracts, OCR fallback

#### 5. Plaid (Bank Connections)
- **Website**: https://plaid.com
- **Setup**:
  1. Create a Plaid account
  2. Get your `PLAID_CLIENT_ID` and `PLAID_SECRET`
  3. Set `PLAID_ENV=sandbox` for testing, `production` for live
- **Used for**: Bank transaction sync, cash balance tracking

#### 6. Stripe (Payment Processing)
- **Website**: https://stripe.com
- **Setup**:
  1. Create a Stripe account
  2. Get your API keys from Dashboard → Developers → API Keys
  3. Set `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  4. Create a webhook endpoint at `/api/webhooks/stripe`
  5. Set `STRIPE_WEBHOOK_SECRET` from webhook settings
- **Used for**: Quote payment links, invoice payments

#### 7. Vercel Blob (Document Storage)
- **Website**: https://vercel.com/storage/blob
- **Setup**:
  1. Go to your Vercel project → Storage → Blob
  2. Create a new Blob store
  3. Copy the `BLOB_READ_WRITE_TOKEN`
- **Used for**: Contract uploads, receipt images, document storage

#### 8. Tiny Fish (Web Scraping for Funding)
- **Website**: https://tinyfish.io
- **Setup**:
  1. Create an account
  2. Get your API key
  3. Set `TINYFISH_API_KEY` in `.env.local`
- **Used for**: Scraping current funding opportunities, grants, loans
- **Optional**: If not configured, the system falls back to AI-generated opportunities

#### 9. Google Cloud (Vertex AI - Optional)
- **Website**: https://cloud.google.com
- **Setup**:
  1. Create a Google Cloud project
  2. Enable Vertex AI API
  3. Create a service account with Vertex AI permissions
  4. Set `GOOGLE_CLOUD_PROJECT_ID` and `GOOGLE_CLOUD_REGION`
- **Used for**: Advanced business analysis (fallback to Groq if not configured)

## Database Setup

### 1. Create Database
```bash
# Using PostgreSQL locally
createdb launchpad

# Or use Prisma Cloud: https://www.prisma.io/data-platform
```

### 2. Run Migrations
```bash
cd launchpad
npx prisma migrate dev --name init
```

### 3. Generate Prisma Client
```bash
npx prisma generate
```

## API Routes Overview

### Authentication
- `POST /api/auth/[...auth0]` - Auth0 callback handler

### Data Management
- `GET/POST /api/data/businesses` - Business CRUD
- `GET/POST /api/data/businesses/[id]/contracts` - Contract management
- `GET/POST /api/data/businesses/[id]/receipts` - Receipt management
- `GET/POST /api/data/businesses/[id]/quotes` - Quote management
- `GET/POST /api/data/businesses/[id]/compliance` - Compliance tracking
- `GET/POST /api/data/businesses/[id]/funding` - Funding opportunities
- `GET/POST /api/data/businesses/[id]/growth-actions` - Growth recommendations

### AI Analysis
- `POST /api/ai/analyze-contract` - Contract analysis with streaming
- `POST /api/ai/analyze-receipt` - Receipt analysis
- `POST /api/ai/analyze-taxes` - Tax analysis
- `POST /api/ai/business-advisor` - Onboarding questionnaire analysis
- `POST /api/ai/generate-contract` - Contract generation
- `POST /api/ai/generate-quote` - Quote generation
- `POST /api/ai/generate-compliance` - Compliance checklist generation
- `POST /api/ai/scan-opportunities` - Growth opportunities scanning
- `POST /api/ai/scan-funding` - Funding opportunities scanning (with Tiny Fish)

### Bank Integration
- `POST /api/plaid/create-link-token` - Create Plaid Link token
- `POST /api/plaid/exchange-token` - Exchange public token for access token
- `POST /api/plaid/sync` - Sync bank transactions

### Document Management
- `POST /api/documents/upload` - Upload to Vercel Blob
- `POST /api/documents/client-upload` - Client-side upload handler

### Payments
- `POST /api/quotes/[id]` - Quote detail and update
- `POST /api/webhooks/stripe` - Stripe webhook handler

## Features by Tab

### Dashboard
- **Overview**: Business snapshot, key metrics
- **Finances**: Cash balance, revenue, expenses, P&L
- **Growth**: Actions, funding opportunities, milestones
- **Compliance**: License tracking, renewal reminders
- **Protection**: Insurance, liability, contracts
- **Taxes**: Tax estimates, deduction tracking

### Contracts
- Upload and analyze contracts
- Extract key terms, obligations, renewal dates
- Generate counter-proposals
- Track contract obligations

### Quotes
- Create professional quotes
- Send to clients
- Track acceptance and payment
- Generate contracts from accepted quotes

### Receipts
- Scan receipt images
- Auto-categorize expenses
- Flag tax deductions
- Track spending by category

### Growth Tab Features
- **Actions**: AI-generated pricing and expense recommendations
- **Funding**: Grants, microloans, SBA loans, competitions
- **Milestones**: Revenue and operating time milestones
- **Weekly Digest**: Business snapshot and upcoming deadlines

## Funding Opportunities

The system finds funding through two methods:

### 1. Tiny Fish Web Scraping (Recommended)
If `TINYFISH_API_KEY` is configured, the system scrapes real, current opportunities from:
- SBA.gov
- Grants.gov
- SCORE.org
- Kiva.org
- Accion.org

### 2. AI Generation (Fallback)
If Tiny Fish is not configured, the system uses Groq/Gemini to generate realistic opportunities based on:
- Business type and location
- Operating history
- Revenue
- Employee count
- Eligibility criteria

## Testing

### Local Development
```bash
cd launchpad
npm run dev
```

Visit `http://localhost:3000`

### Test Credentials
- **Plaid**: Use sandbox credentials (provided in setup)
- **Stripe**: Use test card `4242 4242 4242 4242`
- **Auth0**: Use your test user

## Deployment

### Vercel
```bash
# Push to GitHub, connect to Vercel
# Set environment variables in Vercel dashboard
# Deploy automatically on push
```

### Environment Variables on Vercel
1. Go to Project Settings → Environment Variables
2. Add all variables from `.env.local`
3. Redeploy

## Troubleshooting

### "API key not configured"
- Check that all required API keys are in `.env.local`
- Restart the dev server after adding new variables

### "Database connection failed"
- Verify `DATABASE_URL` is correct
- Check database is running and accessible
- Run `npx prisma db push` to sync schema

### "Plaid connection failed"
- Verify `PLAID_CLIENT_ID` and `PLAID_SECRET` are correct
- Check `PLAID_ENV` matches your account (sandbox vs production)

### "Stripe webhook not working"
- Verify webhook endpoint is publicly accessible
- Check `STRIPE_WEBHOOK_SECRET` is correct
- Test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

## Next Steps

1. Set up all environment variables
2. Run database migrations
3. Test authentication with Auth0
4. Test Plaid connection with sandbox credentials
5. Test AI analysis with a sample contract
6. Configure Tiny Fish for funding opportunities
7. Deploy to Vercel

## Support

For issues or questions:
- Check the troubleshooting section above
- Review API documentation in route files
- Check Prisma schema for data structure
