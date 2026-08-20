import { monitorPositions } from "./src/services/positionMonitor.js";
import {
  executeBuy,
  getOpenPositions,
  getPaperTradingSummary,
} from "./src/services/swapExecutor.js";
import type { TokenData } from "./src/types/token.js";

const token: TokenData = {
  address: "11111111111111111111111111111111",
  symbol: "TEST",
  name: "Test Token",
  price: 1,
  marketCap: 100_000,
  liquidity: 10_000,
  volume24h: 10_000,
  volume1h: 1_000,
  volume5m: 100,
  buys24h: 70,
  sells24h: 30,
  swaps24h: 100,
  holders: 100,
  ageMinutes: 60,
  rugRatio: 0,
  bundlerRate: 0,
  insiderRate: 0,
  top10HolderRate: 0.1,
  sniperHoldRate: 0.1,
  smartDegenCount: 0,
  creatorBalanceRate: 0,
  devTeamHoldRate: 0,
  mintRenounced: true,
  freezeRenounced: true,
  launchpad: "test",
};

await executeBuy({ token, amountUsd: 1, entryScore: 80 });

for (const price of [1.1, 1.2, 1.3, 1.4, 1.19]) {
  await monitorPositions([{ ...token, price }]);
}

const summary = getPaperTradingSummary();

if (
  getOpenPositions().length !== 0 ||
  summary.closedTrades !== 1 ||
  Math.abs(summary.netPnlUsd - 0.196) > 1e-9 ||
  Math.abs(summary.maxPumpPercent - 40) > 1e-9
) {
  throw new Error("Staged exit strategy did not produce the expected result");
}
