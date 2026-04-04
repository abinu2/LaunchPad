# Launchpad Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Dashboard  │  Contracts  │  Quotes  │  Receipts  │  Growth     │
│  ├─ Home    │ ├─ Upload   │ ├─ List  │ ├─ Scan    │ ├─ Actions  │
│  ├─ Finance │ ├─ Analyze  │ ├─ Create│ ├─ Track   │ ├─ Funding  │
│  ├─ Growth  │ ├─ Manage   │ ├─ Send  │ ├─ Export  │ ├─ Milestones
│  ├─ Compliance
│  ├─ Protection
│  └─ Taxes
│
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    API Layer (Next.js Routes)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  /api/data/          /api/ai/              /api/plaid/          │
│  ├─ businesses       ├─ analyze-contract   ├─ create-link-token │
│  ├─ contracts        ├─ analyze-receipt    ├─ exchange-token    │
│  ├─ quotes           ├─ analyze-taxes      └─ sync              │
│  ├─ receipts         ├─ business-advisor                        │
│  ├─ compliance       ├─ generate-contract  /api/documents/      │
│  ├─ funding          ├─ generate-quote     ├─ upload            │
│  └─ growth-actions   ├─ generate-compliance└─ client-upload     │
│                      ├─ scan-opportunities                       │
│                      └─ scan-funding       /api/webhooks/       │
│                                            └─ stripe            │
│
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Service Layer (Libraries)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Authentication      AI Services           External Services    │
│  ├─ Auth0           ├─ Groq (text)        ├─ Plaid (banking)   │
│  └─ JWT             ├─ Gemini (vision)    ├─ Stripe (payments) │
│                     ├─ Vertex AI          ├─ Tiny Fish (web)   │
│  Database           └─ Document AI        └─ Vercel Blob       │
│  ├─ Prisma ORM                                                  │
│  └─ PostgreSQL      Business Logic                              │
│                     ├─ business-graph.ts                        │
│                     ├─ tinyfish.ts                              │
│                     ├─ groq.ts                                  │
│                     ├─ plaid.ts                                 │
│                     └─ stripe.ts                                │
│
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Data Layer (Database)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  PostgreSQL Database                                             │
│  ├─ Business (profiles, financials)                             │
│  ├─ Contract (documents, analysis)                              │
│  ├─ Quote (proposals, payments)                                 │
│  ├─ Receipt (expenses, categorization)                          │
│  ├─ ComplianceItem (licenses, permits)                          │
│  ├─ FundingOpportunity (grants, loans)                          │
│  ├─ GrowthAction (recommendations)                              │
│  ├─ BankTransaction (Plaid sync)                                │
│  ├─ PlaidConnection (bank links)                                │
│  └─ User (Auth0 integration)                                    │
│
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Onboarding Flow
```
User → Auth0 Login → Onboarding Chat → AI Analysis → Business Created
                                              ↓
                                    Compliance Items Added
                                    Growth Actions Generated
```

### 2. Contract Analysis Flow
```
User Uploads Contract → File to Vercel Blob → Extract Text/OCR
                                                    ↓
                                    Groq/Gemini AI Analysis
                                                    ↓
                                    Parse JSON Response
                                                    ↓
                                    Store in Database
                                                    ↓
                                    Display to User
```

### 3. Funding Discovery Flow
```
User Clicks "Scan" → Analyze Business Profile → Search Funding
                                                    ↓
                                    ┌─────────────┴─────────────┐
                                    ↓                           ↓
                            Tiny Fish Web Scraping    AI Generation (Fallback)
                                    ↓                           ↓
                                    └─────────────┬─────────────┘
                                                  ↓
                                    Eligibility Matching
                                                  ↓
                                    Store in Database
                                                  ↓
                                    Display to User
```

### 4. Bank Sync Flow
```
User Clicks "Link Bank" → Plaid Link Token → User Authenticates
                                                    ↓
                                    Exchange Public Token
                                                    ↓
                                    Store Access Token
                                                    ↓
                                    Fetch Transactions
                                                    ↓
                                    Categorize & Store
                                                    ↓
                                    Update Cash Balance
```

### 5. Quote Payment Flow
```
User Creates Quote → Send to Client → Client Views Public Page
                                                    ↓
                                    Client Clicks "Accept & Pay"
                                                    ↓
                                    Stripe Payment Form
                                                    ↓
                                    Payment Processed
                                                    ↓
                                    Webhook Notification
                                                    ↓
                                    Update Quote Status
```

## Component Architecture

### Frontend Components

```
App
├─ Layout
│  ├─ AuthContext
│  ├─ BusinessContext
│  └─ Navigation
│
├─ Dashboard
│  ├─ DashboardNav
│  ├─ GettingStartedChecklist
│  ├─ FinancesQuadrant
│  ├─ GrowthQuadrant
│  ├─ ComplianceQuadrant
│  └─ ProtectionQuadrant
│
├─ Growth
│  ├─ ActionsTab
│  ├─ FundingTab
│  ├─ MilestonesTab
│  ├─ DigestTab
│  └─ ApplicationModal
│
├─ Contracts
│  ├─ ContractUploadZone
│  ├─ ContractList
│  ├─ ContractDetail
│  ├─ GenerateContractModal
│  ├─ CounterProposalModal
│  ├─ ObligationTracker
│  └─ ClauseAccordion
│
├─ Quotes
│  ├─ QuoteList
│  ├─ QuoteDetail
│  ├─ QuoteCreateModal
│  └─ PublicQuotePage
│
├─ Receipts
│  ├─ ReceiptList
│  ├─ ReceiptUploadZone
│  └─ ReceiptDetail
│
└─ Onboarding
   ├─ OnboardingChat
   ├─ OnboardingResults
   └─ PlaidConnectButton
```

### API Route Structure

```
/api
├─ /auth
│  └─ /[...auth0]
│
├─ /data
│  └─ /businesses
│     ├─ route.ts (GET/POST)
│     └─ /[businessId]
│        ├─ /contracts
│        ├─ /quotes
│        ├─ /receipts
│        ├─ /compliance
│        ├─ /funding
│        ├─ /growth-actions
│        ├─ /bank-transactions
│        └─ /plaid-connections
│
├─ /ai
│  ├─ /analyze-contract
│  ├─ /analyze-receipt
│  ├─ /analyze-taxes
│  ├─ /business-advisor
│  ├─ /generate-contract
│  ├─ /generate-quote
│  ├─ /generate-compliance
│  ├─ /scan-opportunities
│  └─ /scan-funding
│
├─ /plaid
│  ├─ /create-link-token
│  ├─ /exchange-token
│  └─ /sync
│
├─ /documents
│  ├─ /upload
│  └─ /client-upload
│
├─ /quotes
│  └─ /[id]
│
└─ /webhooks
   └─ /stripe
```

## Database Schema

```
Business
├─ id (PK)
├─ auth0Id (FK → Auth0)
├─ businessName
├─ businessType
├─ entityType
├─ entityState
├─ financials (JSON)
├─ onboardingStage
├─ completedSteps (JSON)
└─ timestamps

Contract (FK → Business)
├─ id (PK)
├─ businessId (FK)
├─ fileName
├─ fileUrl
├─ contractType
├─ counterpartyName
├─ effectiveDate
├─ expirationDate
├─ healthScore
├─ analysis (JSON)
├─ obligations (JSON)
└─ timestamps

Quote (FK → Business)
├─ id (PK)
├─ businessId (FK)
├─ clientName
├─ services (JSON)
├─ subtotal
├─ taxAmount
├─ total
├─ status
├─ sentAt
├─ paidAt
├─ stripePaymentIntentId
└─ timestamps

Receipt (FK → Business)
├─ id (PK)
├─ businessId (FK)
├─ imageUrl
├─ vendor
├─ amount
├─ date
├─ category
├─ deductibleAmount
└─ timestamps

ComplianceItem (FK → Business)
├─ id (PK)
├─ businessId (FK)
├─ title
├─ jurisdiction
├─ category
├─ status
├─ expirationDate
├─ renewalDate
├─ reminderSent30Days
├─ reminderSent14Days
├─ reminderSent3Days
└─ timestamps

FundingOpportunity (FK → Business)
├─ id (PK)
├─ businessId (FK)
├─ name
├─ provider
├─ type
├─ amountMin
├─ amountMax
├─ interestRate
├─ eligibilityMatch
├─ eligibilityCriteria (JSON)
├─ applicationUrl
├─ applicationDeadline
├─ status
├─ fitScore
├─ recommendation
└─ timestamps

GrowthAction (FK → Business)
├─ id (PK)
├─ businessId (FK)
├─ type
├─ title
├─ impact
├─ reasoning
├─ urgency
├─ effort
├─ dismissed
└─ timestamps

BankTransaction (FK → Business)
├─ id (PK)
├─ businessId (FK)
├─ transactionId (unique)
├─ accountId
├─ amount
├─ date
├─ name
├─ merchantName
├─ category (JSON)
├─ pending
└─ timestamps

PlaidConnection (FK → Business)
├─ id (PK)
├─ businessId (FK)
├─ itemId (unique)
├─ accessToken
├─ institutionId
├─ institutionName
├─ accounts (JSON)
├─ status
├─ lastSyncedAt
└─ timestamps
```

## External Service Integration

### Authentication (Auth0)
```
User → Auth0 Login → JWT Token → API Requests
                                      ↓
                            requireBusinessAccess()
                                      ↓
                            Verify JWT & Business Access
```

### AI Services
```
Document/Text → Groq/Gemini → JSON Response → Parse & Store
                                      ↓
                            Error Handling & Fallback
```

### Banking (Plaid)
```
User → Plaid Link → Public Token → Exchange → Access Token
                                        ↓
                            Fetch Accounts & Transactions
                                        ↓
                            Store in Database
```

### Payments (Stripe)
```
Quote → Payment Link → Stripe Checkout → Payment Processed
                                              ↓
                                    Webhook Notification
                                              ↓
                                    Update Quote Status
```

### Web Scraping (Tiny Fish)
```
Search Query → Tiny Fish API → Web Scraping → Results
                                    ↓
                            Parse & Structure
                                    ↓
                            Store in Database
```

### Document Storage (Vercel Blob)
```
File Upload → Vercel Blob → URL → Store in Database
                                        ↓
                            Retrieve on Demand
```

## Security Architecture

```
┌─────────────────────────────────────────┐
│         Frontend (Client)                │
│  - No sensitive data stored              │
│  - HTTPS only                            │
│  - JWT in secure cookies                 │
└─────────────────────────────────────────┘
              ↓ HTTPS
┌─────────────────────────────────────────┐
│         API Layer (Next.js)              │
│  - requireBusinessAccess() middleware    │
│  - Input validation                      │
│  - Rate limiting                         │
│  - Error handling                        │
└─────────────────────────────────────────┘
              ↓ Encrypted
┌─────────────────────────────────────────┐
│         Database (PostgreSQL)            │
│  - SSL/TLS connection                    │
│  - Parameterized queries (Prisma)        │
│  - Row-level security                    │
│  - Encrypted sensitive fields            │
└─────────────────────────────────────────┘
```

## Deployment Architecture

```
GitHub Repository
        ↓
    Vercel CI/CD
        ↓
    Build & Test
        ↓
    Deploy to Edge
        ↓
    ┌─────────────────────┐
    │  Vercel Functions   │
    │  - API Routes       │
    │  - Streaming        │
    │  - Edge Middleware  │
    └─────────────────────┘
        ↓
    ┌─────────────────────┐
    │  Vercel Blob        │
    │  - Document Storage │
    │  - CDN Delivery     │
    └─────────────────────┘
        ↓
    ┌─────────────────────┐
    │  PostgreSQL         │
    │  - Data Persistence │
    │  - Backups          │
    └─────────────────────┘
```

## Performance Optimization

### Frontend
- Code splitting by route
- Image optimization
- CSS-in-JS with Tailwind
- React Server Components
- Streaming responses

### API
- Database query optimization
- Connection pooling
- Caching strategies
- Streaming for long operations
- Batch operations

### Database
- Indexes on common queries
- Denormalized financials
- JSON fields for flexibility
- Connection pooling

## Monitoring & Observability

```
Application
    ↓
Error Tracking (Sentry)
Performance Monitoring (Vercel Analytics)
Database Monitoring (PostgreSQL Logs)
API Monitoring (Vercel Logs)
    ↓
Alerts & Notifications
    ↓
Incident Response
```

---

This architecture provides a scalable, secure, and maintainable foundation for Launchpad's growth and future enhancements.
