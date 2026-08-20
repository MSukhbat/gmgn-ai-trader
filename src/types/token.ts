export interface TokenData {
  address: string;
  symbol: string;
  name: string;

  price: number;
  marketCap: number;
  liquidity: number;

  volume24h: number;
  buys24h: number;
  sells24h: number;
  swaps24h: number;

  holders: number;
  ageMinutes: number;

  rugRatio: number;
  bundlerRate: number;
  insiderRate: number;

  top10HolderRate: number;
  sniperHoldRate: number;

  smartDegenCount: number;

  creatorBalanceRate: number;
  devTeamHoldRate: number;

  mintRenounced: boolean;
  freezeRenounced: boolean;

  launchpad: string;
}
