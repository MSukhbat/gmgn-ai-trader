import { TokenData } from "../types/token.js";

export interface TokenScore {
  token: TokenData;

  score: number;

  risk: "LOW" | "MEDIUM" | "HIGH";

  decision: "BUY" | "WATCH" | "REJECT";

  reasons: string[];

  buyPressure: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function scoreToken(token: TokenData): TokenScore {
  const reasons: string[] = [];

  let score = 0;

  // =====================================================
  // BUY PRESSURE
  // =====================================================

  const totalTrades = token.buys24h + token.sells24h;

  let buyPressure = 0;

  if (totalTrades > 0) {
    buyPressure = token.buys24h / totalTrades;
  }

  // =====================================================
  // HARD FILTER
  // =====================================================

  let hardReject = false;

  // Very low holders
  if (token.holders < 10) {
    hardReject = true;

    reasons.push("Holders < 10");
  }

  // Very low volume
  if (token.volume24h < 500) {
    hardReject = true;

    reasons.push("Volume < $500");
  }

  // Suspicious rug ratio
  if (token.rugRatio > 0.2) {
    hardReject = true;

    reasons.push("Rug ratio > 20%");
  }

  // High insider concentration
  if (token.insiderRate > 0.2) {
    hardReject = true;

    reasons.push("Insider rate > 20%");
  }

  // High bundler concentration
  if (token.bundlerRate > 0.3) {
    hardReject = true;

    reasons.push("Bundler rate > 30%");
  }

  // =====================================================
  // LIQUIDITY
  // =====================================================

  /*
   * GMGN-ийн liquidity unit-ийг дараа нь
   * бүрэн баталгаажуулна.
   *
   * Одоогоор зөвхөн score-д ашиглаж байна.
   */

  if (token.liquidity > 5000) {
    score += 15;

    reasons.push("Strong liquidity");
  } else if (token.liquidity > 2000) {
    score += 10;
  } else if (token.liquidity > 500) {
    score += 5;
  } else {
    score -= 10;

    reasons.push("Low liquidity");
  }

  // =====================================================
  // VOLUME
  // =====================================================

  if (token.volume24h >= 10000) {
    score += 15;

    reasons.push("Very strong volume");
  } else if (token.volume24h >= 3000) {
    score += 12;
  } else if (token.volume24h >= 1000) {
    score += 8;
  } else if (token.volume24h >= 500) {
    score += 4;
  } else {
    score -= 10;

    reasons.push("Low volume");
  }

  // =====================================================
  // BUY PRESSURE
  // =====================================================

  if (totalTrades > 0) {
    if (buyPressure >= 0.7) {
      score += 20;

      reasons.push("Very strong buy pressure");
    } else if (buyPressure >= 0.55) {
      score += 10;

      reasons.push("Positive buy pressure");
    } else if (buyPressure >= 0.45) {
      score += 0;
    } else if (buyPressure >= 0.4) {
      score -= 10;

      reasons.push("Weak buy pressure");
    } else {
      score -= 20;

      reasons.push("Strong sell pressure");
    }
  }

  // =====================================================
  // HOLDERS
  // =====================================================

  if (token.holders >= 1000) {
    score += 15;
  } else if (token.holders >= 500) {
    score += 12;
  } else if (token.holders >= 200) {
    score += 10;
  } else if (token.holders >= 100) {
    score += 7;
  } else if (token.holders >= 50) {
    score += 5;
  } else {
    score -= 5;
  }

  // =====================================================
  // TOP 10 HOLDERS
  // =====================================================

  if (token.top10HolderRate > 0) {
    if (token.top10HolderRate < 0.2) {
      score += 10;
    } else if (token.top10HolderRate < 0.35) {
      score += 5;
    } else if (token.top10HolderRate >= 0.5) {
      score -= 15;

      reasons.push("High top-10 concentration");
    }
  }

  // =====================================================
  // INSIDER
  // =====================================================

  if (token.insiderRate <= 0.05) {
    score += 8;
  } else if (token.insiderRate <= 0.1) {
    score += 3;
  } else if (token.insiderRate <= 0.2) {
    score -= 5;

    reasons.push("Elevated insider rate");
  }

  // =====================================================
  // BUNDLER
  // =====================================================

  if (token.bundlerRate <= 0.05) {
    score += 8;
  } else if (token.bundlerRate <= 0.15) {
    score += 3;
  } else if (token.bundlerRate <= 0.3) {
    score -= 10;

    reasons.push("Elevated bundler activity");
  }

  // =====================================================
  // SNIPER
  // =====================================================

  if (token.sniperHoldRate <= 0.1) {
    score += 5;
  } else if (token.sniperHoldRate <= 0.2) {
    score -= 3;
  } else {
    score -= 10;

    reasons.push("High sniper concentration");
  }

  // =====================================================
  // SMART DEGEN
  // =====================================================

  if (token.smartDegenCount >= 20) {
    score += 10;

    reasons.push("Many smart degen wallets");
  } else if (token.smartDegenCount >= 10) {
    score += 7;
  } else if (token.smartDegenCount >= 3) {
    score += 4;
  }

  // =====================================================
  // MINT
  // =====================================================

  if (token.mintRenounced) {
    score += 4;
  } else {
    score -= 10;

    reasons.push("Mint not renounced");
  }

  // =====================================================
  // FREEZE
  // =====================================================

  if (token.freezeRenounced) {
    score += 4;
  } else {
    score -= 10;

    reasons.push("Freeze not renounced");
  }

  // =====================================================
  // RUG RATIO
  // =====================================================

  if (token.rugRatio > 0.1) {
    score -= 15;

    reasons.push("Elevated rug ratio");
  }

  // =====================================================
  // FINAL SCORE
  // =====================================================

  score = Math.round(clamp(score, 0, 100));

  // =====================================================
  // HARD REJECT OVERRIDE
  // =====================================================

  if (hardReject) {
    return {
      token,

      score: Math.min(score, 39),

      risk: "HIGH",

      decision: "REJECT",

      reasons,

      buyPressure,
    };
  }

  // =====================================================
  // RISK
  // =====================================================

  let risk: "LOW" | "MEDIUM" | "HIGH";

  if (score >= 75) {
    risk = "LOW";
  } else if (score >= 55) {
    risk = "MEDIUM";
  } else {
    risk = "HIGH";
  }

  let decision: "BUY" | "WATCH" | "REJECT";

  if (score >= 75 && buyPressure >= 0.6) {
    decision = "BUY";
  } else if (score >= 55) {
    decision = "WATCH";
  } else {
    decision = "REJECT";
  }

  return {
    token,

    score,

    risk,

    decision,

    reasons,

    buyPressure,
  };
}
