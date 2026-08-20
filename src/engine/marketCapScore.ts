import { TokenData } from "../types/token.js";

export function marketCapScore(token: TokenData): number {
  const marketCap = token.marketCap;

  if (marketCap >= 50_000 && marketCap <= 500_000) return 5;
  if (marketCap >= 25_000 && marketCap < 50_000) return 4;
  if (marketCap > 500_000 && marketCap <= 1_000_000) return 3;
  if (marketCap >= 10_000) return 2;

  return 0;
}
