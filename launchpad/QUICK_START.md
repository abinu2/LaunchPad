# Quick Start Guide

Get Launchpad running in 5 minutes.

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Git

## 1. Clone & Install

```bash
git clone <repo>
cd launchpad
npm install
```

## 2. Setup Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your API keys:

### Minimum Required
```
DATABASE_URL=postgresql://...
AUTH0_DOMAIN=...
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...
AUTH0_SECRET=...
GROQ_API_KEY=...
GEMINI_API_KEY=...
PLAID_CLIENT_ID=...
PLAID_SECRET=...
BLOB_READ_WRITE_TOKEN=...
```

### Optional (for funding opportunities)
```
TINYFISH_API_KEY=...
```

## 3. Database Setup

```bash
cd launchpad
npx prisma migrate dev --name init
```

## 4. Start Dev Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## 5. Test Features

### Create a Business
1. Sign in with Auth0
2. Complete onboarding questionnaire
3. Save business profile

### Test Funding Scan
1. Go to Growth tab
2. Click "Scan for opportunities"
3. View funding recommendations

### Test Bank Connection
1. Go to Finances tab
2. Click "Link bank account"
3. Use Plaid sandbox credentials

### Create a Quote
1. Go to Quotes tab
2. Create new quote
3. Send to test email

## Key Files

### API Routes
- `src/app/api/ai/scan-funding/route.ts` - Funding opportunities
- `src/app/api/plaid/` - Bank connections
- `src/app/api/quotes/` - Quote management
- `src/app/api/webhooks/stripe/` - Payment webhooks

### Pages
- `src/app/dashboard/growth/page.tsx` - Growth tab
- `src/app/quotes/page.tsx` - Quotes list
- `src/app/receipts/page.tsx` - Receipts

### Libraries
- `src/lib/tinyfish.ts` - Web scraping for funding
- `src/lib/groq.ts` - AI analysis
- `src/lib/plaid.ts` - Bank integration

## Environment Variables Explained

| Variable | Purpose | Required |
|----------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection | Yes |
| `AUTH0_*` | Authentication | Yes |
| `GROQ_API_KEY` | AI text analysis | Yes |
| `GEMINI_API_KEY` | Vision/OCR | Yes |
| `PLAID_*` | Bank connections | Yes |
| `STRIPE_*` | Payment processing | No |
| `BLOB_READ_WRITE_TOKEN` | Document storage | Yes |
| `TINYFISH_API_KEY` | Web scraping | No |

## Troubleshooting

### "API key not configured"
- Check `.env.local` has all required keys
- Restart dev server after adding keys

### "Database connection failed"
- Verify `DATABASE_URL` is correct
- Check PostgreSQL is running
- Run `npx prisma db push`

### "Auth0 login fails"
- Verify `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`
- Check callback URL in Auth0 dashboard

### "Plaid connection fails"
- Verify `PLAID_CLIENT_ID` and `PLAID_SECRET`
- Check `PLAID_ENV=sandbox` for testing

## Next Steps

1. **Configure all services** (see SETUP_GUIDE.md)
2. **Test all features** (see GROWTH_FEATURES.md)
3. **Deploy to Vercel** (see SETUP_GUIDE.md)
4. **Monitor and iterate**

## Documentation

- `SETUP_GUIDE.md` - Complete setup instructions
- `GROWTH_FEATURES.md` - Growth tab features
- `IMPLEMENTATION_SUMMARY.md` - What was implemented

## Support

Check the documentation files for detailed information about each feature.
