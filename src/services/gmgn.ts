import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { TokenData } from "../types/token.js";

const execFileAsync = promisify(execFile);

interface GMGNToken {
  address: string;
  symbol?: string;
  name?: string;

  price?: number;
  usd_market_cap?: number;
  market_cap?: number;
  liquidity?: number;

  volume_24h?: number;
  buys_24h?: number;
  sells_24h?: number;
  swaps_24h?: number;

  holder_count?: number;
  created_timestamp?: number;

  rug_ratio?: number;

  bundler_mhr?: number;
  bundler_trader_amount_rate?: number;

  insider_rate?: number;
  suspected_insider_hold_rate?: number;

  top_10_holder_rate?: number;
  top70_sniper_hold_rate?: number;

  smart_degen_count?: number;

  creator_balance_rate?: number;
  dev_team_hold_rate?: number;

  renounced_mint?: string;
  renounced_freeze_account?: string;

  launchpad?: string;
}

function normalizeToken(raw: GMGNToken): TokenData {
  const createdTimestamp = raw.created_timestamp ?? 0;

  const nowSeconds = Date.now() / 1000;

  const ageMinutes =
    createdTimestamp > 0
      ? Math.max(0, (nowSeconds - createdTimestamp) / 60)
      : 0;

  return {
    address: raw.address,

    symbol: raw.symbol ?? "UNKNOWN",

    name: raw.name ?? raw.symbol ?? "Unknown",

    price: raw.price ?? 0,

    marketCap: raw.usd_market_cap ?? raw.market_cap ?? 0,

    liquidity: raw.liquidity ?? 0,

    // Volume

    volume24h: raw.volume_24h ?? 0,

    // Trades

    buys24h: raw.buys_24h ?? 0,
    sells24h: raw.sells_24h ?? 0,

    swaps24h: raw.swaps_24h ?? 0,

    holders: raw.holder_count ?? 0,

    ageMinutes,

    rugRatio: raw.rug_ratio ?? 0,

    bundlerRate: raw.bundler_trader_amount_rate ?? raw.bundler_mhr ?? 0,

    insiderRate: raw.insider_rate ?? raw.suspected_insider_hold_rate ?? 0,

    top10HolderRate: raw.top_10_holder_rate ?? 0,

    sniperHoldRate: raw.top70_sniper_hold_rate ?? 0,

    smartDegenCount: raw.smart_degen_count ?? 0,

    creatorBalanceRate: raw.creator_balance_rate ?? 0,

    devTeamHoldRate: raw.dev_team_hold_rate ?? 0,

    mintRenounced: raw.renounced_mint === "1",

    freezeRenounced: raw.renounced_freeze_account === "1",

    launchpad: raw.launchpad ?? "unknown",
  };
}

function parseGMGNOutput(stdout: string): unknown {
  const text = stdout.trim();

  if (!text) {
    throw new Error("GMGN CLI returned empty output");
  }

  // JSON шууд parse хийх
  try {
    return JSON.parse(text);
  } catch {
    // fallback
  }

  // Object хайх
  const objectStart = text.indexOf("{");
  const objectEnd = text.lastIndexOf("}");

  if (objectStart !== -1 && objectEnd > objectStart) {
    const jsonText = text.slice(objectStart, objectEnd + 1);

    try {
      return JSON.parse(jsonText);
    } catch {
      // continue
    }
  }

  // Array хайх
  const arrayStart = text.indexOf("[");
  const arrayEnd = text.lastIndexOf("]");

  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    const jsonText = text.slice(arrayStart, arrayEnd + 1);

    try {
      return JSON.parse(jsonText);
    } catch {
      // continue
    }
  }

  throw new Error(
    "Could not parse GMGN CLI output as JSON.\n\n" +
      "START:\n" +
      text.slice(0, 1000) +
      "\n\nEND:\n" +
      text.slice(-1000),
  );
}

function extractTokens(data: unknown): GMGNToken[] {
  if (Array.isArray(data)) {
    return data as GMGNToken[];
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  const obj = data as Record<string, unknown>;

  // GMGN-ийн бодит response:
  //
  // {
  //   completed: [],
  //   near_completion: [],
  //   new_creation: []
  // }
  //
  const newCreation = obj.new_creation;

  if (Array.isArray(newCreation)) {
    return newCreation as GMGNToken[];
  }

  // Fallback
  const possibleKeys = ["data", "list", "tokens", "items", "results"];

  for (const key of possibleKeys) {
    const value = obj[key];

    if (Array.isArray(value)) {
      return value as GMGNToken[];
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = value as Record<string, unknown>;

      for (const nestedKey of possibleKeys) {
        const nestedValue = nested[nestedKey];

        if (Array.isArray(nestedValue)) {
          return nestedValue as GMGNToken[];
        }
      }
    }
  }

  return [];
}

export async function getNewTokens(): Promise<TokenData[]> {
  console.log("🔎 Fetching new Solana tokens from GMGN...");

  try {
    /*
     * Windows:
     *
     * execFile("gmgn-cli.cmd")
     *
     * дээр spawn EINVAL гарч болох тул
     * cmd.exe /c ашиглаж байна.
     */

    const { stdout, stderr } = await execFileAsync(
      "cmd.exe",
      [
        "/d",
        "/s",
        "/c",
        "gmgn-cli.cmd market trenches --chain sol --type new_creation --limit 80 --raw",
      ],
      {
        windowsHide: true,
        maxBuffer: 20 * 1024 * 1024,
      },
    );

    if (stderr.trim()) {
      console.log("GMGN stderr:", stderr.trim());
    }

    console.log("📦 GMGN response received");

    console.log("📏 Response length:", stdout.length);

    if (!stdout.trim()) {
      console.log("⚠️ GMGN returned empty stdout");

      return [];
    }

    console.log("🔍 Response preview:");

    console.log(stdout.slice(0, 300));

    const data = parseGMGNOutput(stdout);

    console.log("✅ GMGN JSON parsed successfully");

    console.log("Top-level type:", Array.isArray(data) ? "array" : typeof data);

    const rawTokens = extractTokens(data);

    console.log(`🪙 Raw tokens found: ${rawTokens.length}`);

    if (rawTokens.length === 0) {
      console.log("⚠️ No token array found.");

      console.log("GMGN response:");

      console.log(stdout.slice(0, 2000));

      return [];
    }

    const validTokens = rawTokens.filter(
      (token) =>
        token &&
        typeof token === "object" &&
        typeof token.address === "string" &&
        token.address.length > 0,
    );

    console.log(`✅ Valid tokens: ${validTokens.length}`);

    const tokens = validTokens.map(normalizeToken);

    console.log(`🎯 Normalized tokens: ${tokens.length}`);

    if (tokens.length > 0) {
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      console.log("🪙 FIRST TOKEN");

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      console.log({
        address: tokens[0].address,

        symbol: tokens[0].symbol,

        name: tokens[0].name,

        price: tokens[0].price,

        marketCap: tokens[0].marketCap,

        liquidity: tokens[0].liquidity,

        volume24h: tokens[0].volume24h,

        buys24h: tokens[0].buys24h,

        sells24h: tokens[0].sells24h,

        holders: tokens[0].holders,

        ageMinutes: tokens[0].ageMinutes,

        rugRatio: tokens[0].rugRatio,

        insiderRate: tokens[0].insiderRate,

        top10HolderRate: tokens[0].top10HolderRate,

        sniperHoldRate: tokens[0].sniperHoldRate,

        smartDegenCount: tokens[0].smartDegenCount,

        mintRenounced: tokens[0].mintRenounced,

        freezeRenounced: tokens[0].freezeRenounced,
      });

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    }

    return tokens;
  } catch (error) {
    console.error("❌ GMGN fetch failed:");

    if (error && typeof error === "object" && "message" in error) {
      console.error((error as Error).message);
    } else {
      console.error(error);
    }

    return [];
  }
}
