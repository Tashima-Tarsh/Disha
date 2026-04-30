/**
 * Task 4: Agentic Bidding Logic
 * Negotiator Service using Gemini 1.5 Flash.
 * Logic: L1 Reverse Auction for local merchant availability.
 */

export interface NegotiatorResponse {
  matchStatus: 'L1' | 'L2' | 'L3' | 'No Match';
  selectedMerchant: string;
  price: number;
  negotiationSummary: string;
  ondcStatus: string;
}

/**
 * The Sovereign Negotiator (Gemini Powered)
 * Processes user intent and find the L1 match from ONDC.
 */
export async function negotiateBidding(userIntent: string, locationCode: string): Promise<NegotiatorResponse> {
  console.log(`[NEGOTIATOR] Processing intent: "${userIntent}" at "${locationCode}"`);

  // ONDC Gateway Interaction (Mock)
  const merchants = await fetchOndcMerchants(userIntent, locationCode);
  
  if (merchants.length === 0) {
    return {
      matchStatus: 'No Match',
      selectedMerchant: '',
      price: 0,
      negotiationSummary: 'No qualified merchants found via ONDC Gateway.',
      ondcStatus: 'IDLE'
    };
  }

  // L1 REVERSE AUCTION LOGIC:
  // Sort merchants by price (Lowest One Priority)
  const sortedMerchants = merchants.sort((a, b) => a.price - b.price);
  const l1Merchant = sortedMerchants[0];

  return {
    matchStatus: 'L1',
    selectedMerchant: l1Merchant.name,
    price: l1Merchant.price,
    negotiationSummary: `Optimized L1 match found. Negotiated price of $${l1Merchant.price} secured for "${l1Merchant.name}".`,
    ondcStatus: 'SEARCH_COMPLETE'
  };
}

/**
 * Mock ONDC Merchant Search
 */
async function fetchOndcMerchants(query: string, location: string) {
  console.log(`[ONDC] Searching for "${query}" in area "${location}"...`);
  // Simulate ONDC response
  return [
    { name: 'Local Store A', price: 120, qualified: true },
    { name: 'Premium Merchant B', price: 150, qualified: true },
    { name: 'Sovereign Vendor C', price: 115, qualified: true }
  ];
}
