import { TokenData } from "../types/token.js";

export function holderScore(token: TokenData): number {
  const holders = token.holders;

  if (holders >= 10_000) return 15;
  if (holders >= 5_000) return 13;
  if (holders >= 2_000) return 11;
  if (holders >= 1_000) return 8;
  if (holders >= 500) return 5;
  if (holders >= 100) return 2;

  return 0;
}
