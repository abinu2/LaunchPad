# Growth Tab Features

The Growth tab helps small business owners identify funding opportunities, optimize pricing, reduce expenses, and track business milestones.

## Overview

The Growth tab has four main sections:

### 1. Actions
AI-generated recommendations for:
- **Pricing optimization**: Raise prices if acceptance rate is high
- **Expense reduction**: Cut costs in high-spend categories
- **Growth tactics**: Specific actions to increase revenue

Actions are prioritized by urgency and effort, showing the highest-impact, lowest-effort items first.

### 2. Funding
Real funding opportunities matched to your business:
- **Grants**: Federal, state, and local grants (no repayment)
- **Microloans**: Small loans from CDFIs, Kiva, Accion
- **SBA Loans**: 7(a) loans, microloans, Community Advantage
- **Lines of Credit**: Business credit for cash flow
- **Competitions**: Business plan competitions with prize money

Each opportunity shows:
- Funding amount range
- Eligibility match score (0-100%)
- Application deadline
- Estimated time to apply
- Pre-filled application data

### 3. Milestones
Business growth milestones that unlock funding eligibility:
- **6 months operating**: Unlocks most grants and microloans
- **$50K revenue**: SBA microloan eligibility
- **1 year operating**: SBA 7(a) loans and conventional credit
- **$80K revenue**: S-Corp tax election (saves $3K-8K/year)
- **$100K revenue**: Conventional business loans
- **90%+ quote acceptance**: Time to raise prices

Each milestone shows progress toward the goal and what it unlocks.

### 4. Weekly Digest
Business snapshot and actionable insights:
- **Win of the week**: Highlight of recent progress
- **This week stats**: Revenue, expenses, new opportunities
- **Funding deadlines**: Upcoming application deadlines
- **Business snapshot**: YTD revenue, margins, cash balance

## How It Works

### Scanning for Opportunities

Click "Scan for opportunities" to:

1. **Analyze your business profile**
   - Business type, location, revenue
   - Operating history, employees
   - Quote acceptance rate

2. **Search for funding** (two methods)
   - **Tiny Fish web scraping** (if configured): Scrapes real, current opportunities from SBA.gov, Grants.gov, Kiva, Accion, etc.
   - **AI generation** (fallback): Uses Groq/Gemini to generate realistic opportunities based on your profile

3. **Evaluate eligibility**
   - Checks your business against each opportunity's criteria
   - Calculates eligibility match score (0-100%)
   - Ranks by fit score

4. **Generate recommendations**
   - Pricing optimization based on quote acceptance rate
   - Expense reduction opportunities
   - Growth actions specific to your business

### Pre-filled Applications

For each funding opportunity, the system pre-fills:
- Business name, type, entity structure
- Owner name and email
- Annual revenue, employee count
- Business address
- Custom fields based on opportunity type

Click "Pre-fill application" to open the opportunity's application form with your data already entered.

## Funding Opportunity Types

### Grants
- **No repayment required**
- Typically $5K-$50K
- Competitive application process
- Examples: SBA grants, state economic development grants

### Microloans
- **Small loans** ($500-$50K)
- **Lower interest rates** than traditional banks
- **Flexible terms** for startups
- Examples: Kiva, Accion, local CDFIs

### SBA Loans
- **7(a) loans**: Up to $5M for general business purposes
- **Microloans**: Up to $50K for startups
- **Community Advantage**: For underserved communities
- **Requires**: 6+ months operating, some revenue

### Lines of Credit
- **Flexible borrowing** for cash flow
- **Interest only on what you use**
- **Requires**: 1+ year operating, good credit

### Business Competitions
- **Prize money** for business plans
- **Networking opportunities**
- **Mentorship** from judges
- **No repayment** (it's a prize, not a loan)

## Eligibility Criteria

Each opportunity has specific eligibility requirements. The system checks:

- **Operating history**: How long you've been in business
- **Revenue**: Annual or monthly revenue thresholds
- **Business type**: Industry-specific requirements
- **Location**: Geographic restrictions
- **Ownership**: Minority, woman, or veteran-owned status
- **Employees**: Employee count requirements
- **Credit**: Credit score or payment history

The **eligibility match score** shows what percentage of criteria you meet.

## Pricing Optimization

The system recommends price increases if:
- **Quote acceptance rate > 85%**: Prices are likely too low
- **Market comparison**: Your prices are below typical rates
- **Profit margin**: You have room to increase without losing business

Each recommendation shows:
- Current price
- Suggested price
- Estimated annual impact
- Reasoning

## Expense Reduction

The system identifies savings opportunities by analyzing:
- **Spending patterns**: High-cost categories
- **Market rates**: Typical costs for your industry
- **Efficiency**: Opportunities to reduce waste

Each recommendation shows:
- Category
- Specific action to take
- Estimated annual savings

## Integration with Other Tabs

### Finances Tab
- Cash balance from Plaid
- Revenue and expense tracking
- Profit margin calculation

### Compliance Tab
- Business formation status
- License and permit requirements
- Affects funding eligibility

### Contracts Tab
- Contract obligations
- Renewal dates
- Affects cash flow planning

## API Endpoints

### Scan for Opportunities
```
POST /api/ai/scan-opportunities
Body: { businessId: string }
Returns: { fundingCount, pricingCount, expenseCount }
```

### Scan for Funding (with Tiny Fish)
```
POST /api/ai/scan-funding
Body: { businessId: string }
Returns: { success, count, opportunities }
```

### Get Funding Opportunities
```
GET /api/data/businesses/[id]/funding
Returns: FundingOpportunity[]
```

### Update Opportunity Status
```
PATCH /api/data/businesses/[id]/funding/[oppId]
Body: { status: "discovered" | "applying" | "submitted" | "approved" | "denied" | "dismissed" }
```

### Get Growth Actions
```
GET /api/data/businesses/[id]/growth-actions
Returns: GrowthAction[]
```

### Dismiss Action
```
PATCH /api/data/businesses/[id]/growth-actions/[actionId]
Body: { dismissed: true }
```

## Configuration

### Enable Tiny Fish Web Scraping

1. Sign up at https://tinyfish.io
2. Get your API key
3. Add to `.env.local`:
   ```
   TINYFISH_API_KEY=your_key_here
   ```
4. Restart the dev server

Without Tiny Fish, the system falls back to AI-generated opportunities.

### Customize Funding Sources

Edit `src/lib/tinyfish.ts` to add or remove sources:
```typescript
sources: [
  "sba.gov",
  "grants.gov",
  "score.org",
  "kiva.org",
  "accion.org",
  "cdfi.org",
  // Add more sources here
]
```

## Best Practices

1. **Scan regularly**: New opportunities appear frequently
2. **Check eligibility**: Focus on opportunities you qualify for
3. **Act on deadlines**: Set reminders for application deadlines
4. **Track applications**: Update status as you apply
5. **Implement recommendations**: Pricing and expense changes compound over time
6. **Monitor milestones**: Track progress toward key thresholds

## Troubleshooting

### No funding opportunities found
- Check that your business profile is complete
- Verify your location (state, city) is set
- Try scanning again (opportunities update daily)
- Check that Tiny Fish API key is configured (if using web scraping)

### Eligibility match is low
- Complete your business profile
- Add more revenue data
- Update employee count
- Check if you meet basic requirements (operating time, revenue)

### Pre-filled application not working
- Verify your business profile is complete
- Check that the opportunity's application form accepts pre-filled data
- Try manually entering data if pre-fill fails

### Pricing recommendation seems wrong
- Check your quote acceptance rate
- Verify your market research
- Consider other factors (competition, market conditions)
- Use the recommendation as a starting point, not a rule

## Future Enhancements

- [ ] Automatic application submission
- [ ] Funding timeline tracking
- [ ] Loan comparison calculator
- [ ] Repayment schedule simulator
- [ ] Funding success rate by business type
- [ ] Integration with accounting software
- [ ] Automated expense categorization
- [ ] Competitor pricing analysis
