import { createConfig } from "@lifi/sdk";
import { RPC_URLS } from "./chains.ts";

export const initializeLifi = () => {
  createConfig({
    integrator: "TTC",
    // Add API key for higher rate limits (get from portal.li.fi)
    // ...(process.env.LIFI_API_KEY && { apiKey: process.env.LIFI_API_KEY }),
    // Custom RPC URLs for better reliability
    rpcUrls: RPC_URLS,
    routeOptions: { slippage: 0.005, order: "CHEAPEST", maxPriceImpact: 0.01 },
  });
};
