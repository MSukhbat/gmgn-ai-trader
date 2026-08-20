import { TokenData } from "../types/token.js";
import { scoreToken } from "../engine/scoreToken.js";
import { tradingConfig } from "../config/trading.js";

export interface TradeValidation {
  approved: boolean;
  score: number;
  reason: string;
}

export function validateTrade(token: TokenData): TradeValidation {
  const score = scoreToken(token);

  if (score < tradingConfig.minEntryScore) {
    return {
      approved: false,
      score,
      reason: `Score too low: ${score}`,
    };
  }

  if (token.liquidity <= 0) {
    return {
      approved: false,
      score,
      reason: "No liquidity",
    };
  }

  if (!token.mintRenounced) {
    return {
      approved: false,
      score,
      reason: "Mint authority is not renounced",
    };
  }

  if (!token.freezeRenounced) {
    return {
      approved: false,
      score,
      reason: "Freeze authority is not renounced",
    };
  }

  return {
    approved: true,
    score,
    reason: "Trade approved",
  };
}
