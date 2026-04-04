/**
 * Tiny Fish integration for web scraping funding opportunities
 * https://tinyfish.io
 */

export interface TinyFishSearchResult {
  title: string;
  url: string;
  source: string;
  description: string;
  type?: string;
  minAmount?: number;
  maxAmount?: number;
  deadline?: string;
  match?: number;
  fitScore?: number;
  interestRate?: string;
  terms?: string;
}

export interface TinyFishSearchResponse {
  results: TinyFishSearchResult[];
  total: number;
  query: string;
}

const TINYFISH_API_KEY = process.env.TINYFISH_API_KEY;
const TINYFISH_API_URL = "https://api.tinyfish.io/v1";

export function isTinyFishConfigured(): boolean {
  return !!TINYFISH_API_KEY;
}

export async function searchFundingOpportunities(
  query: string,
  options?: {
    limit?: number;
    sources?: string[];
  }
): Promise<TinyFishSearchResult[]> {
  if (!TINYFISH_API_KEY) {
    console.warn("Tiny Fish API key not configured - using fallback");
    return [];
  }

  try {
    const response = await fetch(`${TINYFISH_API_URL}/search`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TINYFISH_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        limit: options?.limit ?? 20,
        sources: options?.sources ?? [
          "sba.gov",
          "grants.gov",
          "score.org",
          "kiva.org",
          "accion.org",
          "cdfi.org",
        ],
      }),
    });

    if (!response.ok) {
      console.error(`Tiny Fish API error: ${response.status}`);
      return [];
    }

    const data: TinyFishSearchResponse = await response.json();
    return data.results ?? [];
  } catch (err) {
    console.error("Tiny Fish search error:", err);
    return [];
  }
}

export async function searchStateGrants(
  state: string,
  businessType: string
): Promise<TinyFishSearchResult[]> {
  return searchFundingOpportunities(
    `${state} state grants ${businessType} business`,
    {
      limit: 15,
      sources: ["grants.gov", "state.gov"],
    }
  );
}

export async function searchLocalGrants(
  city: string,
  county: string,
  state: string
): Promise<TinyFishSearchResult[]> {
  return searchFundingOpportunities(
    `${city} ${county} county ${state} local grants small business`,
    {
      limit: 10,
      sources: ["grants.gov", "city.gov"],
    }
  );
}

export async function searchSBALoans(
  businessType: string
): Promise<TinyFishSearchResult[]> {
  return searchFundingOpportunities(
    `SBA loans microloans ${businessType}`,
    {
      limit: 10,
      sources: ["sba.gov"],
    }
  );
}

export async function searchMicroloans(
  businessType: string,
  state: string
): Promise<TinyFishSearchResult[]> {
  return searchFundingOpportunities(
    `microloans ${businessType} ${state} Kiva Accion`,
    {
      limit: 10,
      sources: ["kiva.org", "accion.org", "cdfi.org"],
    }
  );
}

export async function searchCompetitions(
  businessType: string,
  state: string
): Promise<TinyFishSearchResult[]> {
  return searchFundingOpportunities(
    `business plan competition ${businessType} ${state}`,
    {
      limit: 10,
      sources: ["grants.gov", "score.org"],
    }
  );
}

/**
 * Comprehensive funding search combining all sources
 */
export async function searchAllFundingOpportunities(
  businessType: string,
  state: string,
  city: string,
  county: string
): Promise<TinyFishSearchResult[]> {
  const [federal, state_grants, local, sba, microloans, competitions] = await Promise.all([
    searchFundingOpportunities(`federal grants ${businessType}`, { limit: 5 }),
    searchStateGrants(state, businessType),
    searchLocalGrants(city, county, state),
    searchSBALoans(businessType),
    searchMicroloans(businessType, state),
    searchCompetitions(businessType, state),
  ]);

  // Combine and deduplicate by URL
  const all = [...federal, ...state_grants, ...local, ...sba, ...microloans, ...competitions];
  const seen = new Set<string>();
  const unique: TinyFishSearchResult[] = [];

  for (const result of all) {
    if (!seen.has(result.url)) {
      seen.add(result.url);
      unique.push(result);
    }
  }

  return unique;
}
