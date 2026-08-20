import { TokenData } from "../types/token.js";
import { getPreviousSnapshot } from "../scanner/tracker.js";

export type TradeAction = "BUY" | "HOLD" | "SELL";

export interface TradeSignal {
  action: TradeAction;

  confidence: number;

  buyPressure: number;

  priceChange: number;

  volumeChange: number;

  reasons: string[];

  takeProfit1?: number;
  takeProfit2?: number;
  stopLoss?: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Scores the balance of buy and sell transactions on a 0–20 scale.
 * This intentionally uses the same 24-hour trade data as the rest of the
 * scoring pipeline, so a token with no trade history cannot gain points.
 */
export function buySellScore(token: TokenData): number {
  const totalTrades = token.buys24h + token.sells24h;

  if (totalTrades <= 0) {
    return 0;
  }

  const buyPressure = token.buys24h / totalTrades;

  if (buyPressure >= 0.75) return 20;
  if (buyPressure >= 0.65) return 15;
  if (buyPressure >= 0.55) return 10;
  if (buyPressure >= 0.45) return 5;

  return 0;
}

export function getBuySellSignal(token: TokenData, score: number): TradeSignal {
  const reasons: string[] = [];

  // =====================================================
  // BUY PRESSURE
  // =====================================================

  const totalTrades = token.buys24h + token.sells24h;

  const buyPressure = totalTrades > 0 ? token.buys24h / totalTrades : 0;

  // =====================================================
  // PREVIOUS SNAPSHOT
  // =====================================================

  const previous = getPreviousSnapshot(token.address);

  let priceChange = 0;
  let volumeChange = 0;

  if (previous) {
    if (previous.price > 0 && token.price > 0) {
      priceChange = ((token.price - previous.price) / previous.price) * 100;
    }

    if (previous.volume24h > 0) {
      volumeChange =
        ((token.volume24h - previous.volume24h) / previous.volume24h) * 100;
    }
  }

  // =====================================================
  // SELL CONDITIONS
  // =====================================================

  // Emergency stop loss
  if (priceChange <= -15) {
    reasons.push("Price dropped more than 15%");

    return {
      action: "SELL",
      confidence: 95,
      buyPressure,
      priceChange,
      volumeChange,
      reasons,
    };
  }

  // Strong selling pressure + price drop
  if (priceChange <= -10 && buyPressure < 0.4) {
    reasons.push("Strong sell pressure + price decline");

    return {
      action: "SELL",
      confidence: 90,
      buyPressure,
      priceChange,
      volumeChange,
      reasons,
    };
  }

  // Volume collapse + selling
  if (buyPressure < 0.35 && volumeChange < -30) {
    reasons.push("Selling pressure + volume collapse");

    return {
      action: "SELL",
      confidence: 85,
      buyPressure,
      priceChange,
      volumeChange,
      reasons,
    };
  }

  // =====================================================
  // BUY CONFIDENCE
  // =====================================================

  let confidence = 0;

  // Score
  if (score >= 85) {
    confidence += 35;

    reasons.push("Excellent token score");
  } else if (score >= 75) {
    confidence += 30;

    reasons.push("High token score");
  } else if (score >= 65) {
    confidence += 20;
  }

  // Buy pressure
  if (buyPressure >= 0.7) {
    confidence += 25;

    reasons.push("Very strong buy pressure");
  } else if (buyPressure >= 0.6) {
    confidence += 20;

    reasons.push("Strong buy pressure");
  } else if (buyPressure >= 0.55) {
    confidence += 10;

    reasons.push("Positive buy pressure");
  }

  // Liquidity
  if (token.liquidity >= 10000) {
    confidence += 15;

    reasons.push("Excellent liquidity");
  } else if (token.liquidity >= 5000) {
    confidence += 12;

    reasons.push("Strong liquidity");
  } else if (token.liquidity >= 2000) {
    confidence += 7;
  }

  // Volume
  if (token.volume24h >= 20000) {
    confidence += 15;

    reasons.push("Very strong volume");
  } else if (token.volume24h >= 10000) {
    confidence += 12;

    reasons.push("Strong volume");
  } else if (token.volume24h >= 3000) {
    confidence += 7;
  }

  // Positive price momentum
  if (priceChange >= 10) {
    confidence += 10;

    reasons.push("Strong positive price momentum");
  } else if (priceChange > 0) {
    confidence += 5;

    reasons.push("Positive price momentum");
  }

  // Volume increasing
  if (volumeChange >= 50) {
    confidence += 10;

    reasons.push("Volume accelerating");
  } else if (volumeChange >= 20) {
    confidence += 7;

    reasons.push("Volume increasing");
  }

  confidence = Math.round(clamp(confidence, 0, 100));

  // =====================================================
  // BUY
  // =====================================================

  if (
    score >= 75 &&
    buyPressure >= 0.6 &&
    token.liquidity >= 2000 &&
    token.volume24h >= 3000 &&
    confidence >= 65
  ) {
    const entryPrice = token.price;

    return {
      action: "BUY",

      confidence,

      buyPressure,

      priceChange,

      volumeChange,

      reasons,

      takeProfit1: entryPrice * 1.15,

      takeProfit2: entryPrice * 1.3,

      stopLoss: entryPrice * 0.9,
    };
  }

  // =====================================================
  // HOLD
  // =====================================================

  if (score >= 55) {
    reasons.push(
      "Token is interesting but BUY conditions are not strong enough",
    );

    return {
      action: "HOLD",

      confidence,

      buyPressure,

      priceChange,

      volumeChange,

      reasons,
    };
  }

  // =====================================================
  // WEAK
  // =====================================================

  reasons.push("Weak token conditions");

  return {
    action: "HOLD",

    confidence,

    buyPressure,

    priceChange,

    volumeChange,

    reasons,
  };
}
