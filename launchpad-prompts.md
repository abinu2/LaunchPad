# LAUNCHPAD — AI Coding Agent Prompts

## How to Use This Document

Each section below is a **standalone prompt** you give to your AI coding agent (Claude Code, Cursor, etc.) in sequence. Each prompt contains full context so the agent understands the entire project vision while focusing on one buildable piece. **Copy-paste each prompt as-is.** Complete one phase before moving to the next. Each phase builds on the previous one's output.

---

---

## PHASE 0: PROJECT SCAFFOLDING & INFRASTRUCTURE

---

### PROMPT 0A: Project Initialization

```
You are building a full-stack application called "Launchpad" — an AI-powered business partner for first-time small business entrepreneurs. The application helps underserved entrepreneurs who can't afford attorneys, CPAs, and financial advisors by providing AI-driven contract analysis, tax guidance, compliance tracking, funding discovery, and financial intelligence — all personalized to their specific business, location, and situation.

TECH STACK:
- Frontend: Next.js 14+ (App Router) with TypeScript and Tailwind CSS
- Backend API: Next.js API routes
- Database: Firebase Firestore (for the Business Intelligence Graph — a persistent, evolving knowledge structure about each business)
- File Storage: Firebase Storage (for uploaded documents — contracts, receipts, bank statements)
- AI: Google Vertex AI with Gemini 2.0 Flash or Gemini 1.5 Pro (long context window needed for contract analysis)
- Document Processing: Google Document AI (for receipt/document OCR)
- Authentication: Firebase Auth (Google sign-in + email/password)
- Deployment: Google Cloud Run (containerized) or Vercel
- Payment Processing: Stripe integration (for the quote-to-cash tool's payment links)

PROJECT STRUCTURE:
Create the following project structure:

launchpad/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout with providers
│   │   ├── page.tsx                  # Landing/onboarding page
│   │   ├── dashboard/
│   │   │   ├── page.tsx              # Main dashboard (4 quadrants)
│   │   │   ├── protection/page.tsx   # "Am I Protected?" view
│   │   │   ├── compliance/page.tsx   # "Am I Compliant?" view
│   │   │   ├── finances/page.tsx     # "Am I Keeping Enough Money?" view
│   │   │   └── growth/page.tsx       # "What Should I Do Next?" view
│   │   ├── quotes/
│   │   │   ├── page.tsx              # Quote management
│   │   │   ├── [id]/page.tsx         # Individual quote detail
│   │   │   └── public/[id]/page.tsx  # Public client-facing quote page
│   │   ├── contracts/
│   │   │   ├── page.tsx              # Contract vault
│   │   │   └── [id]/page.tsx         # Individual contract analysis
│   │   ├── receipts/
│   │   │   └── page.tsx              # Receipt scanner & expense tracking
│   │   ├── onboarding/
│   │   │   └── page.tsx              # Business setup wizard
│   │   └── api/
│   │       ├── ai/
│   │       │   ├── analyze-contract/route.ts
│   │       │   ├── analyze-receipt/route.ts
│   │       │   ├── generate-contract/route.ts
│   │       │   ├── generate-quote/route.ts
│   │       │   ├── business-advisor/route.ts
│   │       │   └── scan-opportunities/route.ts
│   │       ├── documents/
│   │       │   ├── upload/route.ts
│   │       │   └── process/route.ts
│   │       ├── quotes/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       ├── accept/route.ts
│   │       │       └── pay/route.ts
│   │       └── webhooks/
│   │           └── stripe/route.ts
│   ├── components/
│   │   ├── ui/                       # Reusable UI components
│   │   ├── dashboard/                # Dashboard-specific components
│   │   ├── contracts/                # Contract-related components
│   │   ├── quotes/                   # Quote-related components
│   │   ├── receipts/                 # Receipt scanner components
│   │   └── onboarding/               # Onboarding wizard components
│   ├── lib/
│   │   ├── firebase.ts               # Firebase initialization
│   │   ├── vertex-ai.ts              # Vertex AI client setup
│   │   ├── document-ai.ts            # Document AI client
│   │   ├── stripe.ts                 # Stripe initialization
│   │   └── utils.ts                  # Shared utilities
│   ├── services/
│   │   ├── business-graph.ts         # Business Intelligence Graph CRUD
│   │   ├── contract-analyzer.ts      # Contract analysis logic
│   │   ├── receipt-processor.ts      # Receipt processing logic
│   │   ├── tax-calculator.ts         # Tax calculation engine
│   │   ├── compliance-tracker.ts     # Compliance monitoring
│   │   ├── funding-scanner.ts        # Grant/loan opportunity scanner
│   │   └── quote-engine.ts           # Quote generation & management
│   ├── types/
│   │   ├── business.ts               # Business entity types
│   │   ├── contract.ts               # Contract-related types
│   │   ├── financial.ts              # Financial data types
│   │   ├── quote.ts                  # Quote/invoice types
│   │   └── compliance.ts             # Compliance-related types
│   └── prompts/
│       ├── contract-analysis.ts      # Gemini prompts for contract analysis
│       ├── receipt-analysis.ts       # Gemini prompts for receipt categorization
│       ├── business-advisor.ts       # Gemini prompts for general business advice
│       ├── tax-advisor.ts            # Gemini prompts for tax guidance
│       └── quote-pricing.ts         # Gemini prompts for pricing recommendations
├── public/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── .env.local.example
└── README.md

TASKS FOR THIS PROMPT:
1. Initialize the Next.js project with TypeScript and Tailwind CSS
2. Install all dependencies: firebase, @google-cloud/vertexai, @google-cloud/documentai, stripe, @stripe/stripe-js, lucide-react, date-fns, zod, react-dropzone, recharts
3. Create the complete folder structure above with placeholder files
4. Set up the .env.local.example with all required environment variables:
   - GOOGLE_CLOUD_PROJECT_ID
   - GOOGLE_CLOUD_LOCATION (us-central1)
   - GOOGLE_APPLICATION_CREDENTIALS
   - NEXT_PUBLIC_FIREBASE_API_KEY
   - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
   - NEXT_PUBLIC_FIREBASE_PROJECT_ID
   - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
   - FIREBASE_ADMIN_SDK_KEY (JSON string)
   - STRIPE_SECRET_KEY
   - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
   - STRIPE_WEBHOOK_SECRET
5. Create the Firebase initialization file (lib/firebase.ts) with both client and admin SDK setup
6. Create the Vertex AI client file (lib/vertex-ai.ts) with Gemini model initialization
7. Create the root layout with a clean, professional design system — use a color palette that feels trustworthy and accessible (blues and greens, not startup-trendy gradients). This is for people who might be nervous about starting a business — the UI should feel calm, competent, and encouraging.
8. Set up Firebase Auth with a simple login/signup page

Do NOT build any features yet. Just the scaffolding, configuration, and authentication. Make sure everything compiles and runs.
```

---

### PROMPT 0B: TypeScript Types & Data Model

```
Context: You are building "Launchpad," an AI business partner for first-time entrepreneurs. The project scaffolding is already set up with Next.js, Firebase, Vertex AI, and Stripe.

Now define the complete TypeScript data model. This data model is the Business Intelligence Graph — the persistent knowledge structure that stores everything the AI knows about a business and that every feature reads from and writes to.

Create the following type definitions:

FILE: src/types/business.ts

// The core business entity — everything the AI knows about this business
interface BusinessProfile {
  id: string;                          // Firestore document ID
  userId: string;                      // Firebase Auth UID
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Identity
  businessName: string;
  businessType: string;                // "mobile_car_detailing", "cleaning_service", etc.
  naicsCode: string;                   // Industry classification
  entityType: "sole_prop" | "llc" | "s_corp" | "c_corp" | "partnership";
  entityState: string;                 // State of formation
  ein: string | null;
  formationDate: Date | null;

  // Location & Jurisdiction
  businessAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
    county: string;
  };
  operatingJurisdictions: string[];    // Cities/counties where they operate

  // Owner Info
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  hasOtherJob: boolean;               // Affects tax strategy
  estimatedW2Income: number | null;    // From other job, affects quarterly taxes
  isFirstTimeBusiness: boolean;

  // Business Model
  serviceTypes: ServiceType[];         // What services they offer with pricing
  targetMarket: "residential" | "commercial" | "both";
  usesPersonalVehicle: boolean;
  hasEmployees: boolean;
  employeeCount: number;
  hasContractors: boolean;
  contractorCount: number;

  // Financial Snapshot (updated continuously from receipts/bank data)
  financials: {
    monthlyRevenueAvg: number;
    monthlyExpenseAvg: number;
    profitMargin: number;
    totalRevenueYTD: number;
    totalExpensesYTD: number;
    currentCashBalance: number | null;
    lastUpdated: Timestamp;
  };

  // Onboarding Progress
  onboardingStage: "idea" | "formation" | "protection" | "operating" | "growing";
  completedSteps: string[];            // Track which setup steps are done
}

interface ServiceType {
  id: string;
  name: string;                        // "Full Interior Detail"
  description: string;
  basePrice: number;
  estimatedDuration: number;           // minutes
  supplyCost: number;                  // cost of materials per job
  vehicleTypes?: VehiclePricing[];     // price adjustments by vehicle type (for auto businesses)
}

interface VehiclePricing {
  vehicleType: string;                 // "sedan", "suv", "truck"
  priceMultiplier: number;             // 1.0, 1.3, 1.5, etc.
}

FILE: src/types/contract.ts

interface Contract {
  id: string;
  businessId: string;
  uploadedAt: Timestamp;
  fileName: string;
  fileUrl: string;                     // Firebase Storage URL
  fileType: "pdf" | "docx" | "image";

  // AI-extracted metadata
  contractType: "service_agreement" | "vendor_agreement" | "lease" | "partnership" | "employment" | "financing" | "other";
  counterpartyName: string;
  effectiveDate: Date | null;
  expirationDate: Date | null;
  autoRenews: boolean;
  autoRenewalDate: Date | null;
  autoRenewalNoticePeriod: number | null;  // days before auto-renewal to give notice
  terminationNoticePeriod: number | null;  // days
  totalValue: number | null;               // contract dollar value if determinable
  monthlyValue: number | null;

  // AI analysis results
  analysis: ContractAnalysis;
  status: "active" | "expiring_soon" | "expired" | "draft" | "under_review";
}

interface ContractAnalysis {
  summary: string;                     // 2-3 sentence plain English summary
  riskLevel: "low" | "medium" | "high" | "critical";
  clauses: ClauseAnalysis[];
  missingProtections: string[];        // Things the contract SHOULD have but doesn't
  conflicts: ContractConflict[];       // Conflicts with other contracts in the vault
  recommendations: string[];
  estimatedAnnualCost: number | null;
  counterProposalDraft: string | null; // AI-drafted counter-proposal if issues found
}

interface ClauseAnalysis {
  clauseNumber: string;
  clauseTitle: string;
  originalText: string;                // The actual clause text
  plainEnglish: string;               // What this means in simple terms
  riskLevel: "safe" | "caution" | "danger";
  issue: string | null;                // What's wrong with this clause
  recommendation: string | null;       // What to do about it
  businessImpact: string | null;       // Dollar or operational impact
}

interface ContractConflict {
  thisClause: string;
  conflictingContractId: string;
  conflictingContractName: string;
  conflictingClause: string;
  description: string;
  recommendation: string;
}

FILE: src/types/financial.ts

interface Receipt {
  id: string;
  businessId: string;
  uploadedAt: Timestamp;
  imageUrl: string;

  // AI-extracted data
  vendor: string;
  amount: number;
  date: Date;
  lineItems: LineItem[];

  // AI classification
  category: ExpenseCategory;
  taxClassification: "cogs" | "expense" | "asset" | "personal" | "mixed";
  businessPercentage: number;          // 0-100, for mixed-use expenses
  deductibleAmount: number;
  taxNotes: string;                    // AI explanation of tax treatment
  isReconciled: boolean;               // Matched to bank statement

  // For mileage tracking
  associatedMileage: number | null;    // If this receipt is on a business driving day
}

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

type ExpenseCategory =
  | "supplies"            // COGS - materials used in service delivery
  | "vehicle_fuel"        // Vehicle expenses
  | "vehicle_maintenance" // Vehicle expenses
  | "insurance"           // Business insurance premiums
  | "rent"               // Office/storage rent
  | "utilities"          // Phone, internet, water
  | "marketing"          // Ads, business cards, vehicle wrap
  | "equipment"          // Tools, machines (may need depreciation)
  | "professional_services" // Attorney, CPA, bookkeeper
  | "meals_entertainment"   // Business meals (50% deductible)
  | "office_supplies"       // General office supplies
  | "software"              // Apps, subscriptions
  | "training"              // Courses, certifications
  | "other";

interface TaxSummary {
  businessId: string;
  taxYear: number;
  quarter: 1 | 2 | 3 | 4;

  // Revenue
  grossRevenue: number;
  returnsAndAllowances: number;
  netRevenue: number;

  // COGS
  totalCOGS: number;
  grossProfit: number;

  // Expenses by category
  expenses: Record<ExpenseCategory, number>;
  totalExpenses: number;

  // Deductions
  mileageDeduction: number;
  homeOfficeDeduction: number;
  healthInsuranceDeduction: number;
  section199ADeduction: number;
  totalDeductions: number;

  // Tax obligations
  netTaxableIncome: number;
  estimatedFederalTax: number;
  estimatedStateTax: number;
  estimatedSelfEmploymentTax: number;
  totalEstimatedTax: number;

  // Quarterly payments
  quarterlyPayments: {
    q1: { due: Date; amount: number; paid: boolean; paidDate: Date | null };
    q2: { due: Date; amount: number; paid: boolean; paidDate: Date | null };
    q3: { due: Date; amount: number; paid: boolean; paidDate: Date | null };
    q4: { due: Date; amount: number; paid: boolean; paidDate: Date | null };
  };

  // AI insights
  missedDeductions: { description: string; estimatedValue: number; action: string }[];
  taxSavingOpportunities: string[];
}

interface ProfitAndLoss {
  businessId: string;
  period: "monthly" | "quarterly" | "annual";
  startDate: Date;
  endDate: Date;
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: Record<ExpenseCategory, number>;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  comparedToPreviousPeriod: {
    revenueChange: number;        // percentage
    expenseChange: number;
    profitChange: number;
  };
}

FILE: src/types/quote.ts

interface Quote {
  id: string;
  businessId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Client info
  clientName: string;
  clientEmail: string;
  clientPhone: string;

  // Quote details
  services: QuoteLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;

  // AI pricing analysis
  pricingAnalysis: {
    supplyCost: number;
    estimatedLaborHours: number;
    estimatedLaborCost: number;
    profitMargin: number;
    marketComparison: string;      // "12% below market average"
    recommendation: string;
  };

  // Status tracking
  status: "draft" | "sent" | "viewed" | "accepted" | "declined" | "expired" | "invoiced" | "paid";
  sentAt: Timestamp | null;
  viewedAt: Timestamp | null;
  acceptedAt: Timestamp | null;
  paidAt: Timestamp | null;

  // Contract integration
  contractGenerated: boolean;
  contractId: string | null;           // Links to the auto-generated service agreement
  contractSignedAt: Timestamp | null;

  // Payment
  stripePaymentIntentId: string | null;
  paymentMethod: "stripe" | "venmo" | "cash" | "check" | null;
  paymentUrl: string | null;           // Shareable payment link

  // Scheduling
  scheduledDate: Date | null;
  scheduledTime: string | null;
  scheduledAddress: string | null;

  // Follow-up
  followUpsSent: number;
  lastFollowUpAt: Timestamp | null;
  nextFollowUpAt: Timestamp | null;
}

interface QuoteLineItem {
  serviceId: string;                   // Links to ServiceType in business profile
  serviceName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  addOns: { name: string; price: number }[];
}

FILE: src/types/compliance.ts

interface ComplianceItem {
  id: string;
  businessId: string;

  // What is this requirement
  title: string;                       // "Tempe Business License"
  description: string;                 // What it is and why it's needed
  jurisdiction: "federal" | "state" | "county" | "city";
  jurisdictionName: string;            // "City of Tempe", "State of Arizona", etc.
  category: "license" | "registration" | "permit" | "tax_filing" | "insurance" | "report";
  isRequired: boolean;                 // vs. recommended
  legalCitation: string | null;        // "ARS §44-1221" or specific ordinance

  // Status
  status: "compliant" | "due_soon" | "overdue" | "not_started" | "not_applicable";
  obtainedDate: Date | null;
  expirationDate: Date | null;
  renewalDate: Date | null;            // When to renew (might be before expiration)
  daysUntilDue: number | null;

  // Action info
  applicationUrl: string | null;       // Direct link to apply/renew
  cost: number | null;                 // Filing/renewal fee
  estimatedProcessingTime: string | null; // "2-3 business days"
  documentationRequired: string[];     // What docs are needed to apply
  penaltyForNonCompliance: string | null; // "Fine up to $500 per occurrence"

  // Tracking
  reminderSent30Days: boolean;
  reminderSent14Days: boolean;
  reminderSent3Days: boolean;
  lastCheckedAt: Timestamp;
}

interface FundingOpportunity {
  id: string;
  businessId: string;
  discoveredAt: Timestamp;

  // Opportunity details
  name: string;
  provider: string;                    // "City of Tempe", "SBA", "Kiva", etc.
  type: "grant" | "microloan" | "line_of_credit" | "sba_loan" | "competition" | "other";
  amount: { min: number; max: number };
  interestRate: string | null;         // "0%", "8-13% APR", null for grants
  repaymentTerms: string | null;

  // Eligibility
  eligibilityMatch: number;            // 0-100 confidence they qualify
  eligibilityCriteria: { criterion: string; met: boolean; notes: string }[];
  applicationUrl: string;
  applicationDeadline: Date | null;

  // Application status
  status: "discovered" | "reviewing" | "applying" | "submitted" | "approved" | "denied" | "dismissed";
  applicationProgress: number;         // 0-100 percent complete
  prefilledFields: Record<string, string>; // Fields auto-filled from portal data

  // AI analysis
  fitScore: number;                    // How good is this for their specific situation
  recommendation: string;              // AI explanation of why this is a good/bad fit
  estimatedTimeToApply: string;        // "20 minutes with portal data pre-filled"
}

TASKS:
1. Create all four type definition files exactly as specified above
2. Create the Firestore service file (src/services/business-graph.ts) with CRUD functions:
   - createBusiness(userId, data): creates new BusinessProfile
   - getBusiness(businessId): fetches full business profile
   - updateBusiness(businessId, partial data): updates specific fields
   - getBusinessByUserId(userId): fetches business for current user
   - addContract(businessId, contract): adds contract to sub-collection
   - getContracts(businessId): fetches all contracts
   - addReceipt(businessId, receipt): adds receipt
   - getReceipts(businessId, filters): fetches receipts with date/category filters
   - addComplianceItem(businessId, item): adds compliance requirement
   - getComplianceItems(businessId): fetches all compliance items sorted by urgency
   - addQuote(businessId, quote): adds quote
   - getQuotes(businessId, statusFilter): fetches quotes
   - addFundingOpportunity(businessId, opportunity): adds funding match
   - getFundingOpportunities(businessId): fetches active opportunities
3. Implement proper Firestore security rules that ensure users can only access their own business data
4. Create seed data for a demo business — "Maria's mobile car detailing in Tempe" — with realistic sample data for all entity types so you can test every feature
```

---

---

## PHASE 1: ONBOARDING — THE FIRST 5 MINUTES

---

### PROMPT 1A: The Onboarding Wizard

```
Context: You are building "Launchpad," an AI business partner for first-time entrepreneurs. The project uses Next.js 14, Firebase, and Google Vertex AI (Gemini). The data model and project structure are already built.

Now build the onboarding experience — this is the MOST CRITICAL part of the product because it's the user's first impression and it creates the Business Intelligence Graph that every other feature depends on.

ONBOARDING PHILOSOPHY:
- The user sees ONE text field: "What do you want to build?"
- They type something like: "I want to start a mobile car detailing business in Tempe, Arizona"
- From that single sentence, the AI extracts: industry type, location, likely entity structure, and begins generating a personalized business setup roadmap
- The onboarding then becomes a CONVERSATION, not a form — the AI asks 4-6 targeted follow-up questions, one at a time, where each answer changes downstream recommendations
- At the end, the user has: a recommended entity type, a name verified against trademarks, a step-by-step formation checklist, and their first contract template — all generated in under 5 minutes

BUILD THE FOLLOWING:

1. ONBOARDING PAGE (src/app/onboarding/page.tsx):
   - Clean, welcoming full-screen layout
   - Single prominent text input with the placeholder "What business do you want to start?"
   - After submission, transitions into a chat-like conversational interface
   - The AI agent responds with its analysis of what it inferred from the description and asks the first follow-up question
   - Each follow-up question is presented as a card with tap-able options AND a text field for custom answers
   - Progress indicator showing where they are in the setup process

2. THE FOLLOW-UP QUESTIONS (asked sequentially, each conditionally based on previous answers):

   Question 1: "Will you be working alone, or do you plan to have employees or partners in the first year?"
   - Options: "Just me" | "Hiring employees" | "Business partner(s)" | "Using contractors"
   - WHY THIS MATTERS: Determines entity type (sole prop vs LLC vs partnership), insurance requirements (workers comp triggers with first employee), payroll obligations, and contract types needed

   Question 2: "Will you be using your personal vehicle, home, or any personal equipment for business?"
   - Options: "Personal vehicle" | "Home office" | "Both" | "Neither — dedicated business space/equipment"
   - WHY THIS MATTERS: Determines commercial auto insurance need, mileage deduction eligibility, home office deduction, and asset protection considerations

   Question 3: "Do you have another job right now, or will this be your only income?"
   - Options: "This is a side project — I have a full-time job" | "This will be my only income" | "I'm transitioning from a job"
   - WHY THIS MATTERS: Changes quarterly tax calculation (existing W-2 withholding offsets some obligation), health insurance deduction eligibility, and risk tolerance for startup investment

   Question 4: "Have you picked a business name?"
   - Text input field
   - If yes: AI immediately checks USPTO trademark database, state entity registry, domain availability, and social media handle availability
   - If no: AI suggests 5 names based on the business type and location

   Question 5: "What's your estimated monthly revenue in the first year?"
   - Options: "Under $2,000/month" | "$2,000-5,000/month" | "$5,000-10,000/month" | "Over $10,000/month" | "No idea"
   - WHY THIS MATTERS: Determines optimal entity tax election (S-Corp threshold), quarterly tax payment amounts, insurance coverage levels, and funding eligibility

   Question 6 (optional, if they selected "Hiring employees" or "Using contractors"):
   "Tell me about the help you'll need — what will they do, how often, and will they use your equipment?"
   - Free text input
   - WHY THIS MATTERS: Employee vs. contractor classification analysis — getting this wrong costs $50/day per misclassified worker in Arizona

3. AI ANALYSIS ENGINE (src/app/api/ai/business-advisor/route.ts):
   Create an API endpoint that takes the business description and all follow-up answers, sends them to Vertex AI (Gemini), and generates:

   a) A BUSINESS PROFILE — all fields of the BusinessProfile type populated with inferred and provided data

   b) An ENTITY RECOMMENDATION — specific recommendation (LLC, sole prop, S-Corp, etc.) with reasoning tied to THEIR specific inputs. Include:
      - The recommended entity type
      - Why this is right for THEIR situation (not generic)
      - What would need to change for a different entity to make sense
      - Exact filing cost in their state
      - Estimated processing time
      - Direct link to the filing portal

   c) A NAME ANALYSIS (if name provided):
      - USPTO trademark search results (use web search as proxy for hackathon)
      - State entity registry availability
      - Domain availability (.com, .net)
      - Social media handle availability (Instagram, TikTok, Facebook, Google Business)
      - If conflicts found: 5 alternative name suggestions with availability checks

   d) A FORMATION CHECKLIST — personalized, ordered list of every step to go from idea to legally operating business:
      - Each step has: title, description, estimated time, estimated cost, direct link to complete it, and dependencies (what must be done first)
      - Steps are specific to their entity type, state, county, and city
      - Example for LLC in Tempe, AZ: File Articles of Organization with ACC ($50) → Apply for EIN with IRS (free, instant online) → Open business bank account → Get Tempe business license ($50/year) → Get TPT license from ADOR (free) → Get commercial auto insurance → Draft service agreement

   e) A COMPLIANCE MAP — every license, permit, registration, and recurring filing obligation for this specific business type in this specific jurisdiction, pre-populated as ComplianceItem objects

   f) A FIRST CONTRACT DRAFT — a service agreement template specifically tailored to this business type, ready to use

   The Gemini prompt for this endpoint should be comprehensive. Here is the system prompt to use:

   """
   You are an expert business formation advisor specializing in small businesses. You have deep knowledge of:
   - Entity formation requirements for all 50 US states
   - IRS tax classification rules and elections
   - State and local business licensing requirements
   - Insurance requirements by industry and jurisdiction
   - Contract law and industry-standard service agreements

   Given a business description and the entrepreneur's answers to intake questions, generate a comprehensive business formation plan. Be SPECIFIC to their exact situation — never give generic advice. Reference specific statutes, specific dollar amounts, specific URLs, and specific timelines.

   CRITICAL RULES:
   - Always recommend an LLC over sole proprietorship if the business involves any physical interaction with client property (vehicles, homes, etc.) due to liability exposure
   - Always flag the commercial auto insurance gap if they're using a personal vehicle
   - Always check for employee vs. contractor misclassification risk
   - Always mention the Section 199A QBI deduction for pass-through entities under $182,100
   - Always warn about quarterly estimated tax obligations — this is the #1 thing new entrepreneurs miss
   - If they're in Arizona, mention that LLC annual reports are $0 (unusual — most states charge)
   - If estimated revenue exceeds $80K, mention that S-Corp election should be evaluated
   - Format all output as structured JSON matching the specified schemas
   """

4. RESULTS PAGE:
   After the AI processes everything, display a beautiful results page with:
   - A summary card: "Here's your plan to launch [business name]"
   - Entity recommendation with expandable reasoning
   - Name analysis results (green checks for available, red X for conflicts)
   - Interactive formation checklist with checkboxes (state saved to Firestore)
   - A "Generate My First Contract" button that creates the service agreement
   - A prominent "Go to Dashboard" button

5. DATA PERSISTENCE:
   - Save the complete BusinessProfile to Firestore
   - Save all ComplianceItems to the compliance sub-collection
   - Save the generated contract to the contracts sub-collection
   - Mark the onboarding stage as "formation" in the business profile

Make the onboarding feel like talking to a knowledgeable friend, not filling out a government form. Use conversational language in the AI responses. Show the AI "thinking" with a typing indicator. Make the transition from question to question feel smooth with animations.
```

---

---

## PHASE 2: THE DASHBOARD — THE HOME BASE

---

### PROMPT 2A: Main Dashboard

```
Context: You are building "Launchpad," an AI business partner for first-time entrepreneurs. The project uses Next.js 14, Firebase, and Google Vertex AI. The onboarding flow is already built and creates a BusinessProfile with compliance items and an initial contract.

Now build the main dashboard — the screen the entrepreneur sees every time they open the app. This is organized around FOUR QUESTIONS every business owner has.

DASHBOARD DESIGN:
The dashboard is a 2x2 grid on desktop (stacked on mobile) with four quadrant cards. Each card answers one question and shows a status at a glance with a drill-down link for details.

BUILD THE FOLLOWING:

1. DASHBOARD PAGE (src/app/dashboard/page.tsx):

   Layout: A top bar with the business name, owner name, and a "Quick Actions" dropdown (New Quote, Scan Receipt, Upload Contract, Ask AI). Below that, the 2x2 quadrant grid.

   QUADRANT 1 — "Am I Protected?" (top-left, link to /dashboard/protection)
   - Shows: number of active contracts, protection coverage map
   - Visual: A simple shield icon that's green (fully protected), yellow (gaps exist), or red (critical gaps)
   - Summary text: "4 active contracts. 1 gap identified: no workers comp coverage." or "Fully protected — all identified risks covered."
   - Alerts: Any contract deadlines within 30 days shown as warning badges
   - Quick stat: "Total contract value: $8,500/month"

   QUADRANT 2 — "Am I Compliant?" (top-right, link to /dashboard/compliance)
   - Shows: compliance item counts by status (compliant, due soon, overdue, not started)
   - Visual: A circular progress ring showing % compliant
   - Summary text: "12 of 14 requirements met. 1 due in 8 days. 1 overdue."
   - Alerts: Any overdue items shown in red, upcoming items in yellow with countdown ("TPT return due in 6 days")
   - Upcoming: next 3 deadlines with dates

   QUADRANT 3 — "Am I Keeping Enough Money?" (bottom-left, link to /dashboard/finances)
   - Shows: current month P&L snapshot
   - Visual: A small revenue vs. expenses bar chart (last 3 months)
   - Summary text: "March: $4,200 revenue, $1,640 expenses, $2,560 profit (61% margin)"
   - Alerts: "3 unclaimed deductions found worth $840" or "Quarterly tax payment of $1,620 due in 14 days"
   - Quick stat: "YTD savings from AI recommendations: $3,400"

   QUADRANT 4 — "What Should I Do Next?" (bottom-right, link to /dashboard/growth)
   - Shows: top 3 recommended actions ranked by impact
   - Visual: Numbered action items with impact estimates
   - Examples:
     "1. Apply for Tempe Micro-Enterprise Grant — up to $10,000 free. Deadline: 19 days. [Start Application]"
     "2. Raise ceramic coating price from $350 to $425 — estimated +$3,360/year. [Update Pricing]"
     "3. Switch insurance carrier — save $890/year for identical coverage. [See Comparison]"
   - Each action has an estimated dollar impact and a one-tap action button

2. AI INSIGHT BANNER:
   At the top of the dashboard (below the nav bar, above the quadrants), show a single rotating AI insight — the most important thing the AI thinks the entrepreneur should know right now. This changes daily based on the business state.

   Examples:
   - "Your storage sublease auto-renews in 8 days at a 12% rent increase. You need to send notice by March 25 to renegotiate. [See Details]"
   - "You've been profitable for 6 consecutive months. You now qualify for SBA microloans. [Explore Options]"
   - "Your Q2 estimated tax payment is due in 14 days. Amount: $1,620 federal + $430 state. [Pay Now]"

   Implementation: Create a function that queries all alerts across all quadrants, ranks them by urgency and impact, and surfaces the #1 item.

3. QUICK ACTION FLOATING BUTTON:
   A floating action button (bottom-right on mobile, top-right dropdown on desktop) with:
   - "New Quote" — opens the quote creation flow
   - "Scan Receipt" — opens camera/file upload for receipt scanning
   - "Upload Contract" — opens file upload for contract analysis
   - "Ask AI" — opens a chat interface for general business questions

4. DRILL-DOWN PAGES:
   Create placeholder pages for each quadrant's detail view:
   - /dashboard/protection — full contract vault with timeline and gap analysis
   - /dashboard/compliance — full compliance checklist with deadlines
   - /dashboard/finances — full P&L, expense tracking, tax summary, deduction finder
   - /dashboard/growth — full funding opportunities, pricing analysis, milestone tracker

   These will be built out in later phases. For now, create the page shells with the routing and a "Coming soon" state that shows what will be here.

5. REAL-TIME DATA:
   The dashboard should read from Firestore in real-time (use Firestore onSnapshot listeners) so it updates immediately when receipts are scanned, contracts uploaded, or quotes sent.

6. RESPONSIVE DESIGN:
   - Desktop: 2x2 grid
   - Tablet: 2x2 grid with smaller cards
   - Mobile: stacked single column, each quadrant as an expandable card

Make the dashboard feel like a mission control center — calm, organized, and empowering. The entrepreneur should be able to glance at it and know exactly where their business stands in 5 seconds.
```

---

---

## PHASE 3: TOOL 1 — THE QUOTE-TO-CASH ENGINE

---

### PROMPT 3A: Quote Creation & Pricing Intelligence

```
Context: You are building "Launchpad," an AI business partner for first-time entrepreneurs. The project uses Next.js 14, Firebase, and Google Vertex AI. The onboarding and dashboard are already built. The BusinessProfile in Firestore contains the business's service types with pricing.

Now build Tool 1: The Quote-to-Cash Engine — the feature that turns client inquiries into signed contracts and paid invoices in a single flow.

THE USER FLOW:
1. Maria gets a text from a potential client: "How much for a full detail on my 2022 Tahoe?"
2. She opens Launchpad, taps "New Quote"
3. She selects the service(s), vehicle type, and enters client info
4. The AI analyzes the quote against her historical data and recommends optimal pricing
5. She sends the quote as a shareable link
6. The client receives a professional quote page, selects add-ons, accepts, and e-signs the auto-generated service agreement
7. After the job, Maria taps "Complete" and the client gets an invoice with a payment link
8. If the client doesn't pay, automated follow-ups are sent

BUILD THE FOLLOWING:

1. QUOTE CREATION PAGE (src/app/quotes/page.tsx and creation modal):
   - "New Quote" button opens a creation flow
   - Step 1: Client info (name, email, phone) — autocomplete from previous clients
   - Step 2: Service selection — shows all ServiceTypes from the business profile as selectable cards with prices. Each service shows: name, base price, estimated duration, and supply cost. For auto detailing businesses, show a vehicle type selector that adjusts pricing (sedan = 1.0x, SUV = 1.3x, truck = 1.5x)
   - Step 3: Add-ons — optional additional services (ceramic coating, headlight restoration, engine bay, etc.) as toggle switches with prices
   - Step 4: Schedule — date/time picker for the appointment, address field
   - Step 5: AI pricing review — before sending, the AI analyzes the quote

2. AI PRICING ANALYSIS (src/app/api/ai/generate-quote/route.ts):
   When a quote is ready to send, call Vertex AI with:
   - The quote details (services, pricing, vehicle type)
   - The business's historical data (average price for this service, acceptance rate, supply costs, labor time)
   - Generate a pricing analysis:

   System prompt for Gemini:
   """
   You are a pricing analyst for small service businesses. Given a quote and the business's historical performance data, analyze the pricing and provide recommendations.

   Consider:
   - Is the price competitive for the market (use your knowledge of typical pricing for this service type in this metro area)?
   - What is the estimated profit margin after supply costs and labor?
   - What is the business's historical acceptance rate for similar quotes? If it's above 90%, the price is likely too low.
   - What are competitors likely charging for equivalent service?

   Output a JSON object with:
   {
     "supplyCost": number,
     "estimatedLaborHours": number,
     "estimatedLaborCost": number (at the business's target hourly rate),
     "profitMargin": number (percentage),
     "marketComparison": string ("15% below market average for Tempe area"),
     "recommendation": string ("Your price of $195 for a full-size SUV interior detail is below the Tempe market average of $235. Your 96% acceptance rate suggests significant room to increase. Recommend $235-$250."),
     "suggestedPrice": number
   }
   """

   Display this analysis as a card below the quote summary with the recommendation highlighted. Let the user accept the AI's suggested price or keep their original price.

3. QUOTE PREVIEW & SEND:
   - Show a preview of the quote as the client will see it
   - "Send via Text" button — generates a shareable link and opens the phone's SMS app with the link pre-filled
   - "Send via Email" button — sends an email with the quote embedded
   - "Copy Link" button — copies the shareable link
   - Save the quote to Firestore with status "sent"

4. PUBLIC CLIENT-FACING QUOTE PAGE (src/app/quotes/public/[id]/page.tsx):
   This is the page the CLIENT sees when they click the link. It must work without authentication.

   Design: A clean, professional page with:
   - Business name and logo at the top
   - "Quote from [Business Name]" header
   - Client name and date
   - Itemized services with descriptions and prices
   - Add-on options the client can toggle on/off (the total updates in real-time)
   - Total with tax
   - "Accept Quote" button

   When the client clicks "Accept Quote":
   - Show the auto-generated service agreement (generated from the contract template created during onboarding, customized with this client's name, services, and date)
   - The client reads and e-signs (simple typed signature field with "By typing your name below, you agree to the terms of this service agreement" — this is legally sufficient for service contracts in all US states)
   - After signing, show a confirmation with the scheduled date/time and a "Add to Calendar" button (generates .ics file)
   - Update the quote status to "accepted" in Firestore
   - Send Maria a push notification: "John accepted your quote for $235! Appointment: Saturday 2 PM"

5. QUOTE MANAGEMENT LIST (src/app/quotes/page.tsx):
   - Table/card list of all quotes with columns: Client, Service, Amount, Status, Date
   - Status pills: Draft (gray), Sent (blue), Viewed (yellow), Accepted (green), Declined (red), Paid (green with check)
   - Filter by status
   - Each quote row is clickable to see full details

6. POST-JOB COMPLETION & INVOICING:
   On the quote detail page, after the appointment date has passed, show a "Mark as Complete" button. When tapped:
   - Status changes to "invoiced"
   - The client receives an invoice via text/email with a payment link
   - Payment link uses Stripe Checkout for card payments (create a Stripe Checkout Session via API)
   - Also show the option to "Mark as Paid" manually (for cash/Venmo payments)

7. AUTOMATED FOLLOW-UPS:
   Create a system (can be a simple cron-like check on each page load for hackathon purposes, or a Cloud Function for production):
   - If quote is "sent" and not viewed after 24 hours → send a follow-up text
   - If quote is "accepted" and payment not received after 48 hours → send payment reminder
   - If payment not received after 7 days → send firmer reminder
   - If payment not received after 14 days → alert the business owner with options (late fee, small claims info)

8. STRIPE INTEGRATION (src/app/api/quotes/[id]/pay/route.ts):
   - Create a Stripe Checkout Session for the quote amount
   - Include the client's email for receipt
   - On successful payment, webhook updates the quote status to "paid" and records the payment date
   - Create the webhook handler (src/app/api/webhooks/stripe/route.ts)

CRITICAL UX DETAILS:
- The entire flow from "New Quote" to "Send to Client" should take under 60 seconds
- The client-facing page must look professional on mobile (most clients will open it on their phone)
- The service agreement must look legitimate and professional, not like it was generated by a chatbot
- Show the AI pricing recommendation prominently but non-intrusively — Maria should feel like the AI is a helpful colleague suggesting a price, not overriding her judgment
```

---

---

## PHASE 4: TOOL 2 — THE RECEIPT SCANNER

---

### PROMPT 4A: Receipt Scanning & Financial Intelligence

```
Context: You are building "Launchpad," an AI business partner for first-time entrepreneurs. The project uses Next.js 14, Firebase, Google Vertex AI (Gemini), and Google Document AI. The onboarding, dashboard, and quote-to-cash engine are already built.

Now build Tool 2: The Receipt Scanner — a tool that turns photos of receipts into categorized, tax-optimized financial data that feeds a real-time P&L.

THE USER FLOW:
1. Maria takes a photo of a receipt (or uploads an existing photo)
2. The AI extracts vendor, amount, date, and line items via OCR
3. The AI classifies the expense by category AND tax treatment, explaining WHY
4. If the expense is mixed-use (personal + business), the AI estimates the business percentage
5. The receipt data flows into a real-time P&L and tax summary
6. The AI proactively identifies missed deductions and tax savings

BUILD THE FOLLOWING:

1. RECEIPT SCANNER PAGE (src/app/receipts/page.tsx):
   Layout:
   - Top section: large drop zone / camera button for uploading receipts. On mobile, the primary action should be "Take Photo" which opens the camera directly. On desktop, show a drag-and-drop zone.
   - Support multiple receipt uploads at once (batch scanning)
   - Below the upload zone: a feed of all scanned receipts, most recent first, showing: thumbnail, vendor, amount, category tag (color-coded), date, and tax classification

2. RECEIPT PROCESSING API (src/app/api/ai/analyze-receipt/route.ts):
   When a receipt image is uploaded:

   Step 1: Upload the image to Firebase Storage and get a URL

   Step 2: Send the image to Vertex AI (Gemini) with the following prompt:

   """
   You are an expert bookkeeper and tax advisor for small businesses. Analyze this receipt image and extract all information.

   BUSINESS CONTEXT (provided from the Business Intelligence Graph):
   - Business type: {businessType}
   - Entity type: {entityType}
   - Services offered: {serviceTypes}
   - Business use percentage for vehicle: {vehicleBusinessPercentage}
   - State: {state}

   Extract and return a JSON object with:
   {
     "vendor": string (store/company name),
     "amount": number (total amount),
     "date": string (YYYY-MM-DD),
     "lineItems": [{ "description": string, "quantity": number, "unitPrice": number, "totalPrice": number }],
     "category": one of ["supplies", "vehicle_fuel", "vehicle_maintenance", "insurance", "rent", "utilities", "marketing", "equipment", "meals_entertainment", "office_supplies", "software", "training", "professional_services", "other"],
     "taxClassification": one of ["cogs", "expense", "asset", "personal", "mixed"],
     "businessPercentage": number (0-100),
     "deductibleAmount": number,
     "taxNotes": string (explanation of the tax treatment, specific to their business — e.g., "These microfiber towels are Cost of Goods Sold (supplies used directly in service delivery), not a general business expense. This distinction matters because COGS reduces your gross profit, which affects your Section 199A QBI deduction calculation."),
     "needsMoreInfo": boolean (true if you need clarification, like whether a meal was a business meeting),
     "question": string | null (if needsMoreInfo is true, what to ask — e.g., "This looks like a restaurant receipt. Was this a business meal? If so, who did you meet with and what was the business purpose?")
   }

   CLASSIFICATION RULES:
   - Materials used DIRECTLY in delivering services to clients (cleaning supplies, microfiber towels, ceramic coating products, wax, etc.) = COGS/supplies, NOT general expenses
   - Gas/fuel on days with client appointments = vehicle_fuel, deductible at business use percentage
   - Gas/fuel on non-business days = personal, unless the user clarifies otherwise
   - Equipment over $2,500 = asset (may need depreciation or Section 179 election)
   - Restaurant/food receipts = ask for business purpose before classifying
   - Phone bills, internet = mixed use, estimate business percentage based on business type
   - Anything that's clearly personal (groceries, clothing, entertainment) = personal, $0 deductible
   """

   Step 3: If the AI returns needsMoreInfo = true, present the question to the user and wait for their answer before finalizing the classification.

   Step 4: Save the Receipt object to Firestore under the business's receipts sub-collection.

3. RECEIPT DETAIL VIEW:
   When tapping on a scanned receipt, show:
   - The original receipt image
   - All extracted data (editable — user can correct OCR errors)
   - The AI's category and tax classification with the explanation
   - A "Recategorize" button if the user disagrees with the classification
   - Running totals: "This brings your March supplies total to $847"

4. REAL-TIME P&L (part of src/app/dashboard/finances/page.tsx):
   Build a Profit & Loss view that updates automatically as receipts are scanned and quotes are paid:

   - Revenue section: pulls from paid quotes in the quote engine
   - COGS section: pulls from receipts classified as "cogs"
   - Gross Profit: Revenue - COGS
   - Expense section: all other business receipts, grouped by category
   - Net Profit: Gross Profit - Expenses
   - Profit Margin percentage

   Show this as both a summary card and a detailed breakdown. Include month-over-month comparison ("+12% revenue vs. last month, -8% expenses = +34% profit increase").

   Add a simple line chart (using Recharts) showing monthly revenue, expenses, and profit for the last 6 months.

5. TAX DASHBOARD (part of finances page):
   - Current year estimated tax liability, updated in real-time
   - Quarterly payment tracker: Q1-Q4 with amounts, due dates, and paid/unpaid status
   - Deductions found: a list of every deduction the AI has identified from scanned receipts with dollar values
   - "Missed Deductions" alert: the AI should proactively flag categories where the business SHOULD have deductions but doesn't. Example: "You've driven to 47 client appointments this year but haven't logged any mileage. At $0.70/mile and an estimated 15 miles average per appointment, you're missing approximately $493 in mileage deductions. Start logging mileage to capture this."

6. TAX CALCULATION ENGINE (src/services/tax-calculator.ts):
   Build a function that calculates estimated taxes based on:
   - Total revenue (from paid quotes)
   - Total COGS (from receipts)
   - Total deductible expenses (from receipts, at their deductible amounts)
   - Mileage deduction (if tracked)
   - Self-employment tax (15.3% on 92.35% of net earnings)
   - Federal income tax (using current bracket rates, accounting for standard deduction and SE tax deduction)
   - Arizona state income tax (2.5% flat rate as of 2024+)
   - Section 199A QBI deduction (20% of QBI for income under $182,100)
   - Account for W-2 income from other jobs if applicable (changes the bracket calculations)

   Output a TaxSummary object and save it to Firestore, updating whenever new financial data is added.

7. EXPORT CAPABILITY:
   - "Export for Tax Filing" button that generates a CSV or PDF summary compatible with Schedule C
   - Includes all categorized expenses, revenue, deductions, and quarterly payment history
   - Every entry links back to its source receipt image

CRITICAL DETAILS:
- Receipt scanning should feel instant — show a skeleton/placeholder immediately while the AI processes
- The AI explanation on each receipt is educational — it should teach the entrepreneur WHY something is classified a certain way, building their financial literacy over time
- The tax numbers should always show a disclaimer: "Estimated for planning purposes. Consult a tax professional for filing."
- Handle edge cases: blurry receipts (ask to retake), receipts in other languages, handwritten receipts, digital receipts (screenshots of online orders)
```

---

---

## PHASE 5: TOOL 3 — THE CONTRACT VAULT

---

### PROMPT 5A: Contract Upload, Analysis & Monitoring

```
Context: You are building "Launchpad," an AI business partner for first-time entrepreneurs. The project uses Next.js 14, Firebase, and Google Vertex AI (Gemini). The onboarding, dashboard, quote engine, and receipt scanner are already built.

Now build Tool 3: The Contract Vault — a tool that reads, analyzes, monitors, and cross-references every contract the business has signed.

THE USER FLOW:
1. Maria receives a vendor agreement from a shopping center that wants her to operate from their parking lot
2. She uploads the PDF to Launchpad
3. The AI reads the entire contract (using Gemini's long context window) and produces a clause-by-clause analysis in plain English
4. It flags risky clauses with dollar-impact estimates
5. It checks for conflicts with her OTHER contracts already in the vault
6. It drafts a counter-proposal for any problematic clauses
7. The contract goes into the vault with deadline tracking and auto-renewal monitoring

BUILD THE FOLLOWING:

1. CONTRACT UPLOAD & ANALYSIS PAGE (src/app/contracts/page.tsx):
   - Upload zone supporting PDF, DOCX, and images (photos of printed contracts)
   - While processing, show a progress indicator: "Reading contract... Analyzing clauses... Checking for conflicts... Generating recommendations..."
   - After analysis, display the full analysis results

2. CONTRACT ANALYSIS API (src/app/api/ai/analyze-contract/route.ts):
   Send the full contract text to Vertex AI (Gemini) with this system prompt:

   """
   You are an expert business attorney reviewing a contract on behalf of a small business owner. The business owner is NOT legally sophisticated — explain everything in plain English while being legally precise.

   BUSINESS CONTEXT:
   - Business: {businessName} ({businessType})
   - Entity: {entityType} in {state}
   - Owner: {ownerName}
   - Monthly revenue: {monthlyRevenue}
   - Existing contracts: {existingContractSummaries — titles, key terms, and critical clauses of all contracts already in the vault}

   ANALYZE THIS CONTRACT AND RETURN A JSON OBJECT:
   {
     "summary": "2-3 sentence plain English summary of what this contract is and what it means for the business",
     "contractType": "vendor_agreement|lease|service_agreement|partnership|employment|financing|other",
     "counterpartyName": "Name of the other party",
     "effectiveDate": "YYYY-MM-DD or null",
     "expirationDate": "YYYY-MM-DD or null",
     "autoRenews": boolean,
     "autoRenewalDate": "YYYY-MM-DD or null — when does auto-renewal trigger",
     "autoRenewalNoticePeriod": number or null — days before auto-renewal to give cancellation notice,
     "terminationNoticePeriod": number or null — days notice required to terminate,
     "totalValue": number or null — total dollar value of the contract if determinable,
     "monthlyValue": number or null,
     "riskLevel": "low|medium|high|critical",

     "clauses": [
       {
         "clauseNumber": "7.3",
         "clauseTitle": "Revenue Sharing",
         "originalText": "Exact text of the clause from the document",
         "plainEnglish": "This means the shopping center takes 15% of every dollar you earn — not 15% of your profit, 15% of your total revenue before expenses. On a $200 detail, they get $30 regardless of whether you made money on that job.",
         "riskLevel": "safe|caution|danger",
         "issue": "15% of gross revenue is significantly above market rate. Industry standard for parking lot vendor agreements is 8-10% of gross or a flat daily fee.",
         "recommendation": "Counter-propose either: (a) 8% of gross revenue, or (b) a flat fee of $60/day with a 90-day trial period.",
         "businessImpact": "At your current monthly revenue of $4,200, this clause costs you $630/month ($7,560/year). At 8%, it would cost $336/month — saving you $3,528/year."
       }
     ],

     "missingProtections": [
       "No limitation of liability cap — the shopping center could theoretically hold you liable for unlimited damages",
       "No force majeure clause — if weather prevents you from operating, you may still owe the revenue share minimum",
       "No dispute resolution clause — any disagreement goes straight to litigation instead of mediation (cheaper)"
     ],

     "conflicts": [
       {
         "thisClause": "Clause 12.1 — Non-compete within 10 miles for 12 months",
         "conflictingContractId": "abc123",
         "conflictingContractName": "Pinnacle Property Management MSA",
         "conflictingClause": "Clause 3.2 — Service exclusivity for all Pinnacle properties in Scottsdale",
         "description": "The 10-mile non-compete in this agreement would prevent you from servicing Pinnacle's Scottsdale properties if this agreement terminates. You'd be in breach of one contract or the other.",
         "recommendation": "Reduce the non-compete radius to 2 miles or eliminate it entirely. Alternatively, add a carve-out: 'This non-compete does not apply to pre-existing client relationships established prior to the effective date of this agreement.'"
       }
     ],

     "recommendations": [
       "This contract is worth approximately $1,200/month to your business but creates significant concentration risk — it would represent 29% of your revenue. Keep diversifying your client base.",
       "The personal guarantee in the indemnification clause (Section 8) exposes your personal assets despite your LLC. This largely defeats the purpose of having an LLC. Remove the personal guarantee."
     ],

     "counterProposalDraft": "A complete redlined version of the contract with all recommended changes, each marked with a comment explaining the change to the counterparty in professional language."
   }

   ANALYSIS RULES:
   - Always calculate the DOLLAR IMPACT of problematic clauses against the business's actual financials
   - Always check for non-compete clauses and analyze their geographic/temporal scope against the business's actual operating area
   - Always check for personal guarantee language that pierces the LLC protection
   - Always check for auto-renewal terms and calculate the cost of missing the cancellation window
   - Always check for insurance requirements in the contract and compare against the business's current coverage
   - Always check for indemnification clauses that are one-sided
   - Always check for termination clauses — how much notice does each party need?
   - Flag any clause that would be unenforceable under state law (e.g., overly broad non-competes in states with restrictions)
   - When generating the counter-proposal, use professional legal language — the business owner will send this to the other party, and it needs to look like it came from someone who knows what they're doing
   """

3. CONTRACT ANALYSIS RESULTS PAGE (src/app/contracts/[id]/page.tsx):
   Display the analysis in a structured, scannable format:

   - TOP: Summary card with contract name, counterparty, value, and overall risk level (color-coded badge)
   - TIMELINE BAR: Visual bar showing effective date → today → renewal/expiration date, with key deadlines marked
   - CLAUSE-BY-CLAUSE ANALYSIS: Expandable accordion sections for each clause. Default: show only "caution" and "danger" clauses expanded. Safe clauses collapsed with green checkmarks.
     - Each clause shows: clause number, plain English explanation, risk badge, business impact in dollars, and recommendation
     - "Danger" clauses have a red sidebar and prominent display
   - MISSING PROTECTIONS: Yellow warning cards for each protection the contract should have but doesn't
   - CONFLICTS: Red alert cards showing conflicts with other contracts in the vault, with links to the conflicting contract
   - COUNTER-PROPOSAL: A "Generate Counter-Proposal" button that shows the AI-drafted counter-proposal in a modal. User can edit and then download as a DOCX or copy to clipboard.
   - ACTION BUTTONS: "Add to Vault" (saves to active contracts with monitoring), "Request Changes" (shows counter-proposal), "Decline" (marks as rejected)

4. CONTRACT VAULT LIST (src/app/contracts/page.tsx — enhanced):
   - Card/list view of all contracts in the vault
   - Each card shows: contract name, counterparty, monthly value, risk level, and next deadline
   - Sortable by: date added, expiration date, value, risk level
   - Filter by: contract type, risk level, status
   - A "DEADLINES" section at the top showing upcoming deadlines across all contracts in chronological order with countdown timers
   - Alerts for: auto-renewal windows closing, contracts expiring, insurance requirements not met

5. CONTRACT GENERATION (src/app/api/ai/generate-contract/route.ts):
   For generating new contracts (not analyzing uploaded ones), build an endpoint that creates business-specific contracts:

   System prompt:
   """
   You are an expert business attorney drafting a {contractType} for a {businessType} business in {state}.

   Generate a complete, ready-to-sign contract that includes:
   - All standard protective clauses for a {businessType} business
   - Industry-specific clauses (e.g., pre-existing damage documentation for auto detailing, food safety for catering, property access for cleaning services)
   - State-specific legal requirements for {state}
   - Clear plain-English language (avoid unnecessary legalese while maintaining legal validity)
   - Signature blocks for both parties
   - Date fields

   The contract should protect the business owner (your client) while being fair and reasonable — an overly one-sided contract won't get signed by the counterparty.

   REQUIRED SECTIONS:
   1. Parties and definitions
   2. Scope of services
   3. Pricing and payment terms
   4. Scheduling and cancellation policy
   5. Liability limitation and indemnification
   6. Insurance requirements
   7. Photo/documentation clause (if applicable to industry)
   8. Warranty/guarantee terms
   9. Dispute resolution (mediation before litigation)
   10. Termination provisions
   11. Governing law ({state})
   12. Severability
   13. Entire agreement
   14. Signature blocks

   Format the output as clean HTML that can be converted to PDF or DOCX.
   """

6. CROSS-CONTRACT INTELLIGENCE:
   Every time a new contract is added, re-analyze ALL existing contracts for new conflicts. Store contract summaries in the Business Intelligence Graph so the AI can reference them when analyzing new uploads. Specifically track:
   - Non-compete overlaps
   - Insurance requirement conflicts (one contract requires $1M, another requires $2M)
   - Revenue concentration risk (% of revenue from each contract)
   - Expiration clustering (multiple contracts expiring the same month = revenue risk)

Make the contract analysis feel thorough but not overwhelming. Lead with the 2-3 most important findings, then let the user drill into details. The counter-proposal feature is the "wow" moment — a first-time entrepreneur getting a professional counter-proposal draft in 30 seconds is something they've never experienced.
```

---

---

## PHASE 6: TOOL 4 — THE COMPLIANCE AUTOPILOT

---

### PROMPT 6A: Compliance Tracking & Monitoring

```
Context: You are building "Launchpad," an AI business partner for first-time entrepreneurs. The project uses Next.js 14, Firebase, and Google Vertex AI. The onboarding already created initial ComplianceItems based on the business type and location. Now build the full compliance tracking and monitoring system.

BUILD THE FOLLOWING:

1. COMPLIANCE DASHBOARD (src/app/dashboard/compliance/page.tsx):
   - TOP SECTION: A visual summary showing compliance health
     - Circular progress ring: "12 of 14 requirements met"
     - Three count badges: Green (compliant), Yellow (due within 30 days), Red (overdue or not started)

   - URGENT ALERTS SECTION: Any overdue or due-within-14-days items displayed as prominent alert cards with countdown timers and one-tap action buttons. Example:
     "⚠️ TPT Monthly Return — DUE IN 6 DAYS
      Arizona Transaction Privilege Tax return for March. Estimated amount: $340 based on $8,500 gross revenue.
      [File Now → AZTaxes.gov]  [Mark as Filed]"

   - FULL COMPLIANCE LIST: All compliance items grouped by jurisdiction (Federal → State → County → City), each showing:
     - Title and description
     - Status badge (compliant/due soon/overdue/not started/not applicable)
     - Expiration or due date with countdown
     - Cost to file/renew
     - Penalty for non-compliance
     - Action button (link to filing portal, or "Mark Complete")
     - Last verified date

   - CALENDAR VIEW: A monthly calendar showing all compliance deadlines as colored dots (green = completed, yellow = upcoming, red = overdue). Tapping a date shows the items due.

2. COMPLIANCE ITEM DETAIL VIEW:
   When tapping a compliance item, show:
   - Full description of what this requirement is and WHY it exists
   - The specific legal citation (ARS §44-1221, Tempe City Ordinance 2025-14, etc.)
   - Step-by-step instructions to fulfill it
   - Documentation required (and links to the documents in the portal if they exist)
   - Direct link to the government filing portal
   - History: when it was first obtained, when it was last renewed, when reminders were sent
   - "Mark as Complete" button with optional proof upload (photo of license, filing confirmation screenshot)

3. COMPLIANCE GENERATION ENGINE (src/services/compliance-tracker.ts):
   Build a function that, given a BusinessProfile, generates the complete list of compliance requirements. This function was called during onboarding but should also be callable when business circumstances change (e.g., hiring first employee triggers new requirements).

   Use Vertex AI to generate compliance items:

   """
   You are an expert in small business regulatory compliance. Given the following business profile, generate a COMPLETE list of every federal, state, county, and city compliance requirement this business must meet.

   BUSINESS PROFILE:
   - Business type: {businessType}
   - Entity type: {entityType}
   - State: {state}
   - County: {county}
   - City: {city}
   - Has employees: {hasEmployees}
   - Employee count: {employeeCount}
   - Uses personal vehicle for business: {usesPersonalVehicle}
   - Estimated annual revenue: {estimatedRevenue}
   - Industry-specific factors: {any relevant details like chemicals used, food handling, etc.}

   For EACH requirement, provide:
   {
     "title": "Tempe Business License",
     "description": "All businesses operating within Tempe city limits must obtain a business license, regardless of whether they have a physical location in the city.",
     "jurisdiction": "city",
     "jurisdictionName": "City of Tempe",
     "category": "license",
     "isRequired": true,
     "legalCitation": "Tempe City Code Chapter 28, Article I",
     "applicationUrl": "https://www.tempe.gov/government/community-development/business-licenses",
     "cost": 50,
     "renewalFrequency": "annual",
     "estimatedProcessingTime": "3-5 business days",
     "documentationRequired": ["Articles of Organization", "EIN Letter", "Photo ID"],
     "penaltyForNonCompliance": "Fine up to $300 per month of operation without a license",
     "triggerConditions": "Required for all businesses operating in Tempe city limits"
   }

   BE EXHAUSTIVE. Include requirements that are easy to miss:
   - Transaction Privilege Tax (Arizona's version of sales tax) — monthly filing requirement
   - Wastewater permits for businesses that generate wash water
   - Commercial vehicle registration if using personal vehicle for business
   - Workers compensation insurance (mandatory in AZ with first employee)
   - Quarterly estimated tax payments (federal and state)
   - Annual LLC report filing (free in AZ but failure to file = dissolution)
   - Business personal property tax (for equipment valued over threshold)
   - Any industry-specific certifications or permits
   """

4. AUTOMATED REMINDERS:
   Build a reminder system that sends notifications at 30, 14, and 3 days before each deadline. For the hackathon, implement this as a check that runs when the user opens the dashboard. For production, this would be a Cloud Function on a daily schedule.

   Reminders should include:
   - What's due
   - The exact amount owed (if applicable, calculated from current financials)
   - A direct link to complete the action
   - What happens if they miss it (penalty amount)

5. DYNAMIC COMPLIANCE UPDATES:
   The compliance list should automatically update when the business profile changes:
   - User marks "I hired my first employee" → automatically add: workers comp insurance requirement, withholding tax registration, new hire reporting, I-9 verification, unemployment insurance, OSHA poster requirement
   - User adds a new operating city → automatically add that city's business license and any city-specific requirements
   - Revenue crosses a threshold → add requirements that kick in at higher revenue levels

6. COMPLIANCE EXPORT:
   "Export Compliance Report" button that generates a PDF showing all requirements, their status, and upcoming deadlines — useful for presenting to a bank or lender as part of a loan application.

The compliance tracker should feel like having a regulatory expert watching your back 24/7. The entrepreneur should never be surprised by a deadline, a fine, or a requirement they didn't know about.
```

---

---

## PHASE 7: TOOL 5 — THE GROWTH RADAR

---

### PROMPT 7A: Funding Discovery & Growth Recommendations

```
Context: You are building "Launchpad," an AI business partner for first-time entrepreneurs. The project uses Next.js 14, Firebase, and Google Vertex AI. All four previous tools are built (quotes, receipts, contracts, compliance).

Now build Tool 5: The Growth Radar — a proactive system that surfaces funding opportunities, pricing optimizations, expense reductions, and strategic milestones.

BUILD THE FOLLOWING:

1. GROWTH DASHBOARD (src/app/dashboard/growth/page.tsx):
   Layout: a prioritized action feed — NOT a static list. Each action card shows:
   - Title: what to do
   - Impact: estimated dollar value or business impact
   - Urgency: deadline or time-sensitivity
   - Effort: estimated time to complete
   - Action button: one-tap to start
   - "Dismiss" option with "Why not?" feedback (helps the AI learn what's relevant)

   Sort actions by a combined score of (impact × urgency) / effort.

2. FUNDING SCANNER (src/services/funding-scanner.ts):
   Build a function that searches for funding opportunities matching the business profile. For the hackathon, use Vertex AI with web search grounding to find real, current opportunities:

   """
   You are a small business funding advisor. Given this business profile, search for and identify ALL currently available funding opportunities this business may qualify for.

   BUSINESS PROFILE:
   {full BusinessProfile JSON}

   Search for opportunities in these categories:
   1. Federal grants (SBA, USDA for rural areas, minority business grants)
   2. State grants (Arizona Commerce Authority, ADES)
   3. County/city grants (Maricopa County CDBG, City of Tempe economic development)
   4. Microloans (Kiva, Grameen America, Accion, local CDFIs like Prestamos in Phoenix)
   5. SBA loans (7(a), microloans, Community Advantage)
   6. Lines of credit (suited for businesses with their financial profile)
   7. Business plan competitions and pitch competitions in Arizona
   8. Industry-specific funding (minority-owned business programs, women-owned business programs, veteran programs)

   For each opportunity, provide:
   {
     "name": "Tempe Micro-Enterprise Assistance Program",
     "provider": "City of Tempe",
     "type": "grant",
     "amount": { "min": 1000, "max": 10000 },
     "interestRate": null,
     "repaymentTerms": null,
     "applicationUrl": "https://...",
     "applicationDeadline": "2026-04-30 or null if rolling",
     "eligibilityCriteria": [
       { "criterion": "Business located in Tempe", "met": true, "notes": "Business address is in Tempe" },
       { "criterion": "Operating for 6+ months", "met": true, "notes": "LLC formed 7 months ago" },
       { "criterion": "5 or fewer employees", "met": true, "notes": "Currently 1 (owner only)" },
       { "criterion": "Owner at or below 80% AMI or in LMI census tract", "met": true, "notes": "Business is in Census Tract 3175.02, classified as LMI by HUD" }
     ],
     "eligibilityMatch": 100,
     "fitScore": 92,
     "recommendation": "Strong match. This is free money with no repayment obligation. Your portal data can pre-fill 80% of the application. Estimated time to apply: 20 minutes.",
     "estimatedTimeToApply": "20 minutes with portal data"
   }

   CRITICAL: Only include opportunities the business has a realistic chance of qualifying for. Don't pad the list with long-shot options. Check every eligibility criterion against their actual data.
   """

3. PRICING OPTIMIZER:
   Analyze the business's quote history and generate pricing recommendations:

   - Pull all completed quotes from Firestore
   - Calculate acceptance rate by service type
   - If acceptance rate > 90% for any service → recommend a price increase
   - Compare against market rates (using AI knowledge of typical pricing in the metro area)
   - Generate specific recommendation: "Raise ceramic coating from $350 to $425. Based on your 96% acceptance rate, demand will remain strong. Estimated annual revenue increase: $3,360."

4. EXPENSE REDUCTION SCANNER:
   Analyze the business's recurring expenses and find savings:

   - Identify all recurring charges (same vendor, similar amount, monthly pattern)
   - For insurance: compare current premiums against market rates for equivalent coverage
   - For subscriptions: identify any that haven't been "used" (no related receipts or business activity)
   - For supplies: identify if the same product is being purchased from multiple vendors at different prices
   - Generate specific recommendations with dollar savings and switch instructions

5. MILESTONE TRACKER:
   Track the business's progress against key financial/operational milestones that unlock new opportunities:

   - Revenue milestones: $50K → eligible for more loan products; $80K → S-Corp election evaluation; $100K → SBA 7(a) eligibility
   - Time milestones: 6 months operating → eligible for most grants; 1 year → eligible for SBA microloans; 2 years → eligible for conventional business loans
   - Operational milestones: first employee → workers comp and payroll obligations; first commercial contract → insurance requirements may change
   - Show a visual timeline with achieved milestones (green) and upcoming milestones with progress bars

6. WEEKLY DIGEST:
   Generate a weekly summary that the entrepreneur receives (shown as a dashboard card or could be emailed):

   - Revenue this week vs. last week
   - New opportunities discovered
   - Upcoming deadlines
   - Top recommended action
   - "Win of the week" — something positive (new milestone reached, money saved, client acquired)
   - AI-generated encouragement based on actual progress

7. APPLICATION PRE-FILLER:
   When the user clicks "Start Application" on a funding opportunity:
   - Pull all relevant data from the Business Intelligence Graph
   - Pre-fill every possible field in a form view
   - Highlight fields that still need manual input
   - For narrative/essay questions (like "Describe your growth plan"), generate a draft based on the business's actual data
   - Show estimated time remaining to complete

This tool should feel like having a business-savvy friend who's constantly scanning for opportunities and whispering "hey, you should look at this." The entrepreneur should feel like they have an unfair advantage.
```

---

---

## PHASE 8: POLISH, INTEGRATION & DEMO PREPARATION

---

### PROMPT 8A: Cross-Tool Intelligence & Demo Mode

```
Context: You are building "Launchpad," an AI business partner for first-time entrepreneurs. All five tools are built: quote engine, receipt scanner, contract vault, compliance tracker, and growth radar. The dashboard ties them together.

Now build the cross-tool intelligence layer and prepare for demo.

BUILD THE FOLLOWING:

1. CROSS-TOOL EVENT SYSTEM:
   When data changes in one tool, it should trigger updates in others. Implement an event bus (can be simple function calls for hackathon):

   EVENT: New receipt scanned
   → Update P&L (finances)
   → Recalculate quarterly tax estimate (compliance)
   → Check if new expense category triggers compliance requirements (e.g., chemical purchase → wastewater permit check)
   → Update funding eligibility (growth — revenue/expense changes may affect qualification)

   EVENT: New quote paid
   → Update P&L revenue (finances)
   → Recalculate quarterly tax estimate (compliance)
   → Check for revenue milestones (growth)
   → Update contract concentration analysis if this is a contract client (contracts)

   EVENT: New contract uploaded
   → Check insurance requirements against current coverage (compliance)
   → Check for conflicts with existing contracts (contracts)
   → Update revenue concentration analysis (growth)
   → If contract has auto-renewal, add deadline to compliance calendar

   EVENT: Receipt for equipment over $2,500
   → Flag Section 179 election opportunity (finances)
   → Check if equipment changes compliance requirements (compliance)
   → Update asset inventory (finances)

   EVENT: Revenue milestone crossed
   → Trigger S-Corp evaluation if above $80K (finances)
   → Unlock new funding opportunities (growth)
   → Update pricing recommendations (growth)

2. AI CHAT INTERFACE (src/components/ai-chat.tsx):
   Build a chat sidebar/modal accessible from the "Ask AI" quick action button anywhere in the app. This is a general-purpose business advisor that has access to the ENTIRE Business Intelligence Graph.

   When the user asks any question, the chat sends to Vertex AI:

   """
   You are a business advisor for {businessName}, a {businessType} in {city}, {state}.

   COMPLETE BUSINESS CONTEXT:
   {Full BusinessProfile JSON}
   {Summary of all contracts}
   {Summary of financial data — YTD revenue, expenses, profit margin, tax obligations}
   {Summary of compliance status}
   {Summary of open quotes and their statuses}

   The business owner is asking: "{userQuestion}"

   Answer their question specifically using the business data you have. Do not give generic advice — reference their actual numbers, their actual contracts, their actual compliance status. If they ask about something you don't have data for, tell them what data they need to provide (upload a document, scan a receipt, etc.) to get a specific answer.

   Keep your response concise and actionable. If there are specific next steps, list them in order of priority.
   """

   The chat should:
   - Stream responses in real-time (using Vertex AI streaming)
   - Show relevant document references (e.g., "Based on your Pinnacle contract clause 9.1...")
   - Have quick-reply suggestion chips for common follow-up questions
   - Maintain conversation history within the session

3. DEMO MODE:
   Create a demo mode that pre-loads the app with Maria's complete business data (created during the data model phase). This should show a business that's been operating for 4 months with:
   - 47 completed quotes (variety of services, some paid, some overdue)
   - 120+ scanned receipts across all categories
   - 6 contracts in the vault (1 with an upcoming auto-renewal deadline, 1 with a conflict)
   - Full compliance checklist (mostly green, 1 yellow, 1 red)
   - 3 active funding opportunities
   - A rich P&L with month-over-month data
   - An AI insight banner showing the most urgent action

   Demo mode should be activatable via a URL parameter (?demo=true) or a toggle in settings.

   Create a script (src/scripts/seed-demo-data.ts) that populates Firestore with all demo data. Make the data realistic:
   - Revenue should show a growth trend with seasonal dip
   - Receipts should include the specific example from the project description (AutoZone microfiber towels, Shell gas, Olive Garden meal question)
   - The vendor agreement should contain the problematic clauses described in the project spec (15% gross revenue, non-compete, personal guarantee)
   - Compliance should show the TPT return due in 6 days and the storage sublease auto-renewing in 8 days

4. NOTIFICATION SYSTEM:
   Build a simple notification center (bell icon in the nav bar) that aggregates all alerts:
   - Compliance deadlines approaching
   - Contract deadlines approaching
   - Unpaid invoices becoming overdue
   - New funding opportunities discovered
   - AI insights and recommendations
   - Quote status changes (viewed, accepted, paid)

   Show unread count badge. Each notification links to the relevant page/action.

5. MOBILE OPTIMIZATION:
   Go through every page and ensure:
   - Receipt scanning works with phone camera (use the capture attribute on file inputs)
   - Quote creation is thumb-friendly on mobile
   - Dashboard cards are readable without zooming
   - All action buttons are at least 44x44px (iOS accessibility minimum)
   - The floating action button works well on mobile
   - Contract analysis results are scrollable and readable on small screens

6. PERFORMANCE:
   - Add loading skeletons for all data-fetching states
   - Implement optimistic updates for receipt scanning (show the receipt immediately, update with AI analysis when ready)
   - Cache business profile data in React context to avoid re-fetching on every page
   - Lazy load the AI chat interface
   - Use Next.js Image component for receipt thumbnails

7. ERROR HANDLING:
   - Handle Vertex AI rate limits gracefully (show "AI is thinking..." with retry)
   - Handle Firebase offline state (show cached data with "offline" indicator)
   - Handle failed receipt scans (allow manual entry fallback)
   - Handle Stripe payment failures (show clear error messages with retry options)
   - All file uploads should have size limits, type validation, and progress indicators

Prepare the app for a live demo where someone walks through:
1. Opens the app → sees the dashboard with Maria's business data
2. Creates a new quote → sends it → client accepts on their phone → contract auto-signs
3. Scans a receipt → AI categorizes it → P&L updates in real time
4. Uploads a vendor agreement → AI flags risky clauses → generates counter-proposal
5. Shows the compliance dashboard → one deadline in 6 days with a one-tap action
6. Shows the growth radar → a $10,000 grant with pre-filled application

Every transition should be smooth. Every AI response should be specific to Maria's business, not generic. The whole demo should feel like watching an AI employee running a business's back office.
```

---

---

## APPENDIX: KEY GEMINI PROMPTS REFERENCE

```
This appendix collects all the core Vertex AI (Gemini) prompts used across the application in one place. When building each phase, refer back to these for the exact prompt language. All prompts follow the same pattern:

1. System context: Who the AI is and what it's expert in
2. Business context: The full Business Intelligence Graph data for this specific business
3. Task-specific instructions: What to analyze and what format to return
4. Output format: Always structured JSON matching the TypeScript types
5. Critical rules: Domain-specific guardrails to prevent bad advice

GENERAL RULES FOR ALL PROMPTS:
- Always include the full business profile as context — the AI should never give generic advice
- Always require structured JSON output matching the TypeScript types
- Always include a disclaimer that this is not professional legal/tax/financial advice
- Always reference specific dollar amounts, specific laws, and specific deadlines
- Always provide actionable next steps, not just analysis
- Keep explanations in plain English — the user may have never seen a contract or tax form before
- When in doubt, be conservative — recommend the safer/more compliant option
- Never recommend tax strategies that could be considered aggressive or borderline
- Always mention when something warrants consulting a professional (complex tax situations, litigation risk, etc.)
```
