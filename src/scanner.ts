import { getNewTokens } from "./services/gmgn.js";

import { scoreToken } from "./scanner/scoring.js";
import { analyzeMomentum } from "./scanner/momentum.js";
import { calculateEntry } from "./entry.js";
import { trackToken } from "./scanner/tracker.js";

import { executeBuy, getOpenPositions } from "./services/swapExecutor.js";

import validateTrade from "./services/tradeValidator.js";

import {
   monitorPositions,
  printOpenPositions,
} from "./services/positionMonitor.js";


import { TRADING_CONFIG } from "./config/trading.js";

async function scanner() {
  console.log("\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🚀 SOLANA AI TRADER");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Mode: ${TRADING_CONFIG.mode}`);
  console.log(`Paper Amount: $${TRADING_CONFIG.paperAmountUsd}`);

  try {
    // =================================================
    // 1. FETCH
    // =================================================

    const tokens = await getNewTokens();

    console.log(`\n📊 Received ${tokens.length} tokens`);

    if (tokens.length === 0) {
      console.log("⚠️ No tokens received.");
      return;
    }

    // =================================================
    // 2. MONITOR EXISTING POSITIONS FIRST
    // =================================================

    await monitorPositions(tokens);

    // =================================================
    // 3. ANALYZE
    // =================================================

    const analyzedTokens = tokens.map((token) => {
      const history = trackToken(token);

      const scored = scoreToken(token);

      const momentum = analyzeMomentum(token);

      const entry = calculateEntry(
        token,
        scored.score,
        scored.risk,
        scored.buyPressure,
        momentum,
      );

      return {
        ...scored,
        momentum,
        entry,
        history,
      };
    });

    // =================================================
    // 4. SORT
    // =================================================

    const rankedTokens = [...analyzedTokens].sort(
      (a, b) => b.entry.entryScore - a.entry.entryScore,
    );

    // =================================================
    // 5. BUY CANDIDATES
    // =================================================

    const buySignals = rankedTokens.filter(
      (result) =>
        result.entry.signal === "STRONG_BUY" || result.entry.signal === "BUY",
    );

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("💰 BUY SIGNALS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    if (buySignals.length === 0) {
      console.log("❌ No BUY signals.");

      console.log("\nTop candidates:");

      for (const result of rankedTokens.slice(0, 3)) {
        console.log(
          `• ${result.token.symbol}: entry ${result.entry.entryScore}/100, ` +
            `score ${result.score}/100, risk ${result.risk}`,
        );
        console.log(`  ${result.entry.reasons.slice(0, 3).join("; ")}`);
      }
    }

    // =================================================
    // 6. VALIDATE + PAPER BUY
    // =================================================

    for (const result of buySignals.slice(0, 10)) {
      const token = result.token;

      console.log(`\n🔥 ${token.symbol}`);

      console.log(`Entry Score: ${result.entry.entryScore}/100`);

      console.log(`Signal: ${result.entry.signal}`);

      console.log(`Buy Pressure: ${(result.buyPressure * 100).toFixed(1)}%`);

      console.log(`Liquidity: $${token.liquidity.toFixed(2)}`);

      console.log(`Volume: $${token.volume24h.toFixed(2)}`);

      // ===============================================
      // VALIDATOR
      // ===============================================

      const validation = validateTrade({
        token,

        entryScore: result.entry.entryScore,

        buyPressure: result.buyPressure,
      });

      if (!validation.valid) {
        console.log("❌ TRADE REJECTED");

        console.log(`Reasons: ${validation.reasons.join(", ")}`);

        continue;
      }

      console.log("✅ TRADE VALIDATED");

      // ===============================================
      // BUY
      // ===============================================

      await executeBuy({
        token,

        amountUsd: TRADING_CONFIG.paperAmountUsd,

        entryScore: result.entry.entryScore,
      });
    }

    // =================================================
    // 7. OPEN POSITIONS
    // =================================================

    printOpenPositions();

    // =================================================
    // 8. SUMMARY
    // =================================================

    const openPositions = getOpenPositions();

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 SUMMARY");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    console.log(`🪙 Tokens: ${tokens.length}`);

    console.log(`🔥 Buy signals: ${buySignals.length}`);

    console.log(`📂 Open positions: ${openPositions.length}`);

    console.log(`💵 Position size: $${TRADING_CONFIG.paperAmountUsd}`);

    console.log("🎯 TP: 20% at +10%, +20%, +30%");

    console.log(
      `🟣 Trailing: starts +${TRADING_CONFIG.trailingStartPercent}%, ` +
        `${TRADING_CONFIG.trailingStopPercent}% from peak`,
    );

    console.log(`🛑 SL: -${TRADING_CONFIG.stopLossPercent}%`);
  } catch (error) {
    console.error("\n❌ Scanner error:");

    console.error(error);
  }
}

// =====================================================
// CONTINUOUS SCANNER
// =====================================================

async function startScanner() {
  console.log("🤖 AI TRADING ENGINE STARTING...\n");

  while (true) {
    await scanner();

    console.log(
      `\n⏳ Next scan in ${TRADING_CONFIG.scanIntervalMs / 1000} seconds...\n`,
    );

    await new Promise((resolve) =>
      setTimeout(resolve, TRADING_CONFIG.scanIntervalMs),
    );
  }
}

startScanner();
