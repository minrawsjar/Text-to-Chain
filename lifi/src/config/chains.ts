export const ChainIds = {
  POLYGON: 137,
  OPTIMISM: 10,
  ARBITRUM: 42161,
  // ...
} as const;

export const RPC_URLS: Record<number, string[]> = {
  [ChainIds.POLYGON]: [process.env.POLYGON_RPC_URL!],
  [ChainIds.OPTIMISM]: [process.env.OPTIMISM_RPC_URL!],
};
