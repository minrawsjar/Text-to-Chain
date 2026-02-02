// Shared TypeScript interfaces
export interface QuoteParams {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  toAddress?: string; // Different recipient
  slippage?: number; // Custom slippage (e.g., 0.005 = 0.5%)
  order?: "CHEAPEST" | "FASTEST";
  maxPriceImpact?: number; // Hide high price impact routes
  allowBridges?: string[]; // Filter specific bridges
  allowExchanges?: string[]; // Filter specific exchanges
  integrator: string;
  fee?: number; // Integrator fee (e.g., 0.02 = 2%)
}
export interface RouteParams {
  /* ... */
}
export interface VoucherRedemption {
  /* ... */
}
export interface TransactionResult {
  /* ... */
}
