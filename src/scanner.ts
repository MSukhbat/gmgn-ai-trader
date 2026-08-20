import { getNewTokens } from "./services/gmgn.js";
import { scoreToken } from "./scanner/scoring.js";
import { analyzeMomentum } from "./scanner/momentum.js";
import { calculateEntry } from "./entry.js";
import { trackToken } from "./scanner/tracker.js";

async function scanner() {
  console.log("🚀 Solana Scanner started...\n");

  try {
    // ============================================
    // 1. FETCH
    // ============================================

    const tokens = await getNewTokens();

    console.log(`\n📊 Received ${tokens.length} normalized tokens`);

    if (tokens.length === 0) {
      console.log("⚠️ No tokens received from GMGN.");
      return;
    }

    // ============================================
    // 2. SCORE + MOMENTUM + ENTRY
    // ============================================

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

    // ============================================
    // 3. SORT BY ENTRY SCORE
    // ============================================

    const rankedTokens = [...analyzedTokens].sort(
      (a, b) => b.entry.entryScore - a.entry.entryScore,
    );

    // ============================================
    // 4. ENTRY CANDIDATES
    // ============================================

    const buyList = rankedTokens.filter(
      (result) =>
        result.entry.signal === "STRONG_BUY" || result.entry.signal === "BUY",
    );

    const watchList = rankedTokens.filter(
      (result) => result.entry.signal === "WATCH",
    );

    const rejectedCount = rankedTokens.filter(
      (result) => result.entry.signal === "REJECT",
    ).length;

    // ============================================
    // 5. TOP 10
    // ============================================

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🏆 TOP 10 ENTRY CANDIDATES");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    for (const [index, result] of rankedTokens.slice(0, 10).entries()) {
      const token = result.token;
      const momentum = result.momentum;
      const entry = result.entry;

      console.log(`\n#${index + 1} ${token.symbol}`);

      console.log(
        `Entry Score: ${entry.entryScore}/100 | Signal: ${getSignalEmoji(
          entry.signal,
        )} ${entry.signal}`,
      );

      console.log(`Base Score: ${result.score}/100 | Risk: ${result.risk}`);

      console.log(
        `Momentum: ${momentum.momentumScore}/100 | ${momentum.signal}`,
      );
      console.log(`Snapshots: ${result.history.snapshots.length}`);
      console.log(`Entry Score: ${result.entry.entryScore}/100`);
      console.log(`Entry Signal: ${result.entry.signal}`);
      console.log(`Entry Reasons: ${result.entry.reasons.join(", ")}`);
      console.log(`Address: ${token.address}`);

      console.log(`MC: $${token.marketCap.toFixed(2)}`);

      console.log(`Liquidity: $${token.liquidity.toFixed(2)}`);

      console.log(`Volume 24h: $${token.volume24h.toFixed(2)}`);

      console.log(`Holders: ${token.holders}`);

      console.log(`Buys/Sells: ${token.buys24h}/${token.sells24h}`);

      console.log(`Buy Pressure: ${(result.buyPressure * 100).toFixed(1)}%`);

      console.log(`Age: ${token.ageMinutes.toFixed(1)} min`);

      // ============================================
      // MOMENTUM CHANGES
      // ============================================

      console.log(`Volume Change: ${momentum.volumeChange.toFixed(1)}%`);

      console.log(`Holder Change: ${momentum.holderChange.toFixed(1)}%`);

      console.log(`MC Change: ${momentum.marketCapChange.toFixed(1)}%`);

      console.log(`Liquidity Change: ${momentum.liquidityChange.toFixed(1)}%`);

      // ============================================
      // RISK METRICS
      // ============================================

      console.log(`Bundler: ${(token.bundlerRate * 100).toFixed(2)}%`);

      console.log(`Insider: ${(token.insiderRate * 100).toFixed(2)}%`);

      console.log(`Top 10: ${(token.top10HolderRate * 100).toFixed(2)}%`);

      console.log(`Sniper: ${(token.sniperHoldRate * 100).toFixed(2)}%`);

      console.log(`Mint Renounced: ${token.mintRenounced ? "✅" : "❌"}`);

      console.log(`Freeze Renounced: ${token.freezeRenounced ? "✅" : "❌"}`);

      // ============================================
      // REASONS
      // ============================================

      if (entry.reasons.length > 0) {
        console.log(`Entry Reasons: ${entry.reasons.join(", ")}`);
      }

      if (momentum.reasons.length > 0) {
        console.log(`Momentum Reasons: ${momentum.reasons.join(", ")}`);
      }

      if (result.reasons.length > 0) {
        console.log(`Score Reasons: ${result.reasons.join(", ")}`);
      }

      console.log("────────────────────────────");
    }

    // ============================================
    // BUY SIGNALS
    // ============================================

    const buySignals = rankedTokens.filter(
      (result) =>
        result.entry.signal === "STRONG_BUY" || result.entry.signal === "BUY",
    );

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("💰 BUY SIGNALS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    if (buySignals.length === 0) {
      console.log("❌ No BUY signals.");
    } else {
      for (const [index, result] of buySignals.slice(0, 10).entries()) {
        console.log(`\n🔥 #${index + 1} ${result.token.symbol}`);

        console.log(`Entry Score: ${result.entry.entryScore}/100`);

        console.log(`Signal: ${result.entry.signal}`);

        console.log(`Base Score: ${result.score}/100`);

        console.log(`Risk: ${result.risk}`);

        console.log(`Momentum: ${result.momentum.momentumScore}/100`);

        console.log(`Buy Pressure: ${(result.buyPressure * 100).toFixed(1)}%`);

        console.log(`Liquidity: $${result.token.liquidity.toFixed(2)}`);

        console.log(`Market Cap: $${result.token.marketCap.toFixed(2)}`);

        console.log(`Volume: $${result.token.volume24h.toFixed(2)}`);

        console.log(`Holders: ${result.token.holders}`);

        console.log(`Bundler: ${(result.token.bundlerRate * 100).toFixed(2)}%`);

        console.log(
          `Sniper: ${(result.token.sniperHoldRate * 100).toFixed(2)}%`,
        );

        console.log(
          `Top 10: ${(result.token.top10HolderRate * 100).toFixed(2)}%`,
        );

        console.log(`Mint: ${result.token.mintRenounced ? "✅" : "❌"}`);

        console.log(`Freeze: ${result.token.freezeRenounced ? "✅" : "❌"}`);

        console.log(`Reasons: ${result.entry.reasons.join(", ")}`);

        console.log(`Address: ${result.token.address}`);

        console.log("────────────────────────────");
      }
    }
    // ============================================
    // ============================================
    // 7. WATCHLIST
    // ============================================

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("👀 WATCHLIST");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    if (watchList.length === 0) {
      console.log("❌ No WATCH tokens.");
    } else {
      for (const [index, result] of watchList.slice(0, 10).entries()) {
        console.log(`\n#${index + 1} ${result.token.symbol}`);

        console.log(`Entry Score: ${result.entry.entryScore}/100`);
        console.log(`Entry Signal: ${result.entry.signal}`);

        console.log(`Scanner Score: ${result.score}/100`);
        console.log(`Risk: ${result.risk}`);

        console.log(`Momentum: ${result.momentum.momentumScore}/100`);

        console.log(`Momentum Signal: ${result.momentum.signal}`);

        console.log(`Buy Pressure: ${(result.buyPressure * 100).toFixed(1)}%`);

        console.log(`Liquidity: $${result.token.liquidity.toFixed(2)}`);

        console.log(`Market Cap: $${result.token.marketCap.toFixed(2)}`);

        console.log(`Volume: $${result.token.volume24h.toFixed(2)}`);

        console.log(`Holders: ${result.token.holders}`);

        console.log(`Bundler: ${(result.token.bundlerRate * 100).toFixed(2)}%`);

        console.log(
          `Sniper: ${(result.token.sniperHoldRate * 100).toFixed(2)}%`,
        );

        console.log(
          `Top 10: ${(result.token.top10HolderRate * 100).toFixed(2)}%`,
        );

        console.log(`Mint: ${result.token.mintRenounced ? "✅" : "❌"}`);

        console.log(`Freeze: ${result.token.freezeRenounced ? "✅" : "❌"}`);

        if (result.entry.reasons.length > 0) {
          console.log(`Entry Reasons: ${result.entry.reasons.join(", ")}`);
        }

        if (result.momentum.reasons.length > 0) {
          console.log(
            `Momentum Reasons: ${result.momentum.reasons.join(", ")}`,
          );
        }

        console.log(`Address: ${result.token.address}`);

        console.log("────────────────────────────");
      }
    }

    // ============================================
    // 8. SUMMARY
    // ============================================

    console.log(`🔥 Buy signals: ${buySignals.length}`);
    console.log(`👀 Watchlist: ${watchList.length}`);
    console.log(`🚫 Rejected: ${rejectedCount}`);
  } catch (error) {
    console.error("\n❌ Scanner error:");
    console.error(error);
  }
}

// ============================================
// SIGNAL EMOJI
// ============================================

function getSignalEmoji(signal: "STRONG_BUY" | "BUY" | "WATCH" | "REJECT") {
  switch (signal) {
    case "STRONG_BUY":
      return "🚀";

    case "BUY":
      return "🟢";

    case "WATCH":
      return "👀";

    case "REJECT":
      return "🚫";

    default:
      return "";
  }
}

// ============================================
// CONTINUOUS SCANNER
// ============================================

async function startScanner() {
  while (true) {
    await scanner();

    console.log("⏳ Next scan in 10 seconds...\n");

    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
}

startScanner();
