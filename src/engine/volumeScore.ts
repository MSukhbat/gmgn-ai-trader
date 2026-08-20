import { TokenData } from "../types/token.js";

export function volumeScore(token: TokenData): number {
  if (token.liquidity <= 0) return 0;

  const ratio = token.volume5m / token.liquidity;

  if (ratio >= 2) return 15;
  if (ratio >= 1) return 13;
  if (ratio >= 0.5) return 10;
  if (ratio >= 0.2) return 7;
  if (ratio >= 0.1) return 4;

  return 0;
}
