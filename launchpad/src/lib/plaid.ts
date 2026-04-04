/**
 * Plaid server-side client — only import in API routes.
 */
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from "plaid";

const plaidEnv = (process.env.PLAID_ENV as keyof typeof PlaidEnvironments) || "sandbox";
const plaidClientId = process.env.PLAID_CLIENT_ID || "placeholder_client_id";
const plaidSecret = process.env.PLAID_SECRET || "placeholder_secret";

const config = new Configuration({
  basePath: PlaidEnvironments[plaidEnv],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": plaidClientId,
      "PLAID-SECRET": plaidSecret,
    },
  },
});

export const plaidClient = new PlaidApi(config);

export const PLAID_PRODUCTS: Products[] = [Products.Transactions];
export const PLAID_COUNTRY_CODES: CountryCode[] = [CountryCode.Us];
