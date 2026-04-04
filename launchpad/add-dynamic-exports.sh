#!/bin/bash
# Add export const dynamic = "force-dynamic"; to all API routes that don't have it

# List of API route files that need the export
routes=(
  "src/app/api/webhooks/stripe/route.ts"
  "src/app/api/quotes/[id]/route.ts"
  "src/app/api/quotes/[id]/pay/route.ts"
  "src/app/api/quotes/route.ts"
  "src/app/api/plaid/exchange-token/route.ts"
  "src/app/api/plaid/create-link-token/route.ts"
  "src/app/api/documents/upload/route.ts"
  "src/app/api/documents/client-upload/route.ts"
  "src/app/api/data/businesses/[businessId]/route.ts"
  "src/app/api/data/businesses/[businessId]/receipts/[receiptId]/route.ts"
  "src/app/api/data/businesses/[businessId]/receipts/route.ts"
  "src/app/api/data/businesses/[businessId]/quotes/[quoteId]/route.ts"
  "src/app/api/data/businesses/[businessId]/quotes/route.ts"
  "src/app/api/data/businesses/[businessId]/plaid-connections/route.ts"
  "src/app/api/data/businesses/[businessId]/growth-actions/[actionId]/route.ts"
  "src/app/api/data/businesses/[businessId]/growth-actions/route.ts"
  "src/app/api/data/businesses/[businessId]/funding/[oppId]/route.ts"
  "src/app/api/data/businesses/[businessId]/funding/route.ts"
  "src/app/api/data/businesses/[businessId]/files/route.ts"
  "src/app/api/data/businesses/[businessId]/contracts/[contractId]/route.ts"
  "src/app/api/data/businesses/[businessId]/contracts/route.ts"
  "src/app/api/data/businesses/[businessId]/compliance/[itemId]/route.ts"
  "src/app/api/data/businesses/[businessId]/compliance/route.ts"
  "src/app/api/data/businesses/[businessId]/bank-transactions/route.ts"
  "src/app/api/ai/generate-quote/route.ts"
  "src/app/api/ai/analyze-receipt/route.ts"
  "src/app/api/ai/analyze-contract/route.ts"
)

for route in "${routes[@]}"; do
  if [ -f "$route" ]; then
    # Check if dynamic export already exists
    if ! grep -q "export const dynamic" "$route"; then
      echo "Adding dynamic export to $route"
      # Add after imports, before first export
      sed -i '/^import/!{/^export/i export const dynamic = "force-dynamic";
}' "$route"
    fi
  fi
done

echo "Done!"
