import { TokenData } from "../types/token.js";

export function buySellScore(token: TokenData): number {
  const totalTrades = token.buys5m + token.sells5m;

  if (totalTrades === 0) {
    return 0;
  }

  const buyRatio = token.buys5m / totalTrades;

  if (buyRatio >= 0.75) return 15;
  if (buyRatio >= 0.65) return 13;
  if (buyRatio >= 0.55) return 10;
  if (buyRatio >= 0.5) return 7;
  if (buyRatio >= 0.4) return 4;

  return 0;
}
