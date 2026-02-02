import { ChainIds } from "./chains.ts";

// Token addresses per chain
export const TOKENS = {
  USDC: {
    [ChainIds.POLYGON]: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    [ChainIds.OPTIMISM]: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
  },
  NATIVE: "0x0000000000000000000000000000000000000000",
} as const;
