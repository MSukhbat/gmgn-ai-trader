export const TRADING_CONFIG = {
  mode: "PAPER" as "PAPER" | "LIVE",

  paperAmountUsd: 1,

  stopLossPercent: 10,

  partialTakeProfitTargets: [
    { profitPercent: 10, sellPercent: 20 },
    { profitPercent: 20, sellPercent: 20 },
    { profitPercent: 30, sellPercent: 20 },
  ],

  trailingStartPercent: 40,
  trailingStopPercent: 15,

  scanIntervalMs: 10_000,

  minEntryScore: 65,

  minBuyPressure: 0.55,

  minLiquidityUsd: 1000,

  minVolumeUsd: 1000,

  minHolders: 30,

  maxRugRatio: 0.2,

  maxInsiderRate: 0.2,

  maxBundlerRate: 0.3,
};
