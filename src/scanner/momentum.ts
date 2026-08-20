import fs from "node:fs";
import path from "node:path";
import { TokenData } from "../types/token.js";

export interface MomentumResult {
  momentumScore: number;

  signal:
    | "STRONG_BULLISH"
    | "BULLISH"
    | "NEUTRAL"
    | "BEARISH"
    | "STRONG_BEARISH";

  volumeChange: number;
  holderChange: number;
  marketCapChange: number;
  liquidityChange: number;

  reasons: string[];
}

interface TokenSnapshot {
  timestamp: number;

  volume24h: number;
  holders: number;
  marketCap: number;
  liquidity: number;

  buys24h: number;
  sells24h: number;
}

// ============================================
// HISTORY FILE
// ============================================

const historyDir = path.resolve("data");
const historyFile = path.join(historyDir, "token-history.json");

if (!fs.existsSync(historyDir)) {
  fs.mkdirSync(historyDir, { recursive: true });
}

// ============================================
// LOAD HISTORY
// ============================================

function loadSnapshots(): Map<string, TokenSnapshot> {
  try {
    if (!fs.existsSync(historyFile)) {
      return new Map();
    }

    const raw = fs.readFileSync(historyFile, "utf8");

    if (!raw.trim()) {
      return new Map();
    }

    const data = JSON.parse(raw) as Record<string, TokenSnapshot>;

    return new Map(Object.entries(data));
  } catch (error) {
    console.error("⚠️ Could not load momentum history:", error);

    return new Map();
  }
}

// ============================================
// SAVE HISTORY
// ============================================

function saveSnapshots(snapshots: Map<string, TokenSnapshot>): void {
  try {
    const object = Object.fromEntries(snapshots);

    fs.writeFileSync(historyFile, JSON.stringify(object, null, 2), "utf8");
  } catch (error) {
    console.error("⚠️ Could not save momentum history:", error);
  }
}

// ============================================
// MEMORY
// ============================================

const snapshots = loadSnapshots();

// ============================================
// HELPERS
// ============================================

function calculateChange(current: number, previous: number): number {
  if (previous === 0) {
    if (current > 0) {
      return 100;
    }

    return 0;
  }

  return ((current - previous) / previous) * 100;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

// ============================================
// MOMENTUM ANALYZER
// ============================================

export function analyzeMomentum(token: TokenData): MomentumResult {
  const now = Date.now();

  const previous = snapshots.get(token.address);

  // ============================================
  // CURRENT SNAPSHOT
  // ============================================

  const current: TokenSnapshot = {
    timestamp: now,

    volume24h: token.volume24h,

    holders: token.holders,

    marketCap: token.marketCap,

    liquidity: token.liquidity,

    buys24h: token.buys24h,

    sells24h: token.sells24h,
  };

  // ============================================
  // FIRST TIME TOKEN
  // ============================================

  if (!previous) {
    snapshots.set(token.address, current);

    saveSnapshots(snapshots);

    return {
      momentumScore: 0,

      signal: "NEUTRAL",

      volumeChange: 0,

      holderChange: 0,

      marketCapChange: 0,

      liquidityChange: 0,

      reasons: ["Waiting for historical data"],
    };
  }

  // ============================================
  // CHANGES
  // ============================================

  const volumeChange = calculateChange(current.volume24h, previous.volume24h);

  const holderChange = calculateChange(current.holders, previous.holders);

  const marketCapChange = calculateChange(
    current.marketCap,
    previous.marketCap,
  );

  const liquidityChange = calculateChange(
    current.liquidity,
    previous.liquidity,
  );

  // ============================================
  // SCORE
  // ============================================

  let score = 50;

  const reasons: string[] = [];

  // ============================================
  // VOLUME
  // ============================================

  if (volumeChange >= 100) {
    score += 20;

    reasons.push("Volume exploding");
  } else if (volumeChange >= 50) {
    score += 12;

    reasons.push("Strong volume growth");
  } else if (volumeChange >= 20) {
    score += 6;

    reasons.push("Positive volume growth");
  } else if (volumeChange <= -50) {
    score -= 15;

    reasons.push("Volume dropping");
  } else if (volumeChange <= -20) {
    score -= 8;

    reasons.push("Volume weakening");
  }

  // ============================================
  // HOLDERS
  // ============================================

  if (holderChange >= 20) {
    score += 20;

    reasons.push("Rapid holder growth");
  } else if (holderChange >= 10) {
    score += 12;

    reasons.push("Strong holder growth");
  } else if (holderChange > 0) {
    score += 5;

    reasons.push("Holder count increasing");
  } else if (holderChange <= -10) {
    score -= 15;

    reasons.push("Holder count falling");
  }

  // ============================================
  // MARKET CAP
  // ============================================

  if (marketCapChange >= 20) {
    score += 15;

    reasons.push("Strong market cap growth");
  } else if (marketCapChange >= 10) {
    score += 10;

    reasons.push("Positive market cap growth");
  } else if (marketCapChange > 0) {
    score += 4;

    reasons.push("Market cap increasing");
  } else if (marketCapChange <= -10) {
    score -= 12;

    reasons.push("Market cap falling");
  }

  // ============================================
  // LIQUIDITY
  // ============================================

  if (liquidityChange >= 10) {
    score += 10;

    reasons.push("Liquidity increasing");
  } else if (liquidityChange <= -10) {
    score -= 10;

    reasons.push("Liquidity decreasing");
  }

  // ============================================
  // BUY PRESSURE
  // ============================================

  const totalTrades = current.buys24h + current.sells24h;

  if (totalTrades > 0) {
    const buyPressure = current.buys24h / totalTrades;

    if (buyPressure >= 0.75) {
      score += 10;

      reasons.push("Strong buy pressure");
    } else if (buyPressure >= 0.6) {
      score += 5;

      reasons.push("Positive buy pressure");
    } else if (buyPressure <= 0.35) {
      score -= 10;

      reasons.push("Strong sell pressure");
    }
  }

  // ============================================
  // SCORE LIMIT
  // ============================================

  score = clamp(score);

  // ============================================
  // SIGNAL
  // ============================================

  let signal:
    | "STRONG_BULLISH"
    | "BULLISH"
    | "NEUTRAL"
    | "BEARISH"
    | "STRONG_BEARISH";

  if (score >= 80) {
    signal = "STRONG_BULLISH";
  } else if (score >= 65) {
    signal = "BULLISH";
  } else if (score >= 40) {
    signal = "NEUTRAL";
  } else if (score >= 20) {
    signal = "BEARISH";
  } else {
    signal = "STRONG_BEARISH";
  }

  // ============================================
  // SAVE CURRENT SNAPSHOT
  // ============================================

  snapshots.set(token.address, current);

  saveSnapshots(snapshots);

  // ============================================
  // RESULT
  // ============================================

  return {
    momentumScore: score,

    signal,

    volumeChange,

    holderChange,

    marketCapChange,

    liquidityChange,

    reasons,
  };
}
