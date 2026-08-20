import { TRADING_CONFIG } from "../config/trading.js";
import { TokenData } from "../types/token.js";

export type ExitReason = "SL" | "TRAILING" | "MANUAL";

export interface PartialExit {
  reason: `TP_${number}`;
  targetProfitPercent: number;
  soldPercentOfOriginal: number;
  tokenAmount: number;
  price: number;
  proceedsUsd: number;
  pnlUsd: number;
  timestamp: number;
}

export interface PaperPosition {
  id: string;
  address: string;
  symbol: string;

  entryPrice: number;
  lastObservedPrice: number;
  peakPrice: number;
  maxPumpPercent: number;
  maxDrawdownPercent: number;

  stopLoss: number;
  trailingActive: boolean;

  amountUsd: number;
  tokenAmount: number;
  remainingTokenAmount: number;
  remainingCostBasisUsd: number;
  realizedPnlUsd: number;

  completedTargetPercents: number[];
  partialExits: PartialExit[];

  openedAt: number;
  entryScore: number;
  status: "OPEN" | "CLOSED";

  exitPrice?: number;
  exitReason?: ExitReason;
  closedAt?: number;
  pnlUsd?: number;
  pnlPercent?: number;
}

const positions = new Map<string, PaperPosition>();
const closedPositions: PaperPosition[] = [];

export interface PaperTradingSummary {
  closedTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRatePercent: number;
  grossProfitUsd: number;
  grossLossUsd: number;
  netPnlUsd: number;
  profitFactor: number;
  averageWinnerUsd: number;
  averageLoserUsd: number;
  maxPumpPercent: number;
  capturedPumpPercent: number;
  maxDrawdownPercent: number;
  averageHoldTimeMs: number;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cloneClosedPosition(position: PaperPosition): PaperPosition {
  return {
    ...position,
    completedTargetPercents: [...position.completedTargetPercents],
    partialExits: [...position.partialExits],
  };
}

function calculatePnlPercent(pnlUsd: number, costBasisUsd: number): number {
  return costBasisUsd > 0 ? (pnlUsd / costBasisUsd) * 100 : 0;
}

export async function executeBuy(params: {
  token: TokenData;
  amountUsd: number;
  entryScore: number;
}): Promise<PaperPosition> {
  const { token, amountUsd, entryScore } = params;

  if (TRADING_CONFIG.mode === "LIVE") {
    throw new Error(
      "LIVE trading is disabled. Implement live executor separately.",
    );
  }

  if (!Number.isFinite(token.price) || token.price <= 0) {
    throw new Error(`Invalid price for ${token.symbol}`);
  }

  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    throw new Error("Paper buy amount must be greater than zero");
  }

  const existing = positions.get(token.address);

  if (existing?.status === "OPEN") {
    return existing;
  }

  const tokenAmount = amountUsd / token.price;
  const stopLoss = token.price * (1 - TRADING_CONFIG.stopLossPercent / 100);

  const position: PaperPosition = {
    id: generateId(),
    address: token.address,
    symbol: token.symbol,

    entryPrice: token.price,
    lastObservedPrice: token.price,
    peakPrice: token.price,
    maxPumpPercent: 0,
    maxDrawdownPercent: 0,

    stopLoss,
    trailingActive: false,

    amountUsd,
    tokenAmount,
    remainingTokenAmount: tokenAmount,
    remainingCostBasisUsd: amountUsd,
    realizedPnlUsd: 0,

    completedTargetPercents: [],
    partialExits: [],

    openedAt: Date.now(),
    entryScore,
    status: "OPEN",
  };

  positions.set(token.address, position);

  console.log("\n🟢 PAPER BUY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Token: ${token.symbol}`);
  console.log(`Entry: $${token.price}`);
  console.log("Partial TP: 20% at +10%, +20%, +30%");
  console.log(
    `Trailing: starts +${TRADING_CONFIG.trailingStartPercent}%, ` +
      `${TRADING_CONFIG.trailingStopPercent}% from peak`,
  );
  console.log(`SL: $${stopLoss}`);
  console.log(`Amount: $${amountUsd}`);
  console.log(`Tokens: ${tokenAmount}`);
  console.log(`Score: ${entryScore}`);
  console.log(`Address: ${token.address}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  return position;
}

export async function executePartialSell(params: {
  token: Pick<TokenData, "address" | "price">;
  targetProfitPercent: number;
  sellPercent: number;
}): Promise<PartialExit | undefined> {
  const { token, targetProfitPercent, sellPercent } = params;
  const position = positions.get(token.address);

  if (
    !position ||
    position.status !== "OPEN" ||
    !Number.isFinite(token.price) ||
    token.price <= 0 ||
    sellPercent <= 0 ||
    position.remainingTokenAmount <= 0
  ) {
    return undefined;
  }

  const requestedTokenAmount = position.tokenAmount * (sellPercent / 100);
  const soldTokenAmount = Math.min(
    requestedTokenAmount,
    position.remainingTokenAmount,
  );

  if (soldTokenAmount <= 0) {
    return undefined;
  }

  const soldFractionOfRemaining =
    soldTokenAmount / position.remainingTokenAmount;
  const costBasisUsd =
    position.remainingCostBasisUsd * soldFractionOfRemaining;
  const proceedsUsd = soldTokenAmount * token.price;
  const pnlUsd = proceedsUsd - costBasisUsd;
  const exit: PartialExit = {
    reason: `TP_${targetProfitPercent}`,
    targetProfitPercent,
    soldPercentOfOriginal: (soldTokenAmount / position.tokenAmount) * 100,
    tokenAmount: soldTokenAmount,
    price: token.price,
    proceedsUsd,
    pnlUsd,
    timestamp: Date.now(),
  };

  position.remainingTokenAmount -= soldTokenAmount;
  position.remainingCostBasisUsd -= costBasisUsd;
  position.realizedPnlUsd += pnlUsd;
  position.completedTargetPercents.push(targetProfitPercent);
  position.partialExits.push(exit);

  console.log("\n🟡 PAPER PARTIAL SELL");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Token: ${position.symbol}`);
  console.log(`Target: +${targetProfitPercent}%`);
  console.log(`Sold: ${exit.soldPercentOfOriginal.toFixed(1)}% of position`);
  console.log(`Exit: $${token.price}`);
  console.log(
    `Realized PnL: ${pnlUsd >= 0 ? "+" : "-"}$${Math.abs(pnlUsd).toFixed(4)}`,
  );
  console.log(
    `Remaining: ${(position.remainingTokenAmount / position.tokenAmount * 100).toFixed(1)}%`,
  );
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  return exit;
}

export async function executeSell(
  token: Pick<TokenData, "address" | "price">,
  reason: ExitReason,
): Promise<PaperPosition | undefined> {
  const position = positions.get(token.address);

  if (
    !position ||
    position.status !== "OPEN" ||
    !Number.isFinite(token.price) ||
    token.price <= 0
  ) {
    return undefined;
  }

  const exitPrice = token.price;
  const proceedsUsd = position.remainingTokenAmount * exitPrice;
  const finalLegPnlUsd = proceedsUsd - position.remainingCostBasisUsd;
  const totalPnlUsd = position.realizedPnlUsd + finalLegPnlUsd;

  position.status = "CLOSED";
  position.exitPrice = exitPrice;
  position.exitReason = reason;
  position.closedAt = Date.now();
  position.pnlUsd = totalPnlUsd;
  position.pnlPercent = calculatePnlPercent(totalPnlUsd, position.amountUsd);
  position.realizedPnlUsd = totalPnlUsd;
  position.remainingTokenAmount = 0;
  position.remainingCostBasisUsd = 0;

  // Keep an immutable record so a later re-entry into the same token does not
  // overwrite this trade's realized P&L.
  closedPositions.push(cloneClosedPosition(position));

  console.log("\n🔴 PAPER SELL");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Token: ${position.symbol}`);
  console.log(`Entry: $${position.entryPrice}`);
  console.log(`Exit: $${exitPrice}`);
  console.log(`Reason: ${reason}`);
  console.log(`PnL: ${position.pnlPercent.toFixed(2)}%`);
  console.log(
    `PnL USD: ${totalPnlUsd >= 0 ? "+" : "-"}$${Math.abs(totalPnlUsd).toFixed(4)}`,
  );
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  return position;
}

export function getOpenPositions(): PaperPosition[] {
  return Array.from(positions.values()).filter(
    (position) => position.status === "OPEN",
  );
}

export function getAllPositions(): PaperPosition[] {
  return [...closedPositions, ...getOpenPositions()];
}

export function getPaperTradingSummary(): PaperTradingSummary {
  const winners = closedPositions.filter(
    (position) => (position.pnlUsd ?? 0) > 0,
  );
  const losers = closedPositions.filter(
    (position) => (position.pnlUsd ?? 0) < 0,
  );
  const grossProfitUsd = winners.reduce(
    (total, position) => total + (position.pnlUsd ?? 0),
    0,
  );
  const grossLossUsd = losers.reduce(
    (total, position) => total + Math.abs(position.pnlUsd ?? 0),
    0,
  );
  const netPnlUsd = grossProfitUsd - grossLossUsd;
  const totalPotentialPumpUsd = closedPositions.reduce(
    (total, position) =>
      total +
      Math.max(position.tokenAmount * position.peakPrice - position.amountUsd, 0),
    0,
  );

  return {
    closedTrades: closedPositions.length,
    winningTrades: winners.length,
    losingTrades: losers.length,
    winRatePercent:
      closedPositions.length > 0
        ? (winners.length / closedPositions.length) * 100
        : 0,
    grossProfitUsd,
    grossLossUsd,
    netPnlUsd,
    profitFactor:
      grossLossUsd > 0
        ? grossProfitUsd / grossLossUsd
        : grossProfitUsd > 0
          ? Number.POSITIVE_INFINITY
          : 0,
    averageWinnerUsd:
      winners.length > 0 ? grossProfitUsd / winners.length : 0,
    averageLoserUsd:
      losers.length > 0 ? -grossLossUsd / losers.length : 0,
    maxPumpPercent: Math.max(
      0,
      ...closedPositions.map((position) => position.maxPumpPercent),
    ),
    capturedPumpPercent:
      totalPotentialPumpUsd > 0
        ? (grossProfitUsd / totalPotentialPumpUsd) * 100
        : 0,
    maxDrawdownPercent: Math.max(
      0,
      ...closedPositions.map((position) => position.maxDrawdownPercent),
    ),
    averageHoldTimeMs:
      closedPositions.length > 0
        ? closedPositions.reduce(
            (total, position) =>
              total +
              ((position.closedAt ?? position.openedAt) - position.openedAt),
            0,
          ) / closedPositions.length
        : 0,
  };
}

export function getPosition(address: string): PaperPosition | undefined {
  return positions.get(address);
}
