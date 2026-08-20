import { TokenData } from "../types/token.js";

export function liquidityScore(token: TokenData): number {
  const liquidity = token.liquidity;

  if (liquidity >= 100_000) return 20;
  if (liquidity >= 50_000) return 17;
  if (liquidity >= 20_000) return 14;
  if (liquidity >= 10_000) return 10;
  if (liquidity >= 5_000) return 6;

  return 0;
}
