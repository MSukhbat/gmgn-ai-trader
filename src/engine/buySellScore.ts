import { TokenData } from "../types/token.js";

export interface BuySellResult {
  buyRatio: number;
  sellRatio: number;
  imbalance: number;
  pressure: "EXTREME_BUY" | "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL";
  score: number;
}

export function calculateBuySellScore(token: TokenData): BuySellResult {
  const buys = Math.max(0, token.buys24h);
  const sells = Math.max(0, token.sells24h);

  const total = buys + sells;

  if (total === 0) {
    return {
      buyRatio: 50,
      sellRatio: 50,
      imbalance: 0,
      pressure: "NEUTRAL",
      score: 0,
    };
  }

  const buyRatio = (buys / total) * 100;
  const sellRatio = (sells / total) * 100;

  const imbalance = buyRatio - sellRatio;

  let score = 50;

  if (buyRatio >= 80) {
    score = 100;
  } else if (buyRatio >= 70) {
    score = 90;
  } else if (buyRatio >= 62) {
    score = 80;
  } else if (buyRatio >= 55) {
    score = 65;
  } else if (buyRatio >= 50) {
    score = 50;
  } else if (buyRatio >= 45) {
    score = 35;
  } else {
    score = 20;
  }

  let pressure: BuySellResult["pressure"];

  if (buyRatio >= 80) {
    pressure = "EXTREME_BUY";
  } else if (buyRatio >= 70) {
    pressure = "STRONG_BUY";
  } else if (buyRatio >= 62) {
    pressure = "BUY";
  } else if (buyRatio >= 50) {
    pressure = "NEUTRAL";
  } else {
    pressure = "SELL";
  }

  return {
    buyRatio,
    sellRatio,
    imbalance,
    pressure,
    score,
  };
}
