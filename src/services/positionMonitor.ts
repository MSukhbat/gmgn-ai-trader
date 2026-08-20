import { TRADING_CONFIG } from "../config/trading.js";
import { TokenData } from "../types/token.js";
import { getTokenPrice } from "./gmgn.js";
import {
  executePartialSell,
  executeSell,
  getOpenPositions,
  getPaperTradingSummary,
} from "./swapExecutor.js";

export { getOpenPositions };

function formatUsd(value: number): string {
  return `${value >= 0 ? "+" : "-"}$${Math.abs(value).toFixed(4)}`;
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.round(milliseconds / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function isAtOrAbove(currentPrice: number, targetPrice: number): boolean {
  const tolerance = Math.max(Math.abs(targetPrice) * 1e-10, Number.EPSILON);

  return currentPrice >= targetPrice - tolerance;
}

function isAtOrBelow(currentPrice: number, targetPrice: number): boolean {
  const tolerance = Math.max(Math.abs(targetPrice) * 1e-10, Number.EPSILON);

  return currentPrice <= targetPrice + tolerance;
}

export async function monitorPositions(tokens: TokenData[]): Promise<void> {
  const positions = getOpenPositions();

  if (positions.length === 0) {
    return;
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📡 MONITORING POSITIONS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  for (const position of positions) {
    const scannedToken = tokens.find((token) => token.address === position.address);
    const currentPrice =
      scannedToken && scannedToken.price > 0
        ? scannedToken.price
        : await getTokenPrice(position.address);

    if (!currentPrice) {
      console.log(`⚠️ ${position.symbol} price data not found`);
      continue;
    }

    const pnlPercent =
      ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

    position.peakPrice = Math.max(position.peakPrice, currentPrice);
    position.maxPumpPercent = Math.max(
      position.maxPumpPercent,
      ((position.peakPrice - position.entryPrice) / position.entryPrice) * 100,
    );
    position.maxDrawdownPercent = Math.max(
      position.maxDrawdownPercent,
      ((position.peakPrice - currentPrice) / position.peakPrice) * 100,
    );

    console.log(`\n🪙 ${position.symbol}`);
    console.log(`Entry: $${position.entryPrice}`);
    console.log(`Current: $${currentPrice}`);
    console.log(`PnL: ${pnlPercent.toFixed(2)}%`);
    console.log(`Peak: $${position.peakPrice}`);
    console.log(
      `Remaining: ${(position.remainingTokenAmount / position.tokenAmount * 100).toFixed(1)}%`,
    );
    console.log(`SL: $${position.stopLoss}`);

    // A hard stop always closes every remaining token first.
    if (isAtOrBelow(currentPrice, position.stopLoss)) {
      console.log(`🛑 STOP LOSS HIT: ${position.symbol}`);
      await executeSell({ address: position.address, price: currentPrice }, "SL");
      continue;
    }

    for (const target of TRADING_CONFIG.partialTakeProfitTargets) {
      const targetPrice =
        position.entryPrice * (1 + target.profitPercent / 100);

      if (
        isAtOrAbove(currentPrice, targetPrice) &&
        !position.completedTargetPercents.includes(target.profitPercent)
      ) {
        await executePartialSell({
          token: { address: position.address, price: currentPrice },
          targetProfitPercent: target.profitPercent,
          sellPercent: target.sellPercent,
        });
      }
    }

    if (
      !position.trailingActive &&
      isAtOrAbove(
        currentPrice,
        position.entryPrice *
          (1 + TRADING_CONFIG.trailingStartPercent / 100),
      )
    ) {
      position.trailingActive = true;
      console.log(
        `🟣 TRAILING MODE ACTIVE: ${TRADING_CONFIG.trailingStopPercent}% below peak`,
      );
    }

    if (position.trailingActive) {
      const trailingStop =
        position.peakPrice *
        (1 - TRADING_CONFIG.trailingStopPercent / 100);

      console.log(`Trailing stop: $${trailingStop}`);

      if (isAtOrBelow(currentPrice, trailingStop)) {
        console.log(`📉 TRAILING STOP HIT: ${position.symbol}`);
        await executeSell(
          { address: position.address, price: currentPrice },
          "TRAILING",
        );
        continue;
      }
    }

    position.lastObservedPrice = currentPrice;
    console.log("🟡 HOLD");
  }
}

export function printOpenPositions(): void {
  const positions = getOpenPositions();
  const summary = getPaperTradingSummary();

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📂 OPEN PAPER POSITIONS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  if (positions.length === 0) {
    console.log("❌ No open positions.");
  } else {
    for (const position of positions) {
      const remainingPercent =
        (position.remainingTokenAmount / position.tokenAmount) * 100;

      console.log(`\n🟢 ${position.symbol}`);
      console.log(`Entry: $${position.entryPrice}`);
      console.log(`SL: $${position.stopLoss}`);
      console.log(`Remaining: ${remainingPercent.toFixed(1)}%`);
      console.log(
        `Partial targets hit: ${position.completedTargetPercents.length > 0 ? `+${position.completedTargetPercents.join("%, +")}%` : "None"}`,
      );
      console.log(
        `Trailing: ${position.trailingActive ? "ACTIVE" : `starts at +${TRADING_CONFIG.trailingStartPercent}%`}`,
      );
      console.log(`Address: ${position.address}`);
      console.log("────────────────────────────");
    }
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📈 CLOSED-TRADE PERFORMANCE");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Closed trades: ${summary.closedTrades}`);
  console.log(`Win rate: ${summary.winRatePercent.toFixed(1)}%`);
  console.log(
    `Profit factor: ${Number.isFinite(summary.profitFactor) ? summary.profitFactor.toFixed(2) : "∞"}`,
  );
  console.log(`Net P&L: ${formatUsd(summary.netPnlUsd)}`);
  console.log(`Average winner: ${formatUsd(summary.averageWinnerUsd)}`);
  console.log(`Average loser: ${formatUsd(summary.averageLoserUsd)}`);
  console.log(`Max pump: +${summary.maxPumpPercent.toFixed(2)}%`);
  console.log(`Captured pump: ${summary.capturedPumpPercent.toFixed(2)}%`);
  console.log(`Max drawdown: -${summary.maxDrawdownPercent.toFixed(2)}%`);
  console.log(`Average hold: ${formatDuration(summary.averageHoldTimeMs)}`);
}
