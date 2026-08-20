import { TokenData } from "../types/token.js";

import { liquidityScore } from "./liquidityScore.js";
import { volumeScore } from "./volumeScore.js";
import { holderScore } from "./holderScore.js";
import { safetyScore } from "./safetyScore.js";

import { buySellScore } from "./buySellScore.js";
import { ageScore } from "./ageScore.js";
import { momentumScore } from "./momentumScore.js";
import { marketCapScore } from "./marketCapScore.js";

export function scoreToken(token: TokenData): number {
  const liquidity = liquidityScore(token);
  const volume = volumeScore(token);
  const buySell = buySellScore(token);
  const holder = holderScore(token);
  const age = ageScore(token);
  const momentum = momentumScore(token);
  const marketCap = marketCapScore(token);
  const safety = safetyScore(token);

  const total =
    liquidity + volume + buySell + holder + age + momentum + marketCap + safety;

  return Math.min(total, 100);
}
