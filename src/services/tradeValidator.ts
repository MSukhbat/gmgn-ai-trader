import { TokenData } from "../types/token.js";
import { TRADING_CONFIG } from "../config/trading.js";

interface ValidateTradeInput {
  token: TokenData;
  entryScore: number;
  buyPressure: number;
}

export interface TradeValidation {
  valid: boolean;
  reasons: string[];
}

export default function validateTrade({
  token,
  entryScore,
  buyPressure,
}: ValidateTradeInput): TradeValidation {
  const reasons: string[] = [];

  // ============================================
  // ENTRY SCORE
  // ============================================

  if (entryScore < TRADING_CONFIG.minEntryScore) {
    reasons.push(
      `Entry score too low (${entryScore} < ${TRADING_CONFIG.minEntryScore})`,
    );
  }

  // ============================================
  // BUY PRESSURE
  // ============================================

  if (buyPressure < TRADING_CONFIG.minBuyPressure) {
    reasons.push(`Buy pressure too low (${(buyPressure * 100).toFixed(1)}%)`);
  }

  // ============================================
  // LIQUIDITY
  // ============================================

  if (token.liquidity < TRADING_CONFIG.minLiquidityUsd) {
    reasons.push(`Liquidity too low ($${token.liquidity.toFixed(2)})`);
  }

  // ============================================
  // VOLUME
  // ============================================

  if (token.volume24h < TRADING_CONFIG.minVolumeUsd) {
    reasons.push(`Volume too low ($${token.volume24h.toFixed(2)})`);
  }

  // ============================================
  // HOLDERS
  // ============================================

  if (token.holders < TRADING_CONFIG.minHolders) {
    reasons.push(`Too few holders (${token.holders})`);
  }

  // ============================================
  // RISK
  // ============================================

  if (token.rugRatio > TRADING_CONFIG.maxRugRatio) {
    reasons.push(`Rug ratio too high (${(token.rugRatio * 100).toFixed(1)}%)`);
  }

  if (token.insiderRate > TRADING_CONFIG.maxInsiderRate) {
    reasons.push(
      `Insider rate too high (${(token.insiderRate * 100).toFixed(1)}%)`,
    );
  }

  if (token.bundlerRate > TRADING_CONFIG.maxBundlerRate) {
    reasons.push(
      `Bundler rate too high (${(token.bundlerRate * 100).toFixed(1)}%)`,
    );
  }

  // ============================================
  // RESULT
  // ============================================

  return {
    valid: reasons.length === 0,
    reasons,
  };
}
