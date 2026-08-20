import { TokenData } from "../types/token.js";

export function momentumScore(token: TokenData): number {
  if (token.volume1h <= 0) {
    return 0;
  }

  const shortTermVolume = token.volume5m * 12;
  const ratio = shortTermVolume / token.volume1h;

  if (ratio >= 2) return 10;
  if (ratio >= 1.5) return 8;
  if (ratio >= 1) return 6;
  if (ratio >= 0.5) return 4;

  return 2;
}
