# LAUNCHPAD — AI Coding Agent Prompts (Revised)

## Revision Notes
- Standardized Firebase Admin SDK to server-only usage (never imported client-side)
- All Firestore subcollection paths unified: `businesses/{businessId}/{collection}`
- `next.config.js` → `next.config.ts` throughout
- `Contract` type extended with `obligations[]` for ICI-style live obligation tracking
- `ContractObligation` type added to `contract.ts`
- `ComplianceItem` now includes `renewalFrequency` field (referenced in Phase 6 but missing from Phase 0B)
- `Quote.pricingAnalysis` marked optional (`?`) since it's populated async by AI
- Contract vault routes clarified: list at `/contracts`, upload+analysis at `/contracts/upload`, detail at `/contracts/[id]`
- Phase 5 enhanced with obligation extraction, obligation monitoring, contract health score, and playbook templates
- All Gemini prompts use consistent JSON output format matching TypeScript types

---

## PHASE 0: PROJECT SCAFFOLDING & INFRASTRUCTURE

---

### PROMPT 0A: Project Initialization

```
You are building a full-stack application called "Launchpad" — an AI-powered business partner for first-time small business entrepreneurs. The application helps underserved entrepreneurs who can't afford attorneys, CPAs, and financial advisors by providing AI-driven contract analysis, tax guidance, compliance tracking, funding discovery, and financial intelligence — all personalized to their specific business, location, and situation.

TECH STACK:
- Frontend: Next.js 14+ (App Router) with TypeScript and Tailwind CSS
- Backend API: Next.js API routes (server-side only for Firebase Admin and AI calls)
- Database: Firebase Firestore
- File Storage: Firebase Storage
- AI: Google Vertex AI with Gemini 2.0 Flash (primary) or Gemini 1.5 Pro (long-context contract analysis)
- Authentication: Firebase Auth (Google sign-in + email/password)
- Deployment: Vercel (primary) or Google Cloud Run
- Payment Processing: Stripe

CRITICAL ARCHITECTURE RULES:
- Firebase Admin SDK (firebase-admin) is ONLY used in API routes (server-side). Never import it in client components or pages.
- Firebase client SDK (firebase/app, firebase/auth, firebase/firestore) is used in client components and lib/firebase.ts.
- All Vertex AI calls happen in API routes only — never client-side.
- All Stripe secret key usage happens in API routes only.
- Environment variables prefixed NEXT_PUBLIC_ are safe for client. All others are server-only.

PROJECT STRUCTURE:
launchpad/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                        # Landing / redirect to onboarding or dashboard
│   │   ├── login/page.tsx                  # Auth page
│   │   ├── onboarding/page.tsx             # Business setup wizard
│   │   ├── dashboard/
│   │   │   ├── page.tsx                    # Main dashboard (4 quadrants)
│   │   │   ├── protection/page.tsx         # Contract vault overview
│   │   │   ├── compliance/page.tsx         # Compliance checklist
│   │   │   ├── finances/page.tsx           # P&L and tax dashboard
│   │   │   └── growth/page.tsx             # Growth radar
│   │   ├── quotes/
│   │   │   ├── page.tsx                    # Quote list + creation
│   │   │   ├── [id]/page.tsx               # Quote detail
│   │   │   └── public/[id]/page.tsx        # Public client-facing quote (no auth)
│   │   ├── contracts/
│   │   │   ├── page.tsx                    # Contract vault list
│   │   │   ├── upload/page.tsx             # Upload + analysis flow
│   │   │   └── [id]/page.tsx               # Contract detail + analysis results
│   │   ├── receipts/page.tsx               # Receipt scanner
│   │   └── api/
│   │       ├── ai/
│   │       │   ├── analyze-contract/route.ts
│   │       │   ├── analyze-receipt/route.ts
│   │       │   ├── generate-contract/route.ts
│   │       │   ├── generate-quote/route.ts
│   │       │   ├── business-advisor/route.ts
│   │       │   └── scan-opportunities/route.ts
│   │       ├── documents/
│   │       │   └── upload/route.ts
│   │       ├── quotes/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       ├── accept/route.ts
│   │       │       └── pay/route.ts
│   │       └── webhooks/
│   │           └── stripe/route.ts
│   ├── components/
│   │   ├── ui/                             # Reusable primitives (Button, Card, Badge, etc.)
│   │   ├── dashboard/
│   │   ├── contracts/
│   │   ├── quotes/
│   │   ├── receipts/
│   │   └── onboarding/
│   ├── lib/
│   │   ├── firebase.ts                     # CLIENT SDK only — auth, firestore, storage
│   │   ├── firebase-admin.ts               # ADMIN SDK only — used in API routes
│   │   ├── vertex-ai.ts                    # Vertex AI client — used in API routes only
│   │   ├── stripe.ts                       # Stripe server client — API routes only
│   │   └── utils.ts
│   ├── services/
│   │   ├── business-graph.ts               # Firestore CRUD (client SDK)
│   │   ├── contract-analyzer.ts
│   │   ├── receipt-processor.ts
│   │   ├── tax-calculator.ts
│   │   ├── compliance-tracker.ts
│   │   ├── funding-scanner.ts
│   │   └── quote-engine.ts
│   ├── types/
│   │   ├── business.ts
│   │   ├── contract.ts
│   │   ├── financial.ts
│   │   ├── quote.ts
│   │   └── compliance.ts
│   ├── prompts/
│   │   ├── contract-analysis.ts
│   │   ├── receipt-analysis.ts
│   │   ├── business-advisor.ts
│   │   ├── tax-advisor.ts
│   │   └── quote-pricing.ts
│   └── context/
│       ├── AuthContext.tsx                 # Firebase Auth state
│       └── BusinessContext.tsx             # Cached BusinessProfile for the session
├── public/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── .env.local.example
└── README.md

TASKS:
1. Initialize Next.js 14 project with TypeScript and Tailwind CSS (use `npx create-next-app@latest`)
2. Install dependencies:
   firebase firebase-admin @google-cloud/vertexai stripe @stripe/stripe-js
   lucide-react date-fns zod react-dropzone recharts clsx tailwind-merge
3. Create the complete folder structure with placeholder files (each placeholder exports a default component or empty function)
4. Create .env.local.example:
   # Google Cloud
   GOOGLE_CLOUD_PROJECT_ID=
   GOOGLE_CLOUD_LOCATION=us-central1
   GOOGLE_APPLICATION_CREDENTIALS=          # path to service account JSON (local dev only)
   GOOGLE_SERVICE_ACCOUNT_KEY=              # base64-encoded service account JSON (for Vercel)

   # Firebase Client (safe for browser)
   NEXT_PUBLIC_FIREBASE_API_KEY=
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
   NEXT_PUBLIC_FIREBASE_APP_ID=

   # Firebase Admin (server only — never NEXT_PUBLIC_)
   FIREBASE_ADMIN_PROJECT_ID=
   FIREBASE_ADMIN_CLIENT_EMAIL=
   FIREBASE_ADMIN_PRIVATE_KEY=              # the private key string from service account JSON

   # Stripe (server only)
   STRIPE_SECRET_KEY=
   STRIPE_WEBHOOK_SECRET=

   # Stripe (client safe)
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

5. Create lib/firebase.ts — Firebase CLIENT SDK initialization:
   - Initialize app (guard against re-initialization with getApps() check)
   - Export: auth (getAuth), db (getFirestore), storage (getStorage)
   - Export helper: onAuthStateChange wrapper

6. Create lib/firebase-admin.ts — Firebase ADMIN SDK initialization:
   - Use FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY env vars
   - Guard against re-initialization with getApps() check
   - Export: adminDb (getFirestore from admin), adminAuth (getAuth from admin)
   - Add comment: "This file must only be imported in API routes (server-side)"

7. Create lib/vertex-ai.ts:
   - Initialize VertexAI client using GOOGLE_CLOUD_PROJECT_ID and GOOGLE_CLOUD_LOCATION
   - Export getGeminiModel(modelName: string) helper that returns a GenerativeModel
   - Default model: "gemini-2.0-flash-001"
   - Long-context model: "gemini-1.5-pro" (for contract analysis)
   - Add comment: "This file must only be imported in API routes (server-side)"

8. Create context/AuthContext.tsx:
   - Wraps Firebase onAuthStateChanged
   - Provides: user, loading, signIn, signUp, signOut, signInWithGoogle
   - Redirects unauthenticated users to /login

9. Create context/BusinessContext.tsx:
   - Fetches and caches the BusinessProfile for the authenticated user
   - Provides: business, loading, refreshBusiness
   - Used by all dashboard pages to avoid redundant Firestore reads

10. Create the root layout (app/layout.tsx):
    - Wrap with AuthContext and BusinessContext providers
    - Design system: Inter font, neutral-50 background, slate color palette
    - Trustworthy color palette: primary blue (#2563EB), success green (#16A34A), warning amber (#D97706), danger red (#DC2626)
    - No gradients. Clean, professional, calm.

11. Create app/login/page.tsx:
    - Email/password sign in and sign up (toggle between modes)
    - Google sign-in button
    - After auth: redirect to /onboarding if no business profile exists, else /dashboard

12. Create a shared ui/Button, ui/Card, ui/Badge, ui/Spinner component set using Tailwind

Do NOT build any features. Just scaffolding, config, auth, and shared UI primitives. Verify the app compiles and the login page renders.
```

---

### PROMPT 0B: TypeScript Types & Data Model

```
Context: "Launchpad" scaffolding is complete. Now define the complete TypeScript data model — the Business Intelligence Graph. Every feature reads from and writes to these types. Get them right before building anything else.

IMPORTANT: All types use Firestore Timestamp for server timestamps and Date for client-side date fields. Import Timestamp from "firebase/firestore" in type files.

FILE: src/types/business.ts

import { Timestamp } from "firebase/firestore";

export interface BusinessProfile {
  id: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;

  businessName: string;
  businessType: string;
  naicsCode: string;
  entityType: "sole_prop" | "llc" | "s_corp" | "c_corp" | "partnership";
  entityState: string;
  ein: string | null;
  formationDate: string | null;         // ISO date string (avoids Firestore Date serialization issues)

  businessAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
    county: string;
  };
  operatingJurisdictions: string[];

  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  hasOtherJob: boolean;
  estimatedW2Income: number | null;
  isFirstTimeBusiness: boolean;

  serviceTypes: ServiceType[];
  targetMarket: "residential" | "commercial" | "both";
  usesPersonalVehicle: boolean;
  hasEmployees: boolean;
  employeeCount: number;
  hasContractors: boolean;
  contractorCount: number;

  financials: {
    monthlyRevenueAvg: number;
    monthlyExpenseAvg: number;
    profitMargin: number;
    totalRevenueYTD: number;
    totalExpensesYTD: number;
    currentCashBalance: number | null;
    lastUpdated: Timestamp;
  };

  onboardingStage: "idea" | "formation" | "protection" | "operating" | "growing";
  completedSteps: string[];
}

export interface ServiceType {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  estimatedDuration: number;            // minutes
  supplyCost: number;
  vehicleTypes?: VehiclePricing[];
}

export interface VehiclePricing {
  vehicleType: string;
  priceMultiplier: number;
}

FILE: src/types/contract.ts

import { Timestamp } from "firebase/firestore";

// ICI-style obligation tracking — each extracted obligation is monitored live
export interface ContractObligation {
  id: string;
  clauseRef: string;                    // e.g. "Section 7.3"
  description: string;                  // plain English: what must be done
  party: "business" | "counterparty";   // who must fulfill it
  triggerType: "date" | "event" | "threshold" | "recurring";
  triggerDescription: string;           // "30 days before auto-renewal" / "when revenue exceeds $5,000/mo"
  dueDate: string | null;               // ISO date string, if determinable
  recurringFrequency: "daily" | "weekly" | "monthly" | "quarterly" | "annual" | null;
  status: "pending" | "fulfilled" | "at_risk" | "breached" | "not_applicable";
  monitoredField: string | null;        // BusinessProfile field to watch, e.g. "financials.monthlyRevenueAvg"
  monitoredThreshold: number | null;    // value that triggers a status change
  lastChecked: Timestamp;
  notes: string | null;
}

export interface Contract {
  id: string;
  businessId: string;
  uploadedAt: Timestamp;
  fileName: string;
  fileUrl: string;
  fileType: "pdf" | "docx" | "image";

  contractType: "service_agreement" | "vendor_agreement" | "lease" | "partnership" | "employment" | "financing" | "other";
  counterpartyName: string;
  effectiveDate: string | null;         // ISO date string
  expirationDate: string | null;
  autoRenews: boolean;
  autoRenewalDate: string | null;
  autoRenewalNoticePeriod: number | null;
  terminationNoticePeriod: number | null;
  totalValue: number | null;
  monthlyValue: number | null;

  analysis: ContractAnalysis;
  obligations: ContractObligation[];    // ICI-style: extracted and monitored obligations
  healthScore: number;                  // 0-100, degrades as obligations approach deadlines or conditions change
  status: "active" | "expiring_soon" | "expired" | "draft" | "under_review";
}

export interface ContractAnalysis {
  summary: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  clauses: ClauseAnalysis[];
  missingProtections: string[];
  conflicts: ContractConflict[];
  recommendations: string[];
  estimatedAnnualCost: number | null;
  counterProposalDraft: string | null;
  playbookDeviations: PlaybookDeviation[];  // clauses that differ from standard playbook
}

export interface ClauseAnalysis {
  clauseNumber: string;
  clauseTitle: string;
  originalText: string;
  plainEnglish: string;
  riskLevel: "safe" | "caution" | "danger";
  issue: string | null;
  recommendation: string | null;
  businessImpact: string | null;
  playbookClause: string | null;        // the preferred standard language, if different
}

export interface PlaybookDeviation {
  clauseTitle: string;
  currentLanguage: string;
  playbookLanguage: string;
  reason: string;                       // why the playbook version is better
}

export interface ContractConflict {
  thisClause: string;
  conflictingContractId: string;
  conflictingContractName: string;
  conflictingClause: string;
  description: string;
  recommendation: string;
}

FILE: src/types/financial.ts

import { Timestamp } from "firebase/firestore";

export type ExpenseCategory =
  | "supplies" | "vehicle_fuel" | "vehicle_maintenance" | "insurance"
  | "rent" | "utilities" | "marketing" | "equipment" | "professional_services"
  | "meals_entertainment" | "office_supplies" | "software" | "training" | "other";

export interface Receipt {
  id: string;
  businessId: string;
  uploadedAt: Timestamp;
  imageUrl: string;
  vendor: string;
  amount: number;
  date: string;                         // ISO date string
  lineItems: LineItem[];
  category: ExpenseCategory;
  taxClassification: "cogs" | "expense" | "asset" | "personal" | "mixed";
  businessPercentage: number;
  deductibleAmount: number;
  taxNotes: string;
  isReconciled: boolean;
  associatedMileage: number | null;
  needsMoreInfo: boolean;
  pendingQuestion: string | null;       // AI question awaiting user answer
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface TaxSummary {
  businessId: string;
  taxYear: number;
  quarter: 1 | 2 | 3 | 4;
  grossRevenue: number;
  returnsAndAllowances: number;
  netRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  expenses: Record<ExpenseCategory, number>;
  totalExpenses: number;
  mileageDeduction: number;
  homeOfficeDeduction: number;
  healthInsuranceDeduction: number;
  section199ADeduction: number;
  totalDeductions: number;
  netTaxableIncome: number;
  estimatedFederalTax: number;
  estimatedStateTax: number;
  estimatedSelfEmploymentTax: number;
  totalEstimatedTax: number;
  quarterlyPayments: {
    q1: { due: string; amount: number; paid: boolean; paidDate: string | null };
    q2: { due: string; amount: number; paid: boolean; paidDate: string | null };
    q3: { due: string; amount: number; paid: boolean; paidDate: string | null };
    q4: { due: string; amount: number; paid: boolean; paidDate: string | null };
  };
  missedDeductions: { description: string; estimatedValue: number; action: string }[];
  taxSavingOpportunities: string[];
}

export interface ProfitAndLoss {
  businessId: string;
  period: "monthly" | "quarterly" | "annual";
  startDate: string;
  endDate: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: Record<ExpenseCategory, number>;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  comparedToPreviousPeriod: {
    revenueChange: number;
    expenseChange: number;
    profitChange: number;
  };
}

FILE: src/types/quote.ts

import { Timestamp } from "firebase/firestore";

export interface Quote {
  id: string;
  businessId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  services: QuoteLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  pricingAnalysis?: {                   // optional — populated async by AI after quote creation
    supplyCost: number;
    estimatedLaborHours: number;
    estimatedLaborCost: number;
    profitMargin: number;
    marketComparison: string;
    recommendation: string;
    suggestedPrice: number;
  };
  status: "draft" | "sent" | "viewed" | "accepted" | "declined" | "expired" | "invoiced" | "paid";
  sentAt: Timestamp | null;
  viewedAt: Timestamp | null;
  acceptedAt: Timestamp | null;
  paidAt: Timestamp | null;
  contractGenerated: boolean;
  contractId: string | null;
  contractSignedAt: Timestamp | null;
  stripePaymentIntentId: string | null;
  paymentMethod: "stripe" | "venmo" | "cash" | "check" | null;
  paymentUrl: string | null;
  scheduledDate: string | null;         // ISO date string
  scheduledTime: string | null;
  scheduledAddress: string | null;
  followUpsSent: number;
  lastFollowUpAt: Timestamp | null;
  nextFollowUpAt: Timestamp | null;
}

export interface QuoteLineItem {
  serviceId: string;
  serviceName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  addOns: { name: string; price: number }[];
}

FILE: src/types/compliance.ts

import { Timestamp } from "firebase/firestore";

export interface ComplianceItem {
  id: string;
  businessId: string;
  title: string;
  description: string;
  jurisdiction: "federal" | "state" | "county" | "city";
  jurisdictionName: string;
  category: "license" | "registration" | "permit" | "tax_filing" | "insurance" | "report";
  isRequired: boolean;
  legalCitation: string | null;
  status: "compliant" | "due_soon" | "overdue" | "not_started" | "not_applicable";
  obtainedDate: string | null;          // ISO date string
  expirationDate: string | null;
  renewalDate: string | null;
  renewalFrequency: "monthly" | "quarterly" | "annual" | "biennial" | "one_time" | null;
  daysUntilDue: number | null;
  applicationUrl: string | null;
  cost: number | null;
  estimatedProcessingTime: string | null;
  documentationRequired: string[];
  penaltyForNonCompliance: string | null;
  reminderSent30Days: boolean;
  reminderSent14Days: boolean;
  reminderSent3Days: boolean;
  lastCheckedAt: Timestamp;
  proofUrl: string | null;              // uploaded proof of compliance (photo of license, etc.)
}

export interface FundingOpportunity {
  id: string;
  businessId: string;
  discoveredAt: Timestamp;
  name: string;
  provider: string;
  type: "grant" | "microloan" | "line_of_credit" | "sba_loan" | "competition" | "other";
  amount: { min: number; max: number };
  interestRate: string | null;
  repaymentTerms: string | null;
  eligibilityMatch: number;
  eligibilityCriteria: { criterion: string; met: boolean; notes: string }[];
  applicationUrl: string;
  applicationDeadline: string | null;   // ISO date string
  status: "discovered" | "reviewing" | "applying" | "submitted" | "approved" | "denied" | "dismissed";
  applicationProgress: number;
  prefilledFields: Record<string, string>;
  fitScore: number;
  recommendation: string;
  estimatedTimeToApply: string;
}

TASKS:
1. Create all five type files exactly as specified above
2. Create src/services/business-graph.ts with these Firestore CRUD functions using the CLIENT SDK (imported from lib/firebase.ts):
   - All documents live at: businesses/{businessId}
   - Subcollections: businesses/{businessId}/contracts, /receipts, /quotes, /compliance, /funding
   - createBusiness(userId, data): creates BusinessProfile, returns id
   - getBusiness(businessId): fetches BusinessProfile
   - updateBusiness(businessId, data): partial update with serverTimestamp on updatedAt
   - getBusinessByUserId(userId): query where userId == uid, returns first result or null
   - addContract / getContracts
   - addReceipt / getReceipts(businessId, filters?: { category?, startDate?, endDate? })
   - addComplianceItem / getComplianceItems (sorted by daysUntilDue ascending)
   - updateComplianceItem(businessId, itemId, data)
   - addQuote / getQuotes(businessId, statusFilter?: string)
   - updateQuote(businessId, quoteId, data)
   - addFundingOpportunity / getFundingOpportunities
   - updateContractObligations(businessId, contractId, obligations): updates the obligations array on a contract

3. Create firestore.rules with security rules:
   - Users can only read/write their own business document (where userId == request.auth.uid)
   - Users can only read/write subcollections under their own business
   - Public quote pages need read access to quotes by id without auth — handle this with a separate /public_quotes collection that mirrors quote data for public access

4. Create src/scripts/seed-demo-data.ts:
   Seed a complete demo business "Maria's Detail Co" in Tempe, AZ:
   - BusinessProfile: LLC, mobile car detailing, 7 months operating, Tempe AZ
   - 5 ServiceTypes: Basic Wash ($75), Interior Detail ($150), Full Detail ($225), Ceramic Coating ($450), Engine Bay ($100)
   - 6 months of financial history showing growth trend
   - 47 quotes (mix of paid, pending, declined)
   - 120 receipts across all categories
   - 6 contracts: 2 vendor agreements (1 with auto-renewal in 8 days), 1 storage lease, 1 client MSA, 1 insurance policy, 1 equipment financing
   - 14 compliance items (12 compliant, 1 due in 6 days, 1 overdue)
   - 3 funding opportunities
   - The vendor agreement contract should have: 15% gross revenue share clause, 10-mile non-compete, personal guarantee in indemnification
   - The storage lease should have auto-renewal in 8 days with 12% rent increase
```

---

## PHASE 1: ONBOARDING

---

### PROMPT 1A: The Onboarding Wizard

```
Context: "Launchpad" scaffolding and types are complete. Now build the onboarding experience — the first thing a new user sees, and the flow that creates the Business Intelligence Graph every other feature depends on.

ONBOARDING PHILOSOPHY:
- One text field: "What business do you want to start?"
- AI extracts industry, location, entity hints from the description
- Becomes a conversation — 4-6 targeted follow-up questions, one at a time
- End result: recommended entity type, name check, formation checklist, compliance map, first contract draft — in under 5 minutes

BUILD THE FOLLOWING:

1. ONBOARDING PAGE (src/app/onboarding/page.tsx):
   - Full-screen, centered layout, calm and welcoming
   - Stage 1: Single large text input, placeholder "What business do you want to start?"
   - On submit: call /api/ai/business-advisor with the description to get an initial inference
   - Stage 2: Chat-like interface — AI shows what it inferred, asks first follow-up question
   - Each question is a card with: question text, tap-able option chips, AND a free-text input for custom answers
   - Smooth CSS transition between questions (slide or fade)
   - Progress bar at top: "Step 2 of 5"
   - Show a typing indicator (animated dots) while waiting for AI responses

2. FOLLOW-UP QUESTIONS (sequential, each conditionally shown based on prior answers):

   Q1: "Will you be working alone, or do you plan to have employees or partners?"
   Options: "Just me" | "Hiring employees" | "Business partner(s)" | "Using contractors"
   Impact: entity type, workers comp, payroll, contract types

   Q2: "Will you use your personal vehicle, home, or personal equipment for business?"
   Options: "Personal vehicle" | "Home office" | "Both" | "Neither"
   Impact: commercial auto insurance, mileage deduction, home office deduction

   Q3: "Is this your only income, or do you have another job?"
   Options: "Side project — I have a full-time job" | "This will be my only income" | "Transitioning from a job"
   Impact: quarterly tax calculation, health insurance deduction, W-2 offset

   Q4: "Have you picked a business name?" (text input)
   If yes: AI checks for trademark conflicts, state registry, domain, social handles
   If no: AI suggests 5 names based on business type and location

   Q5: "What's your estimated monthly revenue in year one?"
   Options: "Under $2,000" | "$2,000–$5,000" | "$5,000–$10,000" | "Over $10,000" | "No idea"
   Impact: S-Corp threshold, quarterly tax amounts, insurance levels, funding eligibility

   Q6 (only if Q1 = employees or contractors):
   "Tell me about the help you'll need — what will they do, how often, will they use your equipment?"
   Free text. Impact: employee vs contractor classification risk analysis.

3. AI ANALYSIS API (src/app/api/ai/business-advisor/route.ts):
   POST endpoint. Accepts: { description, answers: Record<string, string> }
   Uses lib/vertex-ai.ts (server-side only). Returns structured JSON.

   System prompt:
   """
   You are an expert business formation advisor for small businesses in the United States.

   Given a business description and intake answers, generate a comprehensive formation plan.
   Be SPECIFIC — reference exact statutes, dollar amounts, URLs, and timelines for their state.
   Never give generic advice. Every recommendation must reference their actual inputs.

   CRITICAL RULES:
   - Recommend LLC over sole prop if the business involves physical interaction with client property
   - Flag commercial auto insurance gap if using personal vehicle for business
   - Flag employee vs contractor misclassification risk if applicable
   - Always mention Section 199A QBI deduction for pass-through entities under $182,100
   - Always warn about quarterly estimated tax obligations
   - Arizona-specific: LLC annual reports are $0 (unusual vs other states)
   - If estimated revenue > $80K/year, mention S-Corp election evaluation
   - Output must be valid JSON matching the schema below

   OUTPUT SCHEMA:
   {
     "inferredBusinessType": string,
     "inferredLocation": { "city": string, "state": string, "county": string },
     "entityRecommendation": {
       "recommended": "sole_prop|llc|s_corp|c_corp|partnership",
       "reasoning": string,
       "filingCost": number,
       "processingTime": string,
       "filingUrl": string,
       "alternativeConsiderations": string
     },
     "nameAnalysis": {
       "nameChecked": string | null,
       "trademarkConflicts": string[],
       "stateRegistryAvailable": boolean,
       "domainAvailable": boolean,
       "suggestedAlternatives": string[]
     } | null,
     "formationChecklist": [
       {
         "id": string,
         "title": string,
         "description": string,
         "estimatedTime": string,
         "estimatedCost": number,
         "link": string,
         "dependsOn": string[]
       }
     ],
     "complianceItems": [ComplianceItem schema — see types/compliance.ts],
     "businessProfile": [partial BusinessProfile — all fields inferrable from the conversation],
     "firstContractHtml": string
   }
   """

4. RESULTS PAGE (shown after AI processes everything):
   - Summary card: "Here's your plan to launch [Business Name]"
   - Entity recommendation card with expandable reasoning section
   - Name analysis: green checkmarks for available, red X for conflicts, alternatives listed
   - Formation checklist: interactive checkboxes, each step shows cost + time + link. State saved to Firestore as completedSteps[].
   - "Generate My First Contract" button — calls /api/ai/generate-contract, shows result in a modal with download option
   - "Go to Dashboard" button (primary CTA)

5. DATA PERSISTENCE:
   - On results page load: call services/business-graph.ts createBusiness() with the AI-generated BusinessProfile
   - Save all ComplianceItems to businesses/{businessId}/compliance subcollection
   - Save the generated contract to businesses/{businessId}/contracts subcollection
   - Set onboardingStage = "formation"
   - Store businessId in BusinessContext so all subsequent pages have it

6. ROUTING:
   - app/page.tsx: if authenticated and has business → redirect to /dashboard. If authenticated and no business → redirect to /onboarding. If not authenticated → redirect to /login.
   - After onboarding completes → redirect to /dashboard

Make the experience feel like talking to a knowledgeable friend. Conversational language. Typing indicators. Smooth transitions. The entrepreneur should feel guided, not interrogated.
```

---

## PHASE 2: THE DASHBOARD

---

### PROMPT 2A: Main Dashboard

```
Context: Onboarding is complete and creates a BusinessProfile with ComplianceItems and an initial contract. Now build the main dashboard.

BUILD THE FOLLOWING:

1. DASHBOARD PAGE (src/app/dashboard/page.tsx):
   Top bar: business name, owner name, notification bell (with unread badge), "Quick Actions" dropdown.
   Quick Actions: New Quote | Scan Receipt | Upload Contract | Ask AI

   2x2 grid on desktop, stacked on mobile. Each quadrant is a Card component linking to its detail page.

   QUADRANT 1 — "Am I Protected?" → /dashboard/protection
   - Shield icon: green (no gaps), yellow (gaps exist), red (critical gaps)
   - "4 active contracts. 1 gap: no workers comp coverage."
   - Warning badges for contract deadlines within 30 days
   - "Total contract value: $X/month"
   - Contract health score average across all active contracts

   QUADRANT 2 — "Am I Compliant?" → /dashboard/compliance
   - Circular progress ring: X of Y requirements met
   - Count badges: green/yellow/red
   - Next 3 deadlines with countdown
   - Overdue items in red

   QUADRANT 3 — "Am I Keeping Enough Money?" → /dashboard/finances
   - Mini bar chart (Recharts): last 3 months revenue vs expenses
   - "March: $4,200 revenue, $1,640 expenses, $2,560 profit (61%)"
   - Alerts: unclaimed deductions, upcoming quarterly tax payment
   - YTD savings from AI recommendations

   QUADRANT 4 — "What Should I Do Next?" → /dashboard/growth
   - Top 3 prioritized actions with dollar impact and action buttons
   - Sorted by (impact × urgency) / effort

2. AI INSIGHT BANNER (between nav and quadrants):
   Single most important alert across all data. Rotates daily.
   Examples: contract auto-renewal in 8 days, quarterly tax due in 14 days, new grant discovered.
   Implementation: getTopInsight() function that queries all alerts, ranks by urgency × impact, returns #1.

3. DRILL-DOWN PAGE SHELLS (placeholder content, full build in later phases):
   - /dashboard/protection — "Contract Vault — coming in Phase 5"
   - /dashboard/compliance — "Compliance Tracker — coming in Phase 6"
   - /dashboard/finances — "Financial Dashboard — coming in Phase 4"
   - /dashboard/growth — "Growth Radar — coming in Phase 7"
   Each shell shows the page title, a brief description of what will be here, and a back button.

4. REAL-TIME DATA:
   Use Firestore onSnapshot listeners for live updates. Wrap in useEffect with cleanup.
   Read from BusinessContext for the business profile (already cached).
   Listen to subcollections: contracts, compliance, quotes, receipts.

5. RESPONSIVE:
   - Desktop/tablet: 2x2 grid (CSS grid, gap-4)
   - Mobile: single column stack
   - Quadrant cards: min-height 200px, fully tappable

6. FLOATING ACTION BUTTON (mobile):
   Bottom-right FAB with expand animation showing: New Quote, Scan Receipt, Upload Contract, Ask AI.
   On desktop, these live in the Quick Actions dropdown in the top bar.

The dashboard is mission control. Glanceable in 5 seconds. Every number is real data from Firestore.
```

---

## PHASES 3–8

Phases 3 through 8 remain as originally specified with the following amendments applied consistently:

- All date fields use ISO string format (not JS Date objects) for Firestore compatibility
- All Firebase Admin SDK usage is server-side only (API routes)
- Contract vault routes: list = /contracts, upload = /contracts/upload, detail = /contracts/[id]
- Phase 5 (Contract Vault) includes the obligation tracking layer described below

---

## PHASE 5 AMENDMENT: CONTRACT OBLIGATION TRACKING

Add the following to Phase 5 in addition to the original spec:

### Obligation Extraction (added to analyze-contract API response):

The contract analysis API must also extract obligations as ContractObligation objects:

```
"obligations": [
  {
    "id": "obl_1",
    "clauseRef": "Section 4.2",
    "description": "Maintain general liability insurance of at least $1,000,000 per occurrence",
    "party": "business",
    "triggerType": "threshold",
    "triggerDescription": "Must be maintained continuously while agreement is active",
    "dueDate": null,
    "recurringFrequency": null,
    "status": "pending",
    "monitoredField": null,
    "monitoredThreshold": null,
    "lastChecked": <now>,
    "notes": "Compare against current insurance coverage in compliance items"
  },
  {
    "id": "obl_2",
    "clauseRef": "Section 9.1",
    "description": "Provide 30 days written notice before auto-renewal date to cancel",
    "party": "business",
    "triggerType": "date",
    "triggerDescription": "30 days before auto-renewal date of 2026-05-15",
    "dueDate": "2026-04-15",
    "recurringFrequency": null,
    "status": "pending",
    "monitoredField": null,
    "monitoredThreshold": null,
    "lastChecked": <now>,
    "notes": null
  }
]
```

### Obligation Monitoring (src/services/contract-analyzer.ts):

Add a function `checkObligationHealth(businessId)` that:
1. Fetches all active contracts and their obligations
2. For each obligation:
   - If triggerType = "date": calculate days until dueDate, set status to "at_risk" if < 14 days
   - If triggerType = "threshold" and monitoredField is set: read that field from BusinessProfile and compare to monitoredThreshold
   - If triggerType = "recurring": check if the last fulfillment date is within the expected window
3. Updates obligation statuses in Firestore
4. Returns a list of at-risk or breached obligations for the dashboard alert system

### Contract Health Score:

After obligation check, recalculate healthScore (0–100) for each contract:
- Start at 100
- -20 for each "at_risk" obligation
- -40 for each "breached" obligation
- -10 for each "danger" clause in the analysis
- -5 for each missing protection
- Minimum 0

### Playbook Templates (src/services/contract-analyzer.ts):

Add a PLAYBOOK constant — a map of clause types to preferred standard language. When the AI analyzes a contract, it compares each clause against the playbook and flags deviations as PlaybookDeviation objects. The counter-proposal automatically uses playbook language for deviations.

Example playbook entries:
- liability_cap: "Liability shall not exceed the total fees paid in the 3 months preceding the claim"
- payment_terms: "Payment due within 30 days of invoice. Late payments accrue interest at 1.5% per month"
- dispute_resolution: "Disputes shall first be submitted to mediation before any litigation"
- auto_renewal_notice: "Either party may cancel with 30 days written notice before renewal date"

---

## APPENDIX: GEMINI PROMPT STANDARDS

All Vertex AI prompts across the application follow this pattern:

1. System role: who the AI is and its domain expertise
2. Business context: inject full BusinessProfile JSON (or relevant subset)
3. Task: what to analyze and what decisions to make
4. Output format: always structured JSON matching TypeScript types exactly
5. Critical rules: domain-specific guardrails

UNIVERSAL RULES FOR ALL PROMPTS:
- Never give generic advice — always reference the business's actual data
- Always require JSON output matching the TypeScript types
- Always include: "This is not professional legal, tax, or financial advice. Consult a licensed professional for your specific situation."
- Reference specific dollar amounts, specific statutes, specific deadlines
- Provide actionable next steps in priority order
- Plain English explanations — assume the user has never seen a contract or tax form
- Conservative recommendations — safer/more compliant option when in doubt
- Flag when a professional consultation is warranted (complex tax, litigation risk, etc.)
- For contract analysis: always calculate dollar impact of problematic clauses against actual financials
- For tax analysis: never recommend aggressive or borderline strategies
```
