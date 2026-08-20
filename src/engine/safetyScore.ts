import { TokenData } from "../types/token.js";

export function safetyScore(token: TokenData): number {
  let score = 0;


  if (token.mintRenounced) {
    score += 3;
  }

  if (token.freezeRenounced) {
    score += 2;
  }

  return score;
}
