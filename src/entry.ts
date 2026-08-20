import { TokenData } from "./types/token.js";
import { MomentumResult } from "./scanner/momentum.js";

export interface EntryResult {
  entryScore: number;

  signal: "STRONG_BUY" | "BUY" | "WATCH" | "REJECT";

  reasons: string[];
}

export function calculateEntry(
  token: TokenData,
  score: number,
  risk: string,
  buyPressure: number,
  momentum: MomentumResult,
): EntryResult {
  let entryScore = 0;

  const reasons: string[] = [];

  // ============================================
  // BASE SCORE
  // ============================================

  entryScore += score * 0.35;

  // ============================================
  // MOMENTUM
  // ============================================

  entryScore += momentum.momentumScore * 0.3;

  if (momentum.momentumScore >= 80) {
    reasons.push("🔥 Very strong momentum");
  } else if (momentum.momentumScore >= 65) {
    reasons.push("Strong momentum");
  }

  // ============================================
  // BUY PRESSURE
  // ============================================

  if (buyPressure >= 0.8) {
    entryScore += 15;

    reasons.push("🔥 Very strong buy pressure");
  } else if (buyPressure >= 0.65) {
    entryScore += 10;

    reasons.push("Strong buy pressure");
  } else if (buyPressure >= 0.55) {
    entryScore += 5;

    reasons.push("Positive buy pressure");
  } else if (buyPressure < 0.4) {
    entryScore -= 15;

    reasons.push("❌ Weak buy pressure");
  }

  // ============================================
  // HOLDER COUNT
  // ============================================

  if (token.holders >= 100) {
    entryScore += 10;

    reasons.push("Strong holder base");
  } else if (token.holders >= 50) {
    entryScore += 7;

    reasons.push("Healthy holder count");
  } else if (token.holders >= 20) {
    entryScore += 3;
  } else if (token.holders < 10) {
    entryScore -= 15;

    reasons.push("❌ Very low holder count");
  }

  // ============================================
  // LIQUIDITY
  // ============================================

  if (token.liquidity >= 5000) {
    entryScore += 10;

    reasons.push("Strong liquidity");
  } else if (token.liquidity >= 2000) {
    entryScore += 5;

    reasons.push("Healthy liquidity");
  } else if (token.liquidity < 1000) {
    entryScore -= 15;

    reasons.push("❌ Low liquidity");
  }

  // ============================================
  // BUNDLER
  // ============================================

  if (token.bundlerRate >= 0.3) {
    entryScore -= 25;

    reasons.push("🚨 Very high bundler activity");
  } else if (token.bundlerRate >= 0.15) {
    entryScore -= 15;

    reasons.push("⚠️ High bundler activity");
  } else if (token.bundlerRate <= 0.05) {
    entryScore += 5;

    reasons.push("Low bundler activity");
  }

  // ============================================
  // SNIPER
  // ============================================

  if (token.sniperHoldRate >= 0.3) {
    entryScore -= 25;

    reasons.push("🚨 Very high sniper concentration");
  } else if (token.sniperHoldRate >= 0.15) {
    entryScore -= 15;

    reasons.push("⚠️ High sniper concentration");
  } else if (token.sniperHoldRate <= 0.05) {
    entryScore += 5;

    reasons.push("Low sniper concentration");
  }

  // ============================================
  // TOP 10 HOLDERS
  // ============================================

  if (token.top10HolderRate >= 0.4) {
    entryScore -= 20;

    reasons.push("🚨 High top-10 concentration");
  } else if (token.top10HolderRate >= 0.25) {
    entryScore -= 10;

    reasons.push("High top-10 concentration");
  }

  // ============================================
  // MINT / FREEZE
  // ============================================

  if (token.mintRenounced) {
    entryScore += 3;
  } else {
    entryScore -= 10;

    reasons.push("❌ Mint not renounced");
  }

  if (token.freezeRenounced) {
    entryScore += 3;
  } else {
    entryScore -= 10;

    reasons.push("❌ Freeze not renounced");
  }

  // ============================================
  // RISK
  // ============================================

  if (risk === "HIGH") {
    entryScore -= 20;

    reasons.push("❌ High risk");
  } else if (risk === "MEDIUM") {
    entryScore -= 5;
  }

  // ============================================
  // NORMALIZE
  // ============================================

  entryScore = Math.max(0, Math.min(100, Math.round(entryScore)));

  // ============================================
  // SIGNAL
  // ============================================

  let signal: "STRONG_BUY" | "BUY" | "WATCH" | "REJECT";

  if (entryScore >= 80 && risk === "LOW" && momentum.momentumScore >= 65) {
    signal = "STRONG_BUY";
  } else if (entryScore >= 65 && risk !== "HIGH") {
    signal = "BUY";
  } else if (entryScore >= 45) {
    signal = "WATCH";
  } else {
    signal = "REJECT";
  }

  return {
    entryScore,
    signal,
    reasons,
  };
}
