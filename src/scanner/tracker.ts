import { TokenData } from "../types/token.js";

export interface TokenHistory {
  address: string;
  symbol: string;

  firstSeen: number;
  lastSeen: number;

  snapshots: TokenData[];
}

const history = new Map<string, TokenHistory>();

const MAX_SNAPSHOTS = 30;

export function trackToken(token: TokenData): TokenHistory {
  const existing = history.get(token.address);

  if (!existing) {
    const newHistory: TokenHistory = {
      address: token.address,
      symbol: token.symbol,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      snapshots: [token],
    };

    history.set(token.address, newHistory);

    return newHistory;
  }

  existing.lastSeen = Date.now();

  existing.snapshots.push(token);

  if (existing.snapshots.length > MAX_SNAPSHOTS) {
    existing.snapshots.shift();
  }

  return existing;
}

export function getTokenHistory(address: string): TokenHistory | undefined {
  return history.get(address);
}

export function getTrackedTokens(): TokenHistory[] {
  return Array.from(history.values());
}

export function getPreviousSnapshot(address: string): TokenData | undefined {
  const tokenHistory = history.get(address);

  if (!tokenHistory) {
    return undefined;
  }

  if (tokenHistory.snapshots.length < 2) {
    return undefined;
  }

  return tokenHistory.snapshots[tokenHistory.snapshots.length - 2];
}
